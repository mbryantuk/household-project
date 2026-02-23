const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { auditLog } = require('../services/audit');

/**
 * GET /api/households/:id/chores
 */
router.get('/', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
  req.tenantDb.all('SELECT * FROM chores WHERE household_id = ?', [req.hhId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

/**
 * POST /api/households/:id/chores
 */
router.post('/', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
  const { name, description, assigned_member_id, frequency, value, next_due_date, emoji } =
    req.body;
  req.tenantDb.run(
    `INSERT INTO chores (household_id, name, description, assigned_member_id, frequency, value, next_due_date, emoji) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.hhId, name, description, assigned_member_id, frequency, value, next_due_date, emoji],
    async function (err) {
      if (err) return res.status(500).json({ error: err.message });

      const newId = this.lastID;
      await auditLog(req.hhId, req.user.id, 'CHORE_CREATE', 'chore', newId, { name }, req);
      res.status(201).json({ id: newId, ...req.body });
    }
  );
});

module.exports = router;
