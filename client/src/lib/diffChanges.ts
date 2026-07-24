import { diffWordsWithSpace } from "diff";

export interface ChangeBlock {
  id: number;
  type: "same" | "change";
  text?: string;      // for "same"
  removed?: string;   // for "change" — text as it was in the original
  added?: string;     // for "change" — text as the editor rewrote it
}

/**
 * Word-level diff between the original and edited chapter text, with
 * adjacent removed/added parts merged into single change blocks so each
 * flagged edit (a replaced phrase, an inserted clause, a cut sentence)
 * can be accepted or declined as one unit.
 */
export function computeChangeBlocks(original: string, edited: string): ChangeBlock[] {
  const parts = diffWordsWithSpace(original, edited);
  const blocks: ChangeBlock[] = [];
  let id = 0;
  let i = 0;
  while (i < parts.length) {
    const part = parts[i];
    if (!part.added && !part.removed) {
      blocks.push({ id: id++, type: "same", text: part.value });
      i++;
      continue;
    }
    let removed = "";
    let added = "";
    while (i < parts.length && (parts[i].added || parts[i].removed)) {
      if (parts[i].removed) removed += parts[i].value;
      if (parts[i].added) added += parts[i].value;
      i++;
    }
    blocks.push({ id: id++, type: "change", removed, added });
  }
  return blocks;
}

/** Resolve final text from change blocks given which changes are accepted (declined ones revert to the original wording). */
export function resolveText(blocks: ChangeBlock[], accepted: Record<number, boolean>): string {
  return blocks
    .map(b => {
      if (b.type === "same") return b.text ?? "";
      const isAccepted = accepted[b.id] ?? true;
      return isAccepted ? (b.added ?? "") : (b.removed ?? "");
    })
    .join("");
}
