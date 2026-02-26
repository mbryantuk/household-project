const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { db, pool } = require('./index');
const path = require('path');

async function runMigrations() {
  console.log('⏳ Running migrations...');
  try {
    await migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });
    console.log('✅ Migrations completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    // Do not close pool if called from elsewhere, but here we are in a script
    if (require.main === module) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
