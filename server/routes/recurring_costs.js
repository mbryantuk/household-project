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
 * GET /api/households/:id/finance/recurring-costs/:itemId
 */
router.get(
  '/:itemId',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  (req, res) => {
    req.tenantDb.get(
      'SELECT * FROM recurring_costs WHERE id = ? AND household_id = ?',
      [req.params.itemId, req.hhId],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Recurring cost not found' });
        res.json(row);
      }
    );
  }
);

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

/**
 * PUT /api/households/:id/finance/recurring-costs/:itemId
 */
router.put(
  '/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  (req, res) => {
    const { name, amount, category_id, frequency } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (amount !== undefined) {
      updates.push('amount = ?');
      params.push(amount);
    }
    if (category_id !== undefined) {
      updates.push('category_id = ?');
      params.push(category_id);
    }
    if (frequency !== undefined) {
      updates.push('frequency = ?');
      params.push(frequency);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    params.push(req.params.itemId, req.hhId);

    req.tenantDb.run(
      `UPDATE recurring_costs SET ${updates.join(', ')} WHERE id = ? AND household_id = ?`,
      params,
      async function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Not found' });

        await auditLog(
          req.hhId,
          req.user.id,
          'RECURRING_COST_UPDATE',
          'recurring_cost',
          parseInt(req.params.itemId),
          { name },
          req
        );
        res.json({ message: 'Updated' });
      }
    );
  }
);

/**
 * DELETE /api/households/:id/finance/recurring-costs/:itemId
 */
router.delete(
  '/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  (req, res) => {
    req.tenantDb.run(
      'DELETE FROM recurring_costs WHERE id = ? AND household_id = ?',
      [req.params.itemId, req.hhId],
      async function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Not found' });

        await auditLog(
          req.hhId,
          req.user.id,
          'RECURRING_COST_DELETE',
          'recurring_cost',
          parseInt(req.params.itemId),
          null,
          req
        );
        res.json({ message: 'Deleted' });
      }
    );
  }
);

module.exports = router;
