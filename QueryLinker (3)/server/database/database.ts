import Database from "better-sqlite3";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection
let db: Database.Database;

export function initializeDatabase(): Database.Database {
  try {
    // Use SQLite database file
    const dbPath =
      process.env.DATABASE_PATH || join(__dirname, "../../data/querylinker.db");

    db = new Database(dbPath);
    db.pragma("journal_mode = WAL"); // Enable WAL mode for better performance
    db.pragma("foreign_keys = ON"); // Enable foreign key constraints

    // First, run any necessary migrations before applying the full schema
    runActivityMigration(db);

    // Then run the complete schema
    const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");
    db.exec(schema);

    // Add solutions schema
    const solutionsSchema = readFileSync(join(__dirname, "solutions-schema.sql"), "utf8");
    db.exec(solutionsSchema);
    console.log("[Database] Solutions schema initialized successfully");

    // Initialize default data if needed
    initializeDefaultData(db);

    console.log("[Database] QueryLinker database initialized successfully");
    return db;
  } catch (error) {
    console.error("[Database] Failed to initialize database:", error);
    throw error;
  }
}

function runActivityMigration(database: Database.Database) {
  try {
    // Check if last_activity column exists
    console.log("[Database] Checking user_sessions table schema...");
    const tableInfo = database.prepare("PRAGMA table_info(user_sessions)").all() as any[];
    console.log("[Database] Current columns:", tableInfo.map(col => col.name).join(", "));

    const hasLastActivity = tableInfo.some(column => column.name === 'last_activity');
    console.log(`[Database] Has last_activity column: ${hasLastActivity}`);

    if (!hasLastActivity) {
      console.log("[Database] Running user activity migration...");

      try {
        // SQLite doesn't allow CURRENT_TIMESTAMP in ALTER TABLE, so we'll use a different approach
        database.exec("ALTER TABLE user_sessions ADD COLUMN last_activity DATETIME");
        console.log("[Database] ✅ Added last_activity column successfully");

        // Verify the column was added
        const newTableInfo = database.prepare("PRAGMA table_info(user_sessions)").all() as any[];
        const nowHasLastActivity = newTableInfo.some(column => column.name === 'last_activity');
        console.log(`[Database] Verification: Column added successfully: ${nowHasLastActivity}`);

      } catch (addError) {
        console.error("[Database] ❌ Failed to add last_activity column:", addError);
        return; // Don't proceed if column addition failed
      }
    } else {
      console.log("[Database] ✅ last_activity column already exists");
    }

    // Create the index
    try {
      database.exec("CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions (last_activity)");
      console.log("[Database] ✅ Created last_activity index successfully");
    } catch (indexError) {
      console.error("[Database] ❌ Could not create last_activity index:", indexError);
    }

    // Update existing sessions (set to created_at for existing sessions, current time for new ones)
    try {
      const result = database.prepare("UPDATE user_sessions SET last_activity = COALESCE(last_activity, created_at, CURRENT_TIMESTAMP)").run();
      console.log(`[Database] ✅ Updated ${result.changes} existing sessions with last_activity`);
    } catch (updateError) {
      console.error("[Database] ❌ Could not update existing sessions:", updateError);
    }

    // Test the column by querying it
    try {
      const testQuery = database.prepare("SELECT COUNT(*) as count FROM user_sessions WHERE last_activity IS NOT NULL").get() as any;
      console.log(`[Database] ✅ Test query successful: ${testQuery.count} sessions have last_activity`);
    } catch (testError) {
      console.error("[Database] ❌ Test query failed:", testError);
    }

  } catch (error) {
    console.error("[Database] Error running activity migration:", error);
  }
}

function initializeDefaultData(database: Database.Database) {
  try {
    // Check if we already have data
    const articleCount = database
      .prepare("SELECT COUNT(*) as count FROM knowledge_articles")
      .get() as { count: number };
    const slaCount = database
      .prepare("SELECT COUNT(*) as count FROM sla_definitions")
      .get() as { count: number };

    if (articleCount.count === 0 || slaCount.count === 0) {
      console.log("[Database] Initializing default data...");

      // Read and execute init data
      const initDataPath = join(__dirname, "init-data.sql");
      try {
        const initData = readFileSync(initDataPath, "utf8");
        const statements = initData.split(";").filter((stmt) => stmt.trim());

        for (const statement of statements) {
          try {
            database.exec(statement);
          } catch (error) {
            console.error("Error executing init data statement:", error);
          }
        }

        console.log("[Database] Default data initialized successfully");
      } catch (error) {
        console.log(
          "[Database] Init data file not found, skipping default data initialization",
        );
      }
    }
  } catch (error) {
    console.error("Error initializing default data:", error);
  }
}

export function getDatabase(): Database.Database | null {
  if (!db) {
    try {
      return initializeDatabase();
    } catch (error) {
      console.warn("[Database] Cannot get database - initialization failed:", error);
      return null;
    }
  }
  return db;
}

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
  private static getDb() {
    const db = getDatabase();
    if (!db) throw new Error("Database not available");
    return db;
  }

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
  static cacheSuggestions(
    data: Omit<CachedSuggestion, "id" | "timestamp">,
  ): number {
    const stmt = this.getDb().prepare(`
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
  }

  /**
   * Get cached suggestions by keywords hash
   */
  static getCachedSuggestions(keywordsHash: string): CachedSuggestion | null {
    const stmt = this.db.prepare(`
      SELECT * FROM cached_suggestions 
      WHERE keywords_hash = ? AND expires_at > CURRENT_TIMESTAMP
      ORDER BY timestamp DESC 
      LIMIT 1
    `);

    return stmt.get(keywordsHash) as CachedSuggestion | null;
  }

  /**
   * Get cached suggestions by incident number
   */
  static getCachedSuggestionsByIncident(
    incidentNumber: string,
  ): CachedSuggestion | null {
    const stmt = this.db.prepare(`
      SELECT * FROM cached_suggestions 
      WHERE incident_number = ? AND expires_at > CURRENT_TIMESTAMP
      ORDER BY timestamp DESC 
      LIMIT 1
    `);

    return stmt.get(incidentNumber) as CachedSuggestion | null;
  }

  /**
   * Clean up expired cache entries
   */
  static cleanupExpiredCache(): number {
    const stmt = this.db.prepare(`
      DELETE FROM cached_suggestions 
      WHERE expires_at < CURRENT_TIMESTAMP
    `);

    const result = stmt.run();
    return result.changes;
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    const totalCached = this.db
      .prepare("SELECT COUNT(*) as count FROM cached_suggestions")
      .get() as { count: number };
    const validCached = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM cached_suggestions WHERE expires_at > CURRENT_TIMESTAMP",
      )
      .get() as { count: number };
    const avgSearchTime = this.db
      .prepare(
        "SELECT AVG(search_time_ms) as avg_time FROM cached_suggestions WHERE search_time_ms IS NOT NULL",
      )
      .get() as { avg_time: number };

    return {
      total_cached: totalCached.count,
      valid_cached: validCached.count,
      expired_cached: totalCached.count - validCached.count,
      avg_search_time_ms: Math.round(avgSearchTime.avg_time || 0),
    };
  }
}

export class InteractionModel {
  private static db = getDatabase();

  /**
   * Record user interaction
   */
  static recordInteraction(
    data: Omit<UserInteraction, "interaction_id" | "timestamp">,
  ): number {
    const stmt = this.db.prepare(`
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
  }

  /**
   * Get interactions for an incident
   */
  static getInteractionsByIncident(incidentNumber: string): UserInteraction[] {
    const stmt = this.db.prepare(`
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
    const stmt = this.db.prepare(`
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
    const stmt = this.db.prepare(`
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
    const stmt = this.db.prepare(`
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
    const stmt = this.db.prepare(`
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
