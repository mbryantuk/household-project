const request = require('supertest');
const express = require('express');
const { authLimiter } = require('../../middleware/rate_limiter');

describe('API Rate Limiting Middleware', () => {
  let testApp;

  beforeAll(() => {
    // Create a dedicated app for this test to avoid interfering with global state
    testApp = express();
    testApp.use(express.json());
    testApp.post('/login', authLimiter, (req, res) => res.status(200).json({ ok: true }));
  });

  it('should block auth requests after too many attempts', async () => {
    // Auth limit is 5 in test environment.
    const attempts = 7;
    let hit429 = false;

    for (let i = 0; i < attempts; i++) {
      const res = await request(testApp)
        .post('/login')
        .send({ email: `rate-${Date.now()}-${i}@limit.com` });

      if (res.status === 429) {
        hit429 = true;
        break;
      }
    }

    expect(hit429).toBe(true);
  }, 30000);

  it('should bypass limit when bypass header is present', async () => {
    const attempts = 10;
    const promises = [];
    for (let i = 0; i < attempts; i++) {
      promises.push(
        request(testApp)
          .post('/login')
          .set('x-bypass-maintenance', 'true')
          .send({ email: 'rate@limit.com' })
      );
    }
    const responses = await Promise.all(promises);
    const blocked = responses.filter((r) => r.status === 429);
    expect(blocked.length).toBe(0);
  });
});
