const request = require('supertest');
const app = require('../../App');
const { db } = require('../../db/index');
const { auditLogs } = require('../../db/schema');

describe('Admin Audit Log API (Pagination)', () => {
  let adminToken;
  let householdId;

  beforeAll(async () => {
    const email = `admin-audit-${Date.now()}@example.com`;
    // 1. Register
    await request(app).post('/api/auth/register').send({
      householdName: 'Admin Audit House',
      email,
      password: 'Password123!',
      firstName: 'Admin',
      lastName: 'User',
    });

    // 2. Login to get token
    const loginRes = await request(app).post('/api/auth/login').send({
      email,
      password: 'Password123!',
    });

    adminToken = loginRes.body.data.token;
    householdId = loginRes.body.data.household.id;

    // 3. Make the user a system admin (if not already)
    const { users } = require('../../db/schema');
    const { eq } = require('drizzle-orm');
    await db.update(users).set({ systemRole: 'admin' }).where(eq(users.email, email));

    // 4. Seed some audit logs
    const logsToInsert = [];
    for (let i = 1; i <= 15; i++) {
      logsToInsert.push({
        householdId,
        userId: loginRes.body.data.user.id,
        action: `TEST_ACTION_${i}`,
        entityType: 'test',
        entityId: i,
        createdAt: new Date(Date.now() - i * 1000), // Ensure stable order
      });
    }
    await db.insert(auditLogs).values(logsToInsert);
  });

  it('should list audit logs with default limit', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.meta).toBeDefined();
    expect(res.body.data.length).toBeGreaterThanOrEqual(15);
  });

  it('should support pagination with limit and cursor', async () => {
    // Page 1
    const res1 = await request(app)
      .get('/api/admin/audit-logs?limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res1.status).toBe(200);
    expect(res1.body.data.length).toBe(5);
    expect(res1.body.meta.has_more).toBe(true);
    const nextCursor = res1.body.meta.next_cursor;
    expect(nextCursor).toBeDefined();

    // Page 2
    const res2 = await request(app)
      .get(`/api/admin/audit-logs?limit=5&cursor=${nextCursor}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res2.status).toBe(200);
    expect(res2.body.data.length).toBe(5);
    // Ensure no overlap
    expect(res2.body.data[0].id).toBeLessThan(nextCursor);
  });
});
