const request = require('supertest');
const app = require('../App');
const { db } = require('../db/index');
const { users } = require('../db/schema');
const { eq } = require('drizzle-orm');

describe('Profile API', () => {
  let token;
  let userId;

  const unwrap = (res) => (res.body.success ? res.body.data : res.body);

  beforeAll(async () => {
    const email = `profile_test@example.com`;
    const password = 'Password123!';

    await request(app)
      .post('/api/auth/register')
      .send({ householdName: 'Profile Test', email, password });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    const data = unwrap(loginRes);
    token = data.token;
    userId = data.user.id;
  });

  it('should retrieve the user profile with customTheme', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const data = unwrap(res);
    expect(data).toHaveProperty('id', userId);
    expect(data.theme).toBeDefined();
  });

  it('should update the user theme', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ theme: 'midnight' });

    expect(res.status).toBe(200);

    const profileRes = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);
    
    expect(unwrap(profileRes).theme).toBe('midnight');
  });

  it('should update the customTheme', async () => {
    const customTheme = { primary: '#ff0000' };
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ customTheme });

    expect(res.status).toBe(200);

    const profileRes = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);
    
    const data = unwrap(profileRes);
    const theme = typeof data.customTheme === 'string' ? JSON.parse(data.customTheme) : data.customTheme;
    expect(theme.primary).toBe('#ff0000');
  });
});
