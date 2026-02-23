const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { auditLog } = require('../services/audit');

/**
 * GET /api/households/:id/finance/recurring-costs
 */
router.get('/', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
  req.tenantDb.all(
    'SELECT * FROM recurring_costs WHERE household_id = ?',
    [req.hhId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

/**
 * POST /api/households/:id/finance/recurring-costs
 */
router.post('/', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
  const {
    name,
    amount,
    category_id,
    frequency,
    day_of_month,
    object_type,
    object_id,
    bank_account_id,
    financial_profile_id,
    metadata,
  } = req.body;

  req.tenantDb.run(
    `INSERT INTO recurring_costs (household_id, name, amount, category_id, frequency, day_of_month, object_type, object_id, bank_account_id, financial_profile_id, metadata) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.hhId,
      name,
      amount,
      category_id,
      frequency,
      day_of_month,
      object_type,
      object_id,
      bank_account_id,
      financial_profile_id,
      JSON.stringify(metadata || {}),
    ],
    async function (err) {
      if (err) return res.status(500).json({ error: err.message });

      const newId = this.lastID;
      await auditLog(
        req.hhId,
        req.user.id,
        'RECURRING_COST_CREATE',
        'recurring_cost',
        newId,
        { name },
        req
      );
      res.status(201).json({ id: newId, ...req.body });
    }
  );
});

module.exports = router;
