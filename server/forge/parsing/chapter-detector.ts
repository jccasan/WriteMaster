export interface DetectedChapter {
  number: number;
  title: string;
  startOffset: number;
  endOffset: number;
  rawText: string;
  wordCount: number;
}

const CHAPTER_PATTERNS = [
  /^(?:chapter|chap\.?)\s+(\d+)\s*[:\-—.]?\s*(.*)/i,
  /^(?:chapter|chap\.?)\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|twenty[\s-]?one|twenty[\s-]?two|twenty[\s-]?three|twenty[\s-]?four|twenty[\s-]?five|twenty[\s-]?six|twenty[\s-]?seven|twenty[\s-]?eight|twenty[\s-]?nine|thirty|thirty[\s-]?one|thirty[\s-]?two|forty|fifty)\s*[:\-—.]?\s*(.*)/i,
  /^(?:chapter|chap\.?)\s+(I{1,3}|IV|V|VI{0,3}|IX|X{0,3}I{0,3}|XI{0,3}|XIV|XV|XVI{0,3}|XIX|XX{0,3}I{0,3}|XXI{0,3}|XXIV|XXV|XXVI{0,3}|XXIX|XXX{0,2}I{0,3})\s*[:\-—.]?\s*(.*)/i,
  /^(\d{1,3})\s*[:\-—.]\s+(.+)/,
  /^(\d{1,3})\s*$/,
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

export function detectChapters(fullText: string): DetectedChapter[] {
  const lines = fullText.split("\n");
  const boundaries: { lineIndex: number; number: number; title: string; offset: number }[] = [];

  let charOffset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length > 0 && line.length < 120) {
      for (const pattern of CHAPTER_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          const rawNum = match[1];
          const subtitle = (match[2] || "").trim();
          const chapterNum = parseChapterNumber(rawNum);
          if (chapterNum !== null) {
            boundaries.push({
              lineIndex: i,
              number: chapterNum,
              title: subtitle || `Chapter ${chapterNum}`,
              offset: charOffset,
            });
            break;
          }
        }
      }
    }
    charOffset += lines[i].length + 1;
  }

  if (boundaries.length === 0) {
    return [];
  }

  const chapters: DetectedChapter[] = [];
  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i].offset;
    const end = i < boundaries.length - 1 ? boundaries[i + 1].offset : fullText.length;
    const rawText = fullText.slice(start, end).trim();
    chapters.push({
      number: boundaries[i].number,
      title: boundaries[i].title,
      startOffset: start,
      endOffset: end,
      rawText,
      wordCount: rawText.split(/\s+/).filter(w => w.length > 0).length,
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
