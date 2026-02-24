const request = require('supertest');
const { globalDb, dbRun, getHouseholdDb } = require('../../db');
const app = require('../../App');
const { seedHousehold } = require('../utils');

describe('Export Route', () => {
  let household;
  let authToken;

  beforeAll(async () => {
    // Seed a test household
    household = await seedHousehold();
    authToken = household.token;
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
    await dbRun(globalDb, 'DELETE FROM households WHERE id = ?', [household.id]);
    await dbRun(globalDb, 'DELETE FROM users WHERE email = ?', [household.adminEmail]);
    try {
      const hhDb = getHouseholdDb(household.id);
      hhDb.close();
    } catch (e) {}
  });
});
