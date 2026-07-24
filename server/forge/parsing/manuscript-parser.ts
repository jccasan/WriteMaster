import * as fs from "fs/promises";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function cleanMammothMarkdown(md: string): string {
  let text = md;
  text = text.replace(/<a\s+id="[^"]*"><\/a>/g, "");
  // Drop images. Mammoth inlines them as base64 data URIs (`![](data:...)`),
  // which are useless as manuscript prose and can bloat a single chapter into
  // megabytes of gibberish. Strip the whole image construct.
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  text = text.replace(/\\([.\-!@#$%^&*()_+=\[\]{};:'",<>?/|`~])/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");
  text = text.replace(/^(#{1,6})\s+\s*/gm, "$1 ");
  text = text.replace(/[ \t]+$/gm, "");
  // Collapse the blank runs left behind by removed images.
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

/**
 * Convert a .docx buffer to clean manuscript text. Images are suppressed at
 * the source (mammoth otherwise embeds them as base64 data URIs) and any
 * residual image markdown is stripped by cleanMammothMarkdown.
 */
export async function docxBufferToText(buffer: Buffer): Promise<string> {
  const mammoth: any = (await import("mammoth")).default;
  const result = await mammoth.convertToMarkdown(
    { buffer },
    { convertImage: mammoth.images.imgElement(() => ({ src: "" })) },
  );
  return cleanMammothMarkdown(result.value);
}

export async function extractText(filePath: string, mimeType: string): Promise<string> {
  if (mimeType === "text/plain" || filePath.endsWith(".txt") || filePath.endsWith(".md")) {
    return fs.readFile(filePath, "utf-8");
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || filePath.endsWith(".docx")) {
    try {
      const buffer = await fs.readFile(filePath);
      return await docxBufferToText(buffer);
    } catch (err: any) {
      throw new Error(`Failed to parse DOCX: ${err.message}`);
    }
  }

  if (mimeType === "application/pdf" || filePath.endsWith(".pdf")) {
    try {
      const { stdout } = await execFileAsync("pdftotext", ["-layout", filePath, "-"]);
      const text = stdout.trim();
      if (!text) throw new Error("pdftotext returned empty output — PDF may be scanned/image-only");
      return text;
    } catch (err: any) {
      throw new Error(`Failed to extract PDF text: ${err.message}`);
    }
  }

  return fs.readFile(filePath, "utf-8");
}

export function extractTextFromPasted(text: string): string {
  return text.trim();
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}
