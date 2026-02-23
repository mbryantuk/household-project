const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { decryptData } = require('../middleware/encryption');
const { auditLog } = require('../services/audit');

/**
 * GET /api/households/:id/shopping-list
 */
router.get('/', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
  req.tenantDb.all(
    'SELECT * FROM shopping_items WHERE household_id = ?',
    [req.hhId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(decryptData('shopping_items', rows || []));
    }
  );
});

/**
 * POST /api/households/:id/shopping-list
 */
router.post('/', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
  const { name, category, quantity, estimated_cost, week_start } = req.body;
  req.tenantDb.run(
    'INSERT INTO shopping_items (household_id, name, category, quantity, estimated_cost, week_start) VALUES (?, ?, ?, ?, ?, ?)',
    [req.hhId, name, category, quantity, estimated_cost, week_start],
    async function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, ...req.body });
    }
  );
});

module.exports = router;
