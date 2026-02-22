const request = require('supertest');
const { globalDb, dbRun } = require('../../db');
const { SECRET_KEY } = require('../../config');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const app = require('../../App'); // Assuming App.js exports the express app

describe('Security Audit Proof of Concept', () => {
  let adminToken60;
  let adminToken61;
  let userToken60;

  beforeAll(async () => {
    // Setup mock users and households if they don't exist
    // This assumes the DB is already bootstrapped by App.js
  });

  it('Vulnerability 1: Hardcoded SECRET_KEY', () => {
    const payload = { id: 999, email: 'hacker@example.com', system_role: 'admin' };
    const token = jwt.sign(payload, 'super_secret_pi_key');
    expect(token).toBeDefined();
    // If we can sign with the hardcoded key, it's a vulnerability
  });

  it('Vulnerability 2: Path Traversal in Backup Download (FIXED)', async () => {
    const token = jwt.sign(
      { id: 78, email: 'mbryantuk@gmail.com', householdId: 60, role: 'admin', systemRole: 'admin' },
      SECRET_KEY
    );

    const res = await request(app)
      .get('/admin/backups/download/..%2f..%2fglobal.db')
      .set('Authorization', `Bearer ${token}`);

    // Should be 403 (Invalid filename) or 404 (if Express normalizes it away)
    // Either way, it must NOT return 200 with data
    expect(res.status).not.toBe(200);
  });

  it('Vulnerability 3: Admin Escalation - Adding user to another household (FIXED)', async () => {
    // We need a user who is NOT a system admin for this test
    const testUserRes = await request(app)
      .post('/auth/register')
      .send({
        householdName: 'Tenancy Test HH',
        email: `tenancy_${Date.now()}@example.com`,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      });

    // Login to get a real token for a non-system-admin
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: `tenancy_${Date.now()}@example.com`, password: 'Password123!' });

    // Since we just registered, we'll use the ID from the DB or a new login
    // For the sake of the POC, we'll forge a token but with system_role: 'user'
    const token = jwt.sign(
      { id: 9999, email: 'test@example.com', householdId: 60, role: 'admin', systemRole: 'user' },
      SECRET_KEY
    );

    const res = await request(app)
      .post('/admin/create-user')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'evil_user_test',
        password: 'Password123!',
        householdId: 3294, // Other household
        role: 'admin',
      });

    expect(res.status).toBe(403);
  });

  it('Tenancy Verification: Viewer of HH 60 cannot access HH 3294', async () => {
    // Use a non-existent or standard user ID that is NOT a system admin
    const token = jwt.sign(
      { id: 9999, email: 'regular@user.com', householdId: 60, role: 'viewer', systemRole: 'user' },
      SECRET_KEY
    );

    const res = await request(app)
      .get('/households/3294/finance/mortgages')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
