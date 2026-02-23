const express = require('express');
const router = express.Router();
const { dbAll, dbRun } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { autoEncrypt, decryptData } = require('../middleware/encryption');
const { logAction } = require('../services/audit');

const SCHEMA_CACHE = {}; // { table: ['col1', 'col2'] }

// ==========================================
// 🏠 GENERIC CRUD HELPERS (Tenant-Aware)
// ==========================================

const getValidColumns = async (db, table) => {
  if (SCHEMA_CACHE[table]) return SCHEMA_CACHE[table];
  const cols = await dbAll(db, `PRAGMA table_info(${table})`);
  const validColumns = cols.map((c) => c.name);
  SCHEMA_CACHE[table] = validColumns;
  return validColumns;
};

const handleGetSingle = (table) => (req, res) => {
  req.tenantDb.get(`SELECT * FROM ${table} WHERE household_id = ?`, [req.hhId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(decryptData(table, row) || {});
  });
};

const handleUpdateSingle = (table) => async (req, res) => {
  try {
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

    // Atomic Upsert
    const sql = `INSERT OR REPLACE INTO ${table} (${placeholders}) VALUES (${qs})`;

    const result = await dbRun(req.tenantDb, sql, values);

    // AUDIT LOG
    await logAction({
      householdId: req.hhId,
      userId: req.user.id,
      action: `${table.toUpperCase()}_UPDATE`,
      entityType: table,
      metadata: { updates: Object.keys(updateData).filter((k) => k !== 'household_id') },
      req,
    });

    res.json({ message: result.changes > 0 ? 'Updated' : 'Created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

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
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields' });
    }

    const placeholders = fields.join(', ');
    const qs = fields.map(() => '?').join(', ');
    const values = Object.values(insertData);

    const result = await dbRun(
      req.tenantDb,
      `INSERT INTO ${table} (${placeholders}) VALUES (${qs})`,
      values
    );

    // AUDIT LOG
    await logAction({
      householdId: req.hhId,
      userId: req.user.id,
      action: `${table.toUpperCase().replace(/S$/, '')}_CREATE`,
      entityType: table.replace(/s$/, ''),
      entityId: result.id,
      metadata: { name: insertData.name || insertData.make || table },
      req,
    });

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
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields' });
    }

    const sets = fields.map((f) => `${f} = ?`).join(', ');
    const values = Object.values(updateData);

    await dbRun(req.tenantDb, `UPDATE ${table} SET ${sets} WHERE id = ? AND household_id = ?`, [
      ...values,
      req.params.itemId,
      req.hhId,
    ]);

    // AUDIT LOG
    await logAction({
      householdId: req.hhId,
      userId: req.user.id,
      action: `${table.toUpperCase().replace(/S$/, '')}_UPDATE`,
      entityType: table.replace(/s$/, ''),
      entityId: parseInt(req.params.itemId),
      metadata: { updates: Object.keys(updateData) },
      req,
    });

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

      // AUDIT LOG
      await logAction({
        householdId: req.hhId,
        userId: req.user.id,
        action: `${table.toUpperCase().replace(/S$/, '')}_DELETE`,
        entityType: table.replace(/s$/, ''),
        entityId: parseInt(req.params.itemId),
        req,
      });

      res.json({ message: 'Deleted' });
    }
  );
};

// ==========================================
// 🚀 ROUTES
// ==========================================

// House Details
router.get(
  '/households/:id/details',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetSingle('house_details')
);
router.put(
  '/households/:id/details',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('house_details'),
  handleUpdateSingle('house_details')
);

// Vehicles
router.get(
  '/households/:id/vehicles',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetList('vehicles')
);
router.get(
  '/households/:id/vehicles/:itemId',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetItem('vehicles')
);
router.post(
  '/households/:id/vehicles',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('vehicles'),
  handleCreateItem('vehicles')
);
router.put(
  '/households/:id/vehicles/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('vehicles'),
  handleUpdateItem('vehicles')
);
router.delete(
  '/households/:id/vehicles/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleDeleteItem('vehicles')
);

// Vehicle Services
router.get(
  `/households/:id/vehicles/:vehicleId/services`,
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  (req, res) => {
    req.tenantDb.all(
      `SELECT * FROM vehicle_services WHERE vehicle_id = ? AND household_id = ?`,
      [req.params.vehicleId, req.hhId],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
      }
    );
  }
);
router.post(
  `/households/:id/vehicles/:vehicleId/services`,
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  (req, res) => {
    req.tenantDb.all(`PRAGMA table_info(vehicle_services)`, [], (pErr, cols) => {
      if (pErr) {
        return res.status(500).json({ error: pErr.message });
      }
      const validColumns = cols.map((c) => c.name);
      const data = {
        ...req.body,
        vehicle_id: req.params.vehicleId,
        household_id: req.hhId,
      };
      const insertData = {};
      Object.keys(data).forEach((key) => {
        if (validColumns.includes(key)) insertData[key] = data[key];
      });
      const fields = Object.keys(insertData);
      req.tenantDb.run(
        `INSERT INTO vehicle_services (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
        Object.values(insertData),
        async function (err) {
          if (err) return res.status(500).json({ error: err.message });

          // AUDIT LOG
          await logAction({
            householdId: req.hhId,
            userId: req.user.id,
            action: 'VEHICLE_SERVICE_CREATE',
            entityType: 'vehicle_service',
            entityId: this.lastID,
            metadata: { vehicleId: req.params.vehicleId },
            req,
          });

          res.status(201).json({ id: this.lastID, ...insertData });
        }
      );
    });
  }
);
router.delete(
  `/households/:id/vehicles/:vehicleId/services/:itemId`,
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  (req, res) => {
    req.tenantDb.run(
      `DELETE FROM vehicle_services WHERE id = ? AND vehicle_id = ? AND household_id = ?`,
      [req.params.itemId, req.params.vehicleId, req.hhId],
      async function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // AUDIT LOG
        await logAction({
          householdId: req.hhId,
          userId: req.user.id,
          action: 'VEHICLE_SERVICE_DELETE',
          entityType: 'vehicle_service',
          entityId: parseInt(req.params.itemId),
          metadata: { vehicleId: req.params.vehicleId },
          req,
        });

        res.json({ message: 'Deleted' });
      }
    );
  }
);

// Assets
router.get(
  '/households/:id/assets',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetList('assets')
);
router.get(
  '/households/:id/assets/:itemId',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetItem('assets')
);
router.post(
  '/households/:id/assets',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('assets'),
  handleCreateItem('assets')
);
router.put(
  '/households/:id/assets/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('assets'),
  handleUpdateItem('assets')
);
router.delete(
  '/households/:id/assets/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleDeleteItem('assets')
);

module.exports = router;
