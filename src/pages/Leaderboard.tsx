import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Calendar,
  Crown,
  Medal,
  Rocket,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

function PodiumCard({
  user,
  rank,
  currentUserId,
  metricLabel,
  metricValue,
}: {
  user: any;
  rank: number;
  currentUserId?: string;
  metricLabel: string;
  metricValue: number;
}) {
  const isCurrentUser = user.id === currentUserId;
  const accentClass =
    rank === 1
      ? 'border-amber-300/25 bg-amber-300/10'
      : rank === 2
        ? 'border-slate-300/20 bg-slate-300/10'
        : 'border-orange-300/20 bg-orange-300/10';

  return (
    <Card className={cn('h-full', accentClass, isCurrentUser ? 'ring-1 ring-primary/35' : '')}>
      <CardContent className="flex h-full flex-col items-center justify-between p-6 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-primary">
          {rank === 1 ? <Crown className="h-5 w-5" /> : <Medal className="h-5 w-5" />}
        </div>

        <div className="mt-5">
          <Link to={`/profile/${user.id}`} className="inline-block">
            <Avatar className="mx-auto h-16 w-16 ring-2 ring-white/10">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback>{user.full_name?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
          </Link>
          <p className="mt-4 text-lg font-semibold text-white">{user.full_name || 'Anonymous'}</p>
          <p className="mt-1 text-sm text-slate-300/68">Level {user.level}</p>
          {isCurrentUser ? <Badge variant="secondary" className="mt-3">You</Badge> : null}
        </div>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Rank #{rank}</p>
          <p className="mt-2 text-3xl font-bold text-white">{metricValue}</p>
          <p className="mt-1 text-sm text-slate-300/68">{metricLabel}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState('global');
  const { profile } = useProfile();

  const { data: globalLeaderboard } = useQuery({
    queryKey: ['leaderboard-global'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, xp, level, current_streak')
        .order('xp', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: weeklyLeaderboard } = useQuery({
    queryKey: ['leaderboard-weekly'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, weekly_xp, level')
        .order('weekly_xp', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const currentUserGlobalRank = globalLeaderboard?.findIndex((user: any) => user.id === profile?.id) ?? -1;
  const currentUserWeeklyRank = weeklyLeaderboard?.findIndex((user: any) => user.id === profile?.id) ?? -1;
  const maxXP = globalLeaderboard?.[0]?.xp || 1;
  const maxWeeklyXP = weeklyLeaderboard?.[0]?.weekly_xp || 1;

  const topGlobal = globalLeaderboard?.slice(0, 3) || [];
  const restGlobal = globalLeaderboard?.slice(3) || [];
  const topWeekly = weeklyLeaderboard?.slice(0, 3) || [];
  const restWeekly = weeklyLeaderboard?.slice(3) || [];

  const renderRankList = (users: any[], valueKey: 'xp' | 'weekly_xp', maxValue: number) => (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-2">
          {users.map((user: any, index: number) => {
            const rank = index + 4;
            const isCurrentUser = user.id === profile?.id;
            const metricValue = user[valueKey] || 0;

            return (
              <div
                key={user.id}
                className={cn(
                  'rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 transition duration-300 hover:border-white/20 hover:bg-white/[0.06]',
                  isCurrentUser ? 'border-primary/20 bg-primary/10' : '',
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/50 text-lg font-semibold text-white">
                      #{rank}
                    </div>
                    <Link to={`/profile/${user.id}`}>
                      <Avatar className="h-11 w-11 ring-2 ring-white/10">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>{user.full_name?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                    </Link>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/profile/${user.id}`} className="truncate font-semibold text-white hover:text-primary">
                        {user.full_name || 'Anonymous'}
                      </Link>
                      {isCurrentUser ? <Badge variant="secondary">You</Badge> : null}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-sm text-slate-300/68">
                      <span>Level {user.level}</span>
                      {'current_streak' in user && user.current_streak ? <span>{user.current_streak} day streak</span> : null}
                    </div>
                    <Progress value={(metricValue / maxValue) * 100} className="mt-3" />
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-semibold text-white">{metricValue}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      {valueKey === 'xp' ? 'All-time XP' : 'Weekly XP'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Competitive Pulse"
        title="Leaderboard with"
        highlight="real presence"
        description="Showcase learner momentum in a clearer, more premium ranking experience. Switch between all-time and weekly performance to surface consistency and recent growth."
        badge={activeTab === 'global' ? 'All-time standings' : 'Weekly standings'}
        metrics={[
          { label: 'Global rank', value: currentUserGlobalRank >= 0 ? `#${currentUserGlobalRank + 1}` : '---', icon: Trophy },
          { label: 'Weekly rank', value: currentUserWeeklyRank >= 0 ? `#${currentUserWeeklyRank + 1}` : '---', icon: Calendar },
          { label: 'Current XP', value: `${profile?.xp || 0}`, icon: TrendingUp },
          { label: 'Current streak', value: `${profile?.current_streak || 0}d`, icon: Rocket },
        ]}
        actions={
          <Button asChild>
            <Link to={`/profile/${profile?.id}`}>
              <ArrowUpRight className="h-4 w-4" />
              Open Profile
            </Link>
          </Button>
        }
      />

      {profile ? (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 ring-2 ring-white/10">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback>{profile.full_name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold text-white">{profile.full_name}</p>
                  <p className="text-sm text-slate-300/68">
                    {`Level ${profile.level} | ${profile.xp} XP | ${profile.current_streak} day streak`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:min-w-[18rem]">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Global</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {currentUserGlobalRank >= 0 ? `#${currentUserGlobalRank + 1}` : '--'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Weekly</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {currentUserWeeklyRank >= 0 ? `#${currentUserWeeklyRank + 1}` : '--'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="global" className="flex-1 gap-2 sm:flex-none">
            <TrendingUp className="h-4 w-4" />
            All-Time
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex-1 gap-2 sm:flex-none">
            <Calendar className="h-4 w-4" />
            This Week
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="mt-6 space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {topGlobal.map((user: any, index: number) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * index, duration: 0.4 }}
              >
                <PodiumCard
                  user={user}
                  rank={index + 1}
                  currentUserId={profile?.id}
                  metricLabel="All-time XP"
                  metricValue={user.xp}
                />
              </motion.div>
            ))}
          </div>
          {renderRankList(restGlobal, 'xp', maxXP)}
        </TabsContent>

        <TabsContent value="weekly" className="mt-6 space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {topWeekly.map((user: any, index: number) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * index, duration: 0.4 }}
              >
                <PodiumCard
                  user={user}
                  rank={index + 1}
                  currentUserId={profile?.id}
                  metricLabel="Weekly XP"
                  metricValue={user.weekly_xp}
                />
              </motion.div>
            ))}
          </div>
          {renderRankList(restWeekly, 'weekly_xp', maxWeeklyXP)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
