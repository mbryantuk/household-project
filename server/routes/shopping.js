const express = require('express');
const router = express.Router();
const { dbAll, dbRun, dbGet } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const shoppingImportRoutes = require('./shopping_import');

/**
 * GET /households/:id/shopping-list
 * Fetch shopping items for the household by week
 */
router.get('/households/:id/shopping-list', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, async (req, res) => {
    const { week_start, all } = req.query;
    try {
        console.log(`[SHOPPING] Fetching list for household ${req.params.id} (all=${all}, week_start=${week_start})`);
        
        let query = "SELECT * FROM shopping_items WHERE household_id = ?";
        let params = [req.params.id];

        if (all === 'true') {
            // No additional filters
        } else if (week_start) {
            query += " AND week_start = ?";
            params.push(week_start);
        } else {
            query += " AND week_start IS NULL";
        }

        query += " ORDER BY is_checked ASC, created_at DESC";
        
        const items = await dbAll(req.tenantDb, query, params);
        
        // Calculate estimated budget
        const totalEstimatedCost = (items || []).reduce((sum, item) => sum + (item.estimated_cost || 0), 0);
        
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
        res.status(500).json({ error: "Failed to fetch shopping list: " + err.message });
    }
});

/**
 * POST /households/:id/shopping-list/copy-previous
 * Copy items from previous week to target week
 */
router.post('/households/:id/shopping-list/copy-previous', authenticateToken, requireHouseholdRole('member'), useTenantDb, async (req, res) => {
    const { target_week, previous_week } = req.body;
    const householdId = req.params.id;

    if (!target_week || !previous_week) {
        return res.status(400).json({ error: "target_week and previous_week are required" });
    }

    try {
        // 1. Get items from previous week
        const prevItems = await dbAll(req.tenantDb, 
            "SELECT name, quantity, category, estimated_cost FROM shopping_items WHERE household_id = ? AND week_start = ?", 
            [householdId, previous_week]
        );

        if (prevItems.length === 0) {
            return res.json({ copiedCount: 0, message: "No items found in previous week" });
        }

        // 2. Insert into target week (skipping duplicates by name if preferred, but usually one might want a clean copy)
        for (const item of prevItems) {
            await dbRun(req.tenantDb, 
                `INSERT INTO shopping_items (household_id, name, quantity, category, estimated_cost, week_start, is_checked) 
                 VALUES (?, ?, ?, ?, ?, ?, 0)`,
                [householdId, item.name, item.quantity, item.category, item.estimated_cost, target_week]
            );
        }

        res.json({ copiedCount: prevItems.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /households/:id/shopping-list
 * Add a new item
 */
router.post('/households/:id/shopping-list', authenticateToken, requireHouseholdRole('member'), useTenantDb, async (req, res) => {
    const { name, quantity, category, estimated_cost, week_start } = req.body;
    if (!name) {
        return res.status(400).json({ error: "Item name is required" });
    }

    try {
        const result = await dbRun(req.tenantDb, 
            `INSERT INTO shopping_items (household_id, name, quantity, category, estimated_cost, week_start) VALUES (?, ?, ?, ?, ?, ?)`,
            [req.params.id, name, quantity || '1', category || 'general', estimated_cost || 0, week_start || null]
        );
        
        const newItem = await dbGet(req.tenantDb, "SELECT * FROM shopping_items WHERE id = ?", [result.id]);
        res.status(201).json(newItem);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PUT /households/:id/shopping-list/:itemId
 */
router.put('/households/:id/shopping-list/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, async (req, res) => {
    const { name, quantity, category, is_checked, estimated_cost, week_start } = req.body;
    const itemId = req.params.itemId;

    try {
        let fields = [];
        let values = [];
        if (name !== undefined) { fields.push("name = ?"); values.push(name); }
        if (quantity !== undefined) { fields.push("quantity = ?"); values.push(quantity); }
        if (category !== undefined) { fields.push("category = ?"); values.push(category); }
        if (is_checked !== undefined) { fields.push("is_checked = ?"); values.push(is_checked ? 1 : 0); }
        if (estimated_cost !== undefined) { fields.push("estimated_cost = ?"); values.push(estimated_cost); }
        if (week_start !== undefined) { fields.push("week_start = ?"); values.push(week_start); }
        
        if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });

        fields.push("updated_at = CURRENT_TIMESTAMP");
        values.push(req.params.id);
        values.push(itemId);

        const sql = `UPDATE shopping_items SET ${fields.join(", ")} WHERE household_id = ? AND id = ?`;
        await dbRun(req.tenantDb, sql, values);
        
        const updatedItem = await dbGet(req.tenantDb, "SELECT * FROM shopping_items WHERE id = ?", [itemId]);
        res.json(updatedItem);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /households/:id/shopping-list/clear
 */
router.delete('/households/:id/shopping-list/clear', authenticateToken, requireHouseholdRole('member'), useTenantDb, async (req, res) => {
    const { week_start } = req.query;
    try {
        let sql = "DELETE FROM shopping_items WHERE household_id = ? AND is_checked = 1";
        let params = [req.params.id];
        if (week_start) {
            sql += " AND week_start = ?";
            params.push(week_start);
        }
        await dbRun(req.tenantDb, sql, params);
        res.json({ message: "Cleared completed items" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /households/:id/shopping-list/:itemId
 */
router.delete('/households/:id/shopping-list/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, async (req, res) => {
    try {
        await dbRun(req.tenantDb, "DELETE FROM shopping_items WHERE household_id = ? AND id = ?", [req.params.id, req.params.itemId]);
        res.json({ message: "Item deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.use('/households/:id/shopping-list/import', shoppingImportRoutes);

module.exports = router;