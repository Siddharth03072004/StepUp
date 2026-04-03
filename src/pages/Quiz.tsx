import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight,
  CheckCircle, 
  XCircle,
  Loader2,
  Trophy,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { invokeEdgeFunction, supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Json } from '@/integrations/supabase/types';
import { recordLearningActivity, syncUserAchievements } from '@/lib/learning';

interface Question {
  id: string;
  question_text: string;
  question_type: 'mcq' | 'true_false';
  options: string[];
  correct_answer: string;
  order_index: number;
}

interface QuizData {
  id: string;
  title: string;
  module_id: string;
  modules: {
    title: string;
    study_plan_id: string;
  };
}

interface GenerateFeedbackResponse {
  success: boolean;
  feedback: string;
}

export default function Quiz() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, refreshProfile } = useProfile();

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [generatingFeedback, setGeneratingFeedback] = useState(false);

  useEffect(() => {
    if (quizId) {
      fetchQuiz();
    }
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      // Fetch quiz with module info
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select(`
          *,
          modules (
            title,
            study_plan_id
          )
        `)
        .eq('id', quizId)
        .maybeSingle();

      if (quizError) throw quizError;

      if (!quizData) {
        toast({
          title: "Quiz not found",
          variant: "destructive",
        });
        navigate('/my-learning');
        return;
      }

      setQuiz(quizData);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true });

      if (questionsError) throw questionsError;

      // Parse options from JSON
      const parsedQuestions = (questionsData || []).map(q => ({
        ...q,
        options: Array.isArray(q.options) 
          ? q.options as string[]
          : JSON.parse(q.options as string),
      }));

      setQuestions(parsedQuestions);

    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast({
        title: "Error",
        description: "Failed to load quiz.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correct_answer) {
        correct++;
      }
    });
    return correct;
  };

  const getIncorrectAnswers = () => {
    return questions
      .filter(q => answers[q.id] !== q.correct_answer)
      .map(q => ({
        question: q.question_text,
        userAnswer: answers[q.id] || 'Not answered',
        correctAnswer: q.correct_answer,
      }));
  };

  const handleSubmit = async () => {
    if (!profile?.id || !quiz) return;

    const finalScore = calculateScore();
    setScore(finalScore);
    setSubmitted(true);

    // Calculate XP based on score
    const percentage = (finalScore / questions.length) * 100;
    let xpEarned = 20;
    if (percentage === 100) xpEarned = 100;
    else if (percentage >= 80) xpEarned = 70;
    else if (percentage >= 60) xpEarned = 50;
    else if (percentage >= 40) xpEarned = 30;

    try {
      // Save quiz attempt
      await supabase.from('quiz_attempts').insert({
        user_id: profile.id,
        quiz_id: quiz.id,
        score: finalScore,
        total_questions: questions.length,
        answers: answers as unknown as Json,
        xp_earned: xpEarned,
      });

      // Add XP
      await supabase.rpc('add_xp', {
        profile_id: profile.id,
        xp_to_add: xpEarned,
      });

      const quizStudyMinutes = Math.max(5, questions.length * 2);
      const { data: planData, error: planError } = await supabase
        .from('study_plans')
        .select('topic_id')
        .eq('id', quiz.modules.study_plan_id)
        .single();

      if (planError) throw planError;

      const { data: currentProgress, error: progressFetchError } = await supabase
        .from('user_progress')
        .select('modules_completed, total_modules, quizzes_taken, average_score, study_time_minutes')
        .eq('user_id', profile.id)
        .eq('topic_id', planData.topic_id)
        .maybeSingle();

      if (progressFetchError) throw progressFetchError;

      const existingQuizCount = currentProgress?.quizzes_taken || 0;
      const nextQuizCount = existingQuizCount + 1;
      const currentAverage = Number(currentProgress?.average_score || 0);
      const nextAverage = Number(
        (((currentAverage * existingQuizCount) + percentage) / nextQuizCount).toFixed(2),
      );

      const { error: progressUpsertError } = await supabase
        .from('user_progress')
        .upsert(
          {
            user_id: profile.id,
            topic_id: planData.topic_id,
            modules_completed: currentProgress?.modules_completed || 0,
            total_modules: currentProgress?.total_modules || 0,
            quizzes_taken: nextQuizCount,
            average_score: nextAverage,
            study_time_minutes: (currentProgress?.study_time_minutes || 0) + quizStudyMinutes,
            last_studied_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,topic_id',
          },
        );

      if (progressUpsertError) throw progressUpsertError;

      await recordLearningActivity(profile.id, quizStudyMinutes);
      await syncUserAchievements(profile.id);
      refreshProfile();

      toast({
        title: `Quiz completed! +${xpEarned} XP`,
        description: `You scored ${finalScore} out of ${questions.length}`,
      });

      // Generate AI feedback
      generateFeedback(finalScore);

    } catch (error) {
      console.error('Error saving quiz attempt:', error);
    }
  };

  const generateFeedback = async (finalScore: number) => {
    if (!quiz) return;
    
    setGeneratingFeedback(true);
    try {
      const { data: planData } = await supabase
        .from('study_plans')
        .select('topics(title)')
        .eq('id', quiz.modules.study_plan_id)
        .single();

      const response = await invokeEdgeFunction<GenerateFeedbackResponse>('generate-feedback', {
        score: finalScore,
        totalQuestions: questions.length,
        incorrectAnswers: getIncorrectAnswers(),
        topicTitle: (planData?.topics as any)?.title || 'Learning',
        moduleTitle: quiz.modules.title,
      });

      if (response.feedback) {
        setFeedback(response.feedback);
      }
    } catch (error) {
      console.error('Error generating feedback:', error);
    } finally {
      setGeneratingFeedback(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentIndex(0);
    setSubmitted(false);
    setScore(0);
    setFeedback(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No quiz questions found.</p>
        <Button onClick={() => navigate('/my-learning')} className="mt-4">
          Back to Learning
        </Button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  // Results View
  if (submitted) {
    const percentage = Math.round((score / questions.length) * 100);
    
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4">
                {percentage >= 70 ? (
                  <Trophy className="h-16 w-16 text-yellow-500" />
                ) : (
                  <CheckCircle className="h-16 w-16 text-primary" />
                )}
              </div>
              <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
              <CardDescription>{quiz.title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-5xl font-bold text-primary">
                {percentage}%
              </div>
              <p className="text-lg">
                You got <span className="font-semibold">{score}</span> out of{' '}
                <span className="font-semibold">{questions.length}</span> questions correct
              </p>

              {/* AI Feedback */}
              {generatingFeedback ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating personalized feedback...
                </div>
              ) : feedback && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-left">{feedback}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Answer Review */}
              <div className="space-y-3 text-left">
                <h3 className="font-semibold">Answer Review</h3>
                {questions.map((q, i) => {
                  const isCorrect = answers[q.id] === q.correct_answer;
                  return (
                    <div 
                      key={q.id} 
                      className={`p-3 rounded-lg border ${
                        isCorrect 
                          ? 'bg-green-500/10 border-green-500/20' 
                          : 'bg-red-500/10 border-red-500/20'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                        )}
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Q{i + 1}: {q.question_text}</p>
                          {!isCorrect && (
                            <>
                              <p className="text-xs text-red-500">
                                Your answer: {answers[q.id] || 'Not answered'}
                              </p>
                              <p className="text-xs text-green-500">
                                Correct: {q.correct_answer}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={handleRetry} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Retry Quiz
                </Button>
                <Button onClick={() => navigate(`/learn/${quiz.modules.study_plan_id}`)}>
                  Back to Study Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Quiz View
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/learn/${quiz.modules.study_plan_id}`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Exit Quiz
        </Button>
        <Badge variant="outline">
          {answeredCount} / {questions.length} answered
        </Badge>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader>
              <Badge variant="secondary" className="w-fit">
                {currentQuestion.question_type === 'mcq' ? 'Multiple Choice' : 'True/False'}
              </Badge>
              <CardTitle className="text-xl leading-relaxed">
                {currentQuestion.question_text}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onValueChange={(value) => handleAnswer(currentQuestion.id, value)}
                className="space-y-3"
              >
                {currentQuestion.options.map((option, i) => (
                  <div
                    key={i}
                    className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      answers[currentQuestion.id] === option
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => handleAnswer(currentQuestion.id, option)}
                  >
                    <RadioGroupItem value={option} id={`option-${i}`} />
                    <Label htmlFor={`option-${i}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>

        {currentIndex === questions.length - 1 ? (
          <Button
            onClick={handleSubmit}
            disabled={answeredCount < questions.length}
            className="gap-2"
          >
            Submit Quiz
            <CheckCircle className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            className="gap-2"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Question Navigator */}
      <div className="flex flex-wrap gap-2 justify-center">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentIndex(i)}
            className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
              i === currentIndex
                ? 'bg-primary text-primary-foreground'
                : answers[q.id]
                ? 'bg-primary/20 text-primary'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
