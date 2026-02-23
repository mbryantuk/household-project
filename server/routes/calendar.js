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

module.exports = router;
