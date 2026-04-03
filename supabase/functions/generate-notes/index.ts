import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createChatCompletion } from "../_shared/ai.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceRoleClient } from "../_shared/supabase.ts";

interface NotesResponse {
  content: string;
  key_points: string[];
}

function extractConcepts(text?: string | null) {
  if (!text) {
    return [];
  }

  return text
    .replace(/\.$/, "")
    .replace(/\bfocusing on\b/gi, ",")
    .replace(/\bincluding\b/gi, ",")
    .replace(/\bsuch as\b/gi, ",")
    .replace(/\blike\b/gi, ",")
    .split(/,| and /i)
    .map((concept) => concept.trim())
    .filter((concept) => concept.length > 2)
    .slice(0, 8);
}

function explainConcept(concept: string) {
  const lower = concept.toLowerCase();

  if (lower.includes("big o")) {
    return "Big O notation describes how runtime or memory usage grows as the input size increases. It helps you compare solutions and choose the approach that remains efficient at scale.";
  }

  if (lower.includes("array")) {
    return "Arrays store elements in contiguous memory, which makes indexed access fast. They are strong when you need direct access by position, but insertions and deletions in the middle can be costly.";
  }

  if (lower.includes("linked list")) {
    return "Linked lists connect nodes through references instead of storing everything contiguously. They make insertions and deletions easier at known positions, but random access is slower than in arrays.";
  }

  if (lower.includes("stack")) {
    return "A stack follows Last In, First Out ordering. It is useful for function calls, undo behavior, expression evaluation, and many depth-first style workflows.";
  }

  if (lower.includes("queue")) {
    return "A queue follows First In, First Out ordering. It is commonly used in scheduling, buffering, and breadth-first style processing.";
  }

  if (lower.includes("space-time trade")) {
    return "Space-time trade-offs appear when an algorithm uses extra memory to reduce runtime, or accepts slower execution to save memory. Understanding this balance helps you pick the right implementation for real constraints.";
  }

  if (lower.includes("edge case")) {
    return "Edge cases are unusual inputs or boundary conditions that often reveal bugs. A strong solution should behave correctly for empty inputs, single-element cases, duplicates, and extreme values.";
  }

  if (lower.includes("implementation")) {
    return "Implementation details matter because a correct idea can still perform poorly if the underlying operations are inefficient. Choosing the right representation is part of solving the problem well.";
  }

  return `${concept} is one of the central ideas in this module. You should be able to define it clearly, recognize when it applies, and connect it to practical problem-solving.`;
}

function buildConceptSections(concepts: string[]) {
  if (concepts.length === 0) {
    return "";
  }

  return concepts
    .map((concept) => `### ${concept}\n\n${explainConcept(concept)}`)
    .join("\n\n");
}

function extractKeyPointsFromMarkdown(content: string) {
  const lines = content.split("\n");
  const keyPoints: string[] = [];
  let inKeyTakeaways = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!inKeyTakeaways && /^##\s+Key Takeaways/i.test(line)) {
      inKeyTakeaways = true;
      continue;
    }

    if (inKeyTakeaways && /^##\s+/.test(line)) {
      break;
    }

    if (inKeyTakeaways && /^[-*]\s+/.test(line)) {
      keyPoints.push(line.replace(/^[-*]\s+/, "").trim());
    }
  }

  return keyPoints.filter(Boolean).slice(0, 7);
}

function normalizeMarkdown(content: string) {
  return content
    .replace(/```markdown\s*/gi, "")
    .replace(/```md\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
}

function buildFallbackNotes(
  moduleTitle: string,
  moduleDescription?: string | null,
  topicTitle?: string | null,
): NotesResponse {
  const subject = topicTitle || "this topic";
  const concepts = extractConcepts(moduleDescription);
  const conceptSections = buildConceptSections(concepts);
  const keyPoints = concepts.length > 0
    ? concepts.slice(0, 5).map((concept) => `${concept} is an important focus area in ${moduleTitle}.`)
    : [
        `${moduleTitle} is a core part of ${subject}.`,
        "The module should be understood through actual concepts, not memorized as isolated facts.",
        "Examples and implementation details help connect theory to practice.",
        "Efficiency and edge cases matter when applying the ideas correctly.",
        "Clear summaries improve retention and later revision.",
      ];

  return {
    content: `## Overview

${moduleTitle} is an important part of **${subject}**. This module focuses on the actual ideas named in the module and how they are used in practice.

${moduleDescription ? `${moduleDescription}\n` : ""}

## Key Takeaways

${keyPoints.map((point) => `- ${point}`).join("\n")}

## Detailed Notes

${conceptSections || `### Core Focus\n\nThis module introduces the main concepts behind ${moduleTitle}. Focus on understanding what each term means, how it behaves, and why it matters in real problem-solving.`}

## Common Mistakes

- Treating the topic as a set of isolated definitions instead of connected ideas.
- Ignoring how efficiency, implementation details, or edge cases affect correctness.
- Memorizing names without practicing how to compare and apply the concepts.

## Summary

${moduleTitle} should leave you with clear conceptual understanding, practical intuition, and awareness of the trade-offs or edge cases that matter in ${subject}.`,
    key_points: keyPoints,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { moduleId, moduleTitle, moduleDescription, topicTitle } = await req.json();

    if (!moduleId || !moduleTitle) {
      throw new Error("Missing required fields");
    }

    let notes: NotesResponse;
    try {
      const prompt = `Create comprehensive study notes for the module "${moduleTitle}" which is part of the topic "${topicTitle || "Learning"}".
${moduleDescription ? `Module description: ${moduleDescription}` : ""}

Write actual instructional content about the module itself.

Requirements:
- Explain the real concepts named in the module title and description.
- Do not write generic study advice like "read through the topic once" or "summarize in your own words".
- Include concrete explanations, comparisons, examples, and implementation insights where relevant.
- If the module is technical and code would help, include one short code example.
- Use markdown headings and bullet lists for readability.
- Include a section exactly named "## Key Takeaways" with 5 concise bullet points.
- Include a section exactly named "## Detailed Notes" with "###" subheadings for the major concepts.
- End with "## Summary".

Return markdown only. Do not return JSON.`;

      const notesContent = await createChatCompletion([
        {
          role: "system",
          content:
            "You are an expert technical educator. Produce concrete, topic-specific notes that teach the module content itself, not generic learning advice.",
        },
        { role: "user", content: prompt },
      ], 0.4);

      const content = normalizeMarkdown(notesContent);
      const keyPoints = extractKeyPointsFromMarkdown(content);

      notes = {
        content,
        key_points: keyPoints.length > 0
          ? keyPoints
          : buildFallbackNotes(moduleTitle, moduleDescription, topicTitle).key_points,
      };
    } catch (aiError) {
      console.error("AI generation failed, using fallback notes:", aiError);
      notes = buildFallbackNotes(moduleTitle, moduleDescription, topicTitle);
    }

    const supabase = createServiceRoleClient();

    const { data: notesData, error: notesError } = await supabase
      .from("notes")
      .upsert(
        {
          module_id: moduleId,
          content: notes.content,
          key_points: notes.key_points,
        },
        {
          onConflict: "module_id",
        },
      )
      .select()
      .single();

    if (notesError) {
      console.error("Error inserting notes:", notesError);
      throw notesError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        notes: notesData,
        message: "Notes generated successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("Error in generate-notes:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate notes";

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
