import { differenceInCalendarDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const LEVEL_THRESHOLDS = [500, 1500, 3500, 7000, 12000, 20000, 32000, 50000, 75000, 100000];

interface GrantableAchievement {
  id: string;
  name: string;
  requirement_type: string;
  requirement_value: number;
  xp_reward: number;
}

export function clampPercentage(value: number | null | undefined): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

export function isEnrollmentComplete(
  progressPercentage: number | null | undefined,
  completedAt?: string | null,
): boolean {
  return Boolean(completedAt) || clampPercentage(progressPercentage) >= 100;
}

export function hasDisplayableAchievementIcon(icon: string | null | undefined): boolean {
  const normalized = icon?.trim() ?? '';
  return normalized.length > 0 && normalized.length <= 2;
}

export function getLevelProgress(level: number | null | undefined, xp: number | null | undefined) {
  const safeLevel = Math.max(1, level ?? 1);
  const safeXp = Math.max(0, xp ?? 0);

  let minXp = 0;
  let maxXp = LEVEL_THRESHOLDS[0];

  if (safeLevel > 1 && safeLevel <= LEVEL_THRESHOLDS.length) {
    minXp = LEVEL_THRESHOLDS[safeLevel - 2];
    maxXp = LEVEL_THRESHOLDS[safeLevel - 1];
  } else if (safeLevel > LEVEL_THRESHOLDS.length) {
    minXp = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + (safeLevel - 11) * 25000;
    maxXp = minXp + 25000;
  }

  const xpRange = Math.max(1, maxXp - minXp);
  const xpWithinLevel = Math.max(0, safeXp - minXp);

  return {
    minXp,
    maxXp,
    xpToNextLevel: Math.max(0, maxXp - safeXp),
    progressPercentage: clampPercentage((xpWithinLevel / xpRange) * 100),
  };
}

function getNextStreak(lastActiveAt: string | null, currentStreak: number, now: Date) {
  if (!lastActiveAt) {
    return 1;
  }

  const diff = differenceInCalendarDays(now, new Date(lastActiveAt));

  if (diff <= 0) {
    return Math.max(1, currentStreak);
  }

  if (diff === 1) {
    return Math.max(1, currentStreak + 1);
  }

  return 1;
}

export async function recordLearningActivity(profileId: string, minutesToAdd = 0) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('current_streak, longest_streak, last_active_at, total_study_time_minutes')
    .eq('id', profileId)
    .single();

  if (profileError) throw profileError;

  const now = new Date();
  const streak = getNextStreak(profile.last_active_at, profile.current_streak ?? 0, now);
  const normalizedMinutes = Math.max(0, Math.round(minutesToAdd));

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      current_streak: streak,
      longest_streak: Math.max(profile.longest_streak ?? 0, streak),
      last_active_at: now.toISOString(),
      total_study_time_minutes: (profile.total_study_time_minutes ?? 0) + normalizedMinutes,
    })
    .eq('id', profileId);

  if (updateError) throw updateError;

  return {
    currentStreak: streak,
    totalStudyTimeMinutes: (profile.total_study_time_minutes ?? 0) + normalizedMinutes,
  };
}

export async function syncUserAchievements(profileId: string) {
  const [
    profileResult,
    progressResult,
    enrollmentsResult,
    quizAttemptsResult,
    achievementsResult,
    existingAchievementsResult,
    requesterConnectionsResult,
    addresseeConnectionsResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('level, current_streak')
      .eq('id', profileId)
      .single(),
    supabase
      .from('user_progress')
      .select('modules_completed')
      .eq('user_id', profileId),
    supabase
      .from('enrollments')
      .select('progress_percentage, completed_at')
      .eq('user_id', profileId),
    supabase
      .from('quiz_attempts')
      .select('score, total_questions')
      .eq('user_id', profileId),
    supabase
      .from('achievements')
      .select('id, name, requirement_type, requirement_value, xp_reward'),
    supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', profileId),
    supabase
      .from('connections')
      .select('id', { count: 'exact', head: true })
      .eq('requester_id', profileId)
      .eq('status', 'accepted'),
    supabase
      .from('connections')
      .select('id', { count: 'exact', head: true })
      .eq('addressee_id', profileId)
      .eq('status', 'accepted'),
  ]);

  const firstError = [
    profileResult.error,
    progressResult.error,
    enrollmentsResult.error,
    quizAttemptsResult.error,
    achievementsResult.error,
    existingAchievementsResult.error,
    requesterConnectionsResult.error,
    addresseeConnectionsResult.error,
  ].find(Boolean);

  if (firstError) throw firstError;

  const modulesCompleted = (progressResult.data ?? []).reduce(
    (total, progress) => total + (progress.modules_completed ?? 0),
    0,
  );
  const perfectQuizzes = (quizAttemptsResult.data ?? []).filter(
    (attempt) => attempt.total_questions > 0 && attempt.score === attempt.total_questions,
  ).length;
  const topicsEnrolled = enrollmentsResult.data?.length ?? 0;
  const topicsCompleted =
    enrollmentsResult.data?.filter((enrollment) =>
      isEnrollmentComplete(enrollment.progress_percentage, enrollment.completed_at),
    ).length ?? 0;
  const acceptedConnections =
    (requesterConnectionsResult.count ?? 0) + (addresseeConnectionsResult.count ?? 0);

  const metrics: Record<string, number> = {
    modules_completed: modulesCompleted,
    perfect_quizzes: perfectQuizzes,
    streak: profileResult.data.current_streak ?? 0,
    level: profileResult.data.level ?? 1,
    connections: acceptedConnections,
    topics_enrolled: topicsEnrolled,
    topics_completed: topicsCompleted,
    code_runs: 0,
  };

  const existingAchievementIds = new Set(
    (existingAchievementsResult.data ?? []).map((achievement) => achievement.achievement_id),
  );

  const achievementsToGrant = ((achievementsResult.data ?? []) as GrantableAchievement[]).filter(
    (achievement) =>
      !existingAchievementIds.has(achievement.id) &&
      (metrics[achievement.requirement_type] ?? 0) >= achievement.requirement_value,
  );

  if (achievementsToGrant.length === 0) {
    return [];
  }

  const { error: grantError } = await supabase
    .from('user_achievements')
    .upsert(
      achievementsToGrant.map((achievement) => ({
        user_id: profileId,
        achievement_id: achievement.id,
      })),
      {
        onConflict: 'user_id,achievement_id',
        ignoreDuplicates: true,
      },
    );

  if (grantError) throw grantError;

  const xpResults = await Promise.all(
    achievementsToGrant.map(async (achievement) => {
      if (!achievement.xp_reward) return null;

      const { error } = await supabase.rpc('add_xp', {
        profile_id: profileId,
        xp_to_add: achievement.xp_reward,
      });

      return error;
    }),
  );

  const xpError = xpResults.find(Boolean);
  if (xpError) throw xpError;

  return achievementsToGrant;
}

export async function fetchEnrollmentsWithDerivedProgress(userId: string, topicSelect = '*') {
  const { data: enrollments, error: enrollmentsError } = await supabase
    .from('enrollments')
    .select(`*, topic:topics(${topicSelect})`)
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false });

  if (enrollmentsError) throw enrollmentsError;

  const { data: studyPlans, error: studyPlansError } = await supabase
    .from('study_plans')
    .select('id, topic_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (studyPlansError) throw studyPlansError;

  const latestPlanByTopic = new Map<string, string>();
  (studyPlans ?? []).forEach((plan) => {
    if (!latestPlanByTopic.has(plan.topic_id)) {
      latestPlanByTopic.set(plan.topic_id, plan.id);
    }
  });

  const planIds = Array.from(latestPlanByTopic.values());
  if (planIds.length === 0) {
    return enrollments ?? [];
  }

  const { data: modules, error: modulesError } = await supabase
    .from('modules')
    .select('study_plan_id, is_completed, completed_at')
    .in('study_plan_id', planIds);

  if (modulesError) throw modulesError;

  const modulesByPlan = new Map<string, Array<{ is_completed: boolean; completed_at: string | null }>>();
  (modules ?? []).forEach((module) => {
    const existing = modulesByPlan.get(module.study_plan_id) ?? [];
    existing.push(module);
    modulesByPlan.set(module.study_plan_id, existing);
  });

  const progressByTopic = new Map<string, { progressPercentage: number; completedAt: string | null }>();
  latestPlanByTopic.forEach((planId, topicId) => {
    const planModules = modulesByPlan.get(planId) ?? [];
    if (planModules.length === 0) {
      return;
    }

    const completedModules = planModules.filter((module) => module.is_completed);
    const progressPercentage = clampPercentage((completedModules.length / planModules.length) * 100);
    const completedAt =
      progressPercentage >= 100
        ? completedModules
            .map((module) => module.completed_at)
            .filter((value): value is string => Boolean(value))
            .sort()
            .at(-1) ?? null
        : null;

    progressByTopic.set(topicId, { progressPercentage, completedAt });
  });

  return (enrollments ?? []).map((enrollment: any) => {
    const derivedProgress = progressByTopic.get(enrollment.topic_id);
    if (!derivedProgress) {
      return enrollment;
    }

    return {
      ...enrollment,
      progress_percentage: derivedProgress.progressPercentage,
      completed_at: derivedProgress.completedAt,
    };
  });
}
