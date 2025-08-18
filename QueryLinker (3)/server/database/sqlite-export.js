import { Pool } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const execAsync = promisify(exec);
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

const sqliteDbPath = join(__dirname, '../../data/querylinker.db');

async function exportSQLiteTable(tableName) {
  console.log(`📤 Exporting ${tableName} from SQLite...`);
  
  try {
    // First check if table exists and has data
    const checkCmd = `echo "SELECT COUNT(*) FROM ${tableName};" | sqlite3 "${sqliteDbPath}"`;
    const countResult = await execAsync(checkCmd);
    const count = parseInt(countResult.stdout.trim());
    
    if (count === 0) {
      console.log(`ℹ️  Table ${tableName} is empty, skipping...`);
      return [];
    }
    
    console.log(`📊 Found ${count} records in ${tableName}`);
    
    // Export data as CSV
    const exportCmd = `echo ".mode csv\n.headers on\nSELECT * FROM ${tableName};" | sqlite3 "${sqliteDbPath}"`;
    const result = await execAsync(exportCmd);
    
    if (!result.stdout.trim()) {
      console.log(`ℹ️  No data exported from ${tableName}`);
      return [];
    }
    
    // Parse CSV data
    const lines = result.stdout.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => {
        v = v.replace(/"/g, ''); // Remove quotes
        if (v === '') return null;
        if (v === 'NULL') return null;
        if (!isNaN(v) && v !== '') return Number(v);
        return v;
      });
      
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      rows.push(row);
    }
    
    console.log(`✅ Exported ${rows.length} records from ${tableName}`);
    return rows;
    
  } catch (error) {
    if (error.message.includes('no such table')) {
      console.log(`ℹ️  Table ${tableName} does not exist in SQLite`);
      return [];
    }
    console.error(`❌ Failed to export ${tableName}:`, error.message);
    return [];
  }
}

async function importToPostgreSQL(tableName, data, columnMapping) {
  if (!data || data.length === 0) {
    console.log(`ℹ️  No data to import for ${tableName}`);
    return;
  }
  
  console.log(`📥 Importing ${data.length} records to PostgreSQL ${tableName}...`);
  
  try {
    let importedCount = 0;
    let errorCount = 0;
    
    for (const row of data) {
      try {
        const columns = Object.keys(columnMapping);
        const values = columns.map(col => {
          let value = row[columnMapping[col]] || row[col];
          
          // Handle JSON columns
          if (typeof value === 'string' && (col.includes('json') || col === 'tags' || col === 'metadata' || col === 'preferences')) {
            try {
              value = JSON.parse(value);
            } catch (e) {
              // Keep as string if not valid JSON
            }
          }
          
          // Handle boolean columns
          if (typeof value === 'number' && (col.includes('active') || col.includes('verified') || col === 'used')) {
            value = Boolean(value);
          }
          
          return value;
        });
        
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const query = `
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;
        
        await pool.query(query, values);
        importedCount++;
      } catch (error) {
        errorCount++;
        if (errorCount <= 3) {
          console.log(`⚠️  Error importing row: ${error.message}`);
        }
      }
    }
    
    console.log(`✅ Imported ${importedCount} records to ${tableName}`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} records failed (likely duplicates)`);
    }
    
  } catch (error) {
    console.error(`❌ Failed to import to ${tableName}:`, error.message);
  }
}

async function createMissingTables() {
  console.log('\n🏗️  Ensuring all PostgreSQL tables exist...');
  
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
        metadata JSONB DEFAULT '{}'
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

    client.release();
    console.log('✅ All PostgreSQL tables verified/created');
    
  } catch (error) {
    console.error('❌ Failed to create tables:', error.message);
  }
}

async function runDataMigration() {
  console.log('🚀 Starting SQLite to PostgreSQL data migration...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }
  
  // Check if SQLite database exists
  if (!fs.existsSync(sqliteDbPath)) {
    console.log('ℹ️  SQLite database not found, setting up PostgreSQL with default data...');
  }

  try {
    // Test PostgreSQL connection
    const client = await pool.connect();
    console.log('✅ PostgreSQL connection successful');
    client.release();

    // Ensure all tables exist
    await createMissingTables();

    // Table migration configuration
    const tables = [
      {
        name: 'users',
        mapping: {
          user_id: 'user_id',
          email: 'email', 
          password_hash: 'password_hash',
          full_name: 'full_name',
          role: 'role',
          email_verified: 'email_verified',
          is_active: 'is_active',
          created_at: 'created_at',
          last_login: 'last_login',
          failed_login_attempts: 'failed_login_attempts',
          locked_until: 'locked_until',
          password_reset_token: 'password_reset_token',
          password_reset_expires: 'password_reset_expires',
          email_verification_token: 'email_verification_token',
          preferences: 'preferences'
        }
      },
      {
        name: 'user_sessions',
        mapping: {
          session_id: 'session_id',
          user_id: 'user_id',
          expires_at: 'expires_at',
          created_at: 'created_at'
        }
      },
      {
        name: 'cached_suggestions',
        mapping: {
          id: 'id',
          incident_number: 'incident_number',
          keywords: 'keywords',
          keywords_hash: 'keywords_hash',
          suggestions_json: 'suggestions_json',
          search_time_ms: 'search_time_ms',
          total_found: 'total_found',
          timestamp: 'timestamp',
          expires_at: 'expires_at'
        }
      },
      {
        name: 'user_interactions',
        mapping: {
          interaction_id: 'interaction_id',
          user_id: 'user_id',
          incident_number: 'incident_number',
          suggestion_id: 'suggestion_id',
          system: 'system',
          suggestion_title: 'suggestion_title',
          suggestion_link: 'suggestion_link',
          action_type: 'action_type',
          timestamp: 'timestamp'
        }
      },
      {
        name: 'intelligence_sources',
        mapping: {
          source_id: 'source_id',
          name: 'name',
          type: 'type',
          api_endpoint: 'api_endpoint',
          config_json: 'config_json',
          is_active: 'is_active',
          last_sync: 'last_sync',
          created_at: 'created_at'
        }
      },
      {
        name: 'intelligence_items',
        mapping: {
          item_id: 'item_id',
          source_id: 'source_id',
          external_id: 'external_id',
          title: 'title',
          content: 'content',
          url: 'url',
          author: 'author',
          published_at: 'published_at',
          severity_score: 'severity_score',
          category: 'category',
          tags: 'tags',
          metadata: 'metadata',
          status: 'status',
          interaction_count: 'interaction_count',
          created_at: 'created_at',
          updated_at: 'updated_at'
        }
      }
    ];

    if (fs.existsSync(sqliteDbPath)) {
      // Migrate each table
      for (const table of tables) {
        const data = await exportSQLiteTable(table.name);
        await importToPostgreSQL(table.name, data, table.mapping);
      }
    }

    // Create default test user if users table is empty
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

    console.log('\n🎉 Data migration completed successfully!');
    console.log('\n📊 Final PostgreSQL Database Summary:');
    
    // Get final counts
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${table.name}`);
        const count = parseInt(result.rows[0].count);
        console.log(`   ${table.name}: ${count} records`);
      } catch (error) {
        // Table might not exist, skip
      }
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runDataMigration().catch(console.error);
