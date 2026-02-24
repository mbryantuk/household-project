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
      const items = decryptData('shopping_items', rows || []);
      const totalEstimated = items.reduce((acc, item) => acc + (item.estimated_cost || 0), 0);
      res.json({
        items,
        summary: {
          total_items: items.length,
          total_estimated_cost: totalEstimated,
        },
      });
    }
  );
});

/**
 * POST /api/households/:id/shopping-list
 */
router.post('/', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
  const { name, category, quantity, estimated_cost, week_start, is_checked } = req.body;
  req.tenantDb.run(
    'INSERT INTO shopping_items (household_id, name, category, quantity, estimated_cost, week_start, is_checked) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.hhId, name, category, quantity, estimated_cost, week_start, is_checked ? 1 : 0],
    async function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, ...req.body });
    }
  );
});

/**
 * PUT /api/households/:id/shopping-list/:itemId
 */
router.put(
  '/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  (req, res) => {
    const { name, category, quantity, estimated_cost, is_checked } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (quantity !== undefined) {
      updates.push('quantity = ?');
      params.push(quantity);
    }
    if (estimated_cost !== undefined) {
      updates.push('estimated_cost = ?');
      params.push(estimated_cost);
    }
    if (is_checked !== undefined) {
      updates.push('is_checked = ?');
      params.push(is_checked ? 1 : 0);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(req.params.itemId, req.hhId);

    req.tenantDb.run(
      `UPDATE shopping_items SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND household_id = ?`,
      params,
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Item not found' });
        res.json({
          id: parseInt(req.params.itemId),
          ...req.body,
          is_checked: is_checked !== undefined ? (is_checked ? 1 : 0) : undefined,
        });
      }
    );
  }
);

/**
 * DELETE /api/households/:id/shopping-list/clear
 */
router.delete(
  '/clear',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  (req, res) => {
    req.tenantDb.run(
      'DELETE FROM shopping_items WHERE household_id = ? AND is_checked = 1',
      [req.hhId],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Checked items cleared', changes: this.changes });
      }
    );
  }
);

/**
 * DELETE /api/households/:id/shopping-list/:itemId
 */
router.delete(
  '/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  (req, res) => {
    req.tenantDb.run(
      'DELETE FROM shopping_items WHERE id = ? AND household_id = ?',
      [req.params.itemId, req.hhId],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Item not found' });
        res.json({ message: 'Item deleted' });
      }
    );
  }
);

module.exports = router;
