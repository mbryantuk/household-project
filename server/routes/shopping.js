const express = require('express');
const router = express.Router();
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { getHouseholdDb } = require('../db');

// --- SHOPPING ITEMS ---

// List Items
router.get('/households/:id/shopping', authenticateToken, requireHouseholdRole('viewer'), (req, res) => {
    const db = getHouseholdDb(req.params.id);
    db.all("SELECT * FROM shopping_items WHERE household_id = ? ORDER BY is_checked ASC, created_at DESC", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add Item
router.post('/households/:id/shopping', authenticateToken, requireHouseholdRole('member'), (req, res) => {
    const { name, category, quantity, emoji } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const db = getHouseholdDb(req.params.id);
    db.run(
        "INSERT INTO shopping_items (household_id, name, category, quantity, emoji) VALUES (?, ?, ?, ?, ?)",
        [req.params.id, name, category || 'general', quantity, emoji],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ 
                id: this.lastID, 
                name, 
                category: category || 'general', 
                quantity, 
                emoji, 
                is_checked: 0, 
                created_at: new Date().toISOString() 
            });
        }
    );
});

// Toggle Checked Status
router.put('/households/:id/shopping/:itemId/toggle', authenticateToken, requireHouseholdRole('member'), (req, res) => {
    const db = getHouseholdDb(req.params.id);
    const { is_checked } = req.body; // Expecting boolean or 0/1

    db.run(
        "UPDATE shopping_items SET is_checked = ? WHERE id = ? AND household_id = ?",
        [is_checked ? 1 : 0, req.params.itemId, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Updated", is_checked: is_checked ? 1 : 0 });
        }
    );
});

// Update Item Details
router.put('/households/:id/shopping/:itemId', authenticateToken, requireHouseholdRole('member'), (req, res) => {
    const { name, category, quantity, emoji } = req.body;
    const db = getHouseholdDb(req.params.id);

    db.run(
        "UPDATE shopping_items SET name = ?, category = ?, quantity = ?, emoji = ? WHERE id = ? AND household_id = ?",
        [name, category, quantity, emoji, req.params.itemId, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Updated" });
        }
    );
});

// Delete Item
router.delete('/households/:id/shopping/:itemId', authenticateToken, requireHouseholdRole('member'), (req, res) => {
    const db = getHouseholdDb(req.params.id);
    db.run(
        "DELETE FROM shopping_items WHERE id = ? AND household_id = ?",
        [req.params.itemId, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Deleted" });
        }
    );
});

// Clear Completed Items
router.delete('/households/:id/shopping/clear-completed', authenticateToken, requireHouseholdRole('member'), (req, res) => {
    const db = getHouseholdDb(req.params.id);
    db.run(
        "DELETE FROM shopping_items WHERE household_id = ? AND is_checked = 1",
        [req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Cleared completed items", deleted: this.changes });
        }
    );
});

module.exports = router;
