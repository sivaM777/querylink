import { embeddingService } from "./embedding";
import { vectorSearch } from "./vector-search";
import { getDatabase } from "../database/database";
import { summarizer } from "./summarizer";

interface Suggestion {
  system: "JIRA" | "CONFLUENCE" | "GITHUB" | "SN_KB" | string;
  title: string;
  id: string;
  snippet?: string;
  link: string;
  icon?: string;
  actions?: string[];
  score?: number;
  metadata?: any;
}

export class SemanticSearchService {
  private getDb() {
    const db = getDatabase();
    if (!db) throw new Error("Database not available");
    return db;
  }

  async ensureIndexed(solutionId: string): Promise<void> {
    const row = this.getDb().prepare(`SELECT content FROM solutions WHERE id = ?`).get(solutionId) as { content?: string } | undefined;
    if (!row || !row.content) return;

    const chunks = await import("./chunker").then((m) => m.chunkText(row.content!));
    const embeddings = await embeddingService.embed(chunks.map((c) => c.content));
    chunks.forEach((c, i) => vectorSearch.indexChunk(solutionId, c.index, c.content, embeddings[i]));
  }

  async indexAll(): Promise<void> {
    const ids = this.getDb().prepare(`SELECT id FROM solutions WHERE sync_status = 'active'`).all() as { id: string }[];
    for (const { id } of ids) {
      await this.ensureIndexed(id);
    }
  }

  async suggestFromIncident(queryText: string, limit: number = 5): Promise<{ suggestions: Suggestion[]; total_found: number }>{
    const [embedding] = await embeddingService.embed([queryText]);
    const matches = vectorSearch.search(embedding, 60);
    if (matches.length === 0) {
      // Fallback: simple keyword SQL search when vectors are not ready
      const tokens = queryText.split(/[^a-z0-9]+/i).filter((t) => t.length > 2);
      const q = tokens.join(" ");
      const rows = this.db.prepare(
        `SELECT id, system, title, snippet, external_url, updated_at, tags, description
         FROM solutions
         WHERE (title LIKE ? OR description LIKE ? OR keywords LIKE ?)
         AND sync_status = 'active'
         ORDER BY updated_at DESC LIMIT ?`
      ).all(`%${q}%`, `%${q}%`, `%${q}%`, limit) as any[];
      const suggestions: Suggestion[] = rows.map((row) => ({
        system: row.system,
        title: row.title,
        id: row.id,
        snippet: row.snippet,
        link: `/solution/${row.id}`,
        score: 0.4,
        metadata: { updated_at: row.updated_at, tags: row.tags, external_url: row.external_url },
      }));
      return { suggestions, total_found: suggestions.length };
    }

    // Collect best chunk per solution
    const bestBySolution = new Map<string, typeof matches[number]>();
    for (const m of matches) {
      const prev = bestBySolution.get(m.solution_id);
      if (!prev || m.score > prev.score) bestBySolution.set(m.solution_id, m);
    }

    const solutionIds = Array.from(bestBySolution.keys());
    const rows = this.db.prepare(
      `SELECT id, system, title, snippet, external_url, updated_at, tags, description FROM solutions WHERE id IN (${solutionIds.map(() => '?').join(',')})`
    ).all(...solutionIds) as any[];

    // Merge and summarize
    const suggestions: Suggestion[] = [];
    const qTokens = queryText.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    for (const row of rows) {
      const best = bestBySolution.get(row.id)!;
      const summary = await summarizer.summarize(queryText, best.content);
      // keyword overlap boost and thresholding
      const hay = `${row.title} ${row.snippet || ''} ${row.description || ''}`.toLowerCase();
      const hits = qTokens.reduce((n, t) => n + (hay.includes(t) ? 1 : 0), 0);
      const boosted = (best.score || 0) + Math.min(hits * 0.02, 0.2);
      if (boosted < this.minRelevanceThreshold()) continue;

      suggestions.push({
        system: row.system,
        title: row.title,
        id: row.id,
        snippet: summary || row.snippet,
        // route to internal details page; include external in metadata
        link: `/solution/${row.id}`,
        score: boosted,
        metadata: { updated_at: row.updated_at, tags: row.tags, external_url: row.external_url }
      });
    }
    suggestions.sort((a, b) => (b.score || 0) - (a.score || 0));
    return { suggestions: suggestions.slice(0, limit), total_found: suggestions.length };
  }

  private minRelevanceThreshold(): number {
    // Higher if using OpenAI embeddings; lower for hash fallback
    const isFallback = !process.env.OPENAI_API_KEY;
    return isFallback ? 0.25 : 0.6;
  }
}

export const semanticSearch = new SemanticSearchService();
