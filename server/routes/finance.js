const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { autoEncrypt, decryptData } = require('../middleware/encryption');
const { dbAll, dbGet, dbRun } = require('../db');
const { NotFoundError, AppError } = require('@hearth/shared');
const response = require('../utils/response');

const recurringCostsRoutes = require('./recurring_costs');
const financeImportRoutes = require('./finance_import');

// ==========================================
// 🏠 GENERIC CRUD HELPERS
// ==========================================

const handleGetList = (table) => async (req, res, next) => {
  try {
    let sql = `SELECT * FROM ${table} WHERE household_id = ? AND deleted_at IS NULL`;
    const params = [req.hhId];
    if (req.query.financial_profile_id) {
      sql += ` AND financial_profile_id = ?`;
      params.push(req.query.financial_profile_id);
    }
    const rows = await dbAll(req.tenantDb, sql, params);
    response.success(res, decryptData(table, rows || []));
  } catch (err) { next(err); }
};

const handleGetItem = (table) => async (req, res, next) => {
  try {
    const row = await dbGet(req.tenantDb, `SELECT * FROM ${table} WHERE id = ? AND household_id = ? AND deleted_at IS NULL`, [req.params.itemId, req.hhId]);
    if (!row) throw new NotFoundError('Item not found');
    response.success(res, decryptData(table, row));
  } catch (err) { next(err); }
};

const handleCreateItem = (table) => async (req, res, next) => {
  try {
    if (req.isDryRun) return response.success(res, { message: 'Dry run', data: req.body });
    const cols = await dbAll(req.tenantDb, `PRAGMA table_info(${table})`, []);
    const validColumns = cols.map((c) => c.name);
    const insertData = {};
    Object.keys(req.body).forEach((key) => {
      if (validColumns.includes(key)) insertData[key] = req.body[key];
    });
    insertData.household_id = req.hhId;
    const fields = Object.keys(insertData);
    const { id: newId } = await dbRun(
      req.tenantDb,
      `INSERT INTO ${table} (${fields.join(', ')}, version) VALUES (${fields.map(() => '?').join(', ')}, 1)`,
      Object.values(insertData)
    );
    response.success(res, { id: newId, version: 1, ...insertData }, null, 201);
  } catch (err) { next(err); }
};

const handleUpdateItem = (table) => async (req, res, next) => {
  try {
    if (req.isDryRun) return response.success(res, { message: 'Dry run', updates: req.body });
    const cols = await dbAll(req.tenantDb, `PRAGMA table_info(${table})`, []);
    const validColumns = cols.map(c => c.name);
    const updates = {};
    Object.keys(req.body).forEach(k => {
      if (validColumns.includes(k) && !['id', 'household_id', 'version'].includes(k)) updates[k] = req.body[k];
    });
    const fields = Object.keys(updates).map(k => `${k} = ?`);
    const result = await dbRun(
      req.tenantDb,
      `UPDATE ${table} SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = ? AND household_id = ? AND deleted_at IS NULL`,
      [...Object.values(updates), req.params.itemId, req.hhId]
    );
    if (result.changes === 0) throw new NotFoundError('Item not found');
    response.success(res, { message: 'Updated' });
  } catch (err) { next(err); }
};

const handleDeleteItem = (table) => async (req, res, next) => {
  try {
    const result = await dbRun(req.tenantDb, `UPDATE ${table} SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND household_id = ?`, [req.params.itemId, req.hhId]);
    if (result.changes === 0) throw new NotFoundError('Item not found');
    response.success(res, { message: 'Deleted' });
  } catch (err) { next(err); }
};

// ==========================================
// 💸 DEBT HELPERS
// ==========================================

const handleGetDebtList = (categoryId) => async (req, res, next) => {
  try {
    const rows = await dbAll(
      req.tenantDb,
      `SELECT * FROM recurring_costs WHERE household_id = ? AND category_id = ? AND deleted_at IS NULL`,
      [req.hhId, categoryId]
    );
    response.success(res, rows.map(r => {
      const meta = r.metadata ? JSON.parse(r.metadata) : {};
      return { ...r, ...meta };
    }));
  } catch (err) { next(err); }
};

const handleCreateDebt = (categoryId) => async (req, res, next) => {
  try {
    const { name, amount, ...metadata } = req.body;
    const { id: newId } = await dbRun(
      req.tenantDb,
      `INSERT INTO recurring_costs (household_id, category_id, name, amount, metadata, version) VALUES (?, ?, ?, ?, ?, 1)`,
      [req.hhId, categoryId, name || 'Debt', amount || 0, JSON.stringify(metadata)]
    );
    response.success(res, { id: newId, version: 1, ...req.body }, null, 201);
  } catch (err) { next(err); }
};

const handleUpdateDebt = (categoryId) => async (req, res, next) => {
  try {
    const { name, amount, ...metadata } = req.body;
    const result = await dbRun(
      req.tenantDb,
      `UPDATE recurring_costs SET name = ?, amount = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = ? AND household_id = ? AND category_id = ? AND deleted_at IS NULL`,
      [name || 'Debt', amount || 0, JSON.stringify(metadata), req.params.itemId, req.hhId, categoryId]
    );
    if (result.changes === 0) throw new NotFoundError('Debt not found');
    response.success(res, { message: 'Updated' });
  } catch (err) { next(err); }
};

// ==========================================
// 🏦 SAVINGS POTS
// ==========================================

router.get('/savings/pots', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, async (req, res, next) => {
  try {
    const rows = await dbAll(
      req.tenantDb,
      'SELECT p.* FROM finance_savings_pots p JOIN finance_savings s ON p.savings_id = s.id WHERE s.household_id = ? AND p.deleted_at IS NULL',
      [req.hhId]
    );
    response.success(res, rows || []);
  } catch (err) { next(err); }
});

router.get('/savings/:itemId/pots', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, async (req, res, next) => {
  try {
    const rows = await dbAll(
      req.tenantDb,
      'SELECT * FROM finance_savings_pots WHERE savings_id = ? AND deleted_at IS NULL',
      [req.params.itemId]
    );
    response.success(res, rows || []);
  } catch (err) { next(err); }
});

router.post('/savings/:itemId/pots', authenticateToken, requireHouseholdRole('member'), useTenantDb, async (req, res, next) => {
  try {
    const { name, target_amount, current_amount, emoji, notes } = req.body;
    const { id: newId } = await dbRun(
      req.tenantDb,
      'INSERT INTO finance_savings_pots (savings_id, name, target_amount, current_amount, emoji, notes, version) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [req.params.itemId, name, target_amount || 0, current_amount || 0, emoji, notes]
    );
    response.success(res, { id: newId, ...req.body }, null, 201);
  } catch (err) { next(err); }
});

router.put('/savings/:itemId/pots/:potId', authenticateToken, requireHouseholdRole('member'), useTenantDb, async (req, res, next) => {
  try {
    const updates = { ...req.body };
    delete updates.id;
    delete updates.savings_id;
    
    const fields = Object.keys(updates).map(k => `${k} = ?`);
    const result = await dbRun(
      req.tenantDb,
      `UPDATE finance_savings_pots SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = ? AND savings_id = ? AND deleted_at IS NULL`,
      [...Object.values(updates), req.params.potId, req.params.itemId]
    );
    if (result.changes === 0) throw new NotFoundError('Pot not found');
    response.success(res, { message: 'Updated' });
  } catch (err) { next(err); }
});

router.delete('/savings/:itemId/pots/:potId', authenticateToken, requireHouseholdRole('member'), useTenantDb, async (req, res, next) => {
  try {
    const result = await dbRun(
      req.tenantDb,
      'UPDATE finance_savings_pots SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND savings_id = ?',
      [req.params.potId, req.params.itemId]
    );
    if (result.changes === 0) throw new NotFoundError('Pot not found');
    response.success(res, { message: 'Deleted' });
  } catch (err) { next(err); }
});

// ==========================================
// 🚀 ROUTES
// ==========================================

const FINANCE_TABLES = [
  { path: 'income', table: 'finance_income', encrypt: true },
  { path: 'savings', table: 'finance_savings', encrypt: true },
  { path: 'credit-cards', table: 'finance_credit_cards', encrypt: true },
  { path: 'investments', table: 'finance_investments', encrypt: false },
  { path: 'pensions', table: 'finance_pensions', encrypt: true },
  { path: 'current-accounts', table: 'finance_current_accounts', encrypt: true },
  { path: 'budget-categories', table: 'finance_budget_categories', encrypt: false },
  { path: 'budget-progress', table: 'finance_budget_progress', encrypt: false },
  { path: 'budget-cycles', table: 'finance_budget_cycles', encrypt: false },
  { path: 'assignments', table: 'finance_assignments', encrypt: false },
];

FINANCE_TABLES.forEach(cfg => {
  const mw = cfg.encrypt ? [autoEncrypt(cfg.table)] : [];
  router.get(`/${cfg.path}`, authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList(cfg.table));
  router.get(`/${cfg.path}/:itemId`, authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetItem(cfg.table));
  router.post(`/${cfg.path}`, authenticateToken, requireHouseholdRole('member'), useTenantDb, ...mw, handleCreateItem(cfg.table));
  router.put(`/${cfg.path}/:itemId`, authenticateToken, requireHouseholdRole('member'), useTenantDb, ...mw, handleUpdateItem(cfg.table));
  router.delete(`/${cfg.path}/:itemId`, authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem(cfg.table));
});

router.get('/mortgages', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetDebtList('mortgage'));
router.post('/mortgages', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateDebt('mortgage'));
router.put('/mortgages/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateDebt('mortgage'));
router.delete('/mortgages/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('recurring_costs'));

router.get('/loans', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetDebtList('loan'));
router.post('/loans', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateDebt('loan'));
router.put('/loans/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateDebt('loan'));
router.delete('/loans/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('recurring_costs'));

router.get('/vehicle-finance', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetDebtList('vehicle_finance'));
router.post('/vehicle-finance', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateDebt('vehicle_finance'));
router.put('/vehicle-finance/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateDebt('vehicle_finance'));
router.delete('/vehicle-finance/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('recurring_costs'));

router.use('/recurring-costs', recurringCostsRoutes);
router.use('/import', financeImportRoutes);

module.exports = router;
