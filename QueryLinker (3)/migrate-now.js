import { runCompleteMigration } from './server/database/complete-migration.js';

console.log('🚀 Starting data migration from SQLite to PostgreSQL...');

runCompleteMigration()
  .then(() => {
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
