export interface ChunkDefinition {
  chunkIndex: number;
  startChapter: number;
  endChapter: number;
  chapterNumbers: number[];
}

export function createChunks(totalChapters: number, chunkSize: number = 8): ChunkDefinition[] {
  if (totalChapters <= 0) return [];

  const effectiveChunkSize = Math.max(4, Math.min(12, chunkSize));
  const chunks: ChunkDefinition[] = [];
  let currentStart = 1;
  let chunkIndex = 0;

  while (currentStart <= totalChapters) {
    const remaining = totalChapters - currentStart + 1;

    let size: number;
    if (remaining <= effectiveChunkSize + Math.floor(effectiveChunkSize / 2)) {
      size = Math.min(remaining, effectiveChunkSize + Math.floor(effectiveChunkSize / 2));
    } else {
      size = effectiveChunkSize;
    }

    const end = currentStart + size - 1;
    const chapterNumbers: number[] = [];
    for (let i = currentStart; i <= end; i++) {
      chapterNumbers.push(i);
    }

    chunks.push({
      chunkIndex,
      startChapter: currentStart,
      endChapter: end,
      chapterNumbers,
    });

    currentStart = end + 1;
    chunkIndex++;
  }

  return chunks;
}
