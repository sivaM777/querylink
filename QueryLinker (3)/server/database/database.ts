// Re-export PostgreSQL database functionality
export {
  initializeDatabase,
  getDatabase,
  executeQuery,
  PreparedStatement,
  DatabaseWrapper,
  db
} from './postgres-database';

import crypto from "crypto";
import { getDatabase, executeQuery, PreparedStatement } from './postgres-database';

// PostgreSQL initialization is handled in postgres-database.ts

// Migration functions removed - PostgreSQL schema is handled in postgres-database.ts

// getDatabase is re-exported from postgres-database.ts

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
      const result = await executeQuery(`
        INSERT INTO cached_suggestions
        (incident_number, keywords, keywords_hash, suggestions_json, search_time_ms, total_found, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (keywords_hash) DO UPDATE SET
          incident_number = EXCLUDED.incident_number,
          keywords = EXCLUDED.keywords,
          suggestions_json = EXCLUDED.suggestions_json,
          search_time_ms = EXCLUDED.search_time_ms,
          total_found = EXCLUDED.total_found,
          expires_at = EXCLUDED.expires_at,
          timestamp = CURRENT_TIMESTAMP
        RETURNING id
      `, [
        data.incident_number,
        data.keywords,
        data.keywords_hash,
        data.suggestions_json,
        data.search_time_ms,
        data.total_found,
        data.expires_at,
      ]);

      return result.rows[0]?.id || 0;
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
      const result = await executeQuery(`
        SELECT * FROM cached_suggestions
        WHERE keywords_hash = $1 AND expires_at > CURRENT_TIMESTAMP
        ORDER BY timestamp DESC
        LIMIT 1
      `, [keywordsHash]);

      return result.rows[0] || null;
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
      const result = await executeQuery(`
        SELECT * FROM cached_suggestions
        WHERE incident_number = $1 AND expires_at > CURRENT_TIMESTAMP
        ORDER BY timestamp DESC
        LIMIT 1
      `, [incidentNumber]);

      return result.rows[0] || null;
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
      const result = await executeQuery(`
        DELETE FROM cached_suggestions
        WHERE expires_at < CURRENT_TIMESTAMP
      `);

      return result.rowCount || 0;
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
      const totalResult = await executeQuery("SELECT COUNT(*) as count FROM cached_suggestions");
      const validResult = await executeQuery(
        "SELECT COUNT(*) as count FROM cached_suggestions WHERE expires_at > CURRENT_TIMESTAMP"
      );
      const avgResult = await executeQuery(
        "SELECT AVG(search_time_ms) as avg_time FROM cached_suggestions WHERE search_time_ms IS NOT NULL"
      );

      const totalCached = totalResult.rows[0]?.count || 0;
      const validCached = validResult.rows[0]?.count || 0;
      const avgSearchTime = avgResult.rows[0]?.avg_time || 0;

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
      const result = await executeQuery(`
        INSERT INTO user_interactions
        (user_id, incident_number, suggestion_id, system, suggestion_title, suggestion_link, action_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING interaction_id
      `, [
        data.user_id,
        data.incident_number,
        data.suggestion_id,
        data.system,
        data.suggestion_title,
        data.suggestion_link,
        data.action_type || "link",
      ]);

      return result.rows[0]?.interaction_id || 0;
    } catch (error) {
      console.error("[InteractionModel] Error recording interaction:", error);
      throw error;
    }
  }

  /**
   * Get interactions for an incident
   */
  static getInteractionsByIncident(incidentNumber: string): UserInteraction[] {
    const stmt = this.getDb().prepare(`
      SELECT * FROM user_interactions 
      WHERE incident_number = ? 
      ORDER BY timestamp DESC
    `);

    return stmt.all(incidentNumber) as UserInteraction[];
  }

  /**
   * Get interactions by user
   */
  static getInteractionsByUser(
    userId: string,
    limit: number = 50,
  ): UserInteraction[] {
    const stmt = this.getDb().prepare(`
      SELECT * FROM user_interactions 
      WHERE user_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);

    return stmt.all(userId, limit) as UserInteraction[];
  }

  /**
   * Get analytics data
   */
  static getAnalytics(days: number = 30) {
    const stmt = this.getDb().prepare(`
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
  }

  /**
   * Get system popularity rankings
   */
  static getSystemPopularity(days: number = 30) {
    const stmt = this.getDb().prepare(`
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
  }

  /**
   * Get most effective suggestions
   */
  static getMostEffectiveSuggestions(limit: number = 10) {
    const stmt = this.getDb().prepare(`
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
  }
}

// Initialize database on module load
try {
  initializeDatabase();
} catch (error) {
  console.error("[Database] Failed to initialize on startup:", error);
  console.warn("[Database] Application will continue without database functionality");
}
