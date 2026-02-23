const express = require('express');
const router = express.Router({ mergeParams: true });
const { dbAll, dbRun } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { decryptData } = require('../middleware/encryption');
const { auditLog } = require('../services/audit');

const SCHEMA_CACHE = {};

const getValidColumns = async (db, table) => {
  if (SCHEMA_CACHE[table]) return SCHEMA_CACHE[table];
  const cols = await dbAll(db, `PRAGMA table_info(${table})`);
  const validColumns = cols.map((c) => c.name);
  SCHEMA_CACHE[table] = validColumns;
  return validColumns;
};

// ==========================================
// 🏠 TENANT DETAILS (House Specifics)
// ==========================================

router.get(
  '/house-details',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  (req, res) => {
    req.tenantDb.get(
      `SELECT * FROM house_details WHERE household_id = ?`,
      [req.hhId],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(decryptData('house_details', row) || {});
      }
    );
  }
);

router.put(
  '/house-details',
  authenticateToken,
  requireHouseholdRole('admin'),
  useTenantDb,
  async (req, res) => {
    try {
      const table = 'house_details';
      const validColumns = await getValidColumns(req.tenantDb, table);
      const data = { ...req.body, household_id: req.hhId };

      const updateData = {};
      Object.keys(data).forEach((key) => {
        if (validColumns.includes(key)) {
          updateData[key] = data[key];
        }
      });

      const fields = Object.keys(updateData);
      if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields' });
      }

      const placeholders = fields.join(', ');
      const qs = fields.map(() => '?').join(', ');
      const values = Object.values(updateData);

      const sql = `INSERT OR REPLACE INTO ${table} (${placeholders}) VALUES (${qs})`;
      const result = await dbRun(req.tenantDb, sql, values);

      await auditLog(
        req.hhId,
        req.user.id,
        'TENANT_HOUSE_DETAILS_UPDATE',
        table,
        null,
        {
          updates: Object.keys(updateData).filter((k) => k !== 'household_id'),
        },
        req
      );

      res.json({ message: result.changes > 0 ? 'Updated' : 'Created' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ==========================================
// 🚗 VEHICLES & ASSETS (Tenant CRUD)
// ==========================================

const handleGetList = (table) => (req, res) => {
  req.tenantDb.all(`SELECT * FROM ${table} WHERE household_id = ?`, [req.hhId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(decryptData(table, rows || []));
  });
};

const handleGetItem = (table) => (req, res) => {
  req.tenantDb.get(
    `SELECT * FROM ${table} WHERE id = ? AND household_id = ?`,
    [req.params.itemId, req.hhId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Item not found' });
      res.json(decryptData(table, row));
    }
  );
};

const handleCreateItem = (table) => async (req, res) => {
  try {
    const validColumns = await getValidColumns(req.tenantDb, table);
    const data = { ...req.body, household_id: req.hhId };

    const insertData = {};
    Object.keys(data).forEach((key) => {
      if (validColumns.includes(key)) {
        insertData[key] = data[key];
      }
    });

    const fields = Object.keys(insertData);
    if (fields.length === 0) return res.status(400).json({ error: 'No valid fields' });

    const placeholders = fields.join(', ');
    const qs = fields.map(() => '?').join(', ');
    const values = Object.values(insertData);

    const result = await dbRun(
      req.tenantDb,
      `INSERT INTO ${table} (${placeholders}) VALUES (${qs})`,
      values
    );

    await auditLog(
      req.hhId,
      req.user.id,
      `${table.toUpperCase().replace(/S$/, '')}_CREATE`,
      table.replace(/s$/, ''),
      result.id,
      {
        name: insertData.name || insertData.make || table,
      },
      req
    );

    res.status(201).json({ id: result.id, ...insertData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const handleUpdateItem = (table) => async (req, res) => {
  try {
    const validColumns = await getValidColumns(req.tenantDb, table);
    const data = req.body;

    const updateData = {};
    Object.keys(data).forEach((key) => {
      if (validColumns.includes(key) && key !== 'id' && key !== 'household_id') {
        updateData[key] = data[key];
      }
    });

    const fields = Object.keys(updateData);
    if (fields.length === 0) return res.status(400).json({ error: 'No valid fields' });

    const sets = fields.map((f) => `${f} = ?`).join(', ');
    const values = Object.values(updateData);

    await dbRun(req.tenantDb, `UPDATE ${table} SET ${sets} WHERE id = ? AND household_id = ?`, [
      ...values,
      req.params.itemId,
      req.hhId,
    ]);

    await auditLog(
      req.hhId,
      req.user.id,
      `${table.toUpperCase().replace(/S$/, '')}_UPDATE`,
      table.replace(/s$/, ''),
      parseInt(req.params.itemId),
      {
        updates: Object.keys(updateData),
      },
      req
    );

    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const handleDeleteItem = (table) => (req, res) => {
  req.tenantDb.run(
    `DELETE FROM ${table} WHERE id = ? AND household_id = ?`,
    [req.params.itemId, req.hhId],
    async function (err) {
      if (err) return res.status(500).json({ error: err.message });

      await auditLog(
        req.hhId,
        req.user.id,
        `${table.toUpperCase().replace(/S$/, '')}_DELETE`,
        table.replace(/s$/, ''),
        parseInt(req.params.itemId),
        null,
        req
      );

      res.json({ message: 'Deleted' });
    }
  );
};

// Vehicles
router.get(
  '/vehicles',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetList('vehicles')
);
router.get(
  '/vehicles/:itemId',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetItem('vehicles')
);
router.post(
  '/vehicles',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleCreateItem('vehicles')
);
router.put(
  '/vehicles/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleUpdateItem('vehicles')
);
router.delete(
  '/vehicles/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleDeleteItem('vehicles')
);

// Assets
router.get(
  '/assets',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetList('assets')
);
router.get(
  '/assets/:itemId',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetItem('assets')
);
router.post(
  '/assets',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleCreateItem('assets')
);
router.put(
  '/assets/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleUpdateItem('assets')
);
router.delete(
  '/assets/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleDeleteItem('assets')
);

module.exports = router;
