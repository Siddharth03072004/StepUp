import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Image, Send, Heart, MessageCircle, Loader2, X } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function Feed() {
  const [postContent, setPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  // Fetch posts with authors, likes, and comments
  const { data: posts, isLoading } = useQuery({
    queryKey: ['feed-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_author_id_fkey(id, full_name, avatar_url, level),
          likes:post_likes(id, user_id),
          comments:post_comments(
            id,
            content,
            created_at,
            author:profiles!post_comments_author_id_fkey(id, full_name, avatar_url)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Create post mutation
  const createPost = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Not authenticated');
      if (!postContent.trim() && !selectedImage) throw new Error('Post cannot be empty');

      let imageUrl = null;

      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const filePath = `${profile.user_id}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, selectedImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const { data, error } = await supabase
        .from('posts')
        .insert({
          author_id: profile.id,
          content: postContent.trim(),
          image_url: imageUrl,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setPostContent('');
      setSelectedImage(null);
      setImagePreview(null);
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
      toast.success('Post created!');
    },
    onError: (error) => {
      toast.error('Failed to create post: ' + error.message);
    },
  });

  // Like/unlike mutation
  const toggleLike = useMutation({
    mutationFn: async (postId: string) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const post = posts?.find((p: any) => p.id === postId);
      const existingLike = post?.likes?.find((l: any) => l.user_id === profile.id);

      if (existingLike) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('id', existingLike.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: profile.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
    },
    onError: (error) => {
      toast.error('Failed to like post: ' + error.message);
    },
  });

  // Add comment mutation
  const addComment = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          author_id: profile.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      setCommentInputs((prev) => ({ ...prev, [variables.postId]: '' }));
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
      toast.success('Comment added!');
    },
    onError: (error) => {
      toast.error('Failed to add comment: ' + error.message);
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitComment = (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    addComment.mutate({ postId, content });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Feed</h1>
        <p className="text-muted-foreground mt-1">
          Share your learning journey
        </p>
      </div>

      {/* Create Post */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback>
                {profile?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder="Share what you're learning..."
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                className="min-h-[80px] resize-none"
              />
              
              {imagePreview && (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-48 rounded-lg object-cover"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image className="h-4 w-4 mr-2" />
                  Add Image
                </Button>
                <Button
                  onClick={() => createPost.mutate()}
                  disabled={createPost.isPending || (!postContent.trim() && !selectedImage)}
                >
                  {createPost.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Post
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Feed */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post: any, index: number) => {
            const isLiked = post.likes?.some((l: any) => l.user_id === profile?.id);
            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Link to={`/profile/${post.author?.id}`}>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={post.author?.avatar_url || undefined} />
                          <AvatarFallback>
                            {post.author?.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div>
                        <Link
                          to={`/profile/${post.author?.id}`}
                          className="font-medium hover:underline"
                        >
                          {post.author?.full_name || 'Anonymous'}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          Level {post.author?.level} •{' '}
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <p className="whitespace-pre-wrap">{post.content}</p>
                    
                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt="Post image"
                        className="rounded-lg max-h-96 object-cover w-full"
                      />
                    )}

                    <div className="flex items-center gap-4 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLike.mutate(post.id)}
                        className={isLiked ? 'text-red-500' : ''}
                      >
                        <Heart
                          className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`}
                        />
                        {post.likes?.length || 0}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        {post.comments?.length || 0}
                      </Button>
                    </div>

                    {/* Comments */}
                    {post.comments && post.comments.length > 0 && (
                      <div className="space-y-2 pt-2 border-t">
                        {post.comments.map((comment: any) => (
                          <div key={comment.id} className="flex gap-2">
                            <Link to={`/profile/${comment.author?.id}`}>
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={comment.author?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {comment.author?.full_name?.charAt(0) || '?'}
                                </AvatarFallback>
                              </Avatar>
                            </Link>
                            <div className="flex-1 bg-muted rounded-lg p-2">
                              <Link
                                to={`/profile/${comment.author?.id}`}
                                className="font-medium text-sm hover:underline"
                              >
                                {comment.author?.full_name}
                              </Link>
                              <p className="text-sm">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Comment */}
                    <div className="flex gap-2 pt-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {profile?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex gap-2">
                        <Input
                          placeholder="Write a comment..."
                          value={commentInputs[post.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSubmitComment(post.id);
                            }
                          }}
                          className="text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSubmitComment(post.id)}
                          disabled={!commentInputs[post.id]?.trim()}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No posts yet</h3>
          <p className="text-muted-foreground">Be the first to share something!</p>
        </div>
      )}
    </div>
  );
}
