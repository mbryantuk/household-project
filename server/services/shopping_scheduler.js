const cron = require('node-cron');
const { globalDb, getHouseholdDb, ensureHouseholdSchema } = require('../db');
const path = require('path');
const fs = require('fs');

/**
 * Background Service to process recurring shopping list schedules
 */
async function processSchedules() {
    console.log("🛒 [SCHEDULER] Checking for shopping list tasks...");
    
    // 1. Get all households
    globalDb.all("SELECT id FROM households", [], async (err, households) => {
        if (err) return console.error("Scheduler Error:", err);

        for (const hh of households) {
            const db = getHouseholdDb(hh.id);
            if (!db) continue;

            await ensureHouseholdSchema(db, hh.id);

            const today = new Date().toISOString().split('T')[0];
            
            // 2. Find schedules due today or earlier
            db.all("SELECT * FROM shopping_schedules WHERE is_active = 1 AND (next_run_date IS NULL OR next_run_date <= ?)", [today], (err, schedules) => {
                if (err) return console.error(`HH#${hh.id} Schedule Error:`, err);

                schedules.forEach(async (schedule) => {
                    console.log(`🚀 [SCHEDULER] Executing schedule "${schedule.name}" for HH#${hh.id}`);
                    
                    const items = JSON.parse(schedule.items || '[]');
                    
                    // 3. Add items to shopping list
                    db.serialize(() => {
                        const stmt = db.prepare("INSERT INTO shopping_items (household_id, name, quantity, category, estimated_cost) VALUES (?, ?, ?, ?, ?)");
                        items.forEach(item => {
                            stmt.run(hh.id, item.name, item.quantity, item.category || 'general', item.estimated_cost || 0);
                        });
                        stmt.finalize();

                        // 4. Calculate next run date
                        const nextDate = calculateNextRun(schedule.frequency, schedule.day_of_week, schedule.day_of_month, schedule.next_run_date || today);
                        db.run("UPDATE shopping_schedules SET next_run_date = ? WHERE id = ?", [nextDate, schedule.id]);
                    });
                });
            });
        }
    });
}

function calculateNextRun(frequency, dayOfWeek, dayOfMonth, currentRun) {
    const d = new Date(currentRun);
    if (frequency === 'weekly') {
        d.setDate(d.getDate() + 7);
    } else if (frequency === 'bi-weekly') {
        d.setDate(d.getDate() + 14);
    } else if (frequency === 'monthly') {
        d.setMonth(d.getMonth() + 1);
        if (dayOfMonth) d.setDate(dayOfMonth);
    } else {
        d.setDate(d.getDate() + 1); // Default daily fallback
    }
    return d.toISOString().split('T')[0];
}

// Run every night at midnight (or during dev, more frequently)
function startShoppingScheduler() {
    cron.schedule('0 0 * * *', () => {
        processSchedules();
    });
    
    // Immediate run on start
    setTimeout(processSchedules, 5000);
}

module.exports = { startShoppingScheduler, processSchedules };
