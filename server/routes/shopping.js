const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const SqliteShoppingRepository = require('../domain/shopping/adapters/SqliteShoppingRepository');
const ShoppingService = require('../domain/shopping/application/ShoppingService');
const { getGrocerySuggestions } = require('../services/grocery_intelligence');
const response = require('../utils/response');
const { AppError, NotFoundError } = require('@hearth/shared');

/**
 * HELPER: Initialize service with tenant DB
 */
function getShoppingService(req) {
  const repository = new SqliteShoppingRepository(req.tenantDb, req.hhId);
  return new ShoppingService(repository);
}

/**
 * Mapper: Entity to API Model
 */
function toApiModel(item) {
  return {
    id: item.id,
    household_id: item.householdId,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    estimated_cost: item.estimatedCost,
    week_start: item.weekStart,
    is_checked: item.isChecked ? 1 : 0,
    updated_at: item.updatedAt,
    created_at: item.createdAt,
  };
}

/**
 * GET /api/households/:id/shopping-list/suggestions
 */
router.get(
  '/suggestions',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const suggestions = await getGrocerySuggestions(req.tenantDb, req.hhId);
      response.success(res, suggestions);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/households/:id/shopping-list
 */
router.get(
  '/',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const service = getShoppingService(req);
      const items = await service.listItems(req.hhId);
      const apiItems = items.map(toApiModel);
      const totalEstimated = apiItems.reduce((acc, item) => acc + (item.estimated_cost || 0), 0);
      response.success(res, {
        items: apiItems,
        summary: { total_items: apiItems.length, total_estimated_cost: totalEstimated },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/households/:id/shopping-list
 */
router.post(
  '/',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      if (req.isDryRun) return response.success(res, { message: 'Dry run', data: req.body });
      const service = getShoppingService(req);
      const item = await service.addItem(req.hhId, req.body);
      response.success(res, toApiModel(item), null, 201);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/households/:id/shopping-list/clear
 */
router.delete(
  '/clear',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const service = getShoppingService(req);
      const count = await service.clearChecked(req.hhId);
      response.success(res, { message: 'Checked items cleared', count });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/households/:id/shopping-list/bulk
 */
router.post(
  '/bulk',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const { actions } = req.body;
      if (!Array.isArray(actions) || actions.length === 0)
        throw new AppError('Actions required', 400);
      const service = getShoppingService(req);
      await service.bulkAction(req.hhId, actions);
      response.success(res, { message: 'Bulk action completed', count: actions.length });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/households/:id/shopping-list/:itemId
 */
router.put(
  '/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const service = getShoppingService(req);
      const item = await service.updateItem(req.params.itemId, req.hhId, req.body);
      if (!item) throw new NotFoundError('Shopping item not found');
      response.success(res, toApiModel(item));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/households/:id/shopping-list/:itemId
 */
router.delete(
  '/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const service = getShoppingService(req);
      const deleted = await service.deleteItem(req.params.itemId, req.hhId);
      if (!deleted) throw new NotFoundError('Shopping item not found');
      response.success(res, { message: 'Item deleted' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
