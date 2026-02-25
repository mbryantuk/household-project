const request = require('supertest');
const app = require('../App');

describe('Shopping List API', () => {
  let token;
  let householdId;
  let otherToken;
  let otherHhId;

  const unwrap = (res) => (res.body.success ? res.body.data : res.body);

  beforeAll(async () => {
    // Setup Primary User & Household
    const email = `shopping_test_${Date.now()}@example.com`;
    const password = 'Password123!';

    await request(app)
      .post('/api/auth/register')
      .send({ householdName: 'Shopping Test House', email, password, is_test: 1 });

    const loginRes = await request(app).post('/api/auth/login').send({ email, password });
    const data = unwrap(loginRes);
    token = data.token;
    householdId = data.household?.id;

    // Setup Secondary User & Household
    const otherEmail = `other_shopping_${Date.now()}@example.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ householdName: 'Other House', email: otherEmail, password, is_test: 1 });

    const otherLoginRes = await request(app).post('/api/auth/login').send({ email: otherEmail, password });
    const otherData = unwrap(otherLoginRes);
    otherToken = otherData.token;
    otherHhId = otherData.household?.id;
  });

  test('should add a shopping item', async () => {
    const res = await request(app)
      .post(`/api/households/${householdId}/shopping-list`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Milk',
        quantity: '2L',
        category: 'dairy',
        estimated_cost: 2.5,
      });

    expect(res.statusCode).toBe(201);
    const data = unwrap(res);
    expect(data.name).toBe('Milk');
    expect(data.estimated_cost).toBe(2.5);
  });

  test('should list shopping items and calculate budget', async () => {
    // Add another item
    await request(app)
      .post(`/api/households/${householdId}/shopping-list`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bread', estimated_cost: 1.5 });

    const res = await request(app)
      .get(`/api/households/${householdId}/shopping-list`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    const data = unwrap(res);
    expect(data.items.length).toBeGreaterThanOrEqual(2);
    expect(data.summary.total_estimated_cost).toBeGreaterThanOrEqual(4.0);
  });

  test('should update an item', async () => {
    const listRes = await request(app)
      .get(`/api/households/${householdId}/shopping-list`)
      .set('Authorization', `Bearer ${token}`);
    
    const item = unwrap(listRes).items[0];

    const updateRes = await request(app)
      .put(`/api/households/${householdId}/shopping-list/${item.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ is_checked: true, quantity: '12' });

    expect(updateRes.statusCode).toBe(200);
    const data = unwrap(updateRes);
    expect(data.is_checked).toBe(1);
    expect(data.quantity).toBe('12');
  });

  test('should NOT see items from another household (Tenancy Rule)', async () => {
    // Create item in HH 1
    await request(app)
      .post(`/api/households/${householdId}/shopping-list`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Primary Secret' });

    // Try to list from HH 2
    const res = await request(app)
      .get(`/api/households/${otherHhId}/shopping-list`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.statusCode).toBe(200);
    const data = unwrap(res);
    const secretItem = data.items.find((i) => i.name === 'Primary Secret');
    expect(secretItem).toBeUndefined();
  });

  test('should clear checked items', async () => {
    const clearRes = await request(app)
      .delete(`/api/households/${householdId}/shopping-list/clear`)
      .set('Authorization', `Bearer ${token}`);

    expect(clearRes.statusCode).toBe(200);

    const listRes = await request(app)
      .get(`/api/households/${householdId}/shopping-list`)
      .set('Authorization', `Bearer ${token}`);
    
    const data = unwrap(listRes);
    const checkedItems = data.items.filter(i => i.is_checked);
    expect(checkedItems.length).toBe(0);
  });

  test('should perform bulk actions (Item 108)', async () => {
    // 1. Add items
    const i1 = await request(app)
      .post(`/api/households/${householdId}/shopping-list`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bulk 1' });
    const i2 = await request(app)
      .post(`/api/households/${householdId}/shopping-list`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bulk 2' });

    // 2. Bulk Delete
    const res = await request(app)
      .post(`/api/households/${householdId}/shopping-list/bulk`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        actions: [
          { type: 'delete', id: unwrap(i1).id },
          { type: 'delete', id: unwrap(i2).id },
        ],
      });

    expect(res.statusCode).toBe(200);
  });
});
