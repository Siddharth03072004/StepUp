import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  skills: string[];
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  weekly_xp: number;
  total_study_time_minutes: number;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user?.id,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!profile?.id) throw new Error('No profile found');
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update profile: ' + error.message);
    },
  });

  const uploadAvatar = async (file: File) => {
    if (!user?.id) throw new Error('Not authenticated');
    
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    await updateProfile.mutateAsync({ avatar_url: publicUrl });
    
    return publicUrl;
  };

  const refreshProfile = () => {
    queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
  };

  return {
    profile,
    isLoading,
    error,
    updateProfile: updateProfile.mutateAsync,
    isUpdatingProfile: updateProfile.isPending,
    uploadAvatar,
    refreshProfile,
  };
}

export function useProfileById(profileId: string | undefined) {
  return useQuery({
    queryKey: ['profile', 'by-id', profileId],
    queryFn: async () => {
      if (!profileId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
      
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!profileId,
  });
}

export function useProfileByUserId(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', 'by-user-id', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
  });
}
