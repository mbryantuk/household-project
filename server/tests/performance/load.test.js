const request = require('supertest');
const app = require('../../App');
const { performance } = require('perf_hooks');

describe('Performance & Speed Tests', () => {
  jest.setTimeout(120000);

  let sysAdminToken = '';
  let householdId = null;
  let adminToken = '';
  const uniqueId = Date.now();

  beforeAll(async () => {
    // 0. Register Super Admin
    await request(app)
      .post('/api/auth/register')
      .send({
        householdName: 'Totem System',
        email: 'super@totem.local',
        password: 'superpassword',
        is_test: 1,
      });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'super@totem.local', password: 'superpassword' });
    sysAdminToken = loginRes.body.data.token;

    // Promote to system admin
    const { db } = require('../../db/index');
    const { users } = require('../../db/schema');
    const { eq } = require('drizzle-orm');
    await db.update(users).set({ systemRole: 'admin' }).where(eq(users.email, 'super@totem.local'));

    const hhRes = await request(app)
      .post('/api/auth/register')
      .send({
        householdName: `PerfTest_${uniqueId}`,
        email: `perf_${uniqueId}@example.com`,
        password: 'password123',
        is_test: 1,
      });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: `perf_${uniqueId}@example.com`, password: 'password123' });
    
    adminToken = adminLogin.body.data.token;
    householdId = adminLogin.body.data.user.defaultHouseholdId || adminLogin.body.data.user.lastHouseholdId;

    if (!householdId) {
       const hhs = await request(app)
         .get('/api/auth/my-households')
         .set('Authorization', `Bearer ${adminToken}`);
       householdId = hhs.body.data[0].id;
    }

    // Seed data
    await request(app)
      .post(`/api/households/${householdId}/assets`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Speed Test Asset', purchase_value: 100 });
    await request(app)
      .post(`/api/households/${householdId}/finance/savings`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        institution: 'Bank',
        account_name: 'Main',
        current_balance: 1000,
        account_number: '12345678',
      });
  });

  afterAll(async () => {
    if (householdId)
      await request(app)
        .delete(`/api/admin/households/${householdId}`)
        .set('Authorization', `Bearer ${sysAdminToken}`);
  });

  const measureSpeed = async (label, fn, iterations = 50) => {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await fn();
    }
    const end = performance.now();
    const avg = (end - start) / iterations;
    console.log(`[SPEED] ${label}: ${avg.toFixed(2)}ms (avg over ${iterations} runs)`);
    return avg;
  };

  it('should measure login speed (Heavy Bcrypt)', async () => {
    const avg = await measureSpeed(
      'Login',
      () =>
        request(app)
          .post('/api/auth/login')
          .send({ email: `perf_${uniqueId}@example.com`, password: 'password123' }),
      10
    );
    expect(avg).toBeLessThan(1000);
  });

  it('should measure GET assets speed (Plain Read)', async () => {
    const avg = await measureSpeed(
      'GET Assets',
      () =>
        request(app)
          .get(`/api/households/${householdId}/assets`)
          .set('Authorization', `Bearer ${adminToken}`),
      30
    );
    expect(avg).toBeLessThan(150);
  });

  it('should measure GET finance savings speed (Decryption Overhead)', async () => {
    const avg = await measureSpeed(
      'GET Savings',
      () =>
        request(app)
          .get(`/api/households/${householdId}/finance/savings`)
          .set('Authorization', `Bearer ${adminToken}`),
      30
    );
    expect(avg).toBeLessThan(200);
  });

  it('should measure POST asset speed (Plain Write)', async () => {
    const avg = await measureSpeed(
      'POST Asset',
      () =>
        request(app)
          .post(`/api/households/${householdId}/assets`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Perf Asset', purchase_value: 10 }),
      10
    );
    expect(avg).toBeLessThan(250);
  });

  it('should handle "Load" (Concurrent requests)', async () => {
    const concurrency = 15; // Increased
    const totalRequests = 150;
    const batches = totalRequests / concurrency;

    const start = performance.now();
    for (let i = 0; i < batches; i++) {
      const promises = [];
      for (let j = 0; j < concurrency; j++) {
        promises.push(
          request(app)
            .get(`/api/households/${householdId}/assets`)
            .set('Authorization', `Bearer ${adminToken}`)
        );
      }
      await Promise.all(promises);
    }
    const end = performance.now();
    const totalTime = end - start;
    const rps = (totalRequests / (totalTime / 1000)).toFixed(2);
    console.log(
      `[LOAD] Concurrency ${concurrency}: ${rps} req/sec (${totalRequests} total requests)`
    );

    expect(Number(rps)).toBeGreaterThan(10);
  });
});
