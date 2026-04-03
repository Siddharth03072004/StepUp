import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Clock, 
  BarChart3, 
  Users, 
  BookOpen,
  Play,
  CheckCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { invokeEdgeFunction, supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import {
  clampPercentage,
  fetchEnrollmentsWithDerivedProgress,
  syncUserAchievements,
} from '@/lib/learning';

interface Topic {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_hours: number;
  image_url: string | null;
}

interface Enrollment {
  id: string;
  progress_percentage: number;
  enrolled_at: string;
  completed_at: string | null;
}

interface StudyPlan {
  id: string;
}

interface GenerateStudyPlanResponse {
  success: boolean;
  studyPlanId: string;
  message?: string;
}

export default function TopicDetail() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, refreshProfile } = useProfile();
  
  const [topic, setTopic] = useState<Topic | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [startingLearning, setStartingLearning] = useState(false);

  useEffect(() => {
    if (topicId) {
      fetchTopicDetails();
    }
  }, [topicId, profile?.id]);

  const fetchTopicDetails = async () => {
    try {
      // Fetch topic details
      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .maybeSingle();

      if (topicError) throw topicError;
      
      if (!topicData) {
        toast({
          title: "Topic not found",
          description: "The topic you're looking for doesn't exist.",
          variant: "destructive",
        });
        navigate('/topics');
        return;
      }

      setTopic(topicData);

      // Fetch enrollment count
      const { count } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('topic_id', topicId);

      setEnrolledCount(count || 0);

      // Check if user is enrolled
      if (profile?.id) {
        const enrollmentData =
          (await fetchEnrollmentsWithDerivedProgress(profile.id)).find(
            (existingEnrollment: any) => existingEnrollment.topic_id === topicId,
          ) || null;

        setEnrollment(enrollmentData);

        // Check if study plan exists
        const { data: planData } = await supabase
          .from('study_plans')
          .select('id')
          .eq('topic_id', topicId)
          .eq('user_id', profile.id)
          .maybeSingle();

        setStudyPlan(planData);
      }
    } catch (error) {
      console.error('Error fetching topic:', error);
      toast({
        title: "Error",
        description: "Failed to load topic details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!profile?.id || !topicId) return;

    setEnrolling(true);
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .insert({
          user_id: profile.id,
          topic_id: topicId,
        })
        .select()
        .single();

      if (error) throw error;

      await syncUserAchievements(profile.id);
      refreshProfile();
      setEnrollment(data);
      setEnrolledCount(prev => prev + 1);
      
      toast({
        title: "Enrolled successfully!",
        description: `You've enrolled in ${topic?.title}. Start learning now!`,
      });
    } catch (error: any) {
      console.error('Error enrolling:', error);
      toast({
        title: "Enrollment failed",
        description: error.message || "Failed to enroll in this topic.",
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
    }
  };

  const handleStartLearning = async () => {
    if (!profile?.id || !topicId || !topic) return;

    // If study plan exists, navigate to it
    if (studyPlan) {
      navigate(`/learn/${studyPlan.id}`);
      return;
    }

    // Generate study plan
    setStartingLearning(true);
    try {
      const response = await invokeEdgeFunction<GenerateStudyPlanResponse>('generate-study-plan', {
        topicId: topicId,
        userId: profile.id,
        topicTitle: topic.title,
        topicDescription: topic.description,
        difficulty: topic.difficulty,
      });

      toast({
        title: "Study plan created!",
        description: "Your personalized learning path is ready.",
      });

      navigate(`/learn/${response.studyPlanId}`);
    } catch (error) {
      console.error('Error generating study plan:', error);
      toast({
        title: "Error",
        description: "Failed to generate study plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setStartingLearning(false);
    }
  };

  const handleUnenroll = async () => {
    if (!profile?.id || !topicId || !enrollment) return;

    setEnrolling(true);
    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', enrollment.id);

      if (error) throw error;

      setEnrollment(null);
      setStudyPlan(null);
      setEnrolledCount(prev => Math.max(0, prev - 1));
      
      toast({
        title: "Unenrolled",
        description: `You've unenrolled from ${topic?.title}.`,
      });
    } catch (error: any) {
      console.error('Error unenrolling:', error);
      toast({
        title: "Error",
        description: "Failed to unenroll from this topic.",
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'intermediate': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'advanced': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!topic) {
    return null;
  }

  const enrollmentProgress = enrollment ? clampPercentage(enrollment.progress_percentage) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => navigate('/topics')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Topics
      </Button>

      {/* Topic Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="overflow-hidden">
          <div className="h-48 bg-gradient-to-r from-primary/20 to-primary/5 flex items-center justify-center">
            <BookOpen className="h-20 w-20 text-primary/50" />
          </div>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{topic.category}</Badge>
                  <Badge className={getDifficultyColor(topic.difficulty)}>
                    {topic.difficulty}
                  </Badge>
                </div>
                <CardTitle className="text-2xl lg:text-3xl">{topic.title}</CardTitle>
              </div>
              
              {enrollment ? (
                <div className="flex gap-2">
                  <Button 
                    onClick={handleStartLearning} 
                    className="gap-2"
                    disabled={startingLearning}
                  >
                    {startingLearning ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating Plan...
                      </>
                    ) : studyPlan ? (
                      <>
                        <Play className="h-4 w-4" />
                        Continue Learning
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Start Learning
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleUnenroll}
                    disabled={enrolling}
                  >
                    {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unenroll'}
                  </Button>
                </div>
              ) : (
                <Button 
                  size="lg" 
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="gap-2"
                >
                  {enrolling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Enroll Now
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-5 w-5" />
                <span>{topic.estimated_hours} hours</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <BarChart3 className="h-5 w-5" />
                <span className="capitalize">{topic.difficulty}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-5 w-5" />
                <span>{enrolledCount} enrolled</span>
              </div>
            </div>

            {/* Progress (if enrolled) */}
            {enrollment && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Your Progress</span>
                  <span>{enrollmentProgress}%</span>
                </div>
                <Progress value={enrollmentProgress} />
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <h3 className="font-semibold">About this topic</h3>
              <p className="text-muted-foreground">
                {topic.description || 'Learn the fundamentals and advanced concepts of this topic through AI-powered personalized study plans, interactive notes with text-to-speech, and comprehensive quizzes to test your knowledge.'}
              </p>
            </div>

            {/* What you'll learn */}
            <div className="space-y-3">
              <h3 className="font-semibold">What you'll learn</h3>
              <ul className="grid gap-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  AI-generated personalized study plan
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Comprehensive notes with key points
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Text-to-Speech for audio learning
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Interactive quizzes with AI feedback
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  XP and achievements for motivation
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
