import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  BookOpen, 
  CheckCircle, 
  Circle, 
  Clock, 
  Loader2,
  Play,
  Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';

interface Module {
  id: string;
  title: string;
  description: string | null;
  estimated_minutes: number | null;
  order_index: number;
  is_completed: boolean;
  completed_at: string | null;
}

interface StudyPlanData {
  id: string;
  title: string;
  description: string | null;
  estimated_hours: number | null;
  topic_id: string;
  topics: {
    title: string;
    category: string;
  };
}

export default function StudyPlan() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useProfile();

  const [studyPlan, setStudyPlan] = useState<StudyPlanData | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (planId) {
      fetchStudyPlan();
    }
  }, [planId]);

  const fetchStudyPlan = async () => {
    try {
      // Fetch study plan with topic info
      const { data: planData, error: planError } = await supabase
        .from('study_plans')
        .select(`
          *,
          topics (
            title,
            category
          )
        `)
        .eq('id', planId)
        .maybeSingle();

      if (planError) throw planError;

      if (!planData) {
        toast({
          title: "Study plan not found",
          description: "This study plan doesn't exist.",
          variant: "destructive",
        });
        navigate('/my-learning');
        return;
      }

      setStudyPlan(planData);

      // Fetch modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('study_plan_id', planId)
        .order('order_index', { ascending: true });

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

    } catch (error) {
      console.error('Error fetching study plan:', error);
      toast({
        title: "Error",
        description: "Failed to load study plan.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const completedModules = modules.filter(m => m.is_completed).length;
  const progressPercentage = modules.length > 0 
    ? Math.round((completedModules / modules.length) * 100) 
    : 0;

  const getNextModule = () => {
    return modules.find(m => !m.is_completed);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!studyPlan) {
    return null;
  }

  const nextModule = getNextModule();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => navigate('/my-learning')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Learning
      </Button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Badge variant="outline">{studyPlan.topics?.category}</Badge>
                <CardTitle className="text-2xl">{studyPlan.title}</CardTitle>
                <p className="text-muted-foreground">{studyPlan.description}</p>
              </div>
              {progressPercentage === 100 && (
                <div className="flex items-center gap-2 text-primary">
                  <Trophy className="h-6 w-6" />
                  <span className="font-semibold">Completed!</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{completedModules} of {modules.length} modules completed</span>
                <span>{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Stats */}
            <div className="flex gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{studyPlan.estimated_hours} hours estimated</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>{modules.length} modules</span>
              </div>
            </div>

            {/* Continue Button */}
            {nextModule && (
              <Button 
                size="lg" 
                onClick={() => navigate(`/learn/${planId}/module/${nextModule.id}`)}
                className="w-full sm:w-auto gap-2"
              >
                <Play className="h-4 w-4" />
                Continue: {nextModule.title}
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Modules List */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Modules</h2>
        {modules.map((module, index) => (
          <motion.div
            key={module.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${
                module.is_completed ? 'bg-primary/5 border-primary/20' : ''
              }`}
              onClick={() => navigate(`/learn/${planId}/module/${module.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`flex-shrink-0 ${module.is_completed ? 'text-primary' : 'text-muted-foreground'}`}>
                    {module.is_completed ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <Circle className="h-6 w-6" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{module.title}</h3>
                    {module.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {module.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{module.estimated_minutes || 30} min</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
