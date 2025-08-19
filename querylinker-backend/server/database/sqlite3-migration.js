import { Pool } from 'pg';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

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

console.log('🚀 Starting SQLite to PostgreSQL migration with sqlite3 package...');

function openSQLiteDatabase() {
  return new Promise((resolve, reject) => {
    if (!existsSync(sqliteDbPath)) {
      reject(new Error('SQLite database file not found'));
      return;
    }
    
    const db = new sqlite3.Database(sqliteDbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('✅ Connected to SQLite database');
        resolve(db);
      }
    });
  });
}

function getAllTables(db) {
  return new Promise((resolve, reject) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, tables) => {
      if (err) {
        reject(err);
      } else {
        resolve(tables);
      }
    });
  });
}

function getTableData(db, tableName) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function getTableSchema(db, tableName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, schema) => {
      if (err) {
        reject(err);
      } else {
        resolve(schema);
      }
    });
  });
}

async function extractAllData() {
  console.log('\n📤 Extracting all data from SQLite...');
  
  const db = await openSQLiteDatabase();
  const extractedData = {};
  
  try {
    // Get all tables
    const tables = await getAllTables(db);
    console.log(`📋 Found ${tables.length} tables:`, tables.map(t => t.name));
    
    // Extract data from each table
    for (const table of tables) {
      const tableName = table.name;
      console.log(`📊 Extracting ${tableName}...`);
      
      try {
        const [data, schema] = await Promise.all([
          getTableData(db, tableName),
          getTableSchema(db, tableName)
        ]);
        
        extractedData[tableName] = {
          schema: schema,
          data: data,
          rowCount: data.length
        };
        
        console.log(`   ✅ Extracted ${data.length} rows from ${tableName}`);
      } catch (error) {
        console.log(`   ❌ Error extracting ${tableName}:`, error.message);
        extractedData[tableName] = { schema: [], data: [], rowCount: 0, error: error.message };
      }
    }
    
    return extractedData;
    
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Error closing SQLite database:', err);
      } else {
        console.log('✅ SQLite database closed');
      }
    });
  }
}

async function ensurePostgreSQLTables() {
  console.log('\n🏗️  Creating missing PostgreSQL tables...');
  
  const client = await pool.connect();
  
  try {
    const createQueries = [
      // Systems table
      `CREATE TABLE IF NOT EXISTS systems (
        system_id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        base_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Records table
      `CREATE TABLE IF NOT EXISTS records (
        record_id SERIAL PRIMARY KEY,
        system_id INTEGER REFERENCES systems(system_id),
        external_id VARCHAR(255),
        title TEXT,
        body TEXT,
        tags TEXT, -- Store as TEXT initially, convert to JSONB later
        url TEXT,
        status VARCHAR(20) DEFAULT 'active',
        source_type VARCHAR(50) DEFAULT 'doc',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Record embeddings
      `CREATE TABLE IF NOT EXISTS record_embeddings (
        id SERIAL PRIMARY KEY,
        record_id INTEGER REFERENCES records(record_id),
        vector TEXT, -- Store as TEXT initially
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
    
    for (const query of createQueries) {
      await client.query(query);
    }
    
    console.log('✅ PostgreSQL tables ensured');
  } finally {
    client.release();
  }
}

async function importTableToPostgreSQL(tableName, tableData) {
  if (!tableData.data || tableData.data.length === 0) {
    console.log(`⏭️  Skipping ${tableName} (no data)`);
    return;
  }
  
  console.log(`📥 Importing ${tableData.data.length} rows to ${tableName}...`);
  
  const client = await pool.connect();
  let importedCount = 0;
  let errorCount = 0;
  
  try {
    for (const row of tableData.data) {
      try {
        const columns = Object.keys(row);
        const values = Object.values(row).map(value => {
          // Handle NULL values
          if (value === null || value === undefined) {
            return null;
          }
          
          // Convert boolean-like numbers
          if (typeof value === 'number' && (value === 0 || value === 1)) {
            const columnName = columns[Object.values(row).indexOf(value)];
            if (columnName && (
              columnName.includes('active') || 
              columnName.includes('verified') || 
              columnName === 'is_active' ||
              columnName === 'email_verified'
            )) {
              return Boolean(value);
            }
          }
          
          return value;
        });
        
        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
        const columnsList = columns.join(', ');
        
        const query = `
          INSERT INTO ${tableName} (${columnsList})
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;
        
        await client.query(query, values);
        importedCount++;
        
      } catch (error) {
        errorCount++;
        if (errorCount <= 3) {
          console.log(`   ⚠️  Error importing row: ${error.message}`);
        }
      }
    }
    
    console.log(`   ✅ Imported ${importedCount} rows to ${tableName}`);
    if (errorCount > 0) {
      console.log(`   ⚠️  ${errorCount} rows failed (likely duplicates)`);
    }
    
  } finally {
    client.release();
  }
}

async function runMigration() {
  try {
    console.log('🔗 PostgreSQL connection:', process.env.DATABASE_URL ? '***configured***' : '❌ NOT SET');
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL not set');
      process.exit(1);
    }

    // Test PostgreSQL connection
    const client = await pool.connect();
    console.log('✅ PostgreSQL connection successful');
    client.release();

    // Ensure PostgreSQL tables exist
    await ensurePostgreSQLTables();
    
    // Extract all SQLite data
    const extractedData = await extractAllData();
    
    // Save backup
    const backupPath = join(__dirname, '../../data/migration-backup.json');
    writeFileSync(backupPath, JSON.stringify(extractedData, null, 2));
    console.log(`💾 Backup saved: ${backupPath}`);
    
    // Import data in order (to handle foreign keys)
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
    
    console.log('\n📥 Starting data import...');
    for (const tableName of importOrder) {
      if (extractedData[tableName]) {
        await importTableToPostgreSQL(tableName, extractedData[tableName]);
      }
    }
    
    // Final verification
    console.log('\n🔍 Verifying migration...');
    const verifyClient = await pool.connect();
    let totalRecords = 0;
    
    try {
      for (const tableName of Object.keys(extractedData)) {
        try {
          const result = await verifyClient.query(`SELECT COUNT(*) FROM ${tableName}`);
          const count = parseInt(result.rows[0].count);
          totalRecords += count;
          console.log(`   ${tableName}: ${count} records`);
        } catch (error) {
          console.log(`   ${tableName}: ${error.message}`);
        }
      }
      
      console.log(`\n🎉 Migration Complete! Total records: ${totalRecords}`);
      
    } finally {
      verifyClient.release();
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);
