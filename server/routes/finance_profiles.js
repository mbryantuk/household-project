const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');

// GET /households/:id/finance/profiles
router.get('/', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
  req.tenantDb.all(
    `SELECT * FROM finance_profiles WHERE household_id = ?`,
    [req.hhId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// POST /households/:id/finance/profiles
router.post('/', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
  const { name, emoji, is_default } = req.body;

  if (is_default) {
    req.tenantDb.run(`UPDATE finance_profiles SET is_default = 0 WHERE household_id = ?`, [
      req.hhId,
    ]);
  }

  req.tenantDb.run(
    `INSERT INTO finance_profiles (household_id, name, emoji, is_default) VALUES (?, ?, ?, ?)`,
    [req.hhId, name, emoji || '💰', is_default ? 1 : 0],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, ...req.body });
    }
  );
});

// PUT /households/:id/finance/profiles/:profileId
router.put(
  '/:profileId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  (req, res) => {
    const { name, emoji, is_default } = req.body;

    if (is_default) {
      req.tenantDb.run(`UPDATE finance_profiles SET is_default = 0 WHERE household_id = ?`, [
        req.hhId,
      ]);
    }

    req.tenantDb.run(
      `UPDATE finance_profiles SET name = ?, emoji = ?, is_default = ? WHERE id = ? AND household_id = ?`,
      [name, emoji, is_default ? 1 : 0, req.params.profileId, req.hhId],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Updated' });
      }
    );
  }
);

// DELETE /households/:id/finance/profiles/:profileId
router.delete(
  '/:profileId',
  authenticateToken,
  requireHouseholdRole('admin'),
  useTenantDb,
  (req, res) => {
    // Reassign to default before delete? Or restrict delete?
    // For now, restrict delete if it's default
    req.tenantDb.get(
      `SELECT is_default FROM finance_profiles WHERE id = ?`,
      [req.params.profileId],
      (err, row) => {
        if (row && row.is_default) {
          return res.status(400).json({ error: 'Cannot delete default profile.' });
        }

        req.tenantDb.run(
          `DELETE FROM finance_profiles WHERE id = ? AND household_id = ?`,
          [req.params.profileId, req.hhId],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Deleted' });
          }
        );
      }
    );
  }
);

module.exports = router;
