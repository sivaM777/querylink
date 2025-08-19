import Database from 'better-sqlite3';
import { Pool } from 'pg';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// SQLite connection
const sqliteDbPath = join(__dirname, '../../data/querylinker.db');
let sqliteDb;

try {
  sqliteDb = new Database(sqliteDbPath, { readonly: true });
  console.log('✅ Connected to SQLite database');
} catch (error) {
  console.error('❌ Failed to connect to SQLite database:', error.message);
  console.log('ℹ️  Continuing with PostgreSQL-only setup...');
}

// Table migration mappings
const tableMappings = {
  users: {
    columns: ['user_id', 'email', 'password_hash', 'full_name', 'role', 'email_verified', 'is_active', 'created_at', 'last_login', 'failed_login_attempts', 'locked_until', 'password_reset_token', 'password_reset_expires', 'email_verification_token', 'preferences'],
    pgColumns: ['user_id', 'email', 'password_hash', 'full_name', 'role', 'email_verified', 'is_active', 'created_at', 'last_login', 'failed_login_attempts', 'locked_until', 'password_reset_token', 'password_reset_expires', 'email_verification_token', 'preferences']
  },
  user_sessions: {
    columns: ['session_id', 'user_id', 'expires_at', 'created_at'],
    pgColumns: ['session_id', 'user_id', 'expires_at', 'created_at']
  },
  cached_suggestions: {
    columns: ['id', 'incident_number', 'keywords', 'keywords_hash', 'suggestions_json', 'search_time_ms', 'total_found', 'timestamp', 'expires_at'],
    pgColumns: ['id', 'incident_number', 'keywords', 'keywords_hash', 'suggestions_json', 'search_time_ms', 'total_found', 'timestamp', 'expires_at']
  },
  user_interactions: {
    columns: ['interaction_id', 'user_id', 'incident_number', 'suggestion_id', 'system', 'suggestion_title', 'suggestion_link', 'action_type', 'timestamp'],
    pgColumns: ['interaction_id', 'user_id', 'incident_number', 'suggestion_id', 'system', 'suggestion_title', 'suggestion_link', 'action_type', 'timestamp']
  },
  password_reset_tokens: {
    columns: ['id', 'user_id', 'token', 'expires_at', 'created_at', 'used'],
    pgColumns: ['id', 'user_id', 'token', 'expires_at', 'created_at', 'used']
  },
  intelligence_sources: {
    columns: ['source_id', 'name', 'type', 'api_endpoint', 'config_json', 'is_active', 'last_sync', 'created_at'],
    pgColumns: ['source_id', 'name', 'type', 'api_endpoint', 'config_json', 'is_active', 'last_sync', 'created_at']
  },
  intelligence_items: {
    columns: ['item_id', 'source_id', 'external_id', 'title', 'content', 'url', 'author', 'published_at', 'severity_score', 'category', 'tags', 'metadata', 'status', 'interaction_count', 'created_at', 'updated_at'],
    pgColumns: ['item_id', 'source_id', 'external_id', 'title', 'content', 'url', 'author', 'published_at', 'severity_score', 'category', 'tags', 'metadata', 'status', 'interaction_count', 'created_at', 'updated_at']
  },
  intelligence_interactions: {
    columns: ['interaction_id', 'user_id', 'item_id', 'action_type', 'timestamp', 'metadata'],
    pgColumns: ['interaction_id', 'user_id', 'item_id', 'action_type', 'timestamp', 'metadata']
  },
  intelligence_categories: {
    columns: ['category_id', 'name', 'color', 'icon', 'priority', 'is_active'],
    pgColumns: ['category_id', 'name', 'color', 'icon', 'priority', 'is_active']
  }
};

async function getTableSchema(tableName) {
  if (!sqliteDb) return null;
  
  try {
    const result = sqliteDb.pragma(`table_info(${tableName})`);
    return result;
  } catch (error) {
    console.log(`ℹ️  Table '${tableName}' does not exist in SQLite`);
    return null;
  }
}

async function tableExists(tableName) {
  if (!sqliteDb) return false;
  
  try {
    const result = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
    return !!result;
  } catch (error) {
    return false;
  }
}

async function getTableCount(tableName) {
  if (!sqliteDb) return 0;
  
  try {
    const result = sqliteDb.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
    return result.count;
  } catch (error) {
    return 0;
  }
}

async function migrateTable(tableName, mapping) {
  console.log(`\n📋 Migrating table: ${tableName}`);
  
  if (!sqliteDb) {
    console.log(`⚠️  SQLite database not available, skipping ${tableName}`);
    return;
  }

  const exists = await tableExists(tableName);
  if (!exists) {
    console.log(`⚠️  Table ${tableName} does not exist in SQLite, skipping...`);
    return;
  }

  const count = await getTableCount(tableName);
  if (count === 0) {
    console.log(`ℹ️  Table ${tableName} is empty, skipping...`);
    return;
  }

  console.log(`📊 Found ${count} records in ${tableName}`);

  try {
    // Get all data from SQLite
    const selectQuery = `SELECT ${mapping.columns.join(', ')} FROM ${tableName}`;
    const rows = sqliteDb.prepare(selectQuery).all();

    if (rows.length === 0) {
      console.log(`ℹ️  No data to migrate for ${tableName}`);
      return;
    }

    // Prepare PostgreSQL insert statement
    const placeholders = mapping.pgColumns.map((_, index) => `$${index + 1}`).join(', ');
    const insertQuery = `
      INSERT INTO ${tableName} (${mapping.pgColumns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT DO NOTHING
    `;

    let migratedCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      try {
        const values = mapping.pgColumns.map(col => {
          let value = row[col];
          
          // Handle JSON columns
          if (typeof value === 'string' && (col.includes('json') || col === 'tags' || col === 'metadata' || col === 'preferences')) {
            try {
              value = JSON.parse(value);
            } catch (e) {
              // If it's not valid JSON, keep as string
            }
          }
          
          // Handle boolean columns for SQLite (0/1 to true/false)
          if (typeof value === 'number' && (col.includes('active') || col.includes('verified') || col === 'used')) {
            value = Boolean(value);
          }

          return value;
        });

        await pool.query(insertQuery, values);
        migratedCount++;
      } catch (error) {
        errorCount++;
        if (errorCount <= 5) { // Only log first 5 errors to avoid spam
          console.log(`⚠️  Error migrating row in ${tableName}:`, error.message);
        }
      }
    }

    console.log(`✅ Migrated ${migratedCount} records from ${tableName}`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} records failed to migrate (likely duplicates or constraint violations)`);
    }

  } catch (error) {
    console.error(`❌ Failed to migrate ${tableName}:`, error.message);
  }
}

async function createMissingTables() {
  console.log('\n🏗️  Creating missing PostgreSQL tables for intelligence system...');
  
  try {
    const client = await pool.connect();
    
    // Create intelligence_sources table
    await client.query(`
      CREATE TABLE IF NOT EXISTS intelligence_sources (
        source_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        api_endpoint TEXT,
        config_json JSONB,
        is_active BOOLEAN DEFAULT true,
        last_sync TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create intelligence_items table  
    await client.query(`
      CREATE TABLE IF NOT EXISTS intelligence_items (
        item_id SERIAL PRIMARY KEY,
        source_id INTEGER NOT NULL,
        external_id VARCHAR(255) NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        url TEXT NOT NULL,
        author VARCHAR(255),
        published_at TIMESTAMP,
        severity_score INTEGER DEFAULT 0,
        category VARCHAR(100),
        tags JSONB DEFAULT '[]',
        metadata JSONB DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'new',
        interaction_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (source_id) REFERENCES intelligence_sources(source_id),
        UNIQUE(source_id, external_id)
      );
    `);

    // Create intelligence_interactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS intelligence_interactions (
        interaction_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}',
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (item_id) REFERENCES intelligence_items(item_id)
      );
    `);

    // Create intelligence_categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS intelligence_categories (
        category_id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        color VARCHAR(7),
        icon VARCHAR(50),
        priority INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true
      );
    `);

    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_intelligence_items_source_id ON intelligence_items(source_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_intelligence_items_status ON intelligence_items(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_intelligence_items_category ON intelligence_items(category);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_intelligence_interactions_user_id ON intelligence_interactions(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_intelligence_interactions_item_id ON intelligence_interactions(item_id);`);

    client.release();
    console.log('✅ Intelligence system tables created successfully');
    
  } catch (error) {
    console.error('❌ Failed to create intelligence tables:', error.message);
  }
}

async function runMigration() {
  console.log('🚀 Starting SQLite to PostgreSQL migration...');
  console.log('🔗 PostgreSQL connection string:', process.env.DATABASE_URL ? '***configured***' : '❌ NOT SET');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  try {
    // Test PostgreSQL connection
    const client = await pool.connect();
    console.log('✅ PostgreSQL connection successful');
    client.release();

    // Create any missing tables first
    await createMissingTables();

    // Migrate each table
    for (const [tableName, mapping] of Object.entries(tableMappings)) {
      await migrateTable(tableName, mapping);
    }

    // Create a default test user if users table is empty
    try {
      const userCount = await pool.query('SELECT COUNT(*) FROM users');
      if (parseInt(userCount.rows[0].count) === 0) {
        console.log('\n👤 Creating default test user...');
        const hashedPassword = await bcrypt.hash('password123', 12);
        
        await pool.query(`
          INSERT INTO users (email, password_hash, full_name, role, email_verified, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (email) DO NOTHING
        `, ['test@example.com', hashedPassword, 'Test User', 'user', true, true]);
        
        console.log('✅ Default user created: test@example.com / password123');
      }
    } catch (error) {
      console.log('⚠️  Could not create default user:', error.message);
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📊 Migration Summary:');
    
    // Get final counts from PostgreSQL
    for (const tableName of Object.keys(tableMappings)) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
        const count = parseInt(result.rows[0].count);
        console.log(`   ${tableName}: ${count} records`);
      } catch (error) {
        console.log(`   ${tableName}: table not found`);
      }
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (sqliteDb) {
      sqliteDb.close();
    }
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration().catch(console.error);
}

export { runMigration };
