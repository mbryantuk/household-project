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

    const data = res.body;
    expect(data.users).toBeDefined();
    expect(data.household).toBeDefined();
    expect(data.data).toBeDefined();
  });

  afterAll(async () => {
    // Clean up
    await dbRun(globalDb, 'DELETE FROM user_households WHERE household_id = ?', [household.id]);
    await dbRun(globalDb, 'DELETE FROM households WHERE id = ?', [household.id]);
  });
});
