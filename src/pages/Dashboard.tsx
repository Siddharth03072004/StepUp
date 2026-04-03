import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  BookOpen,
  Clock3,
  Crown,
  Flame,
  GraduationCap,
  Medal,
  Sparkles,
  Star,
  Target,
  Trophy,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';

export default function Dashboard() {
  const { profile } = useProfile();

  const { data: enrollments } = useQuery({
    queryKey: ['enrollments', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, topic:topics(*)')
        .eq('user_id', profile.id)
        .order('enrolled_at', { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: achievements } = useQuery({
    queryKey: ['user-achievements', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*, achievement:achievements(*)')
        .eq('user_id', profile.id)
        .order('earned_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard-preview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, xp, level')
        .order('xp', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const firstName = profile?.full_name?.split(' ')[0] || 'Learner';
  const xpToNextLevel = profile ? (profile.level * 500) - (profile.xp % 500) : 500;
  const xpProgress = profile ? ((profile.xp % 500) / 500) * 100 : 0;
  const totalStudyHours = Math.floor((profile?.total_study_time_minutes || 0) / 60);
  const activeTracks = enrollments?.length || 0;
  const currentRank = leaderboard?.findIndex((user: any) => user.id === profile?.id);
  const topThree = leaderboard?.slice(0, 3) || [];

  const statCards = [
    {
      label: 'XP Collected',
      value: `${profile?.xp || 0}`,
      helper: 'Lifetime momentum',
      icon: Star,
      accent: 'from-cyan-400/30 to-sky-500/10',
    },
    {
      label: 'Current Level',
      value: `${profile?.level || 1}`,
      helper: `${xpToNextLevel} XP to next unlock`,
      icon: Trophy,
      accent: 'from-amber-300/30 to-orange-500/10',
    },
    {
      label: 'Study Streak',
      value: `${profile?.current_streak || 0}d`,
      helper: 'Consistency pays off',
      icon: Flame,
      accent: 'from-rose-400/25 to-transparent',
    },
    {
      label: 'Study Hours',
      value: `${totalStudyHours}h`,
      helper: 'Deep work logged',
      icon: Clock3,
      accent: 'from-violet-400/25 to-transparent',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Daily Launchpad"
        title={`Welcome back, ${firstName}`}
        highlight="ready to impress"
        description="Your AI learning cockpit is warmed up. Review your momentum, jump back into active tracks, and make the next few clicks feel presentation-ready."
        badge={`${profile?.current_streak || 0} day streak`}
        metrics={[
          { label: 'XP banked', value: `${profile?.xp || 0}`, icon: Star },
          { label: 'Active tracks', value: `${activeTracks}`, icon: BookOpen },
          { label: 'Achievements', value: `${achievements?.length || 0}`, icon: Sparkles },
          { label: 'Global rank', value: currentRank >= 0 ? `#${currentRank + 1}` : '---', icon: Crown },
        ]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/playground">
                <Sparkles className="h-4 w-4" />
                Practice Live
              </Link>
            </Button>
            <Button asChild>
              <Link to="/topics">
                <ArrowUpRight className="h-4 w-4" />
                Explore Topics
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;

          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * index, duration: 0.4 }}
            >
              <Card className="h-full">
                <CardContent className="relative overflow-hidden p-5">
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent}`} />
                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{card.label}</p>
                      <p className="mt-3 text-3xl font-bold text-white">{card.value}</p>
                      <p className="mt-2 text-sm text-slate-300/68">{card.helper}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr,0.95fr]">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">Momentum Overview</p>
                <CardTitle className="mt-2 text-3xl">Level progression in motion</CardTitle>
              </div>
              <Badge variant="secondary">Level {profile?.level || 1}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-slate-300/72">
                    You are <span className="font-semibold text-white">{xpToNextLevel} XP</span> away from the next level.
                  </p>
                  <Progress value={xpProgress} className="h-4" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-[16rem]">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Focus Queue</p>
                    <p className="mt-2 text-xl font-semibold text-white">{activeTracks}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Best Rank</p>
                    <p className="mt-2 text-xl font-semibold text-white">
                      {currentRank >= 0 ? `#${currentRank + 1}` : '--'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Link to="/my-learning" className="group">
                <div className="surface-outline h-full rounded-[1.5rem] p-5 transition duration-300 hover:border-primary/30 hover:bg-white/[0.06]">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <h3 className="mt-4 text-lg font-semibold text-white">Resume Learning</h3>
                  <p className="mt-2 text-sm text-slate-300/68">
                    Continue from your latest AI-generated study path.
                  </p>
                </div>
              </Link>
              <Link to="/analytics" className="group">
                <div className="surface-outline h-full rounded-[1.5rem] p-5 transition duration-300 hover:border-primary/30 hover:bg-white/[0.06]">
                  <Target className="h-5 w-5 text-primary" />
                  <h3 className="mt-4 text-lg font-semibold text-white">Track Growth</h3>
                  <p className="mt-2 text-sm text-slate-300/68">
                    Review performance curves, streaks, and study depth.
                  </p>
                </div>
              </Link>
              <Link to="/leaderboard" className="group">
                <div className="surface-outline h-full rounded-[1.5rem] p-5 transition duration-300 hover:border-primary/30 hover:bg-white/[0.06]">
                  <Trophy className="h-5 w-5 text-primary" />
                  <h3 className="mt-4 text-lg font-semibold text-white">Own the Board</h3>
                  <p className="mt-2 text-sm text-slate-300/68">
                    Check where you stand and chase the next podium jump.
                  </p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-amber-200/70">Leaderboard Snapshot</p>
                <CardTitle className="mt-2 text-3xl">Top learners tonight</CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/leaderboard">
                  View All
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {topThree.length > 0 ? (
              topThree.map((user: any, index: number) => (
                <div
                  key={user.id}
                  className={`
                    rounded-[1.4rem] border p-4 transition duration-300
                    ${user.id === profile?.id ? 'border-primary/20 bg-primary/10' : 'border-white/10 bg-white/[0.04]'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-2 text-primary">
                      {index === 0 ? <Crown className="h-4 w-4" /> : <Medal className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">
                        {user.full_name || 'Anonymous'}
                        {user.id === profile?.id ? <Badge variant="secondary" className="ml-2">You</Badge> : null}
                      </p>
                      <p className="text-sm text-slate-300/68">Level {user.level}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">{user.xp} XP</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Rank #{index + 1}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-slate-300/68">
                Leaderboard data will appear once learners start earning XP.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.95fr]">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">Continue Learning</p>
                <CardTitle className="mt-2 text-3xl">Your active study queue</CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/my-learning">
                  Open Queue
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {enrollments && enrollments.length > 0 ? (
              enrollments.map((enrollment: any) => (
                <Link
                  key={enrollment.id}
                  to={`/topics/${enrollment.topic_id}`}
                  className="group block rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 transition duration-300 hover:border-primary/30 hover:bg-white/[0.06]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
                      {enrollment.topic?.image_url ? (
                        <img
                          src={enrollment.topic.image_url}
                          alt={enrollment.topic.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <BookOpen className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-white">{enrollment.topic?.title}</p>
                          <p className="text-sm text-slate-300/68">
                            {enrollment.topic?.category || 'Learning track'}
                          </p>
                        </div>
                        <Badge variant="secondary">{enrollment.progress_percentage}% complete</Badge>
                      </div>
                      <Progress value={enrollment.progress_percentage} />
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-primary/70" />
                <p className="mt-4 text-lg font-semibold text-white">No active topics yet</p>
                <p className="mt-2 text-sm text-slate-300/68">Pick a track and the dashboard will start glowing with progress.</p>
                <Button asChild className="mt-5">
                  <Link to="/topics">Browse Topics</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <p className="text-xs uppercase tracking-[0.28em] text-amber-200/70">Achievement Feed</p>
            <CardTitle className="mt-2 text-3xl">Recent unlocks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {achievements && achievements.length > 0 ? (
              achievements.map((ua: any) => (
                <div
                  key={ua.id}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200/20 bg-amber-300/10 text-2xl">
                      {ua.achievement?.icon || '★'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white">{ua.achievement?.name}</p>
                      <p className="mt-1 text-sm text-slate-300/68">
                        +{ua.achievement?.xp_reward || 0} XP added to your profile
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-slate-300/68">
                Unlock achievements by finishing modules, quizzes, and practice sessions.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
