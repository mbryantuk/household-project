const request = require('supertest');
const app = require('../App');

describe('💰 Finance Routing Verification', () => {
  let householdId;
  let token;
  let adminEmail = `admin_routing_${Date.now()}@test.com`;

  beforeAll(async () => {
    // Register and login to get a token and household ID
    await request(app).post('/api/auth/register').send({
      householdName: 'Routing House',
      email: adminEmail,
      password: 'Password123!',
    });
    const loginRes = await request(app).post('/api/auth/login').send({
      email: adminEmail,
      password: 'Password123!',
    });
    token = loginRes.body.token;
    householdId = loginRes.body.household?.id;

    // Select household
    await request(app)
      .post(`/api/households/${householdId}/select`)
      .set('Authorization', `Bearer ${token}`);
  });

  afterAll(async () => {
    if (householdId) {
      await request(app)
        .delete(`/api/households/${householdId}`)
        .set('Authorization', `Bearer ${token}`);
    }
  });

  test('GET /api/households/:id/finance/savings/pots should not return 404', async () => {
    const res = await request(app)
      .get(`/api/households/${householdId}/finance/savings/pots`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).not.toBe(404);
    if (res.status === 200) {
      expect(Array.isArray(res.body)).toBe(true);
    }
  });

  test('GET /api/households/:id/finance/savings/:itemId should still work for valid items', async () => {
    // First create a saving
    const createRes = await request(app)
      .post(`/api/households/${householdId}/finance/savings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ institution: 'Test Bank', account_name: 'Main Savings' });

    const itemId = createRes.body.id;
    expect(itemId).toBeDefined();

    const res = await request(app)
      .get(`/api/households/${householdId}/finance/savings/${itemId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.institution).toBe('Test Bank');
  });

  test('GET /api/households/:id/finance/savings/999999 should return 404', async () => {
    const res = await request(app)
      .get(`/api/households/${householdId}/finance/savings/999999`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
