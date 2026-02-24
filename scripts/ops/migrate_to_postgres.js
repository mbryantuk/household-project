const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const sqlite3 = require('sqlite3');
const path = require('path');
const {
  users,
  households,
  userHouseholds,
  testResults,
  versionHistory,
} = require('../../server/db/schema');
const config = require('../../server/config');

async function migrate() {
  console.log('🚀 Starting legacy SQLite to Postgres migration...');

  const pool = new Pool({ connectionString: config.DATABASE_URL });
  const db = drizzle(pool);

  const sqlitePath = path.join(__dirname, '../../server/data/global.db');
  const sqlite = new sqlite3.Database(sqlitePath);

  const getSqliteData = (query) =>
    new Promise((resolve, reject) => {
      sqlite.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

  try {
    // 1. Households
    const hhData = await getSqliteData('SELECT * FROM households');
    console.log(`📍 Found ${hhData.length} households in SQLite.`);
    for (const hh of hhData) {
      await db
        .insert(households)
        .values({
          id: hh.id,
          name: hh.name,
          addressStreet: hh.address_street,
          addressCity: hh.address_city,
          addressZip: hh.address_zip,
          avatar: hh.avatar,
          dateFormat: hh.date_format,
          currency: hh.currency,
          decimals: hh.decimals,
          enabledModules: hh.enabled_modules,
          metadataSchema: hh.metadata_schema,
          autoBackup: hh.auto_backup === 1,
          backupRetention: hh.backup_retention,
          isTest: hh.is_test,
          debugMode: hh.debug_mode,
          nightlyVersionFilter: hh.nightly_version_filter,
          createdAt: new Date(hh.created_at),
        })
        .onConflictDoNothing();
    }

    // 2. Users
    const userData = await getSqliteData('SELECT * FROM users');
    const validUserIds = new Set(userData.map((u) => u.id));
    console.log(`👤 Found ${userData.length} users in SQLite.`);
    for (const user of userData) {
      await db
        .insert(users)
        .values({
          id: user.id,
          email: user.email,
          username: user.username,
          passwordHash: user.password_hash,
          firstName: user.first_name,
          lastName: user.last_name,
          avatar: user.avatar,
          systemRole: user.system_role,
          dashboardLayout: user.dashboard_layout,
          stickyNote: user.sticky_note,
          budgetSettings: user.budget_settings,
          theme: user.theme,
          mode: user.mode,
          defaultHouseholdId: user.default_household_id,
          lastHouseholdId: user.last_household_id,
          isTest: user.is_test,
          isActive: user.is_active === 1,
          mfaEnabled: user.mfa_enabled === 1,
          mfaSecret: user.mfa_secret,
          createdAt: new Date(user.created_at),
        })
        .onConflictDoNothing();
    }

    // 3. UserHouseholds
    const uhData = await getSqliteData('SELECT * FROM user_households');
    console.log(`🔗 Found ${uhData.length} user-household links in SQLite.`);
    for (const uh of uhData) {
      if (!validUserIds.has(uh.user_id)) {
        console.warn(`Skipping orphaned user_household link: user_id ${uh.user_id}`);
        continue;
      }
      await db
        .insert(userHouseholds)
        .values({
          userId: uh.user_id,
          householdId: uh.household_id,
          role: uh.role,
          isActive: uh.is_active === 1,
          joinedAt: new Date(uh.joined_at),
        })
        .onConflictDoNothing();
    }

    // 4. Test Results
    const trData = await getSqliteData('SELECT * FROM test_results');
    console.log(`📊 Found ${trData.length} test results in SQLite.`);
    for (const tr of trData) {
      await db
        .insert(testResults)
        .values({
          id: tr.id,
          testType: tr.test_type,
          suiteName: tr.suite_name,
          passes: tr.passes,
          fails: tr.fails,
          total: tr.total,
          duration: tr.duration,
          reportJson: tr.report_json,
          version: tr.version,
          createdAt: new Date(tr.created_at),
        })
        .onConflictDoNothing();
    }

    // 5. Version History
    const vhData = await getSqliteData('SELECT * FROM version_history');
    console.log(`📜 Found ${vhData.length} version history records in SQLite.`);
    for (const vh of vhData) {
      await db
        .insert(versionHistory)
        .values({
          id: vh.id,
          version: vh.version,
          comment: vh.comment,
          createdAt: new Date(vh.created_at),
        })
        .onConflictDoNothing();
    }

    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
