const request = require('supertest');
const { app } = require('../server');
const { globalDb, dbGet } = require('../db');

const seedHousehold = async (name = 'Test Household') => {
  const email = `test_${Date.now()}@example.com`;
  const password = 'Password123!';

  const regRes = await request(app)
    .post('/api/auth/register')
    .send({ householdName: name, email, password, is_test: 1 });

  if (regRes.status !== 201) {
    throw new Error(`Failed to seed household: ${JSON.stringify(regRes.body)}`);
  }

  // Login to get token and household info
  const loginRes = await request(app).post('/api/auth/login').send({ email, password });

  if (loginRes.status !== 200) {
    throw new Error(`Login failed after seeding: ${JSON.stringify(loginRes.body)}`);
  }

  const token = loginRes.body.token;
  const household = loginRes.body.household;

  if (!household || !household.id) {
    throw new Error(`Household ID missing in login response: ${JSON.stringify(loginRes.body)}`);
  }

  return {
    id: household.id,
    adminEmail: email,
    password: password,
    token: token,
  };
};

module.exports = { seedHousehold };
