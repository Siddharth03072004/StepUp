import { motion } from 'framer-motion';
import { format, startOfWeek } from 'date-fns';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Clock,
  Target,
  TrendingUp,
  Trophy,
  Flame,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { ActivityHeatmap } from '@/components/analytics/ActivityHeatmap';
import {
  clampPercentage,
  fetchEnrollmentsWithDerivedProgress,
  getLevelProgress,
  isEnrollmentComplete,
} from '@/lib/learning';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

interface ActivityDay {
  date: string;
  count: number;
}

function toLocalDateKey(timestamp: string) {
  return format(new Date(timestamp), 'yyyy-MM-dd');
}

function addActivity(activityMap: Map<string, number>, timestamp?: string | null) {
  if (!timestamp) {
    return;
  }

  const key = toLocalDateKey(timestamp);
  activityMap.set(key, (activityMap.get(key) ?? 0) + 1);
}

export default function Analytics() {
  const { profile } = useProfile();

  // Fetch quiz attempts for performance chart
  const { data: quizAttempts } = useQuery({
    queryKey: ['quiz-attempts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: true })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  // Fetch enrollments for topic progress
  const { data: enrollments } = useQuery({
    queryKey: ['enrollments-analytics', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      return fetchEnrollmentsWithDerivedProgress(profile.id, 'title, category');
    },
    enabled: !!profile?.id,
  });

  // Fetch user progress for study time
  const { data: userProgress } = useQuery({
    queryKey: ['user-progress-analytics', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('user_progress')
        .select('*, topic:topics(title)')
        .eq('user_id', profile.id);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  // Fetch achievements
  const { data: achievements } = useQuery({
    queryKey: ['achievements-analytics', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return { earned: [], total: [] };
      
      const [earned, total] = await Promise.all([
        supabase
          .from('user_achievements')
          .select('*')
          .eq('user_id', profile.id),
        supabase
          .from('achievements')
          .select('*'),
      ]);
      
      return {
        earned: earned.data || [],
        total: total.data || [],
      };
    },
    enabled: !!profile?.id,
  });

  const { data: activityHeatmapData } = useQuery({
    queryKey: ['analytics-activity-heatmap', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [] as ActivityDay[];

      const [
        quizAttemptsResult,
        enrollmentsResult,
        studyPlansResult,
        userProgressResult,
        codeSnippetsResult,
      ] = await Promise.all([
        supabase
          .from('quiz_attempts')
          .select('created_at')
          .eq('user_id', profile.id),
        supabase
          .from('enrollments')
          .select('enrolled_at, completed_at')
          .eq('user_id', profile.id),
        supabase
          .from('study_plans')
          .select('id, created_at')
          .eq('user_id', profile.id),
        supabase
          .from('user_progress')
          .select('last_studied_at')
          .eq('user_id', profile.id),
        supabase
          .from('code_snippets')
          .select('created_at, updated_at')
          .eq('user_id', profile.id),
      ]);

      const initialError = [
        quizAttemptsResult.error,
        enrollmentsResult.error,
        studyPlansResult.error,
        userProgressResult.error,
        codeSnippetsResult.error,
      ].find(Boolean);

      if (initialError) throw initialError;

      const studyPlanIds = studyPlansResult.data?.map((plan) => plan.id) ?? [];

      const modulesResult = studyPlanIds.length
        ? await supabase
            .from('modules')
            .select('id, completed_at')
            .in('study_plan_id', studyPlanIds)
        : { data: [], error: null };

      if (modulesResult.error) throw modulesResult.error;

      const moduleIds = modulesResult.data?.map((module) => module.id) ?? [];

      const [notesResult, quizzesResult] = await Promise.all([
        moduleIds.length
          ? supabase
              .from('notes')
              .select('created_at, updated_at')
              .in('module_id', moduleIds)
          : Promise.resolve({ data: [], error: null }),
        moduleIds.length
          ? supabase
              .from('quizzes')
              .select('created_at')
              .in('module_id', moduleIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (notesResult.error) throw notesResult.error;
      if (quizzesResult.error) throw quizzesResult.error;

      const activityMap = new Map<string, number>();

      quizAttemptsResult.data?.forEach((attempt) => {
        addActivity(activityMap, attempt.created_at);
      });

      enrollmentsResult.data?.forEach((enrollment) => {
        addActivity(activityMap, enrollment.enrolled_at);
        addActivity(activityMap, enrollment.completed_at);
      });

      studyPlansResult.data?.forEach((plan) => {
        addActivity(activityMap, plan.created_at);
      });

      modulesResult.data?.forEach((module) => {
        addActivity(activityMap, module.completed_at);
      });

      notesResult.data?.forEach((note) => {
        addActivity(activityMap, note.created_at);
        if (note.updated_at && note.updated_at !== note.created_at) {
          addActivity(activityMap, note.updated_at);
        }
      });

      quizzesResult.data?.forEach((quiz) => {
        addActivity(activityMap, quiz.created_at);
      });

      codeSnippetsResult.data?.forEach((snippet) => {
        addActivity(activityMap, snippet.created_at);
        if (snippet.updated_at && snippet.updated_at !== snippet.created_at) {
          addActivity(activityMap, snippet.updated_at);
        }
      });

      userProgressResult.data?.forEach((progress) => {
        addActivity(activityMap, progress.last_studied_at);
      });

      return Array.from(activityMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!profile?.id,
  });

  // Process data for charts
  const quizPerformanceData = quizAttempts?.map((attempt: any, index: number) => ({
    name: `Quiz ${index + 1}`,
    score: Math.round((attempt.score / attempt.total_questions) * 100),
    xp: attempt.xp_earned,
  })) || [];

  const topicProgressData = enrollments?.map((enrollment: any) => ({
    name: enrollment.topic?.title?.substring(0, 15) + '...',
    progress: clampPercentage(enrollment.progress_percentage),
  })) || [];

  const categoryData = enrollments?.reduce((acc: any[], enrollment: any) => {
    const category = enrollment.topic?.category || 'Other';
    const existing = acc.find((item) => item.name === category);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: category, value: 1 });
    }
    return acc;
  }, []) || [];

  const totalStudyHours = Math.floor((profile?.total_study_time_minutes || 0) / 60);
  const averageQuizScore = quizAttempts?.length
    ? Math.round(
        quizAttempts.reduce((acc: number, a: any) => acc + (a.score / a.total_questions) * 100, 0) /
          quizAttempts.length
      )
    : 0;
  const topicsCompleted =
    enrollments?.filter((e: any) => isEnrollmentComplete(e.progress_percentage, e.completed_at))
      ?.length || 0;
  const achievementsEarned = achievements?.earned?.length || 0;
  const activeDays = activityHeatmapData?.length || 0;
  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd');
  const weeklyActions = activityHeatmapData
    ?.filter((day) => day.date >= currentWeekStart)
    .reduce((total, day) => total + day.count, 0) || 0;
  const maxDayActivity = Math.max(...(activityHeatmapData?.map((day) => day.count) || [0]));
  const levelProgress = getLevelProgress(profile?.level, profile?.xp);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Track your learning progress and performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalStudyHours}h</p>
                  <p className="text-xs text-muted-foreground">Study Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{averageQuizScore}%</p>
                  <p className="text-xs text-muted-foreground">Avg Quiz Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{topicsCompleted}</p>
                  <p className="text-xs text-muted-foreground">Topics Done</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{achievementsEarned}</p>
                  <p className="text-xs text-muted-foreground">Achievements</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Learning Activity Heatmap
            </CardTitle>
            <CardDescription>
              A contribution-style view of your recorded activity across plans, notes, quizzes, progress, and coding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-2xl font-bold">{activeDays}</p>
                <p className="text-xs text-muted-foreground">Active Days</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-2xl font-bold">{weeklyActions}</p>
                <p className="text-xs text-muted-foreground">Actions This Week</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 col-span-2 md:col-span-1">
                <p className="text-2xl font-bold">{maxDayActivity}</p>
                <p className="text-xs text-muted-foreground">Best Day Count</p>
              </div>
            </div>

            <ActivityHeatmap data={activityHeatmapData || []} />

            {activityHeatmapData?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Your calendar will start filling up as you enroll in topics, generate notes, take quizzes, and work in the playground.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Quiz Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quiz Performance
            </CardTitle>
            <CardDescription>Your quiz scores over time</CardDescription>
          </CardHeader>
          <CardContent>
            {quizPerformanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={quizPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Complete quizzes to see your performance
              </div>
            )}
          </CardContent>
        </Card>

        {/* Topic Progress Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Topic Progress
            </CardTitle>
            <CardDescription>Completion percentage by topic</CardDescription>
          </CardHeader>
          <CardContent>
            {topicProgressData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topicProgressData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                    }}
                  />
                  <Bar dataKey="progress" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Enroll in topics to track progress
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Topics by Category
            </CardTitle>
            <CardDescription>Distribution of your enrolled topics</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {categoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Enroll in topics to see distribution
              </div>
            )}
          </CardContent>
        </Card>

        {/* Streak & Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Flame className="h-5 w-5" />
              Streaks & Progress
            </CardTitle>
            <CardDescription>Your consistency and achievements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Current Streak</span>
                <span className="text-sm text-muted-foreground">
                  {profile?.current_streak || 0} days
                </span>
              </div>
              <Progress value={Math.min((profile?.current_streak || 0) * 10, 100)} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Longest Streak</span>
                <span className="text-sm text-muted-foreground">
                  {profile?.longest_streak || 0} days
                </span>
              </div>
              <Progress value={Math.min((profile?.longest_streak || 0) * 5, 100)} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Achievements</span>
                <span className="text-sm text-muted-foreground">
                  {achievementsEarned} / {achievements?.total?.length || 0}
                </span>
              </div>
              <Progress
                value={
                  achievements?.total?.length
                    ? (achievementsEarned / achievements.total.length) * 100
                    : 0
                }
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Level Progress</span>
                <span className="text-sm text-muted-foreground">
                  Level {profile?.level || 1}
                </span>
              </div>
              <Progress value={levelProgress.progressPercentage} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
