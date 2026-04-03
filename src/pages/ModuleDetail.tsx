import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { 
  ArrowLeft, 
  ArrowRight,
  CheckCircle, 
  Clock, 
  Loader2,
  Volume2,
  VolumeX,
  BookOpen,
  Brain,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { invokeEdgeFunction, supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { clampPercentage, recordLearningActivity, syncUserAchievements } from '@/lib/learning';

interface Module {
  id: string;
  title: string;
  description: string | null;
  estimated_minutes: number | null;
  order_index: number;
  is_completed: boolean;
  completed_at?: string | null;
  study_plan_id: string;
}

interface Notes {
  id: string;
  content: string;
  key_points: string[] | null;
}

interface Quiz {
  id: string;
  title: string;
}

interface GenerateNotesResponse {
  success: boolean;
  notes: Notes;
  message?: string;
}

interface GenerateQuizResponse {
  success: boolean;
  quizId: string;
  message?: string;
}

export default function ModuleDetail() {
  const { planId, moduleId } = useParams<{ planId: string; moduleId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, refreshProfile } = useProfile();

  const [module, setModule] = useState<Module | null>(null);
  const [notes, setNotes] = useState<Notes | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [nextModule, setNextModule] = useState<Module | null>(null);
  
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (moduleId && planId) {
      fetchModuleData();
    }
    
    return () => {
      // Cleanup speech on unmount
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [moduleId, planId]);

  const fetchModuleData = async () => {
    try {
      // Fetch module
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select('*')
        .eq('id', moduleId)
        .maybeSingle();

      if (moduleError) throw moduleError;

      if (!moduleData) {
        toast({
          title: "Module not found",
          variant: "destructive",
        });
        navigate(`/learn/${planId}`);
        return;
      }

      setModule(moduleData);

      // Fetch topic title via study plan
      const { data: planData } = await supabase
        .from('study_plans')
        .select('topics(title)')
        .eq('id', planId)
        .maybeSingle();

      if (planData?.topics) {
        setTopicTitle((planData.topics as any).title);
      }

      // Fetch notes
      const { data: notesData } = await supabase
        .from('notes')
        .select('*')
        .eq('module_id', moduleId)
        .maybeSingle();

      setNotes(notesData);

      // Fetch quiz
      const { data: quizData } = await supabase
        .from('quizzes')
        .select('id, title')
        .eq('module_id', moduleId)
        .maybeSingle();

      setQuiz(quizData);

      // Fetch next module
      const { data: nextModuleData } = await supabase
        .from('modules')
        .select('*')
        .eq('study_plan_id', planId)
        .gt('order_index', moduleData.order_index)
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle();

      setNextModule(nextModuleData);

    } catch (error) {
      console.error('Error fetching module:', error);
      toast({
        title: "Error",
        description: "Failed to load module.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateNotes = async () => {
    if (!module) return;
    
    setGeneratingNotes(true);
    try {
      const response = await invokeEdgeFunction<GenerateNotesResponse>('generate-notes', {
        moduleId: module.id,
        moduleTitle: module.title,
        moduleDescription: module.description,
        topicTitle: topicTitle,
      });

      setNotes(response.notes);
      toast({
        title: "Notes generated!",
        description: "Your AI-powered notes are ready.",
      });
    } catch (error) {
      console.error('Error generating notes:', error);
      toast({
        title: "Error",
        description: "Failed to generate notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingNotes(false);
    }
  };

  const generateQuiz = async () => {
    if (!module) return;
    
    setGeneratingQuiz(true);
    try {
      const response = await invokeEdgeFunction<GenerateQuizResponse>('generate-quiz', {
        moduleId: module.id,
        moduleTitle: module.title,
        topicTitle: topicTitle,
        notesContent: notes?.content,
      });

      setQuiz({ id: response.quizId, title: `Quiz: ${module.title}` });
      toast({
        title: "Quiz generated!",
        description: "Your AI-powered quiz is ready.",
      });
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast({
        title: "Error",
        description: "Failed to generate quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const toggleSpeech = () => {
    if (!notes?.content) {
      toast({
        title: "No content",
        description: "Generate notes first before using text-to-speech.",
        variant: "destructive",
      });
      return;
    }

    // Check if speech synthesis is supported
    if (!('speechSynthesis' in window)) {
      toast({
        title: "Not supported",
        description: "Text-to-speech is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Strip markdown for TTS
    const plainText = notes.content
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/`{1,3}[^`]*`{1,3}/g, 'code snippet')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!plainText) {
      toast({
        title: "Empty content",
        description: "No readable content found in notes.",
        variant: "destructive",
      });
      return;
    }

    // Cancel any ongoing speech first
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to get a good voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.localService) 
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0];
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      if (event.error !== 'canceled') {
        toast({
          title: "Speech error",
          description: "Failed to play audio. Please try again.",
          variant: "destructive",
        });
      }
    };
    
    speechRef.current = utterance;
    
    // Some browsers need voices to load asynchronously
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        const newVoices = window.speechSynthesis.getVoices();
        const voice = newVoices.find(v => v.lang.startsWith('en')) || newVoices[0];
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
      };
      // Trigger voice loading
      window.speechSynthesis.getVoices();
    } else {
      window.speechSynthesis.speak(utterance);
    }
    
    setIsSpeaking(true);
  };

  const markAsComplete = async () => {
    if (!module || !profile?.id || module.is_completed) return;
    
    setCompleting(true);
    try {
      const completedAt = new Date().toISOString();

      // Update module
      const { error: moduleError } = await supabase
        .from('modules')
        .update({ 
          is_completed: true, 
          completed_at: completedAt,
        })
        .eq('id', module.id);

      if (moduleError) throw moduleError;

      // Add XP
      const { error: xpError } = await supabase.rpc('add_xp', {
        profile_id: profile.id,
        xp_to_add: 50,
      });

      if (xpError) console.error('Error adding XP:', xpError);

      // Update user progress
      const { data: planData, error: planError } = await supabase
        .from('study_plans')
        .select('topic_id')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      if (planData) {
        const [completedModulesResult, totalModulesResult, currentProgressResult] = await Promise.all([
          supabase
            .from('modules')
            .select('id', { count: 'exact', head: true })
            .eq('study_plan_id', planId)
            .eq('is_completed', true),
          supabase
            .from('modules')
            .select('id', { count: 'exact', head: true })
            .eq('study_plan_id', planId),
          supabase
            .from('user_progress')
            .select('quizzes_taken, average_score, study_time_minutes')
            .eq('user_id', profile.id)
            .eq('topic_id', planData.topic_id)
            .maybeSingle(),
        ]);

        const countError = [
          completedModulesResult.error,
          totalModulesResult.error,
          currentProgressResult.error,
        ].find(Boolean);

        if (countError) throw countError;

        const completedModules = completedModulesResult.count || 0;
        const totalModules = totalModulesResult.count || 0;
        const estimatedStudyMinutes = module.estimated_minutes || 30;
        const progressPercentage =
          totalModules > 0 ? clampPercentage((completedModules / totalModules) * 100) : 0;

        const { error: progressError } = await supabase
          .from('user_progress')
          .upsert(
            {
              user_id: profile.id,
              topic_id: planData.topic_id,
              modules_completed: completedModules,
              total_modules: totalModules,
              quizzes_taken: currentProgressResult.data?.quizzes_taken || 0,
              average_score: currentProgressResult.data?.average_score || 0,
              study_time_minutes:
                (currentProgressResult.data?.study_time_minutes || 0) + estimatedStudyMinutes,
              last_studied_at: completedAt,
            },
            {
              onConflict: 'user_id,topic_id',
            },
          );

        if (progressError) throw progressError;

        const { error: enrollmentError } = await supabase
          .from('enrollments')
          .update({
            progress_percentage: progressPercentage,
            completed_at: progressPercentage >= 100 ? completedAt : null,
          })
          .eq('user_id', profile.id)
          .eq('topic_id', planData.topic_id);

        if (enrollmentError) throw enrollmentError;

        await recordLearningActivity(profile.id, estimatedStudyMinutes);
      }

      await syncUserAchievements(profile.id);
      setModule({ ...module, is_completed: true, completed_at: completedAt });
      refreshProfile();
      
      toast({
        title: "Module completed!",
        description: "You earned 50 XP!",
      });

    } catch (error) {
      console.error('Error completing module:', error);
      toast({
        title: "Error",
        description: "Failed to mark module as complete.",
        variant: "destructive",
      });
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!module) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => navigate(`/learn/${planId}`)}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Study Plan
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
                <Badge variant="outline">Module {module.order_index}</Badge>
                <CardTitle className="text-2xl">{module.title}</CardTitle>
                {module.description && (
                  <p className="text-muted-foreground">{module.description}</p>
                )}
              </div>
              {module.is_completed && (
                <Badge className="bg-primary/10 text-primary gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Completed
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{module.estimated_minutes || 30} minutes</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <CardTitle>Notes</CardTitle>
            </div>
            {notes && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateNotes}
                  disabled={generatingNotes}
                  className="gap-2"
                >
                  {generatingNotes ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Regenerate
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSpeech}
                  className="gap-2"
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="h-4 w-4" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4" />
                      Listen
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {notes ? (
            <div className="space-y-6">
              {/* Key Points */}
              {notes.key_points && notes.key_points.length > 0 && (
                <div className="bg-primary/5 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Key Points
                  </h4>
                  <ul className="space-y-1">
                    {notes.key_points.map((point, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Separator />

              {/* Full Notes */}
              <div className="prose prose-slate prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:text-foreground prose-h2:mt-8 prose-h2:text-2xl prose-h3:text-xl prose-p:text-foreground/90 prose-p:leading-7 prose-strong:text-foreground prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-1 prose-li:text-foreground/90 prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-foreground prose-pre:bg-muted">
                <ReactMarkdown>{notes.content}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No notes yet. Generate AI-powered notes for this module.
              </p>
              <Button 
                onClick={generateNotes} 
                disabled={generatingNotes}
                className="gap-2"
              >
                {generatingNotes ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Notes...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Notes
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quiz Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>Quiz</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {quiz ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{quiz.title}</p>
                <p className="text-sm text-muted-foreground">
                  Test your understanding with an AI-generated quiz
                </p>
              </div>
              <Button onClick={() => navigate(`/quiz/${quiz.id}`)}>
                Take Quiz
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No quiz yet. Generate an AI-powered quiz to test your knowledge.
              </p>
              <Button 
                onClick={generateQuiz} 
                disabled={generatingQuiz || !notes}
                className="gap-2"
              >
                {generatingQuiz ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Quiz...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Quiz
                  </>
                )}
              </Button>
              {!notes && (
                <p className="text-xs text-muted-foreground mt-2">
                  Generate notes first to create a quiz
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <div>
          {!module.is_completed && (
            <Button 
              onClick={markAsComplete}
              disabled={completing}
              className="gap-2"
            >
              {completing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Mark as Complete (+50 XP)
            </Button>
          )}
        </div>
        {nextModule && (
          <Button 
            variant="outline" 
            onClick={() => navigate(`/learn/${planId}/module/${nextModule.id}`)}
            className="gap-2"
          >
            Next Module
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
