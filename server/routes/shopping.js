const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const SqliteShoppingRepository = require('../domain/shopping/adapters/SqliteShoppingRepository');
const ShoppingService = require('../domain/shopping/application/ShoppingService');

/**
 * HELPER: Initialize service with tenant DB
 * @param {Object} req
 * @returns {ShoppingService}
 */
function getShoppingService(req) {
  const repository = new SqliteShoppingRepository(req.tenantDb, req.hhId);
  return new ShoppingService(repository);
}

/**
 * Mapper: Entity to API Model
 * @param {Object} item
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
 * GET /api/households/:id/shopping-list
 */
router.get(
  '/',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res) => {
    try {
      const service = getShoppingService(req);
      const items = await service.listItems(req.hhId);
      const apiItems = items.map(toApiModel);
      const totalEstimated = apiItems.reduce((acc, item) => acc + (item.estimated_cost || 0), 0);
      res.json({
        items: apiItems,
        summary: {
          total_items: apiItems.length,
          total_estimated_cost: totalEstimated,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
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
  async (req, res) => {
    try {
      const service = getShoppingService(req);
      const item = await service.addItem(req.hhId, req.body);
      res.status(201).json(toApiModel(item));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * POST /api/households/:id/shopping-list/bulk
 * Item 108: Bulk Action Pattern
 */
router.post(
  '/bulk',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res) => {
    try {
      const { actions } = req.body;
      if (!Array.isArray(actions) || actions.length === 0) {
        return res.status(400).json({ error: 'Actions array is required and must not be empty' });
      }
      const service = getShoppingService(req);
      await service.bulkAction(req.hhId, actions);
      res.json({ message: 'Bulk action completed successfully', count: actions.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
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
  async (req, res) => {
    try {
      const service = getShoppingService(req);
      const item = await service.updateItem(req.params.itemId, req.hhId, req.body);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      res.json(toApiModel(item));
    } catch (err) {
      res.status(500).json({ error: err.message });
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
  async (req, res) => {
    try {
      const service = getShoppingService(req);
      const changes = await service.clearChecked(req.hhId);
      res.json({ message: 'Checked items cleared', changes });
    } catch (err) {
      res.status(500).json({ error: err.message });
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
  async (req, res) => {
    try {
      const service = getShoppingService(req);
      const deleted = await service.deleteItem(req.params.itemId, req.hhId);
      if (!deleted) return res.status(404).json({ error: 'Item not found' });
      res.json({ message: 'Item deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
