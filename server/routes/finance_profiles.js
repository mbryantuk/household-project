const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const response = require('../utils/response');

/**
 * GET /api/households/:id/finance/profiles
 */
router.get('/', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
  req.tenantDb.all(
    'SELECT * FROM finance_profiles WHERE household_id = ?',
    [req.hhId],
    (err, rows) => {
      if (err) return response.error(res, err.message);
      response.success(res, rows || []);
    }
  );
});

/**
 * POST /api/households/:id/finance/profiles
 */
router.post('/', authenticateToken, requireHouseholdRole('admin'), useTenantDb, (req, res) => {
  const { name, emoji, is_default } = req.body;

  req.tenantDb.run(
    'INSERT INTO finance_profiles (household_id, name, emoji, is_default) VALUES (?, ?, ?, ?)',
    [req.hhId, name, emoji || '💰', is_default ? 1 : 0],
    function (err) {
      if (err) return response.error(res, err.message);
      response.success(res, { id: this.lastID, ...req.body }, null, 201);
    }
  );
});

/**
 * PUT /api/households/:id/finance/profiles/:id
 */
router.put('/:id', authenticateToken, requireHouseholdRole('admin'), useTenantDb, (req, res) => {
  const { name, emoji, is_default } = req.body;

  req.tenantDb.run(
    'UPDATE finance_profiles SET name = ?, emoji = ?, is_default = ? WHERE id = ? AND household_id = ?',
    [name, emoji, is_default ? 1 : 0, req.params.id, req.hhId],
    function (err) {
      if (err) return response.error(res, err.message);
      if (this.changes === 0) return response.error(res, 'Profile not found', null, 404);
      response.success(res, { message: 'Updated' });
    }
  );
});

/**
 * DELETE /api/households/:id/finance/profiles/:id
 */
router.delete('/:id', authenticateToken, requireHouseholdRole('admin'), useTenantDb, (req, res) => {
  // Prevent deleting the default profile
  req.tenantDb.get(
    'SELECT is_default FROM finance_profiles WHERE id = ?',
    [req.params.id],
    (err, row) => {
      if (err) return response.error(res, err.message);
      if (row && row.is_default) {
        return response.error(res, 'Cannot delete the default profile', null, 400);
      }

      req.tenantDb.run(
        'DELETE FROM finance_profiles WHERE id = ? AND household_id = ?',
        [req.params.id, req.hhId],
        function (err) {
          if (err) return response.error(res, err.message);
          response.success(res, { message: 'Deleted' });
        }
      );
    }
  );
});

module.exports = router;
