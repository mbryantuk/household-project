const request = require('supertest');
const app = require('../../App');

const ADMIN_EMAIL = `stress_admin_${Date.now()}@test.com`;
const PASSWORD = 'Password123!';

describe('⚡ SQLite Concurrency Stress', () => {
  jest.setTimeout(30000);

  let token;
  let householdId;

  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register')
      .set('x-bypass-maintenance', 'true')
      .send({ householdName: 'Stress Test', email: ADMIN_EMAIL, password: PASSWORD, is_test: 1 });
    const login = await request(app)
      .post('/api/auth/login')
      .set('x-bypass-maintenance', 'true')
      .send({ email: ADMIN_EMAIL, password: PASSWORD });
    token = login.body.data.token;
    householdId = login.body.data.user.defaultHouseholdId;

    if (!householdId) {
      const hList = await request(app)
        .get('/api/auth/my-households')
        .set('Authorization', `Bearer ${token}`)
        .set('x-bypass-maintenance', 'true');
      householdId = hList.body.data[0]?.id;
    }

    await request(app)
      .post(`/api/households/${householdId}/select`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-bypass-maintenance', 'true');
  });

  afterAll(async () => {
    if (householdId)
      await request(app)
        .delete(`/api/households/${householdId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-bypass-maintenance', 'true');
  });

  test('🧬 WAL Mode Concurrency (20 Parallel Writes)', async () => {
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(
        request(app)
          .put(`/api/households/${householdId}/details`)
          .set('Authorization', `Bearer ${token}`)
          .set('x-bypass-maintenance', 'true')
          .send({ notes: `Stress Write ${i}` })
      );
    }

    const results = await Promise.all(promises);
    const failures = results.filter((r) => r.status !== 200);

    if (failures.length > 0) {
      console.error(
        `❌ Concurrency Failure Details: ${failures.map((f) => `${f.status}: ${JSON.stringify(f.body)}`).join(', ')}`
      );
    }

    console.log(
      `Concurrency Results: ${results.length - failures.length} Success, ${failures.length} Failed`
    );
    expect(failures.length).toBe(0);
  });
});
