const request = require('supertest');
const app = require('../App');
const { db } = require('../db/index');
const { users, households, userHouseholds } = require('../db/schema');
const { eq } = require('drizzle-orm');
const jwt = require('jsonwebtoken');
const config = require('../config');

describe('Utilities API', () => {
  let token;
  let hhId;
  let userId;

  beforeAll(async () => {
    // Setup test user and household
    const [user] = await db
      .insert(users)
      .values({
        email: 'utiltest@example.com',
        passwordHash: 'hash',
        isActive: true,
      })
      .returning();
    userId = user.id;

    const [hh] = await db
      .insert(households)
      .values({
        name: 'Utility Test HH',
      })
      .returning();
    hhId = hh.id;

    await db.insert(userHouseholds).values({
      userId: userId,
      householdId: hhId,
      role: 'admin',
    });

    token = jwt.sign({ id: userId, householdId: hhId }, config.SECRET_KEY);
  });

  afterAll(async () => {
    await db.delete(userHouseholds).where(eq(userHouseholds.userId, userId));
    await db.delete(households).where(eq(households.id, hhId));
    await db.delete(users).where(eq(users.id, userId));
  });

  const types = ['energy', 'water', 'waste', 'council'];

  types.forEach((type) => {
    describe(`${type} CRUD`, () => {
      let itemId;

      it(`should create a new ${type} account`, async () => {
        const payload = {
          provider: 'Test Provider',
          authority_name: 'Test Authority', // for council
          waste_type: 'Recycling', // for waste
          monthly_amount: 100.5,
          notes: 'Test notes',
        };

        const res = await request(app)
          .post(`/api/households/${hhId}/utilities/${type}`)
          .set('Authorization', `Bearer ${token}`)
          .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        itemId = res.body.data.id;
        expect(itemId).toBeDefined();
      });

      it(`should list ${type} accounts`, async () => {
        const res = await request(app)
          .get(`/api/households/${hhId}/utilities/${type}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
      });

      it(`should update ${type} account`, async () => {
        const res = await request(app)
          .put(`/api/households/${hhId}/utilities/${type}/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ notes: 'Updated notes' });

        expect(res.status).toBe(200);
        expect(res.body.data.message).toBe('Updated');
      });

      it(`should delete ${type} account`, async () => {
        const res = await request(app)
          .delete(`/api/households/${hhId}/utilities/${type}/${itemId}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.message).toContain('Deleted');
      });
    });
  });
});
