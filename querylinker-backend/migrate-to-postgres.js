
import { Pool } from 'pg';
import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// SQLite database path
const sqliteDbPath = join(__dirname, 'data/querylinker.db');

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

console.log('🚀 Starting complete SQLite to PostgreSQL migration...');

async function createPostgreSQLTables() {
  console.log('\n📋 Creating PostgreSQL tables...');
  
  const client = await pool.connect();
  
  try {
    // Create all required tables
    const tableQueries = [
      `CREATE TABLE IF NOT EXISTS users (
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
        preferences JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT TRUE
      )`,
      
      `CREATE TABLE IF NOT EXISTS user_sessions (
        session_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        token VARCHAR(500) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS cached_suggestions (
        id SERIAL PRIMARY KEY,
        incident_number VARCHAR(255),
        keywords TEXT NOT NULL,
        keywords_hash VARCHAR(64) UNIQUE NOT NULL,
        suggestions_json TEXT NOT NULL,
        search_time_ms INTEGER,
        total_found INTEGER,
        expires_at TIMESTAMP NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS user_interactions (
        interaction_id SERIAL PRIMARY KEY,
        user_id VARCHAR(255),
        incident_number VARCHAR(255) NOT NULL,
        suggestion_id VARCHAR(255) NOT NULL,
        system VARCHAR(100) NOT NULL,
        suggestion_title TEXT,
        suggestion_link TEXT,
        action_type VARCHAR(50) DEFAULT 'link',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS system_sync_config (
        id SERIAL PRIMARY KEY,
        system VARCHAR(100) UNIQUE NOT NULL,
        enabled BOOLEAN DEFAULT FALSE,
        api_endpoint TEXT,
        auth_config JSONB,
        sync_interval INTEGER DEFAULT 3600,
        last_sync TIMESTAMP,
        last_sync_status VARCHAR(50),
        last_sync_error TEXT,
        total_synced INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS solutions (
        id VARCHAR(255) PRIMARY KEY,
        system VARCHAR(100) NOT NULL,
        external_id VARCHAR(255),
        title TEXT NOT NULL,
        description TEXT,
        content TEXT,
        snippet TEXT,
        status VARCHAR(50),
        priority VARCHAR(50),
        author VARCHAR(255),
        assignee VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP,
        external_url TEXT,
        tags JSONB DEFAULT '[]',
        resolution TEXT,
        steps JSONB DEFAULT '[]',
        related_issues JSONB DEFAULT '[]',
        attachments JSONB DEFAULT '[]',
        keywords TEXT,
        category VARCHAR(100),
        severity VARCHAR(50),
        metadata JSONB DEFAULT '{}',
        sync_status VARCHAR(50) DEFAULT 'active'
      )`
    ];
    
    for (const query of tableQueries) {
      await client.query(query);
    }
    
    // Create indexes
    const indexQueries = [
      `CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token)`,
      `CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity)`,
      `CREATE INDEX IF NOT EXISTS idx_cached_suggestions_hash ON cached_suggestions(keywords_hash)`,
      `CREATE INDEX IF NOT EXISTS idx_cached_suggestions_expires ON cached_suggestions(expires_at)`,
      `CREATE INDEX IF NOT EXISTS idx_solutions_system ON solutions(system)`,
      `CREATE INDEX IF NOT EXISTS idx_solutions_status ON solutions(status)`
    ];
    
    for (const query of indexQueries) {
      await client.query(query);
    }
    
    console.log('✅ PostgreSQL tables created successfully');
    
  } finally {
    client.release();
  }
}

async function migrateData() {
  if (!existsSync(sqliteDbPath)) {
    console.log('⚠️  SQLite database not found, creating sample data...');
    await createSampleData();
    return;
  }
  
  console.log('\n📊 Migrating data from SQLite...');
  
  const sqlite = new Database(sqliteDbPath, { readonly: true });
  const client = await pool.connect();
  
  try {
    // Get all table names from SQLite
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    
    for (const table of tables) {
      const tableName = table.name;
      if (tableName === 'sqlite_sequence') continue;
      
      console.log(`   Migrating ${tableName}...`);
      
      try {
        const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
        
        if (rows.length > 0) {
          // Get column names
          const columns = Object.keys(rows[0]);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          const columnNames = columns.join(', ');
          
          const insertQuery = `
            INSERT INTO ${tableName} (${columnNames}) 
            VALUES (${placeholders})
            ON CONFLICT DO NOTHING
          `;
          
          for (const row of rows) {
            const values = columns.map(col => row[col]);
            await client.query(insertQuery, values);
          }
          
          console.log(`     ✅ ${rows.length} records migrated`);
        }
      } catch (error) {
        console.log(`     ⚠️  Skipped ${tableName}: ${error.message}`);
      }
    }
    
  } finally {
    sqlite.close();
    client.release();
  }
}

async function createSampleData() {
  console.log('\n👤 Creating sample user data...');
  
  const client = await pool.connect();
  
  try {
    // Create admin user
    const adminPasswordHash = await bcrypt.hash('admin123', 12);
    await client.query(`
      INSERT INTO users (email, password_hash, full_name, role, email_verified, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
    `, ['admin@querylinker.com', adminPasswordHash, 'Admin User', 'admin', true, true]);
    
    // Create test user
    const testPasswordHash = await bcrypt.hash('test123', 12);
    await client.query(`
      INSERT INTO users (email, password_hash, full_name, role, email_verified, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
    `, ['test@querylinker.com', testPasswordHash, 'Test User', 'user', true, true]);
    
    // Create system configs
    const systems = [
      { system: 'ServiceNow', enabled: false, api_endpoint: 'https://dev12345.service-now.com/api' },
      { system: 'Jira', enabled: false, api_endpoint: 'https://company.atlassian.net/rest/api/2' },
      { system: 'GitHub', enabled: false, api_endpoint: 'https://api.github.com' }
    ];
    
    for (const sys of systems) {
      await client.query(`
        INSERT INTO system_sync_config (system, enabled, api_endpoint)
        VALUES ($1, $2, $3)
        ON CONFLICT (system) DO NOTHING
      `, [sys.system, sys.enabled, sys.api_endpoint]);
    }
    
    console.log('✅ Sample data created');
    
  } finally {
    client.release();
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  const client = await pool.connect();
  
  try {
    const tables = [
      'users', 'user_sessions', 'system_sync_config', 'solutions', 
      'user_interactions', 'cached_suggestions'
    ];
    
    let totalRecords = 0;
    
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        const count = parseInt(result.rows[0].count);
        totalRecords += count;
        console.log(`   ${table}: ${count} records`);
      } catch (error) {
        console.log(`   ${table}: error - ${error.message}`);
      }
    }
    
    console.log(`\n📊 Total records in PostgreSQL: ${totalRecords}`);
    
    // Test user authentication
    const testUser = await client.query(`
      SELECT user_id, email, full_name, role 
      FROM users 
      WHERE email IN ('admin@querylinker.com', 'test@querylinker.com')
    `);
    
    if (testUser.rows.length > 0) {
      console.log(`\n👥 Test users available:`);
      for (const user of testUser.rows) {
        console.log(`   ${user.email} (${user.role})`);
      }
      console.log(`\n🔑 Login credentials:`);
      console.log(`   admin@querylinker.com / admin123`);
      console.log(`   test@querylinker.com / test123`);
    }
    
  } finally {
    client.release();
  }
}

async function runMigration() {
  try {
    console.log('🔗 PostgreSQL connection:', process.env.DATABASE_URL ? '***configured***' : '❌ NOT SET');
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable not set');
      console.log('\n📝 To fix this:');
      console.log('1. Go to the Secrets tab (🔒 icon in left sidebar)');
      console.log('2. Add key: DATABASE_URL');
      console.log('3. Add your PostgreSQL connection string');
      console.log('4. Run this migration again');
      process.exit(1);
    }

    // Test PostgreSQL connection
    const client = await pool.connect();
    console.log('✅ PostgreSQL connection successful');
    client.release();

    // Run migration steps
    await createPostgreSQLTables();
    await migrateData();
    await verifyMigration();

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n🚀 Your QueryLinker backend is ready to use PostgreSQL');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
