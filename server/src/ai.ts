import { config } from "./config.js";
import type { Recommendation, RecommendationInput } from "./types.js";

export async function addExplanations(
  input: RecommendationInput,
  recommendations: Omit<Recommendation, "explanation">[]
): Promise<Recommendation[]> {
  const fallback = recommendations.map((item) => ({
    ...item,
    explanation: fallbackExplanation(item)
  }));

  try {
    if (config.aiProvider === "openai" && config.openAiApiKey) return await explainWithOpenAi(input, fallback);
    if (config.aiProvider === "anthropic" && config.anthropicApiKey) return await explainWithAnthropic(input, fallback);
    if (config.aiProvider === "qwen" && config.qwenApiKey) return await explainWithQwen(input, fallback);

    if (config.openAiApiKey) return await explainWithOpenAi(input, fallback);
    if (config.anthropicApiKey) return await explainWithAnthropic(input, fallback);
    if (config.qwenApiKey) return await explainWithQwen(input, fallback);
  } catch (error) {
    console.warn("AI explanation failed; using fallback.", error);
  }

  return fallback;
}

function fallbackExplanation(item: Omit<Recommendation, "explanation">): string {
  const good = item.restaurant.reasons.slice(0, 2).join(" and ");
  const tradeoff = item.restaurant.penalties[0] ? ` Tradeoff: ${item.restaurant.penalties[0]}.` : "";
  return `${item.restaurant.name} is the ${item.category.toLowerCase()} because it ${good || "scores best on your current preferences"}.${tradeoff}`;
}

async function explainWithOpenAi(
  input: RecommendationInput,
  recommendations: Recommendation[]
): Promise<Recommendation[]> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.openAiModel,
      input: [
        {
          role: "system",
          content:
            "You write concise restaurant recommendation explanations. Do not change rankings. Return JSON array with category and explanation only."
        },
        {
          role: "user",
          content: JSON.stringify({ input, recommendations })
        }
      ],
      text: { format: { type: "json_object" } }
    })
  });

  if (!response.ok) throw new Error(`OpenAI failed: ${response.status}`);
  const payload = (await response.json()) as { output_text?: string };
  const parsed = JSON.parse(payload.output_text ?? "{}") as {
    explanations?: Array<{ category: string; explanation: string }>;
  };

  return mergeExplanations(recommendations, parsed.explanations);
}

async function explainWithAnthropic(
  input: RecommendationInput,
  recommendations: Recommendation[]
): Promise<Recommendation[]> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.anthropicApiKey ?? "",
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.anthropicModel,
      max_tokens: 500,
      system:
        "You write concise restaurant recommendation explanations. Do not change rankings. Return JSON object with explanations array: category, explanation.",
      messages: [{ role: "user", content: JSON.stringify({ input, recommendations }) }]
    })
  });

  if (!response.ok) throw new Error(`Anthropic failed: ${response.status}`);
  const payload = (await response.json()) as { content?: Array<{ text?: string }> };
  const parsed = JSON.parse(payload.content?.[0]?.text ?? "{}") as {
    explanations?: Array<{ category: string; explanation: string }>;
  };

  return mergeExplanations(recommendations, parsed.explanations);
}

async function explainWithQwen(
  input: RecommendationInput,
  recommendations: Recommendation[]
): Promise<Recommendation[]> {
  const response = await fetch(`${config.qwenBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.qwenApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.qwenModel,
      messages: [
        {
          role: "system",
          content:
            "You write concise restaurant recommendation explanations. Do not change rankings. Return JSON object with explanations array: category, explanation."
        },
        {
          role: "user",
          content: JSON.stringify({ input, recommendations })
        }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) throw new Error(`Qwen failed: ${response.status}`);
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const parsed = JSON.parse(payload.choices?.[0]?.message?.content ?? "{}") as {
    explanations?: Array<{ category: string; explanation: string }>;
  };

  return mergeExplanations(recommendations, parsed.explanations);
}

function mergeExplanations(
  recommendations: Recommendation[],
  explanations?: Array<{ category: string; explanation: string }>
) {
  return recommendations.map((item) => {
    const aiText = explanations?.find((explanation) => explanation.category === item.category)?.explanation;
    return { ...item, explanation: aiText ?? item.explanation };
  });
}
