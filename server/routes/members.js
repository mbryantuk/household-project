const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { autoEncrypt, decryptData } = require('../middleware/encryption');
const { auditLog } = require('../services/audit');

/**
 * GET /api/households/:id/members
 */
router.get('/', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
  req.tenantDb.all('SELECT * FROM members WHERE household_id = ?', [req.hhId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(decryptData('members', rows || []));
  });
});

/**
 * GET /api/households/:id/members/:memberId
 */
router.get(
  '/:memberId',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  (req, res) => {
    req.tenantDb.get(
      'SELECT * FROM members WHERE id = ? AND household_id = ?',
      [req.params.memberId, req.hhId],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Member not found' });
        res.json(decryptData('members', row));
      }
    );
  }
);

/**
 * POST /api/households/:id/members
 */
router.post(
  '/',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('members'),
  (req, res) => {
    const { first_name, last_name, name, type, emoji, color, dob, species } = req.body;

    const finalName = name || first_name || 'New Member';

    req.tenantDb.run(
      `INSERT INTO members (household_id, first_name, last_name, name, type, emoji, color, dob, species) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.hhId, first_name, last_name, finalName, type || 'adult', emoji, color, dob, species],
      async function (err) {
        if (err) return res.status(500).json({ error: err.message });

        const newId = this.lastID;

        // AUDIT LOG
        await auditLog(
          req.hhId,
          req.user.id,
          'MEMBER_CREATE',
          'member',
          newId,
          {
            name: finalName,
            type: type || 'adult',
          },
          req
        );

        res.status(201).json({ id: newId, ...req.body });
      }
    );
  }
);

/**
 * PUT /api/households/:id/members/:memberId
 */
router.put(
  '/:memberId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('members'),
  (req, res) => {
    const { first_name, last_name, name, type, emoji, color, dob, species, alias } = req.body;
    const updates = [];
    const params = [];

    if (first_name !== undefined) {
      updates.push('first_name = ?');
      params.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push('last_name = ?');
      params.push(last_name);
    }
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (type !== undefined) {
      updates.push('type = ?');
      params.push(type);
    }
    if (emoji !== undefined) {
      updates.push('emoji = ?');
      params.push(emoji);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      params.push(color);
    }
    if (dob !== undefined) {
      updates.push('dob = ?');
      params.push(dob);
    }
    if (species !== undefined) {
      updates.push('species = ?');
      params.push(species);
    }
    if (alias !== undefined) {
      updates.push('alias = ?');
      params.push(alias);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    params.push(req.params.memberId);
    params.push(req.hhId);

    req.tenantDb.run(
      `UPDATE members SET ${updates.join(', ')} WHERE id = ? AND household_id = ?`,
      params,
      async function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Member not found' });

        // AUDIT LOG
        await auditLog(
          req.hhId,
          req.user.id,
          'MEMBER_UPDATE',
          'member',
          parseInt(req.params.memberId),
          {
            updates: updates.map((u) => u.split(' =')[0]),
          },
          req
        );

        res.json({ message: 'Member updated' });
      }
    );
  }
);

/**
 * DELETE /api/households/:id/members/:memberId
 */
router.delete(
  '/:memberId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  (req, res) => {
    req.tenantDb.run(
      'DELETE FROM members WHERE id = ? AND household_id = ?',
      [req.params.memberId, req.hhId],
      async function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Member not found' });

        // AUDIT LOG
        await auditLog(
          req.hhId,
          req.user.id,
          'MEMBER_DELETE',
          'member',
          parseInt(req.params.memberId),
          null,
          req
        );

        res.json({ message: 'Member deleted' });
      }
    );
  }
);

module.exports = router;
