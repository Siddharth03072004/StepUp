import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createChatCompletion, parseJsonCompletion } from "../_shared/ai.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceRoleClient } from "../_shared/supabase.ts";

interface StudyPlanModule {
  title: string;
  description: string;
  estimated_minutes: number | string;
  order_index?: number;
}

interface StudyPlanResponse {
  title: string;
  description: string;
  estimated_hours: number | string;
  modules: StudyPlanModule[];
}

function buildFallbackStudyPlan(
  topicTitle: string,
  topicDescription?: string | null,
  difficulty?: string | null,
): StudyPlanResponse {
  const difficultyLabel = difficulty || "intermediate";
  const estimatedHours = difficultyLabel === "advanced" ? 18 : difficultyLabel === "beginner" ? 10 : 14;

  const moduleBlueprints = [
    ["Foundations", "Build the core vocabulary, context, and learning roadmap for this topic."],
    ["Core Concepts", "Understand the main ideas, principles, and mental models that drive the subject."],
    ["Worked Examples", "See the topic in action through guided examples and step-by-step breakdowns."],
    ["Practice and Application", "Apply the concepts to practical tasks, exercises, or short problem sets."],
    ["Common Pitfalls", "Review typical mistakes, edge cases, and strategies for avoiding confusion."],
    ["Revision and Next Steps", "Consolidate what you learned and prepare for deeper practice or assessment."],
  ] as const;

  return {
    title: `Study Plan: ${topicTitle}`,
    description: topicDescription
      ? `A guided learning path for ${topicTitle}. ${topicDescription}`
      : `A guided learning path for mastering ${topicTitle}.`,
    estimated_hours: estimatedHours,
    modules: moduleBlueprints.map(([label, description], index) => ({
      title: `${label} of ${topicTitle}`,
      description,
      estimated_minutes: difficultyLabel === "advanced" ? 40 : 30,
      order_index: index + 1,
    })),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topicId, userId, topicTitle, topicDescription, difficulty } = await req.json();

    if (!topicId || !userId || !topicTitle) {
      throw new Error("Missing required fields");
    }

    const supabase = createServiceRoleClient();

    const { data: existingPlan, error: existingPlanError } = await supabase
      .from("study_plans")
      .select("id")
      .eq("user_id", userId)
      .eq("topic_id", topicId)
      .maybeSingle();

    if (existingPlanError) {
      throw existingPlanError;
    }

    if (existingPlan?.id) {
      const { count: existingModuleCount, error: existingModuleCountError } = await supabase
        .from("modules")
        .select("*", { count: "exact", head: true })
        .eq("study_plan_id", existingPlan.id);

      if (existingModuleCountError) {
        throw existingModuleCountError;
      }

      if ((existingModuleCount || 0) > 0) {
        return new Response(
          JSON.stringify({
            success: true,
            studyPlanId: existingPlan.id,
            message: "Study plan already exists",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    let studyPlan: StudyPlanResponse;
    try {
      const prompt = `Create a comprehensive study plan for the topic "${topicTitle}".
${topicDescription ? `Topic description: ${topicDescription}` : ""}
Difficulty level: ${difficulty || "intermediate"}

Generate a structured study plan with 5-8 modules. For each module provide:
1. A clear title
2. A brief description (1-2 sentences)
3. Estimated time in minutes (15-45 minutes per module)

Return the response as a JSON object with this exact structure:
{
  "title": "Study Plan: [Topic Title]",
  "description": "A comprehensive study plan for mastering [topic]",
  "estimated_hours": [total hours as number],
  "modules": [
    {
      "title": "Module 1: [Title]",
      "description": "[Description]",
      "estimated_minutes": [number],
      "order_index": 1
    }
  ]
}

Only return valid JSON, no markdown or additional text.`;

      const studyPlanContent = await createChatCompletion([
        {
          role: "system",
          content:
            "You are an expert educational curriculum designer. Create well-structured, progressive learning plans.",
        },
        { role: "user", content: prompt },
      ]);

      studyPlan = parseJsonCompletion<StudyPlanResponse>(studyPlanContent);
    } catch (aiError) {
      console.error("AI generation failed, using fallback study plan:", aiError);
      studyPlan = buildFallbackStudyPlan(topicTitle, topicDescription, difficulty);
    }

    const estimatedHoursRaw = studyPlan.estimated_hours;
    const estimatedHoursNum = typeof estimatedHoursRaw === "number"
      ? estimatedHoursRaw
      : Number(estimatedHoursRaw);
    const estimatedHours = Number.isFinite(estimatedHoursNum)
      ? Math.round(estimatedHoursNum)
      : null;

    let planId: string;

    if (existingPlan?.id) {
      const { data: updatedPlan, error: updatePlanError } = await supabase
        .from("study_plans")
        .update({
          title: studyPlan.title,
          description: studyPlan.description,
          estimated_hours: estimatedHours,
        })
        .eq("id", existingPlan.id)
        .select("id")
        .single();

      if (updatePlanError) {
        throw updatePlanError;
      }

      planId = updatedPlan.id;

      const { error: deleteModulesError } = await supabase
        .from("modules")
        .delete()
        .eq("study_plan_id", planId);

      if (deleteModulesError) {
        throw deleteModulesError;
      }
    } else {
      const { data: planData, error: planError } = await supabase
        .from("study_plans")
        .insert({
          user_id: userId,
          topic_id: topicId,
          title: studyPlan.title,
          description: studyPlan.description,
          estimated_hours: estimatedHours,
        })
        .select("id")
        .single();

      if (planError) {
        console.error("Error inserting study plan:", planError);
        throw planError;
      }

      planId = planData.id;
    }

    const modulesToInsert = studyPlan.modules.map((module, index) => {
      const minutesRaw = module.estimated_minutes;
      const minutesNum = typeof minutesRaw === "number" ? minutesRaw : Number(minutesRaw);
      const estimatedMinutes = Number.isFinite(minutesNum) ? Math.round(minutesNum) : 30;

      return {
        study_plan_id: planId,
        title: module.title || `Module ${index + 1}`,
        description: module.description || `Continue building your understanding of ${topicTitle}.`,
        estimated_minutes: estimatedMinutes,
        order_index: module.order_index || index + 1,
        is_completed: false,
      };
    });

    const { error: modulesError } = await supabase
      .from("modules")
      .insert(modulesToInsert);

    if (modulesError) {
      console.error("Error inserting modules:", modulesError);
      throw modulesError;
    }

    const { error: progressError } = await supabase
      .from("user_progress")
      .upsert(
        {
          user_id: userId,
          topic_id: topicId,
          total_modules: studyPlan.modules.length,
          modules_completed: 0,
        },
        {
          onConflict: "user_id,topic_id",
        },
      );

    if (progressError) {
      console.error("Error updating progress:", progressError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        studyPlanId: planId,
        message: "Study plan generated successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("Error in generate-study-plan:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate study plan";

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
