import { Pool, PoolClient, QueryResult } from 'pg';
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// PostgreSQL connection pool
let pool: Pool | null = null;

export function initializeDatabase(): Pool {
  try {
    if (pool) {
      return pool;
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    console.log("[Database] Connecting to PostgreSQL database...");
    
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test the connection
    pool.connect()
      .then((client) => {
        console.log("[Database] PostgreSQL connection established successfully");
        client.release();
        return initializeSchema();
      })
      .catch((error) => {
        console.error("[Database] Failed to connect to PostgreSQL:", error);
        throw error;
      });

    return pool;
  } catch (error) {
    console.error("[Database] Failed to initialize PostgreSQL database:", error);
    throw error;
  }
}

async function initializeSchema(): Promise<void> {
  if (!pool) {
    throw new Error("Database pool not initialized");
  }

  const client = await pool.connect();
  try {
    console.log("[Database] Initializing PostgreSQL schema...");
    
    // Create the main tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        avatar_url TEXT,
        provider VARCHAR(50),
        provider_id VARCHAR(255),
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        preferences JSONB DEFAULT '{}'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        session_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        token VARCHAR(500) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_suggestions (
        id SERIAL PRIMARY KEY,
        incident_number VARCHAR(255),
        keywords TEXT NOT NULL,
        keywords_hash VARCHAR(64) UNIQUE NOT NULL,
        suggestions_json TEXT NOT NULL,
        search_time_ms INTEGER,
        total_found INTEGER,
        expires_at TIMESTAMP NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_interactions (
        interaction_id SERIAL PRIMARY KEY,
        user_id VARCHAR(255),
        incident_number VARCHAR(255) NOT NULL,
        suggestion_id VARCHAR(255) NOT NULL,
        system VARCHAR(100) NOT NULL,
        suggestion_title TEXT,
        suggestion_link TEXT,
        action_type VARCHAR(50) DEFAULT 'link',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cached_suggestions_hash ON cached_suggestions(keywords_hash);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cached_suggestions_expires ON cached_suggestions(expires_at);
    `);

    console.log("[Database] PostgreSQL schema initialized successfully");
  } catch (error) {
    console.error("[Database] Failed to initialize schema:", error);
    throw error;
  } finally {
    client.release();
  }
}

export function getDatabase(): Pool | null {
  if (!pool) {
    try {
      return initializeDatabase();
    } catch (error) {
      console.warn("[Database] Cannot get database - initialization failed:", error);
      return null;
    }
  }
  return pool;
}

// Helper function to execute queries safely
export async function executeQuery(text: string, params?: any[]): Promise<QueryResult> {
  const db = getDatabase();
  if (!db) {
    throw new Error("Database not available");
  }
  
  const client = await db.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// Helper function to execute prepared statements
export class PreparedStatement {
  constructor(private query: string) {}

  async run(...params: any[]): Promise<QueryResult> {
    return executeQuery(this.query, params);
  }

  async get(...params: any[]): Promise<any> {
    const result = await executeQuery(this.query, params);
    return result.rows[0] || null;
  }

  async all(...params: any[]): Promise<any[]> {
    const result = await executeQuery(this.query, params);
    return result.rows;
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
}

// Export a database instance for compatibility
export const db = new DatabaseWrapper();

// Initialize database on module load
try {
  initializeDatabase();
} catch (error) {
  console.error("[Database] Failed to initialize on startup:", error);
  console.warn("[Database] Application will continue without database functionality");
}
