export function extractJSON<T>(text: string, fallback: T): T {
  const cleaned = text.trim();

  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {}
  }

  try {
    return JSON.parse(cleaned);
  } catch {}

  const braceStart = cleaned.indexOf("{");
  const braceEnd = cleaned.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    try {
      return JSON.parse(cleaned.slice(braceStart, braceEnd + 1));
    } catch {}
  }

  const bracketStart = cleaned.indexOf("[");
  const bracketEnd = cleaned.lastIndexOf("]");
  if (bracketStart !== -1 && bracketEnd > bracketStart) {
    try {
      return JSON.parse(cleaned.slice(bracketStart, bracketEnd + 1));
    } catch {}
  }

  let repaired = cleaned;
  if (fenceMatch) repaired = fenceMatch[1].trim();
  repaired = repaired.replace(/,\s*([}\]])/g, "$1");
  repaired = repaired.replace(/\n/g, " ");
  try {
    return JSON.parse(repaired);
  } catch {}

  console.error("[FORGE] Failed to parse JSON from LLM response. First 500 chars:", cleaned.slice(0, 500));
  return fallback;
}
