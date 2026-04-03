type ChatRole = "system" | "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

const DEFAULT_AI_API_URL = "https://api.openai.com/v1/chat/completions";

function requireEnv(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function extractMessageContent(content: unknown) {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }

        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

function extractJsonSubstring(text: string) {
  const firstObjectBrace = text.indexOf("{");
  const lastObjectBrace = text.lastIndexOf("}");
  if (firstObjectBrace !== -1 && lastObjectBrace > firstObjectBrace) {
    return text.slice(firstObjectBrace, lastObjectBrace + 1);
  }

  const firstArrayBracket = text.indexOf("[");
  const lastArrayBracket = text.lastIndexOf("]");
  if (firstArrayBracket !== -1 && lastArrayBracket > firstArrayBracket) {
    return text.slice(firstArrayBracket, lastArrayBracket + 1);
  }

  return text;
}

export async function createChatCompletion(
  messages: ChatMessage[],
  temperature = 0.7,
) {
  const apiUrl = Deno.env.get("AI_API_URL") ?? DEFAULT_AI_API_URL;
  const apiKey = requireEnv("AI_API_KEY");
  const model = requireEnv("AI_MODEL");

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI provider error:", errorText);
    throw new Error("Failed to generate AI response");
  }

  const data = await response.json();
  const content = extractMessageContent(data?.choices?.[0]?.message?.content);

  if (!content) {
    throw new Error("The AI provider returned an empty response");
  }

  return content;
}

export function parseJsonCompletion<T>(content: string) {
  const cleaned = content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return JSON.parse(extractJsonSubstring(cleaned)) as T;
  }
}
