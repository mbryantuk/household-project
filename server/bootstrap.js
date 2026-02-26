const { users, households, userHouseholds } = require('./db/schema');
const { eq, and, desc, sql } = require('drizzle-orm');

async function bootstrap(db) {
  try {
    // Ensure Materialized View exists
    await db.execute(sql`
      CREATE MATERIALIZED VIEW IF NOT EXISTS audit_log_stats AS
      SELECT 
        household_id, 
        action, 
        COUNT(*) as action_count,
        MAX(created_at) as last_action_at
      FROM audit_logs
      GROUP BY household_id, action
    `);

    const adminEmail = 'mbryantuk@gmail.com';

    // 1. Find User
    const [user] = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    if (!user) return;

    // 2. Ensure admin access to Household #60 (Bryant)
    const [hh60] = await db.select().from(households).where(eq(households.id, 60)).limit(1);
    if (hh60) {
      const [link] = await db
        .select()
        .from(userHouseholds)
        .where(and(eq(userHouseholds.userId, user.id), eq(userHouseholds.householdId, 60)))
        .limit(1);

      if (!link) {
        await db.insert(userHouseholds).values({
          userId: user.id,
          householdId: 60,
          role: 'admin',
          isActive: true,
        });
      } else if (link.role !== 'admin') {
        await db
          .update(userHouseholds)
          .set({ role: 'admin' })
          .where(and(eq(userHouseholds.userId, user.id), eq(userHouseholds.householdId, 60)));
      }
    }

    // 3. Ensure admin access to latest test household
    const [latestTestHh] = await db
      .select()
      .from(households)
      .where(eq(households.isTest, 1))
      .orderBy(desc(households.id))
      .limit(1);

    if (latestTestHh) {
      const [testLink] = await db
        .select()
        .from(userHouseholds)
        .where(
          and(eq(userHouseholds.userId, user.id), eq(userHouseholds.householdId, latestTestHh.id))
        )
        .limit(1);

      if (!testLink) {
        await db.insert(userHouseholds).values({
          userId: user.id,
          householdId: latestTestHh.id,
          role: 'admin',
          isActive: true,
        });
      } else if (testLink.role !== 'admin') {
        await db
          .update(userHouseholds)
          .set({ role: 'admin' })
          .where(
            and(eq(userHouseholds.userId, user.id), eq(userHouseholds.householdId, latestTestHh.id))
          );
      }
    }

    console.log(`✅ Bootstrap: Admin access verified for ${adminEmail}`);
  } catch (err) {
    console.error('❌ Bootstrap failure:', err);
  }
}

module.exports = { bootstrap };
