import Anthropic from "@anthropic-ai/sdk";

// Anthropic AI integration — javascript_anthropic blueprint
// The newest model is "claude-sonnet-4-20250514"
// Using claude-haiku for cheap/fast steps, claude-sonnet for complex steps

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const CHEAP_MODEL = "claude-haiku-3-5-20241022";
const POWERFUL_MODEL = "claude-sonnet-4-20250514";

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
    max_tokens: 4096,
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
