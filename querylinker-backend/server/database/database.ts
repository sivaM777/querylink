
import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// SQLite database path
const dbPath = join(__dirname, "../../data/querylinker.db");

// SQLite database instance
let db: Database.Database;

export function initializeDatabase(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    console.log("✅ Connected to SQLite database:", dbPath);
  }
  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    db = initializeDatabase();
  }
  return db;
}

export function executeQuery(query: string, params: any[] = []): any {
  const database = getDatabase();
  try {
    if (query.trim().toLowerCase().startsWith('select')) {
      return { rows: database.prepare(query).all(...params) };
    } else {
      const result = database.prepare(query).run(...params);
      return { 
        rows: [], 
        rowCount: result.changes,
        insertId: result.lastInsertRowid 
      };
    }
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

export class PreparedStatement {
  private stmt: Database.Statement;

  constructor(query: string) {
    this.stmt = getDatabase().prepare(query);
  }

  run(...params: any[]) {
    return this.stmt.run(...params);
  }

  get(...params: any[]) {
    return this.stmt.get(...params);
  }

  all(...params: any[]) {
    return this.stmt.all(...params);
  }
}

export class DatabaseWrapper {
  prepare(query: string): PreparedStatement {
    return new PreparedStatement(query);
  }

  exec(query: string): void {
    getDatabase().exec(query);
  }
}

// Initialize database on module load
db = initializeDatabase();

// Export the database instance
export { db };

// Database Models and Operations

export interface CachedSuggestion {
  id?: number;
  incident_number?: string;
  keywords: string;
  keywords_hash: string;
  suggestions_json: string;
  search_time_ms?: number;
  total_found?: number;
  timestamp?: string;
  expires_at: string;
}

export interface UserInteraction {
  interaction_id?: number;
  user_id?: string;
  incident_number: string;
  suggestion_id: string;
  system: string;
  suggestion_title?: string;
  suggestion_link?: string;
  action_type?: "link" | "view" | "dismiss";
  timestamp?: string;
}

export class CacheModel {
  /**
   * Generate hash for keywords to enable fast lookups
   */
  static generateKeywordsHash(keywords: string): string {
    return crypto
      .createHash("sha256")
      .update(keywords.toLowerCase().trim())
      .digest("hex");
  }

  /**
   * Store cached suggestions
   */
  static async cacheSuggestions(
    data: Omit<CachedSuggestion, "id" | "timestamp">,
  ): Promise<number> {
    try {
      const stmt = getDatabase().prepare(`
        INSERT OR REPLACE INTO cached_suggestions
        (incident_number, keywords, keywords_hash, suggestions_json, search_time_ms, total_found, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        data.incident_number,
        data.keywords,
        data.keywords_hash,
        data.suggestions_json,
        data.search_time_ms,
        data.total_found,
        data.expires_at,
      );

      return result.lastInsertRowid as number;
    } catch (error) {
      console.error("[CacheModel] Error caching suggestions:", error);
      throw error;
    }
  }

  /**
   * Get cached suggestions by keywords hash
   */
  static async getCachedSuggestions(keywordsHash: string): Promise<CachedSuggestion | null> {
    try {
      const stmt = getDatabase().prepare(`
        SELECT * FROM cached_suggestions
        WHERE keywords_hash = ? AND expires_at > datetime('now')
        ORDER BY timestamp DESC
        LIMIT 1
      `);

      return stmt.get(keywordsHash) || null;
    } catch (error) {
      console.error("[CacheModel] Error getting cached suggestions:", error);
      return null;
    }
  }

  /**
   * Get cached suggestions by incident number
   */
  static async getCachedSuggestionsByIncident(
    incidentNumber: string,
  ): Promise<CachedSuggestion | null> {
    try {
      const stmt = getDatabase().prepare(`
        SELECT * FROM cached_suggestions
        WHERE incident_number = ? AND expires_at > datetime('now')
        ORDER BY timestamp DESC
        LIMIT 1
      `);

      return stmt.get(incidentNumber) || null;
    } catch (error) {
      console.error("[CacheModel] Error getting cached suggestions by incident:", error);
      return null;
    }
  }

  /**
   * Clean up expired cache entries
   */
  static async cleanupExpiredCache(): Promise<number> {
    try {
      const stmt = getDatabase().prepare(`
        DELETE FROM cached_suggestions
        WHERE expires_at < datetime('now')
      `);

      const result = stmt.run();
      return result.changes;
    } catch (error) {
      console.error("[CacheModel] Error cleaning up expired cache:", error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats() {
    try {
      const totalStmt = getDatabase().prepare("SELECT COUNT(*) as count FROM cached_suggestions");
      const validStmt = getDatabase().prepare(
        "SELECT COUNT(*) as count FROM cached_suggestions WHERE expires_at > datetime('now')"
      );
      const avgStmt = getDatabase().prepare(
        "SELECT AVG(search_time_ms) as avg_time FROM cached_suggestions WHERE search_time_ms IS NOT NULL"
      );

      const totalResult = totalStmt.get() as any;
      const validResult = validStmt.get() as any;
      const avgResult = avgStmt.get() as any;

      const totalCached = totalResult?.count || 0;
      const validCached = validResult?.count || 0;
      const avgSearchTime = avgResult?.avg_time || 0;

      return {
        total_cached: parseInt(totalCached),
        valid_cached: parseInt(validCached),
        expired_cached: parseInt(totalCached) - parseInt(validCached),
        avg_search_time_ms: Math.round(avgSearchTime),
      };
    } catch (error) {
      console.error("[CacheModel] Error getting cache stats:", error);
      return {
        total_cached: 0,
        valid_cached: 0,
        expired_cached: 0,
        avg_search_time_ms: 0,
      };
    }
  }
}

export class InteractionModel {
  /**
   * Record user interaction
   */
  static async recordInteraction(
    data: Omit<UserInteraction, "interaction_id" | "timestamp">,
  ): Promise<number> {
    try {
      const stmt = getDatabase().prepare(`
        INSERT INTO user_interactions
        (user_id, incident_number, suggestion_id, system, suggestion_title, suggestion_link, action_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        data.user_id,
        data.incident_number,
        data.suggestion_id,
        data.system,
        data.suggestion_title,
        data.suggestion_link,
        data.action_type || "link",
      );

      return result.lastInsertRowid as number;
    } catch (error) {
      console.error("[InteractionModel] Error recording interaction:", error);
      throw error;
    }
  }

  /**
   * Get interactions for an incident
   */
  static async getInteractionsByIncident(incidentNumber: string): Promise<UserInteraction[]> {
    try {
      const stmt = getDatabase().prepare(`
        SELECT * FROM user_interactions
        WHERE incident_number = ?
        ORDER BY timestamp DESC
      `);

      return stmt.all(incidentNumber);
    } catch (error) {
      console.error("[InteractionModel] Error getting interactions by incident:", error);
      return [];
    }
  }

  /**
   * Get interactions by user
   */
  static async getInteractionsByUser(
    userId: string,
    limit: number = 50,
  ): Promise<UserInteraction[]> {
    try {
      const stmt = getDatabase().prepare(`
        SELECT * FROM user_interactions
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `);

      return stmt.all(userId, limit);
    } catch (error) {
      console.error("[InteractionModel] Error getting interactions by user:", error);
      return [];
    }
  }

  /**
   * Get analytics data
   */
  static async getAnalytics(days: number = 30) {
    try {
      const stmt = getDatabase().prepare(`
        SELECT
          system,
          COUNT(*) as total_interactions,
          COUNT(DISTINCT incident_number) as unique_incidents,
          COUNT(DISTINCT user_id) as unique_users,
          DATE(timestamp) as interaction_date
        FROM user_interactions
        WHERE timestamp >= datetime('now', '-${days} days')
        AND action_type = 'link'
        GROUP BY system, DATE(timestamp)
        ORDER BY interaction_date DESC, total_interactions DESC
      `);

      return stmt.all();
    } catch (error) {
      console.error("[InteractionModel] Error getting analytics:", error);
      return [];
    }
  }

  /**
   * Get system popularity rankings
   */
  static async getSystemPopularity(days: number = 30) {
    try {
      const stmt = getDatabase().prepare(`
        SELECT
          system,
          COUNT(*) as link_count,
          COUNT(DISTINCT incident_number) as incident_count,
          COUNT(DISTINCT user_id) as user_count,
          ROUND(AVG(CASE WHEN action_type = 'link' THEN 1.0 ELSE 0.0 END) * 100, 2) as link_rate
        FROM user_interactions
        WHERE timestamp >= datetime('now', '-${days} days')
        GROUP BY system
        ORDER BY link_count DESC
      `);

      return stmt.all();
    } catch (error) {
      console.error("[InteractionModel] Error getting system popularity:", error);
      return [];
    }
  }

  /**
   * Get most effective suggestions
   */
  static async getMostEffectiveSuggestions(limit: number = 10) {
    try {
      const stmt = getDatabase().prepare(`
        SELECT
          suggestion_id,
          system,
          suggestion_title,
          COUNT(*) as link_count,
          COUNT(DISTINCT incident_number) as incident_count,
          COUNT(DISTINCT user_id) as user_count
        FROM user_interactions
        WHERE action_type = 'link'
        AND timestamp >= datetime('now', '-30 days')
        GROUP BY suggestion_id, system, suggestion_title
        ORDER BY link_count DESC, incident_count DESC
        LIMIT ?
      `);

      return stmt.all(limit);
    } catch (error) {
      console.error("[InteractionModel] Error getting effective suggestions:", error);
      return [];
    }
  }
}
