export interface TextChunk {
  index: number;
  content: string;
}

/**
 * Split text into overlapping chunks sized for embedding.
 * Defaults target ~1200 characters with 15% overlap.
 */
export function chunkText(
  text: string,
  opts: { maxChars?: number; overlapRatio?: number } = {},
): TextChunk[] {
  const maxChars = opts.maxChars ?? 1200;
  const overlapRatio = Math.min(Math.max(opts.overlapRatio ?? 0.15, 0), 0.5);
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;
  while (start < clean.length) {
    const end = Math.min(start + maxChars, clean.length);
    const slice = clean.slice(start, end);
    chunks.push({ index, content: slice });
    index += 1;
    // step forward with overlap
    if (end >= clean.length) break;
    const step = Math.floor(maxChars * (1 - overlapRatio));
    start += Math.max(step, 1);
  }
  return chunks;
}


