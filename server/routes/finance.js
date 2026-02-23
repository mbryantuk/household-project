const express = require('express');
const router = express.Router({ mergeParams: true });
const { dbAll, dbRun } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { autoEncrypt, decryptData } = require('../middleware/encryption');
const { logAction } = require('../services/audit');

// Import Recurring Costs
const recurringCostsRoutes = require('./recurring_costs');
const financeImportRoutes = require('./finance_import');

// ==========================================
// 🏠 GENERIC CRUD HELPERS (Tenant-Aware)
// ==========================================

const handleGetList = (table) => (req, res) => {
  let sql = `SELECT * FROM ${table} WHERE household_id = ?`;
  const params = [req.hhId];

  if (req.query.financial_profile_id) {
    sql += ` AND financial_profile_id = ?`;
    params.push(req.query.financial_profile_id);
  }

  req.tenantDb.all(sql, params, (err, rows) => {
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

const handleCreateItem = (table) => (req, res) => {
  req.tenantDb.all(`PRAGMA table_info(${table})`, [], (pErr, cols) => {
    if (pErr) {
      return res.status(500).json({ error: pErr.message });
    }

    const validColumns = cols.map((c) => c.name);
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
      `INSERT INTO ${table} (${placeholders}) VALUES (${qs})`,
      values,
      async function (err) {
        if (err) return res.status(500).json({ error: err.message });

        const newId = this.lastID;

        // AUDIT LOG
        await logAction({
          householdId: req.hhId,
          userId: req.user.id,
          action: `${table.toUpperCase()}_CREATE`,
          entityType: table,
          entityId: newId,
          metadata: {
            name: insertData.name || insertData.bank_name || insertData.employer || table,
          },
          req,
        });

        res.status(201).json({ id: newId, ...insertData });
      }
    );
  });
};

const handleUpdateItem = (table) => (req, res) => {
  req.tenantDb.all(`PRAGMA table_info(${table})`, [], (pErr, cols) => {
    if (pErr) {
      return res.status(500).json({ error: pErr.message });
    }

    const validColumns = cols.map((c) => c.name);
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

    req.tenantDb.run(
      `UPDATE ${table} SET ${sets} WHERE id = ? AND household_id = ?`,
      [...values, req.params.itemId, req.hhId],
      async function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // AUDIT LOG
        await logAction({
          householdId: req.hhId,
          userId: req.user.id,
          action: `${table.toUpperCase()}_UPDATE`,
          entityType: table,
          entityId: parseInt(req.params.itemId),
          metadata: { updates: Object.keys(updateData) },
          req,
        });

        res.json({ message: 'Updated' });
      }
    );
  });
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
        action: `${table.toUpperCase()}_DELETE`,
        entityType: table,
        entityId: parseInt(req.params.itemId),
        req,
      });

      res.json({ message: 'Deleted' });
    }
  );
};

// ==========================================
// 🔗 SUB-RESOURCE HELPERS
// ==========================================

const handleSubList = (childTable, parentTable, parentKey) => (req, res) => {
  const parentId = req.params[parentKey];
  req.tenantDb.get(
    `SELECT id FROM ${parentTable} WHERE id = ? AND household_id = ?`,
    [parentId, req.hhId],
    (err, row) => {
      if (err || !row) {
        return res.status(404).json({ error: 'Parent resource not found' });
      }
      req.tenantDb.all(
        `SELECT * FROM ${childTable} WHERE ${parentKey.replace('Id', '_id')} = ?`,
        [parentId],
        (cErr, rows) => {
          if (cErr) return res.status(500).json({ error: cErr.message });
          res.json(rows);
        }
      );
    }
  );
};

const handleSubCreate = (childTable, parentTable, parentKey) => (req, res) => {
  const parentId = req.params[parentKey];
  const foreignKey = parentKey.replace('Id', '_id');
  req.tenantDb.get(
    `SELECT id FROM ${parentTable} WHERE id = ? AND household_id = ?`,
    [parentId, req.hhId],
    (err, row) => {
      if (err || !row) {
        return res.status(404).json({ error: 'Parent resource not found' });
      }
      req.tenantDb.all(`PRAGMA table_info(${childTable})`, [], (pErr, cols) => {
        if (pErr) {
          return res.status(500).json({ error: pErr.message });
        }
        const validColumns = cols.map((c) => c.name);
        const data = { ...req.body, [foreignKey]: parentId };
        const insertData = {};
        Object.keys(data).forEach((key) => {
          if (validColumns.includes(key)) insertData[key] = data[key];
        });
        const fields = Object.keys(insertData);
        req.tenantDb.run(
          `INSERT INTO ${childTable} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
          Object.values(insertData),
          async function (iErr) {
            if (iErr) return res.status(500).json({ error: iErr.message });

            // AUDIT LOG
            await logAction({
              householdId: req.hhId,
              userId: req.user.id,
              action: `${childTable.toUpperCase()}_CREATE`,
              entityType: childTable,
              entityId: this.lastID,
              metadata: { parentId, parentTable },
              req,
            });

            res.status(201).json({ id: this.lastID, ...insertData });
          }
        );
      });
    }
  );
};

const handleSubDelete = (childTable, parentTable, parentKey) => (req, res) => {
  const parentId = req.params[parentKey];
  const itemId = req.params.itemId;
  const foreignKey = parentKey.replace('Id', '_id');
  const sql = `DELETE FROM ${childTable} WHERE id = ? AND ${foreignKey} IN (SELECT id FROM ${parentTable} WHERE id = ? AND household_id = ?)`;
  req.tenantDb.run(sql, [itemId, parentId, req.hhId], async function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ error: 'Item not found or access denied' });

    // AUDIT LOG
    await logAction({
      householdId: req.hhId,
      userId: req.user.id,
      action: `${childTable.toUpperCase()}_DELETE`,
      entityType: childTable,
      entityId: parseInt(itemId),
      metadata: { parentId, parentTable },
      req,
    });

    res.json({ message: 'Deleted' });
  });
};

const handleSubUpdate = (childTable, parentTable, parentKey) => (req, res) => {
  const parentId = req.params[parentKey];
  const itemId = req.params.itemId;
  const foreignKey = parentKey.replace('Id', '_id');
  req.tenantDb.get(
    `SELECT id FROM ${parentTable} WHERE id = ? AND household_id = ?`,
    [parentId, req.hhId],
    (err, row) => {
      if (err || !row) {
        return res.status(404).json({ error: 'Parent resource not found' });
      }
      req.tenantDb.all(`PRAGMA table_info(${childTable})`, [], (pErr, cols) => {
        if (pErr) {
          return res.status(500).json({ error: pErr.message });
        }
        const validColumns = cols.map((c) => c.name);
        const data = req.body;
        const updateData = {};
        Object.keys(data).forEach((key) => {
          if (validColumns.includes(key) && key !== 'id' && key !== foreignKey)
            updateData[key] = data[key];
        });
        const fields = Object.keys(updateData);
        if (fields.length === 0) {
          return res.status(400).json({ error: 'No valid fields' });
        }
        const sets = fields.map((f) => `${f} = ?`).join(', ');
        req.tenantDb.run(
          `UPDATE ${childTable} SET ${sets} WHERE id = ? AND ${foreignKey} = ?`,
          [...Object.values(updateData), itemId, parentId],
          async function (uErr) {
            if (uErr) return res.status(500).json({ error: uErr.message });

            // AUDIT LOG
            await logAction({
              householdId: req.hhId,
              userId: req.user.id,
              action: `${childTable.toUpperCase()}_UPDATE`,
              entityType: childTable,
              entityId: parseInt(itemId),
              metadata: { parentId, parentTable, updates: Object.keys(updateData) },
              req,
            });

            res.json({ message: 'Updated' });
          }
        );
      });
    }
  );
};

// ==========================================
// 🚀 ROUTES
// ==========================================

const handleAssignMember = (req, res) => {
  const { entity_type, entity_id, member_id } = req.body;
  if (!entity_type || !entity_id || !member_id)
    return res.status(400).json({ error: 'Missing required fields' });
  req.tenantDb.get(
    'SELECT id FROM members WHERE id = ? AND household_id = ?',
    [member_id, req.hhId],
    (err, row) => {
      if (err || !row) {
        return res.status(404).json({ error: 'Member not found' });
      }
      req.tenantDb.run(
        `INSERT OR IGNORE INTO finance_assignments (household_id, entity_type, entity_id, member_id) VALUES (?, ?, ?, ?)`,
        [req.hhId, entity_type, entity_id, member_id],
        async function (iErr) {
          if (iErr) return res.status(500).json({ error: iErr.message });

          // AUDIT LOG
          await logAction({
            householdId: req.hhId,
            userId: req.user.id,
            action: 'FINANCE_ASSIGNMENT_CREATE',
            entityType: 'finance_assignment',
            metadata: { entity_type, entity_id, member_id },
            req,
          });

          res.status(201).json({ message: 'Assigned' });
        }
      );
    }
  );
};

const handleUnassignMember = (req, res) => {
  const { entity_type, entity_id, member_id } = req.params;
  req.tenantDb.run(
    `DELETE FROM finance_assignments WHERE household_id = ? AND entity_type = ? AND entity_id = ? AND member_id = ?`,
    [req.hhId, entity_type, entity_id, member_id],
    async function (err) {
      if (err) return res.status(500).json({ error: err.message });

      // AUDIT LOG
      await logAction({
        householdId: req.hhId,
        userId: req.user.id,
        action: 'FINANCE_ASSIGNMENT_DELETE',
        entityType: 'finance_assignment',
        metadata: { entity_type, entity_id, member_id },
        req,
      });

      res.json({ message: 'Unassigned' });
    }
  );
};

const handleGetAssignments = (req, res) => {
  let sql = 'SELECT * FROM finance_assignments WHERE household_id = ?';
  let params = [req.hhId];
  if (req.query.entity_type) {
    sql += ' AND entity_type = ?';
    params.push(req.query.entity_type);
  }
  if (req.query.entity_id) {
    sql += ' AND entity_id = ?';
    params.push(req.query.entity_id);
  }
  if (req.query.member_id) {
    sql += ' AND member_id = ?';
    params.push(req.query.member_id);
  }
  req.tenantDb.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

// ==========================================
// 💸 VIRTUAL DEBT ROUTES (Mapped to recurring_costs)
// ==========================================

const handleGetDebtList = (categoryId) => (req, res) => {
  req.tenantDb.all(
    `SELECT * FROM recurring_costs WHERE household_id = ? AND category_id = ? AND is_active = 1`,
    [req.hhId, categoryId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(
        (rows || []).map((row) => {
          const meta = row.metadata ? JSON.parse(row.metadata) : {};
          return {
            ...row,
            ...meta,
            name: row.name,
            amount: row.amount,
            // Ensure specific fields expected by frontend are at top level
            lender: meta.lender || row.name,
            monthly_payment: row.amount,
            remaining_balance: meta.remaining_balance || 0,
            total_amount: meta.total_amount || 0,
          };
        })
      );
    }
  );
};

const handleCreateDebt = (categoryId) => (req, res) => {
  const {
    name,
    lender,
    provider,
    amount,
    monthly_payment,
    financial_profile_id,
    bank_account_id,
    ...metadata
  } = req.body;
  const finalName = name || lender || provider || 'Debt Item';
  const finalAmount = parseFloat(amount || monthly_payment) || 0;
  const metaStr = JSON.stringify({ lender: lender || provider || finalName, ...metadata });

  let objectType = req.body.object_type || 'household';
  let objectId = req.body.object_id || null;

  if (categoryId === 'vehicle_finance' && req.body.vehicle_id) {
    objectType = 'vehicle';
    objectId = req.body.vehicle_id;
  }

  req.tenantDb.run(
    `INSERT INTO recurring_costs (
        household_id, object_type, object_id, category_id, name, amount, frequency, 
        start_date, day_of_month, adjust_for_working_day, emoji, metadata, 
        financial_profile_id, bank_account_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.hhId,
      objectType,
      objectId,
      categoryId,
      finalName,
      finalAmount,
      'monthly',
      req.body.start_date || null,
      req.body.payment_day || null,
      req.body.nearest_working_day || 1,
      req.body.emoji || null,
      metaStr,
      financial_profile_id || null,
      bank_account_id || null,
    ],
    async function (err) {
      if (err) return res.status(500).json({ error: err.message });

      // AUDIT LOG
      await logAction({
        householdId: req.hhId,
        userId: req.user.id,
        action: 'DEBT_CREATE',
        entityType: 'recurring_cost',
        entityId: this.lastID,
        metadata: { categoryId, name: finalName },
        req,
      });

      res.status(201).json({ id: this.lastID, ...req.body });
    }
  );
};

const handleUpdateDebt = (categoryId) => (req, res) => {
  const {
    name,
    lender,
    provider,
    amount,
    monthly_payment,
    financial_profile_id,
    bank_account_id,
    ...metadata
  } = req.body;
  const finalName = name || lender || provider || 'Debt Item';
  const finalAmount = parseFloat(amount || monthly_payment) || 0;
  const metaStr = JSON.stringify({ lender: lender || provider || finalName, ...metadata });

  let objectType = req.body.object_type || 'household';
  let objectId = req.body.object_id || null;

  if (categoryId === 'vehicle_finance' && req.body.vehicle_id) {
    objectType = 'vehicle';
    objectId = req.body.vehicle_id;
  }

  req.tenantDb.run(
    `UPDATE recurring_costs SET 
        name = ?, amount = ?, day_of_month = ?, emoji = ?, metadata = ?,
        object_type = ?, object_id = ?, financial_profile_id = ?, bank_account_id = ?
        WHERE id = ? AND household_id = ? AND category_id = ?`,
    [
      finalName,
      finalAmount,
      req.body.payment_day || null,
      req.body.emoji || null,
      metaStr,
      objectType,
      objectId,
      financial_profile_id || null,
      bank_account_id || null,
      req.params.itemId,
      req.hhId,
      categoryId,
    ],
    async function (err) {
      if (err) return res.status(500).json({ error: err.message });

      // AUDIT LOG
      await logAction({
        householdId: req.hhId,
        userId: req.user.id,
        action: 'DEBT_UPDATE',
        entityType: 'recurring_cost',
        entityId: parseInt(req.params.itemId),
        metadata: { categoryId, name: finalName },
        req,
      });

      res.json({ message: 'Updated' });
    }
  );
};

// --- RELATIVE ROUTES (Mounted at /households/:id/finance) ---

router.get(
  '/mortgages',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetDebtList('mortgage')
);
router.post(
  '/mortgages',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleCreateDebt('mortgage')
);
router.put(
  '/mortgages/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleUpdateDebt('mortgage')
);
router.delete(
  '/mortgages/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleDeleteItem('recurring_costs')
);

router.get(
  '/loans',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetDebtList('loan')
);
router.post(
  '/loans',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleCreateDebt('loan')
);
router.put(
  '/loans/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleUpdateDebt('loan')
);
router.delete(
  '/loans/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleDeleteItem('recurring_costs')
);

router.get(
  '/vehicle-finance',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetDebtList('vehicle_finance')
);
router.post(
  '/vehicle-finance',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleCreateDebt('vehicle_finance')
);
router.put(
  '/vehicle-finance/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleUpdateDebt('vehicle_finance')
);
router.delete(
  '/vehicle-finance/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleDeleteItem('recurring_costs')
);

router.get(
  '/assignments',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetAssignments
);
router.post(
  '/assignments',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleAssignMember
);
router.delete(
  '/assignments/:entity_type/:entity_id/:member_id',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleUnassignMember
);

router.get(
  '/income',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetList('finance_income')
);
router.get(
  '/income/:itemId',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetItem('finance_income')
);
router.post(
  '/income',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('finance_income'),
  handleCreateItem('finance_income')
);
router.put(
  '/income/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('finance_income'),
  handleUpdateItem('finance_income')
);
router.delete(
  '/income/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleDeleteItem('finance_income')
);

router.get(
  '/savings/pots',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  (req, res) => {
    const sql = `SELECT p.*, s.institution, s.account_name, s.emoji as account_emoji, s.current_balance FROM finance_savings_pots p JOIN finance_savings s ON p.savings_id = s.id WHERE s.household_id = ?`;
    req.tenantDb.all(sql, [req.hhId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    });
  }
);

router.get(
  '/savings',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetList('finance_savings')
);
router.get(
  '/savings/:itemId',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetItem('finance_savings')
);
router.post(
  '/savings',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('finance_savings'),
  handleCreateItem('finance_savings')
);
router.put(
  '/savings/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('finance_savings'),
  handleUpdateItem('finance_savings')
);
router.delete(
  '/savings/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleDeleteItem('finance_savings')
);

router.get(
  '/savings/:savingsId/pots',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleSubList('finance_savings_pots', 'finance_savings', 'savingsId')
);
router.post(
  '/savings/:savingsId/pots',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleSubCreate('finance_savings_pots', 'finance_savings', 'savingsId')
);
router.put(
  '/savings/:savingsId/pots/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleSubUpdate('finance_savings_pots', 'finance_savings', 'savingsId')
);
router.delete(
  '/savings/:savingsId/pots/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleSubDelete('finance_savings_pots', 'finance_savings', 'savingsId')
);

router.get(
  '/credit-cards',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetList('finance_credit_cards')
);
router.get(
  '/credit-cards/:itemId',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetItem('finance_credit_cards')
);
router.post(
  '/credit-cards',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('finance_credit_cards'),
  handleCreateItem('finance_credit_cards')
);
router.put(
  '/credit-cards/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('finance_credit_cards'),
  handleUpdateItem('finance_credit_cards')
);
router.delete(
  '/credit-cards/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleDeleteItem('finance_credit_cards')
);

router.get(
  '/investments',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetList('finance_investments')
);
router.get(
  '/investments/:itemId',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetItem('finance_investments')
);
router.post(
  '/investments',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleCreateItem('finance_investments')
);
router.put(
  '/investments/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleUpdateItem('finance_investments')
);
router.delete(
  '/investments/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleDeleteItem('finance_investments')
);

router.get(
  '/pensions',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetList('finance_pensions')
);
router.get(
  '/pensions/:itemId',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetItem('finance_pensions')
);
router.post(
  '/pensions',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('finance_pensions'),
  handleCreateItem('finance_pensions')
);
router.put(
  '/pensions/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('finance_pensions'),
  handleUpdateItem('finance_pensions')
);
router.delete(
  '/pensions/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleDeleteItem('finance_pensions')
);

router.get(
  '/pensions/:pensionId/history',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleSubList('finance_pensions_history', 'finance_pensions', 'pensionId')
);
router.post(
  '/pensions/:pensionId/history',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleSubCreate('finance_pensions_history', 'finance_pensions', 'pensionId')
);
router.delete(
  '/pensions/:pensionId/history/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleSubDelete('finance_pensions_history', 'finance_pensions', 'pensionId')
);

router.get(
  '/categories',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetList('finance_budget_categories')
);
router.post(
  '/categories',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleCreateItem('finance_budget_categories')
);
router.delete(
  '/categories/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleDeleteItem('finance_budget_categories')
);

router.get(
  '/budget-progress',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  (req, res) => {
    let sql = `SELECT * FROM finance_budget_progress WHERE household_id = ?`;
    const params = [req.hhId];
    if (req.query.financial_profile_id) {
      sql += ` AND financial_profile_id = ?`;
      params.push(req.query.financial_profile_id);
    }
    req.tenantDb.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    });
  }
);

router.get(
  '/budget-cycles',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  (req, res) => {
    let sql = `SELECT * FROM finance_budget_cycles WHERE household_id = ?`;
    const params = [req.hhId];
    if (req.query.financial_profile_id) {
      sql += ` AND financial_profile_id = ?`;
      params.push(req.query.financial_profile_id);
    }
    req.tenantDb.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    });
  }
);

router.delete(
  '/budget-cycles/:cycleStart',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  (req, res) => {
    const { cycleStart } = req.params;
    const { financial_profile_id } = req.query;

    let sqlCycle = `DELETE FROM finance_budget_cycles WHERE household_id = ? AND cycle_start = ?`;
    let sqlProg = `DELETE FROM finance_budget_progress WHERE household_id = ? AND cycle_start = ?`;
    const params = [req.hhId, cycleStart];

    if (financial_profile_id) {
      sqlCycle += ` AND financial_profile_id = ?`;
      sqlProg += ` AND financial_profile_id = ?`;
      params.push(financial_profile_id);
    }

    req.tenantDb.serialize(() => {
      req.tenantDb.run('BEGIN TRANSACTION');
      req.tenantDb.run(sqlCycle, params);
      req.tenantDb.run(sqlProg, params, async (err) => {
        if (err) {
          req.tenantDb.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }

        // AUDIT LOG
        await logAction({
          householdId: req.hhId,
          userId: req.user.id,
          action: 'BUDGET_CYCLE_DELETE',
          entityType: 'budget_cycle',
          metadata: { cycleStart, financial_profile_id },
          req,
        });

        req.tenantDb.run('COMMIT', () => {
          res.json({ message: 'Cycle reset' });
        });
      });
    });
  }
);

router.post(
  '/budget-cycles',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  (req, res) => {
    const { cycle_start, actual_pay, current_balance, bank_account_id, financial_profile_id } =
      req.body;

    req.tenantDb.serialize(() => {
      req.tenantDb.run('BEGIN TRANSACTION');

      // 1. Update/Insert Cycle
      req.tenantDb.run(
        `
            INSERT INTO finance_budget_cycles (household_id, financial_profile_id, cycle_start, actual_pay, current_balance, bank_account_id) 
            VALUES (?, ?, ?, ?, ?, ?) 
            ON CONFLICT(household_id, financial_profile_id, cycle_start) 
            DO UPDATE SET 
                actual_pay = excluded.actual_pay, 
                current_balance = excluded.current_balance,
                bank_account_id = excluded.bank_account_id
        `,
        [req.hhId, financial_profile_id, cycle_start, actual_pay, current_balance, bank_account_id],
        async function (err) {
          if (err) {
            req.tenantDb.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }

          // AUDIT LOG
          await logAction({
            householdId: req.hhId,
            userId: req.user.id,
            action: 'BUDGET_CYCLE_UPDATE',
            entityType: 'budget_cycle',
            metadata: { cycle_start, financial_profile_id },
            req,
          });

          // 2. If bank_account_id is provided, sync the balance to the current account
          if (bank_account_id) {
            req.tenantDb.run(
              `UPDATE finance_current_accounts SET current_balance = ? WHERE id = ? AND household_id = ?`,
              [current_balance, bank_account_id, req.hhId],
              (updateErr) => {
                if (updateErr) {
                  req.tenantDb.run('ROLLBACK');
                  return res.status(500).json({ error: updateErr.message });
                }
                req.tenantDb.run('COMMIT', () => {
                  res.json({ message: 'Cycle and bank account updated' });
                });
              }
            );
          } else {
            req.tenantDb.run('COMMIT', () => {
              res.json({ message: 'Cycle updated' });
            });
          }
        }
      );
    });
  }
);

router.post(
  '/budget-progress',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  (req, res) => {
    const { cycle_start, item_key, is_paid, actual_amount, actual_date, financial_profile_id } =
      req.body;
    const newAmount = parseFloat(actual_amount) || 0;
    const newPaid = parseInt(is_paid) || 0;

    req.tenantDb.get(
      `SELECT is_paid, actual_amount FROM finance_budget_progress WHERE household_id = ? AND financial_profile_id = ? AND cycle_start = ? AND item_key = ?`,
      [req.hhId, financial_profile_id, cycle_start, item_key],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const oldPaid = row ? row.is_paid || 0 : 0;
        const oldAmount = row ? row.actual_amount || 0 : 0;
        let potDelta = 0;
        let balanceDelta = 0;

        // 1. Pot Logic (Internal Savings Sync)
        if (item_key.startsWith('pot_')) {
          if (newPaid && !oldPaid) potDelta = newAmount;
          else if (!newPaid && oldPaid) potDelta = -oldAmount;
          else if (newPaid && oldPaid) potDelta = newAmount - oldAmount;
        }

        // 2. Bank Balance Sync Logic (Budget -> Real World)
        const isIncome = item_key.startsWith('income_');
        const multiplier = isIncome ? 1 : -1;

        if (newPaid && !oldPaid) {
          balanceDelta = newAmount * multiplier;
        } else if (!newPaid && oldPaid) {
          balanceDelta = -oldAmount * multiplier;
        } else if (newPaid && oldPaid) {
          balanceDelta = (newAmount - oldAmount) * multiplier;
        }

        req.tenantDb.serialize(() => {
          req.tenantDb.run('BEGIN TRANSACTION');
          req.tenantDb.run(
            `INSERT INTO finance_budget_progress (household_id, financial_profile_id, cycle_start, item_key, is_paid, actual_amount, actual_date) 
                             VALUES (?, ?, ?, ?, ?, ?, ?) 
                             ON CONFLICT(household_id, financial_profile_id, cycle_start, item_key) 
                             DO UPDATE SET 
                                is_paid = excluded.is_paid, 
                                actual_amount = excluded.actual_amount,
                                actual_date = COALESCE(excluded.actual_date, finance_budget_progress.actual_date)`,
            [
              req.hhId,
              financial_profile_id,
              cycle_start,
              item_key,
              newPaid,
              newAmount,
              actual_date,
            ],
            async (pErr) => {
              if (pErr) {
                req.tenantDb.run('ROLLBACK');
                return res.status(500).json({ error: pErr.message });
              }

              // AUDIT LOG
              await logAction({
                householdId: req.hhId,
                userId: req.user.id,
                action: 'BUDGET_PROGRESS_UPDATE',
                entityType: 'budget_progress',
                metadata: { cycle_start, item_key, is_paid: newPaid, amount: newAmount },
                req,
              });

              const finalize = () => {
                // Update the main Budget Cycle Balance and Linked Bank Account if applicable
                if (balanceDelta !== 0) {
                  req.tenantDb.get(
                    `SELECT bank_account_id FROM finance_budget_cycles WHERE household_id = ? AND financial_profile_id = ? AND cycle_start = ?`,
                    [req.hhId, financial_profile_id, cycle_start],
                    (cycErr, cycle) => {
                      if (cycErr || !cycle) {
                        req.tenantDb.run('COMMIT', () => {
                          res.status(201).json({ message: 'Progress saved' });
                        });
                        return;
                      }

                      // Update Cycle Balance
                      req.tenantDb.run(
                        `UPDATE finance_budget_cycles SET current_balance = current_balance + ? WHERE household_id = ? AND financial_profile_id = ? AND cycle_start = ?`,
                        [balanceDelta, req.hhId, financial_profile_id, cycle_start],
                        (bcErr) => {
                          if (bcErr) {
                            req.tenantDb.run('ROLLBACK');
                            return res.status(500).json({ error: bcErr.message });
                          }

                          // Update Bank Account Balance (only if linked)
                          if (cycle.bank_account_id) {
                            req.tenantDb.run(
                              `UPDATE finance_current_accounts SET current_balance = current_balance + ? WHERE id = ? AND household_id = ?`,
                              [balanceDelta, cycle.bank_account_id, req.hhId],
                              (baErr) => {
                                if (baErr) {
                                  req.tenantDb.run('ROLLBACK');
                                  return res.status(500).json({ error: baErr.message });
                                }
                                req.tenantDb.run('COMMIT', () => {
                                  res.status(201).json({
                                    message: 'Progress saved and bank/cycle synced',
                                    balanceDelta,
                                  });
                                });
                              }
                            );
                          } else {
                            req.tenantDb.run('COMMIT', () => {
                              res
                                .status(201)
                                .json({ message: 'Progress saved and cycle synced', balanceDelta });
                            });
                          }
                        }
                      );
                    }
                  );
                } else {
                  req.tenantDb.run('COMMIT', () => {
                    res.status(201).json({ message: 'Progress saved' });
                  });
                }
              };

              if (potDelta !== 0 && item_key.startsWith('pot_')) {
                const potId = item_key.split('_')[1];
                req.tenantDb.run(
                  `UPDATE finance_savings_pots SET current_amount = current_amount + ? WHERE id = ? AND savings_id IN (SELECT id FROM finance_savings WHERE household_id = ?)`,
                  [potDelta, potId, req.hhId],
                  (potErr) => {
                    if (potErr) {
                      req.tenantDb.run('ROLLBACK');
                      return res.status(500).json({ error: potErr.message });
                    }
                    req.tenantDb.run(
                      `UPDATE finance_savings SET current_balance = current_balance + ? WHERE id = (SELECT savings_id FROM finance_savings_pots WHERE id = ?) AND household_id = ?`,
                      [potDelta, potId, req.hhId],
                      (savErr) => {
                        if (savErr) {
                          req.tenantDb.run('ROLLBACK');
                          return res.status(500).json({ error: savErr.message });
                        }
                        finalize();
                      }
                    );
                  }
                );
              } else {
                finalize();
              }
            }
          );
        });
      }
    );
  }
);

router.delete(
  '/budget-progress/:cycleStart/:itemKey',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  (req, res) => {
    const { cycleStart, itemKey } = req.params;
    const { financial_profile_id } = req.query;

    req.tenantDb.get(
      `SELECT is_paid, actual_amount FROM finance_budget_progress WHERE household_id = ? AND financial_profile_id = ? AND cycle_start = ? AND item_key = ?`,
      [req.hhId, financial_profile_id, cycleStart, itemKey],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const oldPaid = row ? row.is_paid || 0 : 0;
        const oldAmount = row ? row.actual_amount || 0 : 0;
        let potDelta = 0;
        let balanceDelta = 0;

        if (oldPaid) {
          // Reverse balance change
          const isIncome = itemKey.startsWith('income_');
          const multiplier = isIncome ? 1 : -1;
          balanceDelta = -(oldAmount * multiplier);

          if (itemKey.startsWith('pot_')) {
            potDelta = -oldAmount;
          }
        }

        req.tenantDb.serialize(() => {
          req.tenantDb.run('BEGIN TRANSACTION');

          const finalize = () => {
            req.tenantDb.run(
              `DELETE FROM finance_budget_progress WHERE household_id = ? AND financial_profile_id = ? AND cycle_start = ? AND item_key = ?`,
              [req.hhId, financial_profile_id, cycleStart, itemKey],
              async (delErr) => {
                if (delErr) {
                  req.tenantDb.run('ROLLBACK');
                  return res.status(500).json({ error: delErr.message });
                }

                // AUDIT LOG
                await logAction({
                  householdId: req.hhId,
                  userId: req.user.id,
                  action: 'BUDGET_PROGRESS_DELETE',
                  entityType: 'budget_progress',
                  metadata: { cycleStart, itemKey, financial_profile_id },
                  req,
                });

                if (balanceDelta !== 0) {
                  req.tenantDb.get(
                    `SELECT bank_account_id FROM finance_budget_cycles WHERE household_id = ? AND financial_profile_id = ? AND cycle_start = ?`,
                    [req.hhId, financial_profile_id, cycleStart],
                    (cycErr, cycle) => {
                      if (cycErr || !cycle) {
                        req.tenantDb.run('COMMIT', () => {
                          res.json({ message: 'Progress removed' });
                        });
                        return;
                      }
                      req.tenantDb.run(
                        `UPDATE finance_budget_cycles SET current_balance = current_balance + ? WHERE household_id = ? AND financial_profile_id = ? AND cycle_start = ?`,
                        [balanceDelta, req.hhId, financial_profile_id, cycleStart],
                        (bcErr) => {
                          if (bcErr) {
                            req.tenantDb.run('ROLLBACK');
                            return res.status(500).json({ error: bcErr.message });
                          }
                          if (cycle.bank_account_id) {
                            req.tenantDb.run(
                              `UPDATE finance_current_accounts SET current_balance = current_balance + ? WHERE id = ? AND household_id = ?`,
                              [balanceDelta, cycle.bank_account_id, req.hhId],
                              (baErr) => {
                                if (baErr) {
                                  req.tenantDb.run('ROLLBACK');
                                  return res.status(500).json({ error: baErr.message });
                                }
                                req.tenantDb.run('COMMIT', () => {
                                  res.json({
                                    message: 'Progress removed and balances synced',
                                    balanceDelta,
                                  });
                                });
                              }
                            );
                          } else {
                            req.tenantDb.run('COMMIT', () => {
                              res.json({
                                message: 'Progress removed and cycle synced',
                                balanceDelta,
                              });
                            });
                          }
                        }
                      );
                    }
                  );
                } else {
                  req.tenantDb.run('COMMIT', () => {
                    res.json({ message: 'Progress removed' });
                  });
                }
              }
            );
          };

          if (potDelta !== 0) {
            const potId = itemKey.split('_')[1];
            req.tenantDb.run(
              `UPDATE finance_savings_pots SET current_amount = current_amount + ? WHERE id = ? AND savings_id IN (SELECT id FROM finance_savings WHERE household_id = ?)`,
              [potDelta, potId, req.hhId],
              (potErr) => {
                if (potErr) {
                  req.tenantDb.run('ROLLBACK');
                  return res.status(500).json({ error: potErr.message });
                }
                req.tenantDb.run(
                  `UPDATE finance_savings SET current_balance = current_balance + ? WHERE id = (SELECT savings_id FROM finance_savings_pots WHERE id = ?) AND household_id = ?`,
                  [potDelta, potId, req.hhId],
                  (savErr) => {
                    if (savErr) {
                      req.tenantDb.run('ROLLBACK');
                      return res.status(500).json({ error: savErr.message });
                    }
                    finalize();
                  }
                );
              }
            );
          } else {
            finalize();
          }
        });
      }
    );
  }
);

router.get(
  '/current-accounts',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetList('finance_current_accounts')
);
router.get(
  '/current-accounts/:itemId',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  handleGetItem('finance_current_accounts')
);
router.post(
  '/current-accounts',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('finance_current_accounts'),
  handleCreateItem('finance_current_accounts')
);
router.put(
  '/current-accounts/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('finance_current_accounts'),
  handleUpdateItem('finance_current_accounts')
);
router.delete(
  '/current-accounts/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  handleDeleteItem('finance_current_accounts')
);

// Mount recurring costs
router.use('/recurring-costs', recurringCostsRoutes);
router.use('/import', financeImportRoutes);

module.exports = router;
