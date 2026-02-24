const request = require('supertest');
const app = require('../App');
const { db } = require('../db/index');
const { users } = require('../db/schema');
const { eq } = require('drizzle-orm');
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config');

describe('Profile API', () => {
  let token;
  let userId;

  beforeAll(async () => {
    // Create a test user in Postgres
    const [user] = await db
      .insert(users)
      .values({
        email: 'profile_test@example.com',
        passwordHash: 'hash',
        firstName: 'Profile',
        lastName: 'Test',
        systemRole: 'user',
        isActive: true,
        theme: 'totem',
        customTheme: '{}',
      })
      .returning();

    userId = user.id;
    token = jwt.sign({ id: userId, email: 'profile_test@example.com' }, SECRET_KEY);
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
  });

  it('should retrieve the user profile with custom_theme', async () => {
    const res = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', userId);
    expect(res.body.theme).toBeDefined();
    // In the actual API response, Drizzle might be returning camelCase
    expect(res.body.customTheme || res.body.custom_theme).toBeDefined();
  });

  it('should update the user theme', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ theme: 'midnight' });

    expect(res.status).toBe(200);

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    expect(user.theme).toBe('midnight');
  });

  it('should update the custom_theme', async () => {
    const customTheme = { primary: '#ff0000', mode: 'dark' };
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ custom_theme: customTheme });

    expect(res.status).toBe(200);

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const themeStr =
      typeof user.customTheme === 'string' ? user.customTheme : JSON.stringify(user.customTheme);
    expect(themeStr).toContain('#ff0000');
  });
});
