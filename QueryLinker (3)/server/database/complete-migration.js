import { Pool } from 'pg';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

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

// SQLite database path
const sqliteDbPath = join(__dirname, '../../data/querylinker.db');

console.log('🚀 Starting comprehensive SQLite to PostgreSQL migration...');

async function ensurePostgreSQLTables() {
  console.log('\n🏗️  Ensuring all PostgreSQL tables exist...');
  
  const client = await pool.connect();
  
  try {
    // Create all necessary tables based on SQLite schema
    const tableCreationQueries = [
      // Users table (already exists but let's ensure correct structure)
      `CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        avatar_url TEXT,
        provider VARCHAR(50),
        provider_id VARCHAR(255),
        email_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMP,
        email_verification_token VARCHAR(255),
        preferences JSONB DEFAULT '{}'
      )`,
      
      // User sessions
      `CREATE TABLE IF NOT EXISTS user_sessions (
        session_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id),
        token VARCHAR(255),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Chat messages 
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255),
        user_name VARCHAR(255),
        message_text TEXT,
        message_type VARCHAR(50),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Intelligence sources
      `CREATE TABLE IF NOT EXISTS intelligence_sources (
        source_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        api_endpoint TEXT,
        config_json JSONB,
        is_active BOOLEAN DEFAULT true,
        last_sync TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Intelligence items
      `CREATE TABLE IF NOT EXISTS intelligence_items (
        item_id SERIAL PRIMARY KEY,
        source_id INTEGER REFERENCES intelligence_sources(source_id),
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
      )`,
      
      // Intelligence interactions
      `CREATE TABLE IF NOT EXISTS intelligence_interactions (
        interaction_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id),
        item_id INTEGER REFERENCES intelligence_items(item_id),
        action_type VARCHAR(50) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'
      )`,
      
      // Intelligence categories
      `CREATE TABLE IF NOT EXISTS intelligence_categories (
        category_id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        color VARCHAR(7),
        icon VARCHAR(50),
        priority INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true
      )`,
      
      // Systems table for integration registry
      `CREATE TABLE IF NOT EXISTS systems (
        system_id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        base_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Records table for express-sqlite-rag
      `CREATE TABLE IF NOT EXISTS records (
        record_id SERIAL PRIMARY KEY,
        system_id INTEGER REFERENCES systems(system_id),
        external_id VARCHAR(255),
        title TEXT,
        body TEXT,
        tags JSONB DEFAULT '[]',
        url TEXT,
        status VARCHAR(20) DEFAULT 'active',
        source_type VARCHAR(50) DEFAULT 'doc',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(system_id, external_id)
      )`,
      
      // Record embeddings
      `CREATE TABLE IF NOT EXISTS record_embeddings (
        id SERIAL PRIMARY KEY,
        record_id INTEGER REFERENCES records(record_id),
        vector JSONB,
        model VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // SLA analytics
      `CREATE TABLE IF NOT EXISTS sla_analytics (
        id SERIAL PRIMARY KEY,
        metric_name VARCHAR(100),
        metric_value DECIMAL,
        measurement_date DATE,
        system VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];
    
    for (const query of tableCreationQueries) {
      await client.query(query);
    }
    
    console.log('✅ All PostgreSQL tables ensured');
  } finally {
    client.release();
  }
}

async function extractSQLiteData() {
  console.log('\n📤 Extracting data from SQLite database...');
  
  if (!existsSync(sqliteDbPath)) {
    console.log('❌ SQLite database file not found');
    return null;
  }
  
  let sqliteDb;
  try {
    sqliteDb = new Database(sqliteDbPath, { readonly: true });
    console.log('✅ Connected to SQLite database');
    
    // Get list of all tables
    const tables = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    console.log(`📋 Found ${tables.length} tables in SQLite:`, tables.map(t => t.name));
    
    const extractedData = {};
    
    for (const table of tables) {
      const tableName = table.name;
      console.log(`📊 Extracting data from table: ${tableName}`);
      
      try {
        // Get table schema
        const schema = sqliteDb.pragma(`table_info(${tableName})`);
        
        // Get all data
        const data = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all();
        
        extractedData[tableName] = {
          schema: schema,
          data: data,
          rowCount: data.length
        };
        
        console.log(`   ✅ Extracted ${data.length} rows from ${tableName}`);
      } catch (error) {
        console.log(`   ❌ Error extracting from ${tableName}:`, error.message);
        extractedData[tableName] = { schema: [], data: [], rowCount: 0, error: error.message };
      }
    }
    
    // Save extracted data to JSON file for backup
    const backupPath = join(__dirname, '../../data/sqlite-backup.json');
    writeFileSync(backupPath, JSON.stringify(extractedData, null, 2));
    console.log(`💾 Backup saved to: ${backupPath}`);
    
    return extractedData;
    
  } catch (error) {
    console.error('❌ Error extracting SQLite data:', error);
    return null;
  } finally {
    if (sqliteDb) {
      sqliteDb.close();
    }
  }
}

async function importDataToPostgreSQL(extractedData) {
  console.log('\n📥 Importing data to PostgreSQL...');
  
  if (!extractedData) {
    console.log('❌ No data to import');
    return;
  }
  
  const client = await pool.connect();
  
  try {
    // Define table import order to handle foreign keys
    const importOrder = [
      'users',
      'user_sessions', 
      'systems',
      'records',
      'record_embeddings',
      'intelligence_sources',
      'intelligence_categories',
      'intelligence_items',
      'intelligence_interactions',
      'chat_messages',
      'cached_suggestions',
      'user_interactions',
      'password_reset_tokens',
      'system_sync_config',
      'solutions',
      'solution_chunks',
      'sla_analytics'
    ];
    
    for (const tableName of importOrder) {
      if (!extractedData[tableName] || extractedData[tableName].data.length === 0) {
        console.log(`⏭️  Skipping ${tableName} (no data)`);
        continue;
      }
      
      console.log(`📥 Importing ${extractedData[tableName].data.length} rows to ${tableName}...`);
      
      const tableData = extractedData[tableName];
      let importedCount = 0;
      let errorCount = 0;
      
      for (const row of tableData.data) {
        try {
          await importRowToPostgreSQL(client, tableName, row, tableData.schema);
          importedCount++;
        } catch (error) {
          errorCount++;
          if (errorCount <= 3) { // Only log first 3 errors per table
            console.log(`   ⚠️  Error importing row to ${tableName}:`, error.message);
          }
        }
      }
      
      console.log(`   ✅ Imported ${importedCount} rows to ${tableName}`);
      if (errorCount > 0) {
        console.log(`   ⚠️  ${errorCount} rows failed (likely duplicates or constraint violations)`);
      }
    }
    
    // Update sequences for PostgreSQL auto-increment columns
    await updateSequences(client);
    
  } finally {
    client.release();
  }
}

async function importRowToPostgreSQL(client, tableName, row, schema) {
  const columns = Object.keys(row);
  const values = Object.values(row);
  
  // Convert SQLite data types to PostgreSQL compatible values
  const convertedValues = values.map((value, index) => {
    const columnName = columns[index];
    const columnInfo = schema.find(s => s.name === columnName);
    
    // Handle JSON columns
    if (typeof value === 'string' && (
      columnName.includes('json') || 
      columnName === 'tags' || 
      columnName === 'metadata' || 
      columnName === 'preferences' ||
      columnName === 'config_json' ||
      columnName === 'vector'
    )) {
      try {
        return JSON.parse(value);
      } catch {
        return value; // Keep as string if not valid JSON
      }
    }
    
    // Handle boolean columns (SQLite uses 0/1)
    if (typeof value === 'number' && (
      columnName.includes('active') || 
      columnName.includes('verified') || 
      columnName === 'used' ||
      columnName === 'is_active' ||
      columnName === 'email_verified'
    )) {
      return Boolean(value);
    }
    
    // Handle NULL values
    if (value === null || value === undefined) {
      return null;
    }
    
    return value;
  });
  
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  const columnsList = columns.join(', ');
  
  const query = `
    INSERT INTO ${tableName} (${columnsList})
    VALUES (${placeholders})
    ON CONFLICT DO NOTHING
  `;
  
  await client.query(query, convertedValues);
}

async function updateSequences(client) {
  console.log('\n🔢 Updating PostgreSQL sequences...');
  
  const sequenceQueries = [
    "SELECT setval('users_user_id_seq', COALESCE((SELECT MAX(user_id) FROM users), 1))",
    "SELECT setval('user_sessions_session_id_seq', COALESCE((SELECT MAX(session_id) FROM user_sessions), 1))", 
    "SELECT setval('systems_system_id_seq', COALESCE((SELECT MAX(system_id) FROM systems), 1))",
    "SELECT setval('records_record_id_seq', COALESCE((SELECT MAX(record_id) FROM records), 1))",
    "SELECT setval('intelligence_sources_source_id_seq', COALESCE((SELECT MAX(source_id) FROM intelligence_sources), 1))",
    "SELECT setval('intelligence_items_item_id_seq', COALESCE((SELECT MAX(item_id) FROM intelligence_items), 1))",
    "SELECT setval('intelligence_interactions_interaction_id_seq', COALESCE((SELECT MAX(interaction_id) FROM intelligence_interactions), 1))",
    "SELECT setval('intelligence_categories_category_id_seq', COALESCE((SELECT MAX(category_id) FROM intelligence_categories), 1))",
    "SELECT setval('chat_messages_id_seq', COALESCE((SELECT MAX(id) FROM chat_messages), 1))"
  ];
  
  for (const query of sequenceQueries) {
    try {
      await client.query(query);
    } catch (error) {
      console.log(`   ⚠️  Error updating sequence: ${error.message}`);
    }
  }
  
  console.log('✅ Sequences updated');
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  const client = await pool.connect();
  
  try {
    // Get counts from all tables
    const tables = [
      'users', 'user_sessions', 'chat_messages', 'cached_suggestions',
      'user_interactions', 'system_sync_config', 'solutions', 'solution_chunks',
      'intelligence_sources', 'intelligence_items', 'intelligence_interactions',
      'intelligence_categories', 'password_reset_tokens', 'systems', 'records',
      'record_embeddings', 'sla_analytics'
    ];
    
    console.log('\n📊 Final PostgreSQL Data Summary:');
    let totalRecords = 0;
    
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        const count = parseInt(result.rows[0].count);
        totalRecords += count;
        console.log(`   ${table}: ${count} records`);
      } catch (error) {
        console.log(`   ${table}: table not found or error`);
      }
    }
    
    console.log(`\n🎉 Migration Complete! Total records in PostgreSQL: ${totalRecords}`);
    
    // Test a sample query
    const sampleUser = await client.query('SELECT email, full_name FROM users LIMIT 1');
    if (sampleUser.rows.length > 0) {
      console.log(`✅ Sample user: ${sampleUser.rows[0].email} (${sampleUser.rows[0].full_name})`);
    }
    
  } finally {
    client.release();
  }
}

async function runCompleteMigration() {
  try {
    console.log('🔗 PostgreSQL connection string:', process.env.DATABASE_URL ? '***configured***' : '❌ NOT SET');
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable not set');
      process.exit(1);
    }

    // Test PostgreSQL connection
    const client = await pool.connect();
    console.log('✅ PostgreSQL connection successful');
    client.release();

    // Step 1: Ensure all PostgreSQL tables exist
    await ensurePostgreSQLTables();
    
    // Step 2: Extract all data from SQLite
    const extractedData = await extractSQLiteData();
    
    if (!extractedData) {
      console.log('❌ Failed to extract SQLite data');
      process.exit(1);
    }
    
    // Step 3: Import data to PostgreSQL
    await importDataToPostgreSQL(extractedData);
    
    // Step 4: Verify migration
    await verifyMigration();

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCompleteMigration().catch(console.error);
}

export { runCompleteMigration };
