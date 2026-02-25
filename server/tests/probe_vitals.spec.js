const request = require('supertest');
const app = require('../App');

describe('System Vitals Probe', () => {
  it('should return 200 for POST /api/system/vitals', async () => {
    const res = await request(app).post('/api/system/vitals').send({ test: true });
    expect(res.status).toBe(200);
  });
});
