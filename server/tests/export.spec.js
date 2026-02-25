// server/tests/export.spec.js
const request = require('supertest');
const app = require('../App');
const { globalDb, dbRun } = require('../db');
const { seedHousehold } = require('./utils');

describe('GET /api/export/:household_id', () => {
  let household;

  beforeAll(async () => {
    household = await seedHousehold('Export Test');
  });

  it('should return 404 if household_id is missing (route not matched)', async () => {
    const res = await request(app)
      .get('/api/export/')
      .set('Authorization', `Bearer ${household.token}`);
    expect(res.statusCode).toEqual(404);
  });

  it('should return 200 and export data if household_id is valid', async () => {
    const res = await request(app)
      .get(`/api/export/${household.id}`)
      .set('Authorization', `Bearer ${household.token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.header['content-type']).toMatch(/json/);

    const data = res.body.data;
    expect(data.users).toBeDefined();
    expect(data.household).toBeDefined();
    expect(data.data).toBeDefined();
  });

  afterAll(async () => {
    // Clean up
    const { db } = require('../db/index');
    const { households, userHouseholds } = require('../db/schema');
    const { eq } = require('drizzle-orm');
    await db.delete(userHouseholds).where(eq(userHouseholds.householdId, household.id));
    await db.delete(households).where(eq(households.id, household.id));
  });
});
