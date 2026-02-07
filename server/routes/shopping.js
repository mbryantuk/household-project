const express = require('express');
const router = express.Router();
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { getHouseholdDb, ensureHouseholdSchema, dbAll, dbRun } = require('../db');

// --- SHOPPING ITEMS ---

// List Items
router.get('/households/:id/shopping', authenticateToken, requireHouseholdRole('viewer'), async (req, res) => {
    try {
        const db = getHouseholdDb(req.params.id);
        await ensureHouseholdSchema(db, req.params.id);
        const rows = await dbAll(db, "SELECT * FROM shopping_items WHERE household_id = ? ORDER BY is_checked ASC, created_at DESC", [req.params.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Item
router.post('/households/:id/shopping', authenticateToken, requireHouseholdRole('member'), async (req, res) => {
    const { name, category, quantity, emoji } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    try {
        const db = getHouseholdDb(req.params.id);
        await ensureHouseholdSchema(db, req.params.id);
        const result = await dbRun(
            db,
            "INSERT INTO shopping_items (household_id, name, category, quantity, emoji) VALUES (?, ?, ?, ?, ?)",
            [req.params.id, name, category || 'general', quantity, emoji]
        );
        res.json({ 
            id: result.id, 
            name, 
            category: category || 'general', 
            quantity, 
            emoji, 
            is_checked: 0, 
            created_at: new Date().toISOString() 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle Checked Status
router.put('/households/:id/shopping/:itemId/toggle', authenticateToken, requireHouseholdRole('member'), async (req, res) => {
    const { is_checked } = req.body; 

    try {
        const db = getHouseholdDb(req.params.id);
        await ensureHouseholdSchema(db, req.params.id);
        await dbRun(
            db,
            "UPDATE shopping_items SET is_checked = ? WHERE id = ? AND household_id = ?",
            [is_checked ? 1 : 0, req.params.itemId, req.params.id]
        );
        res.json({ message: "Updated", is_checked: is_checked ? 1 : 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Item Details
router.put('/households/:id/shopping/:itemId', authenticateToken, requireHouseholdRole('member'), async (req, res) => {
    const { name, category, quantity, emoji } = req.body;
    try {
        const db = getHouseholdDb(req.params.id);
        await ensureHouseholdSchema(db, req.params.id);
        await dbRun(
            db,
            "UPDATE shopping_items SET name = ?, category = ?, quantity = ?, emoji = ? WHERE id = ? AND household_id = ?",
            [name, category, quantity, emoji, req.params.itemId, req.params.id]
        );
        res.json({ message: "Updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Item
router.delete('/households/:id/shopping/:itemId', authenticateToken, requireHouseholdRole('member'), async (req, res) => {
    try {
        const db = getHouseholdDb(req.params.id);
        await ensureHouseholdSchema(db, req.params.id);
        await dbRun(
            db,
            "DELETE FROM shopping_items WHERE id = ? AND household_id = ?",
            [req.params.itemId, req.params.id]
        );
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Clear Completed Items
router.delete('/households/:id/shopping/clear-completed', authenticateToken, requireHouseholdRole('member'), async (req, res) => {
    try {
        const db = getHouseholdDb(req.params.id);
        await ensureHouseholdSchema(db, req.params.id);
        const result = await dbRun(
            db,
            "DELETE FROM shopping_items WHERE household_id = ? AND is_checked = 1",
            [req.params.id]
        );
        res.json({ message: "Cleared completed items", deleted: result.changes || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;