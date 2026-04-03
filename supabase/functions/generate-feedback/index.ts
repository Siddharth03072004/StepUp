import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createChatCompletion } from "../_shared/ai.ts";
import { corsHeaders } from "../_shared/cors.ts";

function buildFallbackFeedback(
  score: number,
  totalQuestions: number,
  moduleTitle?: string | null,
): string {
  const percentage = Math.round((score / totalQuestions) * 100);
  const moduleLabel = moduleTitle || "this module";

  if (percentage === 100) {
    return `Excellent work on ${moduleLabel}. You showed strong understanding across the full quiz, so keep that momentum going into the next module.`;
  }

  if (percentage >= 70) {
    return `Nice work on ${moduleLabel}. You have a solid grasp of the main ideas, and a quick review of the missed concepts should help you improve even further.`;
  }

  if (percentage >= 40) {
    return `You are making progress on ${moduleLabel}. Revisit the key concepts and examples once more, then retry the quiz to strengthen your understanding.`;
  }

  return `This attempt on ${moduleLabel} shows that you need a bit more revision, and that is completely normal. Go back through the notes carefully, focus on the basics, and then try again with a calmer second pass.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { score, totalQuestions, incorrectAnswers, topicTitle, moduleTitle } = await req.json();

    if (score === undefined || !totalQuestions) {
      throw new Error("Missing required fields");
    }

    let feedback: string;

    try {
      const percentage = Math.round((score / totalQuestions) * 100);
      const mistakes = incorrectAnswers?.length > 0
        ? incorrectAnswers
          .map(
            (answer: {
              question: string;
              userAnswer: string;
              correctAnswer: string;
            }) =>
              `  - Question: "${answer.question}" - They answered: "${answer.userAnswer}" but the correct answer was "${answer.correctAnswer}"`,
          )
          .join("\n")
        : "- Perfect score!";

      const prompt = `A student just completed a quiz for the module "${moduleTitle}" in the topic "${topicTitle}".

Quiz Results:
- Score: ${score} out of ${totalQuestions} (${percentage}%)
${incorrectAnswers?.length > 0 ? `- Questions answered incorrectly:\n${mistakes}` : mistakes}

Provide personalized, encouraging feedback in 2-3 sentences that:
1. Acknowledges their performance appropriately
2. If they made mistakes, briefly explain the key concept they might have missed
3. Encourages them to continue learning

Keep the tone supportive and motivating. Be specific to their actual mistakes if any.`;

      feedback = await createChatCompletion([
        {
          role: "system",
          content:
            "You are an encouraging and supportive learning coach who provides constructive feedback to students.",
        },
        { role: "user", content: prompt },
      ]);
    } catch (aiError) {
      console.error("AI generation failed, using fallback feedback:", aiError);
      feedback = buildFallbackFeedback(score, totalQuestions, moduleTitle);
    }

    return new Response(
      JSON.stringify({
        success: true,
        feedback,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("Error in generate-feedback:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate feedback";

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
