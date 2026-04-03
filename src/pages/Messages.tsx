import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Send, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface Connection {
  id: string;
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  lastMessage?: Message;
}

export default function Messages() {
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  // Fetch connections with accepted status
  const { data: connections } = useQuery({
    queryKey: ['message-connections', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('connections')
        .select(`
          id,
          requester_id,
          addressee_id,
          requester:profiles!connections_requester_id_fkey(id, full_name, avatar_url),
          addressee:profiles!connections_addressee_id_fkey(id, full_name, avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`);
      
      if (error) throw error;

      const formattedConnections: Connection[] = data.map((conn: any) => ({
        id: conn.id,
        profile: conn.requester_id === profile.id ? conn.addressee : conn.requester,
      }));

      return formattedConnections;
    },
    enabled: !!profile?.id,
  });

  // Fetch messages for selected connection
  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ['messages', profile?.id, selectedConnection?.profile.id],
    queryFn: async () => {
      if (!profile?.id || !selectedConnection?.profile.id) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${profile.id},receiver_id.eq.${selectedConnection.profile.id}),and(sender_id.eq.${selectedConnection.profile.id},receiver_id.eq.${profile.id})`
        )
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!profile?.id && !!selectedConnection?.profile.id,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!profile?.id || !selectedConnection?.profile.id) throw new Error('Missing IDs');
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: profile.id,
          receiver_id: selectedConnection.profile.id,
          content,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setMessageInput('');
      refetchMessages();
    },
    onError: (error) => {
      toast.error('Failed to send message: ' + error.message);
    },
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${profile.id}`,
        },
        () => {
          refetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, refetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    sendMessage.mutate(messageInput.trim());
  };

  const filteredConnections = connections?.filter((conn) =>
    conn.profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)]">
      <div className="flex h-full gap-4">
        {/* Connections List */}
        <Card className={cn(
          "w-full lg:w-80 flex flex-col",
          selectedConnection && "hidden lg:flex"
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Messages</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              {filteredConnections && filteredConnections.length > 0 ? (
                <div className="p-2">
                  {filteredConnections.map((conn) => (
                    <button
                      key={conn.id}
                      onClick={() => setSelectedConnection(conn)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left",
                        selectedConnection?.id === conn.id && "bg-accent"
                      )}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conn.profile.avatar_url || undefined} />
                        <AvatarFallback>
                          {conn.profile.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {conn.profile.full_name || 'Anonymous'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          Click to start chatting
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  <p>No connections yet</p>
                  <p className="text-sm mt-1">Connect with others to start chatting</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className={cn(
          "flex-1 flex flex-col",
          !selectedConnection && "hidden lg:flex"
        )}>
          {selectedConnection ? (
            <>
              {/* Chat Header */}
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setSelectedConnection(null)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedConnection.profile.avatar_url || undefined} />
                    <AvatarFallback>
                      {selectedConnection.profile.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {selectedConnection.profile.full_name || 'Anonymous'}
                    </p>
                    <p className="text-sm text-muted-foreground">Online</p>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    {messages?.map((message) => {
                      const isOwn = message.sender_id === profile?.id;
                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "flex",
                            isOwn ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[70%] px-4 py-2 rounded-2xl",
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted rounded-bl-md"
                            )}
                          >
                            <p className="break-words">{message.content}</p>
                            <p
                              className={cn(
                                "text-xs mt-1",
                                isOwn
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              )}
                            >
                              {format(new Date(message.created_at), 'HH:mm')}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>

              {/* Message Input */}
              <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={sendMessage.isPending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose a connection to start chatting</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
