const request = require('supertest');
const app = require('../App');
const { globalDb, dbRun } = require('../db');

describe('🚀 JSON Tenant Export Verification', () => {
  let token;
  let householdId;
  let email = `export_test_${Date.now()}@test.com`;

  beforeAll(async () => {
    // 1. Register
    await request(app).post('/api/auth/register').send({
      householdName: 'Export JSON House',
      email: email,
      password: 'Password123!',
      firstName: 'Export',
      lastName: 'Tester',
    });

    // 2. Login
    const loginRes = await request(app).post('/api/auth/login').send({
      email: email,
      password: 'Password123!',
    });

    token = loginRes.body.data.token;
    householdId = loginRes.body.data.household.id;

    // 3. Add some data to the tenant DB
    await request(app)
      .post(`/api/households/${householdId}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'John Doe', type: 'adult' });
  });

  test('GET /api/export/:id should return a full JSON package', async () => {
    const res = await request(app)
      .get(`/api/export/${householdId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('application/json');
    expect(res.header['content-disposition']).toContain('attachment');

    const data = res.body.data;
    expect(data.metadata.household_id.toString()).toBe(householdId.toString());
    expect(data.household.name).toBe('Export JSON House');
    expect(data.users.length).toBeGreaterThan(0);
    expect(data.users[0].email).toBe(email);

    // Check tenant data
    expect(data.data.members).toBeDefined();
    expect(data.data.members.length).toBeGreaterThan(0);
    expect(data.data.members[0].name).toBe('John Doe');
  });

  test('Unauthorized user should not be able to export', async () => {
    // Different user
    const otherEmail = `other_${Date.now()}@test.com`;
    await request(app).post('/api/auth/register').send({
      householdName: 'Other House',
      email: otherEmail,
      password: 'Password123!',
    });
    const loginRes = await request(app).post('/api/auth/login').send({
      email: otherEmail,
      password: 'Password123!',
    });
    const otherToken = loginRes.body.data.token;

    const res = await request(app)
      .get(`/api/export/${householdId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });
});
