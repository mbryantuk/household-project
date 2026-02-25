const request = require('supertest');
const app = require('../../App');
const { DATABASE_URL } = require('../../config');

describe('Immutable Audit Logging', () => {
  let token;
  let householdId;
  let testMemberId;

  beforeAll(async () => {
    const email = `audit-${Date.now()}@example.com`;
    // 1. Register
    await request(app).post('/api/auth/register').send({
      householdName: 'Audit House',
      email,
      password: 'Password123!',
      firstName: 'Audit',
      lastName: 'Admin',
    });

    // 2. Login to get token and household context
    const loginRes = await request(app).post('/api/auth/login').send({
      email,
      password: 'Password123!',
    });

    token = loginRes.body.data.token;
    householdId = loginRes.body.data.household.id;
  });

  it('should log a MEMBER_CREATE action', async () => {
    const res = await request(app)
      .post(`/api/households/${householdId}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        first_name: 'Audit',
        last_name: 'Subject',
        type: 'adult',
      });

    expect(res.status).toBe(201);
    testMemberId = res.body.data.id;

    // If Postgres is available, we verify the DB entry
    if (DATABASE_URL) {
      const { db } = require('../../db/index');
      const { auditLogs } = require('../../db/schema');
      const { eq, and } = require('drizzle-orm');

      const logs = await db
        .select()
        .from(auditLogs)
        .where(and(eq(auditLogs.householdId, householdId), eq(auditLogs.action, 'MEMBER_CREATE')));

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].entityType).toBe('member');
      expect(logs[0].entityId).toBe(testMemberId);
    }
  });

  it('should log a MEMBER_UPDATE action', async () => {
    const res = await request(app)
      .put(`/api/households/${householdId}/members/${testMemberId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        alias: 'Updated Alias',
      });

    expect(res.status).toBe(200);

    if (DATABASE_URL) {
      const { db } = require('../../db/index');
      const { auditLogs } = require('../../db/schema');
      const { eq, and } = require('drizzle-orm');

      const logs = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.householdId, householdId),
            eq(auditLogs.action, 'MEMBER_UPDATE'),
            eq(auditLogs.entityId, testMemberId)
          )
        );

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].metadata.updates).toContain('alias');
    }
  });
});
