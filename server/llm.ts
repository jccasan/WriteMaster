import { createClient } from "@base44/sdk";
import pRetry, { AbortError } from "p-retry";

// AI is powered by Base44's built-in InvokeLLM integration, which bills
// against the workspace's Base44 integration credits — no external API key
// required. Requires BASE44_APP_ID (the Base44 app id from the editor URL).
//
// Model mapping (Base44 model ids):
//   cheap    -> gpt_5_mini        (fast/low-cost, replaces claude-haiku-4-5)
//   powerful -> claude_sonnet_4_6 (replaces claude-sonnet-4-6)

const CHEAP_MODEL = "gpt_5_mini";
const POWERFUL_MODEL = "claude_sonnet_4_6";

// Running totals for the process lifetime, logged with each call so long
// pipeline runs show cumulative activity.
const totals = {
  calls: 0,
};

let _client: ReturnType<typeof createClient> | null = null;

function getClient(): ReturnType<typeof createClient> {
  if (_client) return _client;
  const appId = process.env.BASE44_APP_ID;
  if (!appId) {
    throw new Error(
      "BASE44_APP_ID is not set. AI features use Base44's built-in InvokeLLM " +
        "integration and need the Base44 app id (found in the Base44 editor URL)."
    );
  }
  _client = createClient({ appId });
  return _client;
}

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status ?? 0;
  // Rate limits, overloaded, and server errors are transient.
  return status === 429 || status === 529 || status >= 500;
}

/**
 * Call the LLM through Base44's InvokeLLM integration (uses Base44 credits).
 * The optional system prompt is folded into the single prompt the integration
 * accepts. `maxTokens` is accepted for call-site compatibility but not used —
 * the integration manages its own output length.
 */
export async function callLLM(
  prompt: string,
  mode: "cheap" | "powerful",
  systemPrompt?: string,
  _maxTokens?: number
): Promise<string> {
  const model = mode === "cheap" ? CHEAP_MODEL : POWERFUL_MODEL;
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  console.log(`[LLM] Calling Base44 InvokeLLM ${model} (${mode} mode)...`);
  const startTime = Date.now();

  const result = await pRetry(
    async () => {
      try {
        return await getClient().integrations.Core.InvokeLLM({
          prompt: fullPrompt,
          model,
        });
      } catch (err) {
        if (isRetryable(err)) throw err;
        throw new AbortError(err instanceof Error ? err : String(err));
      }
    },
    {
      retries: 3,
      minTimeout: 2000,
      factor: 2,
      onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
        console.warn(
          `[LLM] Attempt ${attemptNumber} failed (${retriesLeft} retries left): ${error.message}`
        );
      },
    }
  );

  const text = typeof result === "string" ? result : JSON.stringify(result);
  totals.calls += 1;
  console.log(
    `[LLM] Response in ${Date.now() - startTime}ms | session totals: ${totals.calls} calls`
  );

  return text;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Multi-turn chat helper. InvokeLLM takes a single prompt, so the conversation
 * history is flattened into one prompt and the model is asked to reply to the
 * most recent user message.
 */
export async function callChatLLM(
  systemPrompt: string,
  messages: ChatMessage[],
  mode: "cheap" | "powerful"
): Promise<string> {
  const conversation = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");
  const prompt =
    `${systemPrompt}\n\n---\n\nConversation so far:\n${conversation}\n\n` +
    `Respond as the assistant to the most recent user message.`;
  return callLLM(prompt, mode);
}
