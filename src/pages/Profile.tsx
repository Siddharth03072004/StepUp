import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Edit, Download, Flame, Trophy, Star, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile, useProfileById } from '@/hooks/useProfile';
import { format } from 'date-fns';
import { useRef } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import {
  clampPercentage,
  fetchEnrollmentsWithDerivedProgress,
  hasDisplayableAchievementIcon,
} from '@/lib/learning';

export default function Profile() {
  const { id } = useParams();
  const { profile: currentUserProfile, uploadAvatar } = useProfile();
  const { data: viewedProfile } = useProfileById(id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profile = viewedProfile || currentUserProfile;
  const isOwnProfile = currentUserProfile?.id === profile?.id;

  const { data: achievements } = useQuery({
    queryKey: ['profile-achievements', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from('user_achievements')
        .select('*, achievement:achievements(*)')
        .eq('user_id', profile.id);
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const { data: enrollments } = useQuery({
    queryKey: ['profile-enrollments', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      return fetchEnrollmentsWithDerivedProgress(profile.id);
    },
    enabled: !!profile?.id,
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAvatar(file);
      toast.success('Avatar updated!');
    } catch (error: any) {
      toast.error('Failed to upload: ' + error.message);
    }
  };

  const exportToPDF = () => {
    if (!profile) return;
    const doc = new jsPDF();
    doc.setFontSize(24);
    doc.text(profile.full_name || 'User', 20, 30);
    doc.setFontSize(12);
    doc.text(`Level ${profile.level} - ${profile.xp} XP`, 20, 45);
    doc.text(`Streak: ${profile.current_streak} days`, 20, 55);
    doc.text(`Bio: ${profile.bio || 'No bio'}`, 20, 70);
    doc.text(`Skills: ${profile.skills?.join(', ') || 'None'}`, 20, 85);
    doc.text(`Achievements: ${achievements?.length || 0}`, 20, 100);
    doc.text(`Topics Enrolled: ${enrollments?.length || 0}`, 20, 115);
    doc.save(`${profile.full_name || 'profile'}.pdf`);
  };

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative">
              <Avatar className="h-32 w-32">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-4xl">{profile.full_name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              {isOwnProfile && (
                <>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  <Button size="icon" variant="secondary" className="absolute bottom-0 right-0" onClick={() => fileInputRef.current?.click()}>
                    <Camera className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                  <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                    <div className="flex items-center gap-1"><Trophy className="h-4 w-4" />Level {profile.level}</div>
                    <div className="flex items-center gap-1"><Star className="h-4 w-4" />{profile.xp} XP</div>
                    <div className="flex items-center gap-1"><Flame className="h-4 w-4" />{profile.current_streak} day streak</div>
                  </div>
                </div>
                {isOwnProfile && (
                  <div className="flex gap-2">
                    <Link to="/settings"><Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-1" />Edit</Button></Link>
                    <Button variant="outline" size="sm" onClick={exportToPDF}><Download className="h-4 w-4 mr-1" />PDF</Button>
                  </div>
                )}
              </div>
              <p className="mt-4 text-muted-foreground">{profile.bio || 'No bio yet'}</p>
              {profile.skills && profile.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {profile.skills.map((skill: string) => (<Badge key={skill} variant="secondary">{skill}</Badge>))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Achievements ({achievements?.length || 0})</CardTitle></CardHeader>
          <CardContent>
            {achievements && achievements.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {achievements.map((ua: any) => (
                  <div key={ua.id} className="text-center p-2 rounded-lg bg-accent">
                    <div className="flex justify-center">
                      {hasDisplayableAchievementIcon(ua.achievement?.icon) ? (
                        <span className="text-2xl">{ua.achievement?.icon}</span>
                      ) : (
                        <Trophy className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <p className="text-xs mt-1 truncate">{ua.achievement?.name}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-muted-foreground text-center py-4">No achievements yet</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Enrolled Topics ({enrollments?.length || 0})</CardTitle></CardHeader>
          <CardContent>
            {enrollments && enrollments.length > 0 ? (
              <div className="space-y-3">
                {enrollments.slice(0, 5).map((e: any) => (
                  <Link key={e.id} to={`/topics/${e.topic_id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{e.topic?.title}</p>
                      <Progress value={clampPercentage(e.progress_percentage)} className="h-1.5 mt-1" />
                    </div>
                    <span className="text-sm text-muted-foreground">{clampPercentage(e.progress_percentage)}%</span>
                  </Link>
                ))}
              </div>
            ) : <p className="text-muted-foreground text-center py-4">No topics enrolled</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
