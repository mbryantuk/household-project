const request = require('supertest');
const { globalDb, getHouseholdDb } = require('../../db');
const app = require('../../server');
const { seedHousehold } = require('../utils');

describe('Export Route', () => {
  let household;
  let authToken;

  beforeAll(async () => {
    // Seed a test household
    household = await seedHousehold();

    // Authenticate as admin user
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'brady@example.com', password: 'password123' });
    authToken = res.body.token;
  });

  it('should export household data as JSON', async () => {
    const res = await request(app)
      .get(`/api/export/${household.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(res.body).toBeDefined();
    expect(res.body.metadata).toBeDefined();
    expect(res.body.household).toBeDefined();
    expect(res.body.users).toBeDefined();
    expect(res.body.data).toBeDefined();
  });

  afterAll(async () => {
    // Clean up the test household
    await globalDb.run('DELETE FROM households WHERE id = ?', [household.id]);
    await globalDb.run('DELETE FROM users WHERE email = ?', ['brady@example.com']);
    await getHouseholdDb(household.id).close();
  });
});
