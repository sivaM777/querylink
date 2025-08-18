import { getDatabase } from "../database/database";

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}

export interface VectorMatch {
  solution_id: string;
  chunk_id: string;
  score: number;
  content: string;
}

export class VectorSearchService {
  private db = getDatabase();

  indexChunk(solutionId: string, chunkIndex: number, content: string, embedding: number[]): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO solution_chunks (id, solution_id, chunk_index, content, embedding)
       VALUES (?, ?, ?, ?, ?)`
    );
    const id = `${solutionId}::${chunkIndex}`;
    stmt.run(id, solutionId, chunkIndex, content, JSON.stringify(embedding));
  }

  search(queryEmbedding: number[], limit: number = 20): VectorMatch[] {
    const rows = this.db.prepare(
      `SELECT id as chunk_id, solution_id, content, embedding FROM solution_chunks`
    ).all() as { chunk_id: string; solution_id: string; content: string; embedding: string }[];

    const matches: VectorMatch[] = [];
    for (const r of rows) {
      if (!r.embedding) continue;
      let emb: number[];
      try {
        emb = JSON.parse(r.embedding);
      } catch {
        continue;
      }
      const score = cosineSimilarity(queryEmbedding, emb);
      matches.push({ solution_id: r.solution_id, chunk_id: r.chunk_id, score, content: r.content });
    }
    return matches.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

export const vectorSearch = new VectorSearchService();


