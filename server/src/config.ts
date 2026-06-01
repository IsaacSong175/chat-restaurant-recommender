import dotenv from "dotenv";

dotenv.config();

function normalizeOrigin(origin: string | undefined) {
  return origin?.replace(/\/+$/, "");
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: normalizeOrigin(process.env.CLIENT_ORIGIN),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-before-deploying",
  aiProvider: process.env.AI_PROVIDER ?? "auto",
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
  qwenApiKey: process.env.QWEN_API_KEY ?? process.env.DASHSCOPE_API_KEY,
  qwenModel: process.env.QWEN_MODEL ?? "qwen-plus",
  qwenBaseUrl: process.env.QWEN_BASE_URL ?? "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
};
