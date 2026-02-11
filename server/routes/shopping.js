const express = require('express');
const router = express.Router();
const { dbAll, dbRun, dbGet } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');

/**
 * GET /households/:id/shopping-list
 * Fetch all shopping items for the household
 */
router.get('/households/:id/shopping-list', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, async (req, res) => {
    try {
        console.log(`[SHOPPING] Fetching list for household ${req.params.id}`);
        const items = await dbAll(req.tenantDb, "SELECT * FROM shopping_items WHERE household_id = ? ORDER BY is_checked ASC, created_at DESC", [req.params.id]);
        
        // Calculate estimated budget
        const totalEstimatedCost = (items || []).reduce((sum, item) => sum + (item.estimated_cost || 0), 0);
        
        if (req.tenantDb) req.tenantDb.close();
        
        res.json({
            items: items || [],
            summary: {
                total_items: (items || []).length,
                pending_items: (items || []).filter(i => !i.is_checked).length,
                total_estimated_cost: totalEstimatedCost
            }
        });
    } catch (err) {
        console.error("[SHOPPING] Failed to fetch shopping list", err);
        if (req.tenantDb) req.tenantDb.close();
        res.status(500).json({ error: "Failed to fetch shopping list: " + err.message });
    }
});

/**
 * POST /households/:id/shopping-list
 * Add a new item
 */
router.post('/households/:id/shopping-list', authenticateToken, requireHouseholdRole('member'), useTenantDb, async (req, res) => {
    const { name, quantity, category, estimated_cost } = req.body;
    if (!name) {
        if (req.tenantDb) req.tenantDb.close();
        return res.status(400).json({ error: "Item name is required" });
    }

    try {
        console.log(`[SHOPPING] Adding item to household ${req.params.id}: ${name}`);
        const result = await dbRun(req.tenantDb, 
            `INSERT INTO shopping_items (household_id, name, quantity, category, estimated_cost) VALUES (?, ?, ?, ?, ?)`,
            [req.params.id, name, quantity || '1', category || 'general', estimated_cost || 0]
        );
        
        const newItem = await dbGet(req.tenantDb, "SELECT * FROM shopping_items WHERE id = ?", [result.id]);
        if (req.tenantDb) req.tenantDb.close();
        res.status(201).json(newItem);
    } catch (err) {
        console.error("[SHOPPING] Failed to add shopping item", err);
        if (req.tenantDb) req.tenantDb.close();
        res.status(500).json({ error: "Failed to add item: " + err.message });
    }
});

/**
 * PUT /households/:id/shopping-list/:itemId
 * Update an item (toggle check, edit details)
 */
router.put('/households/:id/shopping-list/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, async (req, res) => {
    const { name, quantity, category, is_checked, estimated_cost } = req.body;
    const itemId = req.params.itemId;

    try {
        console.log(`[SHOPPING] Updating item ${itemId} for household ${req.params.id}`);
        // Dynamic update
        let fields = [];
        let values = [];
        if (name !== undefined) { fields.push("name = ?"); values.push(name); }
        if (quantity !== undefined) { fields.push("quantity = ?"); values.push(quantity); }
        if (category !== undefined) { fields.push("category = ?"); values.push(category); }
        if (is_checked !== undefined) { fields.push("is_checked = ?"); values.push(is_checked ? 1 : 0); }
        if (estimated_cost !== undefined) { fields.push("estimated_cost = ?"); values.push(estimated_cost); }
        
        if (fields.length === 0) {
            if (req.tenantDb) req.tenantDb.close();
            return res.status(400).json({ error: "No fields to update" });
        }

        fields.push("updated_at = CURRENT_TIMESTAMP");
        values.push(req.params.id);
        values.push(itemId);

        const sql = `UPDATE shopping_items SET ${fields.join(", ")} WHERE household_id = ? AND id = ?`;
        
        await dbRun(req.tenantDb, sql, values);
        
        const updatedItem = await dbGet(req.tenantDb, "SELECT * FROM shopping_items WHERE id = ?", [itemId]);
        if (req.tenantDb) req.tenantDb.close();
        res.json(updatedItem);
    } catch (err) {
        console.error("[SHOPPING] Failed to update shopping item", err);
        if (req.tenantDb) req.tenantDb.close();
        res.status(500).json({ error: "Failed to update item: " + err.message });
    }
});

/**
 * DELETE /households/:id/shopping-list/clear
 * Clear all checked items
 */
router.delete('/households/:id/shopping-list/clear', authenticateToken, requireHouseholdRole('member'), useTenantDb, async (req, res) => {
    try {
        console.log(`[SHOPPING] Clearing completed items for household ${req.params.id}`);
        await dbRun(req.tenantDb, "DELETE FROM shopping_items WHERE household_id = ? AND is_checked = 1", [req.params.id]);
        if (req.tenantDb) req.tenantDb.close();
        res.json({ message: "Cleared completed items" });
    } catch (err) {
        console.error("[SHOPPING] Failed to clear shopping list", err);
        if (req.tenantDb) req.tenantDb.close();
        res.status(500).json({ error: "Failed to clear items: " + err.message });
    }
});

/**
 * DELETE /households/:id/shopping-list/:itemId
 * Delete a specific item
 */
router.delete('/households/:id/shopping-list/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, async (req, res) => {
    try {
        console.log(`[SHOPPING] Deleting item ${req.params.itemId} for household ${req.params.id}`);
        await dbRun(req.tenantDb, "DELETE FROM shopping_items WHERE household_id = ? AND id = ?", [req.params.id, req.params.itemId]);
        if (req.tenantDb) req.tenantDb.close();
        res.json({ message: "Item deleted" });
    } catch (err) {
        console.error("[SHOPPING] Failed to delete shopping item", err);
        if (req.tenantDb) req.tenantDb.close();
        res.status(500).json({ error: "Failed to delete item: " + err.message });
    }
});

module.exports = router;
