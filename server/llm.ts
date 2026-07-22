import Anthropic from "@anthropic-ai/sdk";
import pRetry, { AbortError } from "p-retry";

// Replit AI Integrations — javascript_anthropic_ai_integrations blueprint
// Uses AI_INTEGRATIONS_ANTHROPIC_BASE_URL and AI_INTEGRATIONS_ANTHROPIC_API_KEY (auto-configured)
// Supported models: claude-sonnet-4-6 (balanced), claude-haiku-4-5 (fastest)

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const CHEAP_MODEL = "claude-haiku-4-5";
const POWERFUL_MODEL = "claude-sonnet-4-6";

// System prompts at or above this length are marked cacheable. Anthropic's
// minimum cacheable prefix is 1024 tokens (~4k chars); shorter blocks are
// silently not cached, so the marker is harmless either way.
const CACHE_THRESHOLD_CHARS = 4000;

// Running totals for the process lifetime, logged with each call so long
// pipeline runs show cumulative spend.
const totals = {
  calls: 0,
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
};

function isRetryable(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    const status = err.status ?? 0;
    // Rate limits, overloaded, and server errors are transient.
    return status === 429 || status === 529 || status >= 500;
  }
  // Network-level failures (no response at all) are retryable.
  return err instanceof Anthropic.APIConnectionError;
}

export async function callLLM(
  prompt: string,
  mode: "cheap" | "powerful",
  systemPrompt?: string,
  maxTokens?: number
): Promise<string> {
  const model = mode === "cheap" ? CHEAP_MODEL : POWERFUL_MODEL;
  const tokens = maxTokens ?? 8192;

  console.log(`[LLM] Calling ${model} (${mode} mode, max_tokens=${tokens})...`);
  const startTime = Date.now();

  const system =
    systemPrompt && systemPrompt.length >= CACHE_THRESHOLD_CHARS
      ? [
          {
            type: "text" as const,
            text: systemPrompt,
            cache_control: { type: "ephemeral" as const },
          },
        ]
      : systemPrompt;

  const message = await pRetry(
    async () => {
      try {
        return await anthropic.messages.create({
          model,
          max_tokens: tokens,
          ...(system ? { system } : {}),
          messages: [{ role: "user", content: prompt }],
        });
      } catch (err) {
        if (isRetryable(err)) throw err;
        throw new AbortError(err instanceof Error ? err : String(err));
      }
    },
    {
      retries: 4,
      minTimeout: 2000,
      factor: 2,
      onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
        console.warn(
          `[LLM] Attempt ${attemptNumber} failed (${retriesLeft} retries left): ${error.message}`
        );
      },
    }
  );

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const duration = Date.now() - startTime;

  const usage = message.usage;
  const cacheRead = (usage as any).cache_read_input_tokens ?? 0;
  const cacheWrite = (usage as any).cache_creation_input_tokens ?? 0;
  totals.calls += 1;
  totals.inputTokens += usage.input_tokens + cacheRead + cacheWrite;
  totals.outputTokens += usage.output_tokens;
  totals.cacheReadTokens += cacheRead;

  console.log(
    `[LLM] Response in ${duration}ms — in=${usage.input_tokens} out=${usage.output_tokens}` +
      (cacheRead || cacheWrite
        ? ` cache_read=${cacheRead} cache_write=${cacheWrite}`
        : "") +
      ` | session totals: ${totals.calls} calls, ${totals.inputTokens} in, ${totals.outputTokens} out (${totals.cacheReadTokens} cached)`
  );

  return text;
}
