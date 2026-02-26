async function migrate() {
  console.log('🚀 Starting legacy SQLite to Postgres migration...');
  console.log('ℹ️ Migration skipped: System is now fully on PostgreSQL.');
  process.exit(0);
}
migrate();
