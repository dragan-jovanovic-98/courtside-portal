// Anthropic client + structured-output helper for Phase C post-call analysis.
//
// Default model: claude-haiku-4-5. Plenty for classification + structured
// extraction over short transcripts — Sonnet is overkill for this task.
// Per-call cost: ~$0.006 vs Sonnet's ~$0.018. Per-agent override available
// via portal_agents.analysis_function_name (point at a heavier-model variant).

const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

export interface ClaudeUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface StructuredOutputCall<T> {
  system: string;
  user: string;
  /** JSON Schema describing the structured output. Claude is forced to call a tool whose input matches this schema. */
  schema: Record<string, unknown>;
  model?: string;
  /** Optional max output tokens. */
  maxTokens?: number;
}

export interface StructuredOutputResult<T> {
  data: T;
  usage: ClaudeUsage;
  model: string;
}

/**
 * Call Claude with a JSON-schema-enforced structured output.
 *
 * Pattern: define a single virtual "tool" whose `input_schema` matches the
 * desired output. Set `tool_choice` to force the model to invoke it. Claude
 * returns a single tool_use block whose `input` is the validated structured
 * output.
 */
export async function callClaudeWithStructuredOutput<T>({
  system,
  user,
  schema,
  model = DEFAULT_MODEL,
  maxTokens = 4096,
}: StructuredOutputCall<T>): Promise<StructuredOutputResult<T>> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set in edge function secrets.");
  }

  const body = {
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
    tools: [
      {
        name: "structured_output",
        description: "Return the structured analysis result.",
        input_schema: schema,
      },
    ],
    tool_choice: { type: "tool", name: "structured_output" },
  };

  const res = await fetch(`${ANTHROPIC_BASE_URL}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic ${res.status}: ${text}`);
  }

  const json = await res.json();
  const toolUse = (json.content ?? []).find(
    (block: { type?: string }) => block?.type === "tool_use",
  );
  if (!toolUse?.input) {
    throw new Error("Anthropic response did not contain a tool_use block.");
  }

  return {
    data: toolUse.input as T,
    usage: {
      input_tokens: json.usage?.input_tokens ?? 0,
      output_tokens: json.usage?.output_tokens ?? 0,
    },
    model: json.model ?? model,
  };
}

/**
 * Approximate Claude cost in cents based on model + token usage.
 * Pricing as of 2026-04:
 *   Haiku 4.5  : $1   input  / $5    output  per 1M tokens
 *   Sonnet 4.6 : $3   input  / $15   output  per 1M tokens
 *   Opus 4.7   : $15  input  / $75   output  per 1M tokens
 * Returns cost in cents (numeric, retain decimals).
 */
export function estimateClaudeCostCents(usage: ClaudeUsage, model: string = DEFAULT_MODEL): number {
  if (model.includes("haiku")) {
    return (usage.input_tokens * 1.0 + usage.output_tokens * 5.0) / 1_000_000 * 100;
  }
  if (model.includes("opus")) {
    return (usage.input_tokens * 15.0 + usage.output_tokens * 75.0) / 1_000_000 * 100;
  }
  // Sonnet (default) and other unrecognized models
  return (usage.input_tokens * 3.0 + usage.output_tokens * 15.0) / 1_000_000 * 100;
}
