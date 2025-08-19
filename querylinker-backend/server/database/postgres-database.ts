import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import * as Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sqliteDbPath = join(__dirname, "../data/querylinker.db");

// SQLite database instance
let db: Database.Database;

export function initializeDatabase(): Database.Database {
  try {
    if (db) {
      return db;
    }

    console.log("[Database] Connecting to SQLite database...");

    db = new Database(sqliteDbPath);

    // Enable foreign key constraints
    db.pragma('foreign_keys = ON');

    console.log("[Database] SQLite connection established successfully");
    return initializeSchema();

  } catch (error) {
    console.error("[Database] Failed to initialize SQLite database:", error);
    throw error;
  }
}

async function initializeSchema(): Promise<Database.Database> {
  if (!db) {
    throw new Error("Database not initialized");
  }

  try {
    console.log("[Database] Initializing SQLite schema...");

    // Create the main tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        full_name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        avatar_url TEXT,
        provider TEXT,
        provider_id TEXT,
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        preferences TEXT DEFAULT '{}'
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        session_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS cached_suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_number TEXT,
        keywords TEXT NOT NULL,
        keywords_hash TEXT UNIQUE NOT NULL,
        suggestions_json TEXT NOT NULL,
        search_time_ms INTEGER,
        total_found INTEGER,
        expires_at TIMESTAMP NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS user_interactions (
        interaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        incident_number TEXT NOT NULL,
        suggestion_id TEXT NOT NULL,
        system TEXT NOT NULL,
        suggestion_title TEXT,
        suggestion_link TEXT,
        action_type TEXT DEFAULT 'link',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cached_suggestions_hash ON cached_suggestions(keywords_hash);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cached_suggestions_expires ON cached_suggestions(expires_at);
    `);

    // Create additional tables for the QueryLinker functionality
    db.exec(`
      CREATE TABLE IF NOT EXISTS system_sync_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        system TEXT UNIQUE NOT NULL,
        enabled BOOLEAN DEFAULT FALSE,
        api_endpoint TEXT,
        auth_config TEXT DEFAULT '{}',
        sync_interval INTEGER DEFAULT 3600,
        last_sync TIMESTAMP,
        last_sync_status TEXT,
        last_sync_error TEXT,
        total_synced INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS solutions (
        id TEXT PRIMARY KEY,
        system TEXT NOT NULL,
        external_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        content TEXT,
        snippet TEXT,
        status TEXT,
        priority TEXT,
        author TEXT,
        assignee TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP,
        external_url TEXT,
        tags TEXT DEFAULT '[]',
        resolution TEXT,
        steps TEXT DEFAULT '[]',
        related_issues TEXT DEFAULT '[]',
        attachments TEXT DEFAULT '[]',
        keywords TEXT,
        category TEXT,
        severity TEXT,
        metadata TEXT DEFAULT '{}',
        sync_status TEXT DEFAULT 'active'
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS solution_chunks (
        id TEXT PRIMARY KEY,
        solution_id TEXT REFERENCES solutions(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT
      );
    `);

    // Create indexes for better performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_solutions_system ON solutions(system);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_solutions_status ON solutions(status);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_solutions_sync_status ON solutions(sync_status);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_solution_chunks_solution_id ON solution_chunks(solution_id);
    `);

    console.log("[Database] SQLite schema initialized successfully");
    return db;
  } catch (error) {
    console.error("[Database] Failed to initialize schema:", error);
    throw error;
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

// Helper function to execute queries safely
export async function executeQuery(query: string, params: any[] = []): Promise<Database.RunResult> {
  if (!db) {
    await initializeDatabase();
  }

  try {
    // Convert PostgreSQL-style parameterized queries ($1, $2) to SQLite style (?, ?)
    const sqliteQuery = query.replace(/\$(\d+)/g, '?');

    const stmt = db.prepare(sqliteQuery);
    const result = stmt.run(...params);
    return result;
  } catch (error) {
    console.error('[Database] Query error:', error);
    throw error;
  }
}

// Helper function to execute prepared statements
export class PreparedStatement {
  private query: string;

  constructor(query: string) {
    this.query = query;
  }

  async run(...params: any[]): Promise<Database.RunResult> {
    return executeQuery(this.query, params);
  }

  async get(...params: any[]): Promise<any> {
    const sqliteQuery = this.query.replace(/\$(\d+)/g, '?');
    const stmt = db.prepare(sqliteQuery);
    const row = stmt.get(...params);
    return row;
  }

  async all(...params: any[]): Promise<any[]> {
    const sqliteQuery = this.query.replace(/\$(\d+)/g, '?');
    const stmt = db.prepare(sqliteQuery);
    const rows = stmt.all(...params);
    return rows;
  }
}

// Database wrapper to maintain compatibility with existing code
export class DatabaseWrapper {
  prepare(query: string): PreparedStatement {
    return new PreparedStatement(query);
  }

  async exec(query: string): Promise<void> {
    await executeQuery(query);
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    const sqliteQuery = sql.replace(/\$(\d+)/g, '?');
    if (sqliteQuery.trim().toLowerCase().startsWith('select')) {
      const stmt = db.prepare(sqliteQuery);
      const rows = stmt.all(...params);
      return { rows, rowCount: rows.length };
    } else {
      return executeQuery(sql, params);
    }
  }
}

// Export a database instance for compatibility
export const dbInstance = new DatabaseWrapper();

// Initialize database on module load
try {
  initializeDatabase();
} catch (error) {
  console.error("[Database] Failed to initialize on startup:", error);
  console.warn("[Database] Application will continue without database functionality");
}