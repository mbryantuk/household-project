const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../../App');
const { db } = require('../../db/index');
const { users, households } = require('../../db/schema');
const { eq } = require('drizzle-orm');

const ADMIN_EMAIL = `destroy_test_${Date.now()}@test.com`;
const SYS_ADMIN_EMAIL = `sysadmin_${Date.now()}@test.com`;
const PASSWORD = 'Password123!';
const DATA_DIR = path.join(__dirname, '../../data');

describe('💣 Tenant Destruction & Cleanup', () => {
  jest.setTimeout(60000);

  let token;
  let sysAdminToken;
  let householdId;

  const unwrap = (res) => (res.body.success ? res.body.data : res.body);

  beforeAll(async () => {
    // 1. Setup: Create User & Household
    await request(app).post('/api/auth/register').send({
      householdName: 'Doom Household',
      email: ADMIN_EMAIL,
      password: PASSWORD,
      is_test: 1,
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: PASSWORD });
    token = unwrap(login).token;

    const hList = await request(app)
      .get('/api/auth/my-households')
      .set('Authorization', `Bearer ${token}`);
    householdId = unwrap(hList)[0]?.id;

    // 2. Setup: Create System Admin
    await request(app)
      .post('/api/auth/register')
      .send({ householdName: 'Admin HH', email: SYS_ADMIN_EMAIL, password: PASSWORD, is_test: 1 });

    await db.update(users).set({ systemRole: 'admin' }).where(eq(users.email, SYS_ADMIN_EMAIL));

    const sysLoginReal = await request(app)
      .post('/api/auth/login')
      .send({ email: SYS_ADMIN_EMAIL, password: PASSWORD });
    sysAdminToken = unwrap(sysLoginReal).token;
  });

  test('🧨 Destroy Tenant: Regular Admin should remove all traces', async () => {
    const email = `reg_${Date.now()}@test.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ householdName: 'Regular Destruct HH', email: email, password: PASSWORD, is_test: 1 });
    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ email: email, password: PASSWORD });
    const actualToken = unwrap(login2).token;

    const hList = await request(app)
      .get('/api/auth/my-households')
      .set('Authorization', `Bearer ${actualToken}`);
    const hhId = unwrap(hList)[0]?.id;

    // Guaranteed "touch" of the tenant DB file
    const dbPath = path.join(DATA_DIR, `household_${hhId}.db`);
    fs.writeFileSync(dbPath, 'Fake SQLite Content');
    expect(fs.existsSync(dbPath)).toBe(true);

    // Execute Destruction
    const delRes = await request(app)
      .delete(`/api/households/${hhId}`)
      .set('Authorization', `Bearer ${actualToken}`);
    expect(delRes.status).toBe(200);

    // Verify Destruction
    const [hhRow] = await db.select().from(households).where(eq(households.id, hhId));
    expect(hhRow).toBeUndefined();
    expect(fs.existsSync(dbPath)).toBe(false);
  });

  test('👑 Destroy Tenant: System Admin should be able to destroy ANY household', async () => {
    const otherUserEmail = `target_${Date.now()}@test.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ householdName: 'Target HH', email: otherUserEmail, password: PASSWORD, is_test: 1 });

    const [targetHhRow] = await db
      .select()
      .from(households)
      .where(eq(households.name, 'Target HH'));
    const targetHhId = targetHhRow.id;

    const targetDbPath = path.join(DATA_DIR, `household_${targetHhId}.db`);
    fs.writeFileSync(targetDbPath, 'Fake SQLite Content');
    expect(fs.existsSync(targetDbPath)).toBe(true);

    const delRes = await request(app)
      .delete(`/api/households/${targetHhId}`)
      .set('Authorization', `Bearer ${sysAdminToken}`);

    expect(delRes.status).toBe(200);
    expect(unwrap(delRes).message).toContain('deleted');

    const [hhRow] = await db.select().from(households).where(eq(households.id, targetHhId));
    expect(hhRow).toBeUndefined();
    expect(fs.existsSync(targetDbPath)).toBe(false);
  });
});
