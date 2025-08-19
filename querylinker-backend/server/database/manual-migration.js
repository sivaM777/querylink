import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

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

console.log('🚀 Starting manual data migration to populate PostgreSQL...');

async function createSampleUsers() {
  console.log('\n👥 Creating sample users with proper authentication...');
  
  const client = await pool.connect();
  
  try {
    // Create test users with hashed passwords
    const users = [
      {
        email: 'admin@querylinker.com',
        password: 'admin123',
        full_name: 'System Administrator',
        role: 'admin',
        email_verified: true
      },
      {
        email: 'support@querylinker.com', 
        password: 'support123',
        full_name: 'Support Agent',
        role: 'user',
        email_verified: true
      },
      {
        email: 'analyst@querylinker.com',
        password: 'analyst123',
        full_name: 'IT Analyst',
        role: 'user',
        email_verified: true
      }
    ];
    
    for (const user of users) {
      try {
        const hashedPassword = await bcrypt.hash(user.password, 12);
        
        await client.query(`
          INSERT INTO users (email, password_hash, full_name, role, email_verified, created_at)
          VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
          ON CONFLICT (email) DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            email_verified = EXCLUDED.email_verified,
            updated_at = CURRENT_TIMESTAMP
        `, [user.email, hashedPassword, user.full_name, user.role, user.email_verified]);
        
        console.log(`   ✅ Created/Updated user: ${user.email} (${user.role})`);
      } catch (error) {
        console.log(`   ❌ Error creating user ${user.email}:`, error.message);
      }
    }
    
  } finally {
    client.release();
  }
}

async function createSystemConfigurations() {
  console.log('\n⚙️  Creating system configurations...');
  
  const client = await pool.connect();
  
  try {
    const systems = [
      {
        system: 'Jira Cloud',
        enabled: true,
        api_endpoint: 'https://your-domain.atlassian.net/rest/api/2',
        auth_config: { type: 'basic', username: '', password: '' },
        sync_interval: 3600
      },
      {
        system: 'Confluence',
        enabled: true,
        api_endpoint: 'https://your-domain.atlassian.net/wiki/rest/api',
        auth_config: { type: 'basic', username: '', password: '' },
        sync_interval: 7200
      },
      {
        system: 'GitHub',
        enabled: false,
        api_endpoint: 'https://api.github.com',
        auth_config: { type: 'token', token: '' },
        sync_interval: 1800
      },
      {
        system: 'ServiceNow KB',
        enabled: false,
        api_endpoint: 'https://your-instance.service-now.com/api',
        auth_config: { type: 'basic', username: '', password: '' },
        sync_interval: 3600
      }
    ];
    
    for (const system of systems) {
      try {
        await client.query(`
          INSERT INTO system_sync_config (system, enabled, api_endpoint, auth_config, sync_interval, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (system) DO UPDATE SET
            enabled = EXCLUDED.enabled,
            api_endpoint = EXCLUDED.api_endpoint,
            auth_config = EXCLUDED.auth_config,
            sync_interval = EXCLUDED.sync_interval,
            updated_at = CURRENT_TIMESTAMP
        `, [system.system, system.enabled, system.api_endpoint, JSON.stringify(system.auth_config), system.sync_interval]);
        
        console.log(`   ✅ Configured system: ${system.system}`);
      } catch (error) {
        console.log(`   ❌ Error configuring ${system.system}:`, error.message);
      }
    }
    
  } finally {
    client.release();
  }
}

async function createSampleSolutions() {
  console.log('\n📚 Creating sample knowledge base solutions...');
  
  const client = await pool.connect();
  
  try {
    const solutions = [
      {
        id: 'jira-auth-fix-001',
        system: 'Jira Cloud',
        external_id: 'ISSUE-1234',
        title: 'Fix: Portal 401 errors after security update',
        description: 'Users experiencing 401 unauthorized errors when accessing portal after recent security update',
        content: 'This issue occurs when authentication tokens expire after security updates. Clear browser cache and re-authenticate.',
        snippet: 'Clear browser cache, re-authenticate, check token expiration',
        status: 'resolved',
        priority: 'high',
        author: 'IT Security Team',
        external_url: 'https://your-domain.atlassian.net/browse/ISSUE-1234',
        tags: ['authentication', 'portal', '401', 'security'],
        resolution: 'Clear authentication cache and regenerate tokens',
        steps: [
          'Clear browser cache and cookies',
          'Re-authenticate with valid credentials', 
          'Verify token expiration settings',
          'Test portal access'
        ],
        keywords: 'portal 401 authentication error login failure',
        category: 'Authentication',
        severity: 'medium'
      },
      {
        id: 'confluence-search-002',
        system: 'Confluence',
        external_id: 'DOC-5678',
        title: 'Confluence search indexing issues',
        description: 'Search results not returning recent documents',
        content: 'Search indexing service needs to be restarted to include recent content updates.',
        snippet: 'Restart search indexing service for recent content',
        status: 'resolved',
        priority: 'medium',
        author: 'Documentation Team',
        external_url: 'https://your-domain.atlassian.net/wiki/spaces/IT/pages/5678',
        tags: ['confluence', 'search', 'indexing'],
        resolution: 'Restart search indexing service',
        steps: [
          'Access Confluence administration',
          'Navigate to search indexing',
          'Restart indexing service',
          'Verify search functionality'
        ],
        keywords: 'confluence search index results missing documents',
        category: 'Search',
        severity: 'low'
      },
      {
        id: 'github-webhook-003',
        system: 'GitHub',
        external_id: 'ISSUE-9999',
        title: 'GitHub webhook delivery failures',
        description: 'Webhooks failing to deliver to internal systems',
        content: 'Network firewall blocking webhook deliveries. Update firewall rules to allow GitHub webhook IPs.',
        snippet: 'Update firewall rules for GitHub webhook IPs',
        status: 'resolved',
        priority: 'high',
        author: 'DevOps Team',
        external_url: 'https://github.com/company/repo/issues/9999',
        tags: ['github', 'webhook', 'firewall', 'network'],
        resolution: 'Updated firewall rules for GitHub webhook IP ranges',
        steps: [
          'Identify GitHub webhook IP ranges',
          'Update firewall rules',
          'Test webhook delivery',
          'Monitor webhook logs'
        ],
        keywords: 'github webhook delivery failure firewall network',
        category: 'Integration',
        severity: 'high'
      }
    ];
    
    for (const solution of solutions) {
      try {
        await client.query(`
          INSERT INTO solutions (
            id, system, external_id, title, description, content, snippet, 
            status, priority, author, external_url, tags, resolution, steps, 
            keywords, category, severity, metadata, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            content = EXCLUDED.content,
            updated_at = CURRENT_TIMESTAMP
        `, [
          solution.id, solution.system, solution.external_id, solution.title,
          solution.description, solution.content, solution.snippet, solution.status,
          solution.priority, solution.author, solution.external_url,
          JSON.stringify(solution.tags), solution.resolution, JSON.stringify(solution.steps),
          solution.keywords, solution.category, solution.severity, JSON.stringify({})
        ]);
        
        console.log(`   ✅ Created solution: ${solution.title}`);
      } catch (error) {
        console.log(`   ❌ Error creating solution ${solution.id}:`, error.message);
      }
    }
    
  } finally {
    client.release();
  }
}

async function createSampleInteractions() {
  console.log('\n🔄 Creating sample user interactions...');
  
  const client = await pool.connect();
  
  try {
    // Get a user ID to use for interactions
    const userResult = await client.query('SELECT user_id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      console.log('   ⚠️  No users found, skipping interactions');
      return;
    }
    
    const userId = userResult.rows[0].user_id;
    
    const interactions = [
      {
        user_id: userId,
        incident_number: 'INC0001234',
        suggestion_id: 'jira-auth-fix-001',
        system: 'Jira Cloud',
        suggestion_title: 'Fix: Portal 401 errors after security update',
        suggestion_link: 'https://your-domain.atlassian.net/browse/ISSUE-1234',
        action_type: 'link'
      },
      {
        user_id: userId,
        incident_number: 'INC0001235',
        suggestion_id: 'confluence-search-002',
        system: 'Confluence',
        suggestion_title: 'Confluence search indexing issues',
        suggestion_link: 'https://your-domain.atlassian.net/wiki/spaces/IT/pages/5678',
        action_type: 'view'
      }
    ];
    
    for (const interaction of interactions) {
      try {
        await client.query(`
          INSERT INTO user_interactions (
            user_id, incident_number, suggestion_id, system, 
            suggestion_title, suggestion_link, action_type, timestamp
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        `, [
          interaction.user_id, interaction.incident_number, interaction.suggestion_id,
          interaction.system, interaction.suggestion_title, interaction.suggestion_link,
          interaction.action_type
        ]);
        
        console.log(`   ✅ Created interaction: ${interaction.suggestion_title}`);
      } catch (error) {
        console.log(`   ❌ Error creating interaction:`, error.message);
      }
    }
    
  } finally {
    client.release();
  }
}

async function updateSequences() {
  console.log('\n🔢 Updating PostgreSQL sequences...');
  
  const client = await pool.connect();
  
  try {
    const sequenceQueries = [
      "SELECT setval('users_user_id_seq', COALESCE((SELECT MAX(user_id) FROM users), 1))",
      "SELECT setval('user_sessions_session_id_seq', COALESCE((SELECT MAX(session_id) FROM user_sessions), 1))",
      "SELECT setval('user_interactions_interaction_id_seq', COALESCE((SELECT MAX(interaction_id) FROM user_interactions), 1))",
      "SELECT setval('system_sync_config_id_seq', COALESCE((SELECT MAX(id) FROM system_sync_config), 1))",
      "SELECT setval('cached_suggestions_id_seq', COALESCE((SELECT MAX(id) FROM cached_suggestions), 1))"
    ];
    
    for (const query of sequenceQueries) {
      try {
        await client.query(query);
      } catch (error) {
        // Ignore sequence errors for tables that might not have sequences
      }
    }
    
    console.log('✅ Sequences updated');
  } finally {
    client.release();
  }
}

async function verifyData() {
  console.log('\n🔍 Verifying migrated data...');
  
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
    
    // Test authentication
    const testUser = await client.query(`
      SELECT user_id, email, full_name, role 
      FROM users 
      WHERE email = 'admin@querylinker.com'
    `);
    
    if (testUser.rows.length > 0) {
      console.log(`✅ Test user created: ${testUser.rows[0].email} (${testUser.rows[0].role})`);
      console.log(`🔑 Login credentials: admin@querylinker.com / admin123`);
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

    // Test connection
    const client = await pool.connect();
    console.log('✅ PostgreSQL connection successful');
    client.release();

    // Create sample data
    await createSampleUsers();
    await createSystemConfigurations();
    await createSampleSolutions();
    await createSampleInteractions();
    await updateSequences();
    await verifyData();
    
    console.log('\n🎉 Manual migration completed successfully!');
    console.log('\n🔐 You can now login with:');
    console.log('   Email: admin@querylinker.com');
    console.log('   Password: admin123');
    console.log('\n   Or:');
    console.log('   Email: support@querylinker.com');
    console.log('   Password: support123');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);
