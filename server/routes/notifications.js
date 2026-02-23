const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');

/**
 * GET /api/households/:id/notifications
 */
router.get('/', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
  req.tenantDb.all(
    'SELECT * FROM notifications WHERE household_id = ? ORDER BY created_at DESC',
    [req.hhId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

/**
 * POST /api/households/:id/notifications/:id/read
 */
router.post(
  '/:nid/read',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  (req, res) => {
    req.tenantDb.run(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND household_id = ?',
      [req.params.nid, req.hhId],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Marked as read' });
      }
    );
  }
);

module.exports = router;
