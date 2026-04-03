import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createChatCompletion, parseJsonCompletion } from "../_shared/ai.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceRoleClient } from "../_shared/supabase.ts";

interface QuizQuestion {
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  order_index?: number;
}

interface QuizResponse {
  title: string;
  questions: QuizQuestion[];
}

function buildFallbackQuiz(moduleTitle: string, topicTitle?: string | null): QuizResponse {
  const subject = topicTitle || "this topic";

  return {
    title: `Quiz: ${moduleTitle}`,
    questions: [
      {
        question_text: `What is the main purpose of studying ${moduleTitle} in ${subject}?`,
        question_type: "mcq",
        options: [
          "To build understanding and apply the concepts in practice",
          "To avoid using examples during learning",
          "To memorize random facts without context",
          "To skip revision entirely",
        ],
        correct_answer: "To build understanding and apply the concepts in practice",
        order_index: 1,
      },
      {
        question_text: `True or False: Practice and revision are useful when learning ${moduleTitle}.`,
        question_type: "true_false",
        options: ["True", "False"],
        correct_answer: "True",
        order_index: 2,
      },
      {
        question_text: `Which study approach is most effective for ${moduleTitle}?`,
        question_type: "mcq",
        options: [
          "Understand key concepts, review examples, and practice regularly",
          "Ignore feedback and move on immediately",
          "Read once and never revisit the material",
          "Study only difficult parts without building foundations",
        ],
        correct_answer: "Understand key concepts, review examples, and practice regularly",
        order_index: 3,
      },
      {
        question_text: `True or False: Common mistakes should be ignored while learning ${moduleTitle}.`,
        question_type: "true_false",
        options: ["True", "False"],
        correct_answer: "False",
        order_index: 4,
      },
      {
        question_text: `What should a learner do after completing ${moduleTitle}?`,
        question_type: "mcq",
        options: [
          "Summarize the topic and test their understanding",
          "Avoid checking what they learned",
          "Delete all notes immediately",
          "Skip all future modules",
        ],
        correct_answer: "Summarize the topic and test their understanding",
        order_index: 5,
      },
    ],
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { moduleId, moduleTitle, topicTitle, notesContent } = await req.json();

    if (!moduleId || !moduleTitle) {
      throw new Error("Missing required fields");
    }

    let quiz: QuizResponse;
    try {
      const prompt = `Create a quiz for the module "${moduleTitle}" which is part of the topic "${topicTitle || "Learning"}".
${notesContent ? `Based on this content: ${notesContent.substring(0, 2000)}...` : ""}

Generate 5 quiz questions with a mix of:
- Multiple choice questions (mcq) with 4 options
- True/False questions (true_false) with options ["True", "False"]

Return the response as a JSON object with this exact structure:
{
  "title": "Quiz: ${moduleTitle}",
  "questions": [
    {
      "question_text": "What is...?",
      "question_type": "mcq",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "order_index": 1
    },
    {
      "question_text": "True or False: ...?",
      "question_type": "true_false",
      "options": ["True", "False"],
      "correct_answer": "True",
      "order_index": 2
    }
  ]
}

Make questions challenging but fair. Ensure correct_answer exactly matches one of the options.
Only return valid JSON, no additional text.`;

      const quizContent = await createChatCompletion([
        {
          role: "system",
          content:
            "You are an expert quiz creator who designs educational assessments that test understanding, not just memorization.",
        },
        { role: "user", content: prompt },
      ]);

      quiz = parseJsonCompletion<QuizResponse>(quizContent);
    } catch (aiError) {
      console.error("AI generation failed, using fallback quiz:", aiError);
      quiz = buildFallbackQuiz(moduleTitle, topicTitle);
    }

    const supabase = createServiceRoleClient();

    const { data: existingQuiz } = await supabase
      .from("quizzes")
      .select("id")
      .eq("module_id", moduleId)
      .maybeSingle();

    let quizId: string;

    if (existingQuiz) {
      quizId = existingQuiz.id;

      await supabase
        .from("quiz_questions")
        .delete()
        .eq("quiz_id", quizId);
    } else {
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          module_id: moduleId,
          title: quiz.title,
        })
        .select()
        .single();

      if (quizError) {
        console.error("Error inserting quiz:", quizError);
        throw quizError;
      }

      quizId = quizData.id;
    }

    const questionsToInsert = quiz.questions.map((question, index) => ({
      quiz_id: quizId,
      question_text: question.question_text,
      question_type: question.question_type,
      options: question.options,
      correct_answer: question.correct_answer,
      order_index: question.order_index || index + 1,
    }));

    const { error: questionsError } = await supabase
      .from("quiz_questions")
      .insert(questionsToInsert);

    if (questionsError) {
      console.error("Error inserting questions:", questionsError);
      throw questionsError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        quizId,
        message: "Quiz generated successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("Error in generate-quiz:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate quiz";

    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
