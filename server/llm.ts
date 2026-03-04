import Anthropic from "@anthropic-ai/sdk";

// Replit AI Integrations — javascript_anthropic_ai_integrations blueprint
// Uses AI_INTEGRATIONS_ANTHROPIC_BASE_URL and AI_INTEGRATIONS_ANTHROPIC_API_KEY (auto-configured)
// Supported models: claude-sonnet-4-6 (balanced), claude-haiku-4-5 (fastest)

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const CHEAP_MODEL = "claude-haiku-4-5";
const POWERFUL_MODEL = "claude-sonnet-4-6";

export async function callLLM(
  prompt: string,
  mode: "cheap" | "powerful",
  systemPrompt?: string
): Promise<string> {
  const model = mode === "cheap" ? CHEAP_MODEL : POWERFUL_MODEL;

  console.log(`[LLM] Calling ${model} (${mode} mode)...`);
  const startTime = Date.now();

  const message = await anthropic.messages.create({
    model,
    max_tokens: 8192,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const duration = Date.now() - startTime;
  console.log(
    `[LLM] Response received in ${duration}ms (${text.length} chars)`
  );

  return text;
}
