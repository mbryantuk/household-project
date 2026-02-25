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

    expect(res.body.data).toBeDefined();
    expect(res.body.data.metadata).toBeDefined();
    expect(res.body.data.household).toBeDefined();
    expect(res.body.data.users).toBeDefined();
    expect(res.body.data.data).toBeDefined();
  });

  afterAll(async () => {
    // Clean up the test household
    const { db } = require('../../db/index');
    const { households, users, userHouseholds } = require('../../db/schema');
    const { eq } = require('drizzle-orm');
    await db.delete(userHouseholds).where(eq(userHouseholds.householdId, household.id));
    await db.delete(households).where(eq(households.id, household.id));
    await db.delete(users).where(eq(users.email, household.adminEmail));
    try {
      const hhDb = getHouseholdDb(household.id);
      hhDb.close();
    } catch (e) {}
  });
});
