import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Loader2,
  Play,
  Sparkles,
  Target,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { invokeEdgeFunction, supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import {
  clampPercentage,
  fetchEnrollmentsWithDerivedProgress,
  isEnrollmentComplete,
} from '@/lib/learning';

interface StudyPlan {
  id: string;
  topic_id: string;
}

interface GenerateStudyPlanResponse {
  success: boolean;
  studyPlanId: string;
  message?: string;
}

function SectionShell({
  title,
  count,
  description,
  children,
}: {
  title: string;
  count: number;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">{title}</p>
            <CardTitle className="mt-2 text-3xl">{count} tracks</CardTitle>
          </div>
          <p className="max-w-xl text-sm text-slate-300/68">{description}</p>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function MyLearning() {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [generatingPlan, setGeneratingPlan] = useState<string | null>(null);

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['my-enrollments', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      return fetchEnrollmentsWithDerivedProgress(profile.id);
    },
    enabled: !!profile?.id,
  });

  const { data: studyPlans } = useQuery({
    queryKey: ['study-plans', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('study_plans')
        .select('id, topic_id')
        .eq('user_id', profile.id);
      if (error) throw error;
      return data as StudyPlan[];
    },
    enabled: !!profile?.id,
  });

  const getStudyPlanForTopic = (topicId: string) => studyPlans?.find((plan) => plan.topic_id === topicId);

  const handleStartLearning = async (enrollment: any) => {
    const existingPlan = getStudyPlanForTopic(enrollment.topic_id);

    if (existingPlan) {
      navigate(`/learn/${existingPlan.id}`);
      return;
    }

    setGeneratingPlan(enrollment.topic_id);
    try {
      const response = await invokeEdgeFunction<GenerateStudyPlanResponse>('generate-study-plan', {
        topicId: enrollment.topic_id,
        userId: profile?.id,
        topicTitle: enrollment.topic?.title,
        topicDescription: enrollment.topic?.description,
        difficulty: enrollment.topic?.difficulty,
      });

      toast({
        title: 'Study plan created!',
        description: 'Your personalized learning path is ready.',
      });

      navigate(`/learn/${response.studyPlanId}`);
    } catch (error) {
      console.error('Error generating study plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate study plan. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGeneratingPlan(null);
    }
  };

  const inProgress =
    enrollments?.filter((enrollment: any) => {
      const progress = clampPercentage(enrollment.progress_percentage);
      return !isEnrollmentComplete(enrollment.progress_percentage, enrollment.completed_at) && progress > 0;
    }) || [];
  const notStarted =
    enrollments?.filter((enrollment: any) => clampPercentage(enrollment.progress_percentage) === 0) || [];
  const completed =
    enrollments?.filter((enrollment: any) => isEnrollmentComplete(enrollment.progress_percentage, enrollment.completed_at)) || [];

  const EnrollmentCard = ({
    enrollment,
    status,
  }: {
    enrollment: any;
    status: 'in-progress' | 'not-started' | 'completed';
  }) => {
    const existingPlan = getStudyPlanForTopic(enrollment.topic_id);
    const isGenerating = generatingPlan === enrollment.topic_id;
    const progress = clampPercentage(enrollment.progress_percentage);

    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge variant="secondary">{enrollment.topic?.category || 'Learning track'}</Badge>
              <h3 className="mt-3 text-xl font-semibold text-white">{enrollment.topic?.title}</h3>
            </div>
            <Badge
              className={
                status === 'completed'
                  ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                  : status === 'in-progress'
                    ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100'
                    : 'border-white/10 bg-white/[0.05] text-slate-200'
              }
            >
              {status === 'completed' ? 'Completed' : status === 'in-progress' ? 'In Progress' : 'Queued'}
            </Badge>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-300/68">
            {enrollment.topic?.description || 'A guided AI-assisted path with modules, notes, and quiz checkpoints.'}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-center gap-2 text-slate-300/70">
                <Clock3 className="h-4 w-4 text-primary" />
                Duration
              </div>
              <p className="mt-2 font-semibold text-white">{enrollment.topic?.estimated_hours || 0} hours</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-center gap-2 text-slate-300/70">
                <Target className="h-4 w-4 text-primary" />
                Progress
              </div>
              <p className="mt-2 font-semibold text-white">{progress}% complete</p>
            </div>
          </div>

          <div className="mt-5">
            <Progress value={progress} className="h-4" />
          </div>

          <div className="mt-5 flex gap-3">
            <Button onClick={() => handleStartLearning(enrollment)} disabled={isGenerating} className="flex-1">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Building Plan
                </>
              ) : existingPlan ? (
                <>
                  <Play className="h-4 w-4" />
                  Continue
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Start Learning
                </>
              )}
            </Button>
            <Button asChild variant="outline">
              <Link to={`/topics/${enrollment.topic_id}`}>
                <ArrowUpRight className="h-4 w-4" />
                Details
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Learning Queue"
        title="Stay in"
        highlight="study flow"
        description="Every enrolled topic appears here as a polished learning lane. Jump back into active plans, start queued tracks, and show clear academic progress on demand."
        badge={`${enrollments?.length || 0} enrolled topics`}
        metrics={[
          { label: 'In progress', value: `${inProgress.length}`, icon: Play },
          { label: 'Ready to start', value: `${notStarted.length}`, icon: Sparkles },
          { label: 'Completed', value: `${completed.length}`, icon: CheckCircle2 },
          { label: 'Total hours', value: `${Math.floor((profile?.total_study_time_minutes || 0) / 60)}h`, icon: Clock3 },
        ]}
        actions={
          <Button asChild>
            <Link to="/topics">
              <BookOpen className="h-4 w-4" />
              Browse Topics
            </Link>
          </Button>
        }
      />

      {enrollments?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-white/10 bg-white/[0.05]">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mt-6 text-2xl font-semibold text-white">No topics enrolled yet</h3>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-300/68">
              Start a topic and this workspace will transform into your active study command center with AI-generated plans, notes, and quizzes.
            </p>
            <Button asChild className="mt-6">
              <Link to="/topics">Explore Topics</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {inProgress.length > 0 ? (
            <SectionShell
              title="Active Runway"
              count={inProgress.length}
              description="These are your most demo-worthy tracks because they already show visible progression and AI-generated continuity."
            >
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {inProgress.map((enrollment: any, index: number) => (
                  <motion.div
                    key={enrollment.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.35 }}
                  >
                    <EnrollmentCard enrollment={enrollment} status="in-progress" />
                  </motion.div>
                ))}
              </div>
            </SectionShell>
          ) : null}

          {notStarted.length > 0 ? (
            <SectionShell
              title="Ready to Launch"
              count={notStarted.length}
              description="Queued topics are perfect when you want to show how quickly the platform can spin up a fresh guided study journey."
            >
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {notStarted.map((enrollment: any, index: number) => (
                  <motion.div
                    key={enrollment.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.35 }}
                  >
                    <EnrollmentCard enrollment={enrollment} status="not-started" />
                  </motion.div>
                ))}
              </div>
            </SectionShell>
          ) : null}

          {completed.length > 0 ? (
            <SectionShell
              title="Completed Tracks"
              count={completed.length}
              description="Finished topics remain available for review, making it easy to revisit polished notes or re-run a topic during the demo."
            >
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {completed.map((enrollment: any, index: number) => (
                  <motion.div
                    key={enrollment.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.35 }}
                  >
                    <EnrollmentCard enrollment={enrollment} status="completed" />
                  </motion.div>
                ))}
              </div>
            </SectionShell>
          ) : null}
        </div>
      )}
    </div>
  );
}
