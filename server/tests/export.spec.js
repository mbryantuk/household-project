// server/tests/export.spec.js
const request = require('supertest');
const app = require('../App'); // Assuming this is how you export your app
const db = require('../db');

describe('GET /api/export/:household_id', () => {
  // Mock admin authentication
  const mockAdminMiddleware = (req, res, next) => {
    req.user = { isAdmin: true }; // Simulate an admin user
    next();
  };

  // Before each test, apply the mock admin middleware
  beforeEach(() => {
    app.use('/api/export', mockAdminMiddleware, require('../routes/export'));
  });

  it('should return 400 if household_id is missing', async () => {
    const res = await request(app).get('/api/export/');
    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toEqual('Household ID is required');
  });

  it('should return 200 and export data if household_id is valid', async () => {
    // Insert some test data into the database for this household_id
    const household_id = 'test_household';
    await db.run('INSERT INTO users (household_id, name) VALUES (?, ?)', [household_id, 'Test User']);
    await db.run('INSERT INTO assets (household_id, name) VALUES (?, ?)', [household_id, 'Test Asset']);

    const res = await request(app).get(`/api/export/${household_id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.header['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.header['content-disposition']).toEqual(`attachment; filename=household-${household_id}-data.json`);

    const data = JSON.parse(res.text);
    expect(data.users).toBeDefined();
    expect(data.assets).toBeDefined();
    // Add more assertions to check the data

    // Clean up the test data
    await db.run('DELETE FROM users WHERE household_id = ?', [household_id]);
    await db.run('DELETE FROM assets WHERE household_id = ?', [household_id]);
  });

  it('should return 500 if there is a server error', async () => {
    // Mock the database to simulate an error
    jest.spyOn(db, 'all').mockImplementation(() => {
      throw new Error('Test error');
    });

    const household_id = 'test_household';
    const res = await request(app).get(`/api/export/${household_id}`);

    expect(res.statusCode).toEqual(500);
    expect(res.body.message).toEqual('Failed to export data');

    // Restore the original database function
    jest.spyOn(db, 'all').mockRestore();
  });
});
