const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { decryptData } = require('../middleware/encryption');
const { auditLog } = require('../services/audit');

/**
 * GET /api/households/:id/calendar
 */
router.get('/', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
  req.tenantDb.all('SELECT * FROM dates WHERE household_id = ?', [req.hhId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(decryptData('dates', rows || []));
  });
});

/**
 * GET /api/households/:id/calendar/:itemId
 */
router.get(
  '/:itemId',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  (req, res) => {
    req.tenantDb.get(
      'SELECT * FROM dates WHERE id = ? AND household_id = ?',
      [req.params.itemId, req.hhId],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Date not found' });
        res.json(decryptData('dates', row));
      }
    );
  }
);

/**
 * POST /api/households/:id/calendar
 */
router.post('/', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
  const {
    title,
    date,
    end_date,
    type,
    parent_type,
    parent_id,
    is_all_day,
    remind_days,
    description,
    emoji,
  } = req.body;

  req.tenantDb.run(
    `INSERT INTO dates (household_id, title, date, end_date, type, parent_type, parent_id, is_all_day, remind_days, description, emoji) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.hhId,
      title,
      date,
      end_date,
      type,
      parent_type,
      parent_id,
      is_all_day,
      remind_days,
      description,
      emoji,
    ],
    async function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, ...req.body });
    }
  );
});

/**
 * PUT /api/households/:id/calendar/:itemId
 */
router.put(
  '/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  (req, res) => {
    const { title, date } = req.body;
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (date !== undefined) {
      updates.push('date = ?');
      params.push(date);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    params.push(req.params.itemId, req.hhId);

    req.tenantDb.run(
      `UPDATE dates SET ${updates.join(', ')} WHERE id = ? AND household_id = ?`,
      params,
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Updated' });
      }
    );
  }
);

/**
 * DELETE /api/households/:id/calendar/:itemId
 */
router.delete(
  '/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  (req, res) => {
    req.tenantDb.run(
      'DELETE FROM dates WHERE id = ? AND household_id = ?',
      [req.params.itemId, req.hhId],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
      }
    );
  }
);

module.exports = router;
