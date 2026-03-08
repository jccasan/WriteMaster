export interface DetectedChapter {
  number: number;
  title: string;
  startOffset: number;
  endOffset: number;
  rawText: string;
  wordCount: number;
}

const CHAPTER_PATTERNS: { pattern: RegExp; numGroup: number; titleGroup: number | null }[] = [
  { pattern: /^(?:chapter|chap\.?)\s+(\d+)\s*[:\-\u2014.]?\s*(.*)/i, numGroup: 1, titleGroup: 2 },
  { pattern: /^(?:chapter|chap\.?)\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|twenty[\s-]?one|twenty[\s-]?two|twenty[\s-]?three|twenty[\s-]?four|twenty[\s-]?five|twenty[\s-]?six|twenty[\s-]?seven|twenty[\s-]?eight|twenty[\s-]?nine|thirty|thirty[\s-]?one|thirty[\s-]?two|forty|fifty)\s*[:\-\u2014.]?\s*(.*)/i, numGroup: 1, titleGroup: 2 },
  { pattern: /^(?:chapter|chap\.?)\s+(I{1,3}|IV|V|VI{0,3}|IX|X{0,3}I{0,3}|XI{0,3}|XIV|XV|XVI{0,3}|XIX|XX{0,3}I{0,3}|XXI{0,3}|XXIV|XXV|XXVI{0,3}|XXIX|XXX{0,2}I{0,3})\s*[:\-\u2014.]?\s*(.*)/i, numGroup: 1, titleGroup: 2 },
  { pattern: /^ch\s+(\d+)\s*[\-\u2014\u2013:.]\s*(.*)/i, numGroup: 1, titleGroup: 2 },
  { pattern: /^ch\s+(\d+)\s*$/i, numGroup: 1, titleGroup: null },
  { pattern: /^chapter:\s*(.*)/i, numGroup: -1, titleGroup: 1 },
  { pattern: /^(\d{1,3})\s*[:\-\u2014.]\s+(.+)/, numGroup: 1, titleGroup: 2 },
  { pattern: /^(\d{1,3})\s*$/, numGroup: 1, titleGroup: null },
];

const STRUCTURAL_PATTERNS = [
  /^prologue\s*[:\-\u2014.]?\s*(.*)/i,
  /^epilogue\s*[:\-\u2014.]?\s*(.*)/i,
  /^part\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|I{1,3}|IV|V|VI{0,3})\s*[:\-\u2014.]?\s*(.*)/i,
  /^interlude\s*[:\-\u2014.]?\s*(.*)/i,
  /^afterword\s*[:\-\u2014.]?\s*(.*)/i,
];

const WORD_TO_NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20,
  "twenty-one": 21, "twenty one": 21, "twenty-two": 22, "twenty two": 22,
  "twenty-three": 23, "twenty three": 23, "twenty-four": 24, "twenty four": 24,
  "twenty-five": 25, "twenty five": 25, "twenty-six": 26, "twenty six": 26,
  "twenty-seven": 27, "twenty seven": 27, "twenty-eight": 28, "twenty eight": 28,
  "twenty-nine": 29, "twenty nine": 29, thirty: 30, "thirty-one": 31, "thirty one": 31,
  "thirty-two": 32, "thirty two": 32, forty: 40, fifty: 50,
};

const ROMAN_TO_NUM: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
  XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15, XVI: 16, XVII: 17, XVIII: 18, XIX: 19, XX: 20,
  XXI: 21, XXII: 22, XXIII: 23, XXIV: 24, XXV: 25, XXVI: 26, XXVII: 27, XXVIII: 28, XXIX: 29, XXX: 30,
  XXXI: 31, XXXII: 32,
};

function parseChapterNumber(raw: string): number | null {
  const trimmed = raw.trim().toLowerCase().replace(/\s+/g, " ");
  const num = parseInt(trimmed);
  if (!isNaN(num) && num > 0 && num <= 200) return num;
  if (WORD_TO_NUM[trimmed]) return WORD_TO_NUM[trimmed];
  const upper = trimmed.toUpperCase();
  if (ROMAN_TO_NUM[upper]) return ROMAN_TO_NUM[upper];
  return null;
}

interface Boundary {
  lineIndex: number;
  number: number;
  title: string;
  offset: number;
}

function isBlank(line: string): boolean {
  return line.trim().length === 0;
}

function looksLikeDialogue(line: string): boolean {
  const t = line.trim();
  if (t.startsWith('"') || t.startsWith("'")) return true;
  if (/^[\u201C\u201D\u2018\u2019]/.test(t)) return true;
  if (t.includes('said') || t.includes('asked') || t.includes('replied')) return true;
  if ((t.match(/"/g) || []).length >= 2) return true;
  if ((t.match(/\u201C/g) || []).length >= 1 && (t.match(/\u201D/g) || []).length >= 1) return true;
  return false;
}

function looksLikeLocationSubheading(line: string): boolean {
  const t = line.trim();
  if (t.length < 3 || t.length > 100) return false;
  if (looksLikeDialogue(t)) return false;
  if (/\d{1,2}:\d{2}/.test(t)) return true;
  if (/\b(AM|PM|am|pm)\b/.test(t)) return true;
  if (/,\s*[A-Z]{2}\b/.test(t)) return true;
  if (/\b\d{4}\b/.test(t)) return true;
  if (/\b(Hotel|Airport|Office|Headquarters|Home|Manor|Street|Road|Avenue|Base|Facility|Room|Apartment|Building)\b/i.test(t)) return true;
  if (/\b(Earlier|Later|Days|Weeks|Months|Hours|Minutes)\b/i.test(t)) return true;
  return false;
}

function looksLikeSectionTitle(line: string): boolean {
  const t = line.trim();
  if (t.length < 2 || t.length > 60) return false;
  if (looksLikeDialogue(t)) return false;
  if (t.endsWith(".") || t.endsWith(",") || t.endsWith(";") || t.endsWith(":")) return false;
  if (/^\d{1,2}:\d{2}/.test(t)) return false;
  if (/^\d{2}:\d{2}:\d{2}/.test(t)) return false;
  const wordCount = t.split(/\s+/).length;
  if (wordCount > 8) return false;
  if (/^[A-Z]/.test(t)) return true;
  return false;
}

export function detectChapters(fullText: string): DetectedChapter[] {
  const lines = fullText.split("\n");
  const boundaries: Boundary[] = [];
  let autoNumber = 0;

  let charOffset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length > 0 && line.length < 120) {
      let matched = false;

      for (const { pattern, numGroup, titleGroup } of CHAPTER_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          let chapterNum: number | null = null;
          let title = "";

          if (numGroup === -1) {
            autoNumber++;
            chapterNum = autoNumber;
            title = titleGroup !== null ? (match[titleGroup] || "").trim() : "";
          } else {
            const rawNum = match[numGroup];
            chapterNum = parseChapterNumber(rawNum);
            title = titleGroup !== null ? (match[titleGroup] || "").trim() : "";
          }

          if (chapterNum !== null) {
            autoNumber = chapterNum;
            boundaries.push({
              lineIndex: i,
              number: chapterNum,
              title: title || `Chapter ${chapterNum}`,
              offset: charOffset,
            });
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        for (const pattern of STRUCTURAL_PATTERNS) {
          const match = line.match(pattern);
          if (match) {
            autoNumber++;
            const subtitle = match[match.length - 1]?.trim() || "";
            const label = line.split(/[\s:\-\u2014.]/)[0];
            boundaries.push({
              lineIndex: i,
              number: autoNumber,
              title: subtitle || label,
              offset: charOffset,
            });
            break;
          }
        }
      }
    }
    charOffset += lines[i].length + 1;
  }

  if (boundaries.length >= 5) {
    return buildChaptersFromBoundaries(boundaries, fullText);
  }

  const titleBoundaries = detectTitleHeadings(lines, fullText);
  if (titleBoundaries.length >= 3) {
    return buildChaptersFromBoundaries(titleBoundaries, fullText);
  }

  if (boundaries.length >= 2) {
    return buildChaptersFromBoundaries(boundaries, fullText);
  }

  return [];
}

function detectTitleHeadings(lines: string[], fullText: string): Boundary[] {
  const candidates: { lineIndex: number; title: string; offset: number }[] = [];

  let charOffset = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const prevBlank = i === 0 || isBlank(lines[i - 1]);
    const nextLine = i < lines.length - 1 ? lines[i + 1] : "";
    const nextNextLine = i < lines.length - 2 ? lines[i + 2] : "";
    const nextBlank = isBlank(nextLine);

    if (prevBlank && looksLikeSectionTitle(trimmed)) {
      let isSectionHead = false;

      if (nextBlank && looksLikeLocationSubheading(nextNextLine)) {
        isSectionHead = true;
      }

      if (!nextBlank && looksLikeLocationSubheading(nextLine) &&
          (i + 2 >= lines.length || isBlank(nextNextLine))) {
        isSectionHead = true;
      }

      if (nextBlank && !looksLikeLocationSubheading(nextNextLine)) {
        if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:and|the|of|at|in|on|to|for|&|\/)\s+[A-Z]?[a-z]+)*$/.test(trimmed)) {
          if (trimmed.split(/\s+/).length >= 2 && trimmed.split(/\s+/).length <= 6) {
            isSectionHead = true;
          }
        }
      }

      if (isSectionHead) {
        candidates.push({ lineIndex: i, title: trimmed, offset: charOffset });
      }
    }
    charOffset += lines[i].length + 1;
  }

  if (candidates.length < 3) return [];

  const gaps: number[] = [];
  for (let i = 1; i < candidates.length; i++) {
    gaps.push(candidates[i].offset - candidates[i - 1].offset);
  }
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)];
  const minGap = Math.max(500, medianGap * 0.1);

  const filtered = [candidates[0]];
  for (let i = 1; i < candidates.length; i++) {
    const gap = candidates[i].offset - filtered[filtered.length - 1].offset;
    if (gap >= minGap) {
      filtered.push(candidates[i]);
    }
  }

  if (filtered.length < 3) return [];

  const boundaries: Boundary[] = [];
  for (let i = 0; i < filtered.length; i++) {
    boundaries.push({
      lineIndex: filtered[i].lineIndex,
      number: i + 1,
      title: filtered[i].title,
      offset: filtered[i].offset,
    });
  }
  return boundaries;
}

function buildChaptersFromBoundaries(boundaries: Boundary[], fullText: string): DetectedChapter[] {
  const chapters: DetectedChapter[] = [];
  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i].offset;
    const end = i < boundaries.length - 1 ? boundaries[i + 1].offset : fullText.length;
    const rawText = fullText.slice(start, end).trim();
    const wordCount = rawText.split(/\s+/).filter(w => w.length > 0).length;
    if (i === boundaries.length - 1 && wordCount < 200) continue;
    chapters.push({
      number: boundaries[i].number,
      title: boundaries[i].title,
      startOffset: start,
      endOffset: end,
      rawText,
      wordCount,
    });
  }
  return chapters;
}

export function createSegments(fullText: string, segmentCount: number = 6): DetectedChapter[] {
  const words = fullText.split(/\s+/);
  const wordsPerSegment = Math.ceil(words.length / segmentCount);
  const segments: DetectedChapter[] = [];

  for (let i = 0; i < segmentCount; i++) {
    const startWord = i * wordsPerSegment;
    const endWord = Math.min((i + 1) * wordsPerSegment, words.length);
    if (startWord >= words.length) break;

    const rawText = words.slice(startWord, endWord).join(" ");
    segments.push({
      number: i + 1,
      title: `Segment ${i + 1}`,
      startOffset: 0,
      endOffset: 0,
      rawText,
      wordCount: endWord - startWord,
    });
  }

  return segments;
}
