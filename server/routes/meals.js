const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { decryptData } = require('../middleware/encryption');
const { auditLog } = require('../services/audit');

/**
 * GET /api/households/:id/meals
 */
router.get('/', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
  req.tenantDb.all('SELECT * FROM meals WHERE household_id = ?', [req.hhId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(decryptData('meals', rows || []));
  });
});

/**
 * POST /api/households/:id/meals
 */
router.post('/', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
  const { name, description, emoji, category } = req.body;
  req.tenantDb.run(
    'INSERT INTO meals (household_id, name, description, emoji, category) VALUES (?, ?, ?, ?, ?)',
    [req.hhId, name, description, emoji, category],
    async function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, ...req.body });
    }
  );
});

/**
 * GET /api/households/:id/meals/plan
 */
router.get('/plan', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
  req.tenantDb.all('SELECT * FROM meal_plans WHERE household_id = ?', [req.hhId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

/**
 * POST /api/households/:id/meals/plan
 */
router.post('/plan', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
  const { date, member_id, meal_id, type, servings, notes } = req.body;
  req.tenantDb.run(
    'INSERT INTO meal_plans (household_id, date, member_id, meal_id, type, servings, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.hhId, date, member_id, meal_id, type, servings, notes],
    async function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, ...req.body });
    }
  );
});

module.exports = router;
