import { getDatabase } from "../database/database";
import { embeddingService } from "./embedding";
import { vectorSearch } from "./vector-search";
import { chunkText } from "./chunker";

function toJsonVector(vec: number[]): string { return JSON.stringify(vec); }
function fromJsonVector(s?: string | null): number[] { return s ? JSON.parse(s) : []; }

export class ExpressSqliteRAGService {
  private getDb() {
    const db = getDatabase();
    if (!db) throw new Error("Database not available");
    return db;
  }

  upsertRecord(systemName: string, externalId: string, title: string, body: string, url: string, tags: string[] = []): number {
    let sys = this.db.prepare(`SELECT system_id FROM systems WHERE name = ?`).get(systemName) as any;
    if (!sys) {
      this.db.prepare(`INSERT INTO systems(name, base_url) VALUES(?, ?)`).run(systemName, null);
      sys = this.db.prepare(`SELECT system_id FROM systems WHERE name = ?`).get(systemName) as any;
    }
    const insert = this.db.prepare(`INSERT OR REPLACE INTO records(system_id, external_id, title, body, tags, url, status, source_type, created_at, updated_at)
      VALUES(?, ?, ?, ?, ?, ?, 'active', 'doc', COALESCE((SELECT created_at FROM records WHERE system_id=? AND external_id=?), CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)`);
    insert.run(sys.system_id, externalId, title, body, JSON.stringify(tags), url, sys.system_id, externalId);
    const row = this.db.prepare(`SELECT record_id FROM records WHERE system_id=? AND external_id=?`).get(sys.system_id, externalId) as any;
    return row.record_id as number;
  }

  async indexRecord(recordId: number, body: string): Promise<void> {
    const chunks = chunkText(body);
    const embs = await embeddingService.embed(chunks.map((c) => c.content));
    for (let i = 0; i < chunks.length; i++) {
      const id = `record-${recordId}::${i}`;
      vectorSearch.indexChunk(id, i, chunks[i].content, embs[i]);
    }
    // also store a single pooled embedding row (optional)
    const pooled = embs[0] || [];
    this.db.prepare(`INSERT INTO record_embeddings(record_id, vector, model) VALUES(?, ?, ?)`).run(recordId, toJsonVector(pooled), process.env.EMBEDDING_MODEL || 'dev-hash');
  }

  async searchIncident(text: string, limit: number = 10, systemFilter?: string[]) {
    const [qEmb] = await embeddingService.embed([text]);
    const matches = vectorSearch.search(qEmb, 80);
    const best: Record<string, number> = {};
    for (const m of matches) {
      const [kind, recId] = m.solution_id.split('::')[0].split('record-');
      const id = parseInt(recId || '0', 10);
      if (!id) continue;
      if (!best[id] || m.score > best[id]) best[id] = m.score;
    }
    const ids = Object.keys(best).map((v) => parseInt(v, 10));
    if (ids.length === 0) return [];
    let sql = `SELECT r.record_id, s.name as system, r.title, r.body, r.url, r.tags FROM records r JOIN systems s ON r.system_id=s.system_id WHERE r.record_id IN (${ids.map(()=>'?').join(',')})`;
    const params: any[] = [...ids];
    if (systemFilter && systemFilter.length) {
      sql += ` AND s.name IN (${systemFilter.map(()=>'?').join(',')})`;
      params.push(...systemFilter);
    }
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows
      .map((r) => ({ id: r.record_id, system: r.system, title: r.title, snippet: (r.body||'').slice(0, 250)+"...", url: r.url, tags: r.tags ? JSON.parse(r.tags) : [], score: best[r.record_id] || 0 }))
      .sort((a,b)=>b.score-a.score)
      .slice(0, limit);
  }
}

export const expressSqliteRag = new ExpressSqliteRAGService();
