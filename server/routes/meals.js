const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { decryptData } = require('../middleware/encryption');
const { dbAll, dbGet, dbRun } = require('../db');
const { NotFoundError, AppError } = require('@hearth/shared');
const response = require('../utils/response');

/**
 * GET /api/households/:id/meals
 */
router.get(
  '/',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const rows = await dbAll(
        req.tenantDb,
        'SELECT * FROM meals WHERE household_id = ? AND deleted_at IS NULL',
        [req.hhId]
      );
      response.success(res, decryptData('meals', rows || []));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/households/:id/meals/plan
 */
router.get(
  '/plan',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const rows = await dbAll(
        req.tenantDb,
        'SELECT * FROM meal_plans WHERE household_id = ? AND deleted_at IS NULL',
        [req.hhId]
      );
      response.success(res, rows || []);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/households/:id/meals/sync-groceries
 * Item 223: Sync shopping list from meal plan
 */
router.post(
  '/sync-groceries',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const { populateGroceriesFromMeals } = require('../services/grocery_automation');
      const result = await populateGroceriesFromMeals(req.hhId);
      response.success(res, result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/households/:id/meals/plan
 */
router.post(
  '/plan',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const { date, member_id, meal_id, type, servings, notes } = req.body;
      const { id: newId } = await dbRun(
        req.tenantDb,
        'INSERT INTO meal_plans (household_id, date, member_id, meal_id, type, servings, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.hhId, date, member_id, meal_id, type || 'dinner', servings || 1, notes]
      );
      response.success(res, { id: newId, ...req.body }, null, 201);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/households/:id/meals/plan/:itemId
 */
router.delete(
  '/plan/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const result = await dbRun(
        req.tenantDb,
        'UPDATE meal_plans SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND household_id = ?',
        [req.params.itemId, req.hhId]
      );
      if (result.changes === 0) throw new NotFoundError('Plan entry not found');
      response.success(res, { message: 'Plan entry deleted' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/households/:id/meals
 */
router.post(
  '/',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      if (req.isDryRun) {
        return response.success(res, { message: 'Dry run successful', data: req.body });
      }
      const { name, description, emoji, category } = req.body;
      const { id: newId } = await dbRun(
        req.tenantDb,
        'INSERT INTO meals (household_id, name, description, emoji, category) VALUES (?, ?, ?, ?, ?)',
        [req.hhId, name, description, emoji, category]
      );
      response.success(res, { id: newId, ...req.body }, null, 201);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/households/:id/meals/:itemId
 */
router.delete(
  '/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const result = await dbRun(
        req.tenantDb,
        'UPDATE meals SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND household_id = ?',
        [req.params.itemId, req.hhId]
      );
      if (result.changes === 0) throw new NotFoundError('Meal not found');
      response.success(res, { message: 'Meal deleted (soft)' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
router.all('*', (req, res) =>
  res.status(404).json({ error: 'meals router catch-all', method: req.method, path: req.path })
);
