import * as fs from "fs/promises";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function cleanMammothMarkdown(md: string): string {
  let text = md;
  text = text.replace(/<a\s+id="[^"]*"><\/a>/g, "");
  text = text.replace(/\\([.\-!@#$%^&*()_+=\[\]{};:'",<>?/|`~])/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");
  text = text.replace(/^(#{1,6})\s+\s*/gm, "$1 ");
  return text.trim();
}

export async function extractText(filePath: string, mimeType: string): Promise<string> {
  if (mimeType === "text/plain" || filePath.endsWith(".txt") || filePath.endsWith(".md")) {
    return fs.readFile(filePath, "utf-8");
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || filePath.endsWith(".docx")) {
    try {
      const mammoth = await import("mammoth");
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.default.convertToMarkdown({ buffer });
      return cleanMammothMarkdown(result.value);
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
