const express = require('express');
const router = express.Router();
const { dbAll } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { autoEncrypt, decryptData } = require('../middleware/encryption');
const { logAction } = require('../services/audit');

// 1. LIST MEMBERS
router.get(
  '/households/:id/members',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  (req, res) => {
    req.tenantDb.all(`SELECT * FROM members WHERE household_id = ?`, [req.hhId], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const today = new Date();
      const updates = [];

      // Decrypt PII before processing
      const decryptedRows = decryptData('members', rows);

      decryptedRows.forEach((member) => {
        if (member.type === 'child' && member.dob) {
          const birthDate = new Date(member.dob);
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }

          if (age >= 18) {
            member.type = 'adult';
            updates.push(
              new Promise((resolve) => {
                req.tenantDb.run(
                  `UPDATE members SET type = 'adult' WHERE id = ?`,
                  [member.id],
                  () => resolve()
                );
              })
            );
          }
        }
      });

      if (updates.length > 0) {
        Promise.all(updates).then(() => {
          res.json(decryptedRows);
        });
      } else {
        res.json(decryptedRows);
      }
    });
  }
);

// 2. GET SINGLE MEMBER
router.get(
  '/households/:id/members/:itemId',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  (req, res) => {
    req.tenantDb.get(
      `SELECT * FROM members WHERE id = ? AND household_id = ?`,
      [req.params.itemId, req.hhId],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Member not found' });

        res.json(decryptData('members', row));
      }
    );
  }
);

// 3. ADD MEMBER
router.post(
  '/households/:id/members',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('members'),
  async (req, res) => {
    try {
      const cols = await dbAll(req.tenantDb, `PRAGMA table_info(members)`);
      const validColumns = cols.map((c) => c.name);

      // Name logic
      if (!req.body.name && req.body.first_name) {
        req.body.name = [req.body.first_name, req.body.middle_name, req.body.last_name]
          .filter(Boolean)
          .join(' ');
      } else if (req.body.name && !req.body.first_name) {
        const parts = req.body.name.trim().split(' ');
        if (parts.length === 1) req.body.first_name = parts[0];
        else if (parts.length === 2) {
          req.body.first_name = parts[0];
          req.body.last_name = parts[1];
        } else {
          req.body.first_name = parts[0];
          req.body.last_name = parts[parts.length - 1];
          req.body.middle_name = parts.slice(1, parts.length - 1).join(' ');
        }
      }

      const data = { ...req.body, household_id: req.hhId };

      const insertData = {};
      Object.keys(data).forEach((key) => {
        if (validColumns.includes(key)) {
          insertData[key] = data[key];
        }
      });

      const fields = Object.keys(insertData);
      if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields' });
      }

      const placeholders = fields.join(', ');
      const qs = fields.map(() => '?').join(', ');
      const values = Object.values(insertData);

      req.tenantDb.run(
        `INSERT INTO members (${placeholders}) VALUES (${qs})`,
        values,
        async function (err) {
          if (err) return res.status(500).json({ error: err.message });

          const newId = this.lastID;

          // AUDIT LOG
          await logAction({
            householdId: req.hhId,
            userId: req.user.id,
            action: 'MEMBER_CREATE',
            entityType: 'member',
            entityId: newId,
            metadata: { name: insertData.name, type: insertData.type },
            req,
          });

          res.status(201).json({ id: newId, ...insertData });
        }
      );
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// 4. UPDATE MEMBER
router.put(
  '/households/:id/members/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('members'),
  async (req, res) => {
    try {
      const cols = await dbAll(req.tenantDb, `PRAGMA table_info(members)`);
      const validColumns = cols.map((c) => c.name);

      const data = { ...req.body };

      const updateData = {};
      Object.keys(data).forEach((key) => {
        if (validColumns.includes(key) && key !== 'id' && key !== 'household_id') {
          updateData[key] = data[key];
        }
      });

      const fields = Object.keys(updateData);
      if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields' });
      }

      const sets = fields.map((f) => `${f} = ?`).join(', ');
      const values = Object.values(updateData);

      req.tenantDb.run(
        `UPDATE members SET ${sets} WHERE id = ? AND household_id = ?`,
        [...values, req.params.itemId, req.hhId],
        async function (err) {
          if (err) return res.status(500).json({ error: err.message });

          // AUDIT LOG
          await logAction({
            householdId: req.hhId,
            userId: req.user.id,
            action: 'MEMBER_UPDATE',
            entityType: 'member',
            entityId: parseInt(req.params.itemId),
            metadata: { updates: Object.keys(updateData) },
            req,
          });

          res.json({ message: 'Updated' });
        }
      );
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// 5. DELETE MEMBER
router.delete(
  '/households/:id/members/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  (req, res) => {
    req.tenantDb.run(
      `DELETE FROM members WHERE id = ? AND household_id = ?`,
      [req.params.itemId, req.hhId],
      async function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // AUDIT LOG
        await logAction({
          householdId: req.hhId,
          userId: req.user.id,
          action: 'MEMBER_DELETE',
          entityType: 'member',
          entityId: parseInt(req.params.itemId),
          req,
        });

        res.json({ message: 'Deleted' });
      }
    );
  }
);

module.exports = router;
