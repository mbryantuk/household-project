const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../data/totem.db');
const db = new sqlite3.Database(DB_PATH);

function cleanup() {
    console.log('🧹 Starting Test Data Cleanup...');
    
    // 1. Find all test users (emails ending in @test.com or containing 'test')
    db.all(`SELECT id, household_id FROM users WHERE email LIKE '%@test.com' OR email LIKE '%test_user%'`, [], (err, users) => {
        if (err) {
            console.error('Error finding test users:', err);
            return;
        }

        if (users.length === 0) {
            console.log('✨ No test users found.');
            // Even if no users, check for orphan test households
            cleanupHouseholds([]);
            return;
        }

        const userIds = users.map(u => u.id);
        const householdIds = [...new Set(users.map(u => u.household_id).filter(id => id))];

        console.log(`Found ${users.length} test users and ${householdIds.length} associated households.`);

        // 2. Delete test users
        const placeholders = userIds.map(() => '?').join(',');
        db.run(`DELETE FROM users WHERE id IN (${placeholders})`, userIds, function(err) {
            if (err) console.error('Error deleting users:', err);
            else console.log(`✅ Deleted ${this.changes} users.`);
            
            cleanupHouseholds(householdIds);
        });
    });
}

function cleanupHouseholds(householdIds) {
    // Also find households with names containing "Test Household"
    db.all(`SELECT id FROM households WHERE name LIKE '%Test Household%' OR name LIKE 'Test Family'`, [], (err, rows) => {
        if (err) console.error('Error finding test households:', err);
        
        const extraIds = rows ? rows.map(r => r.id) : [];
        const allIds = [...new Set([...householdIds, ...extraIds])];

        if (allIds.length === 0) {
            console.log('✨ No test households to clean.');
            db.close();
            return;
        }

        const placeholders = allIds.map(() => '?').join(',');

        // We need to clean up related tables first to maintain referential integrity (if enforced, or just for cleanliness)
        // Tables: members, assets, vehicles, recurring_costs, calendar_events, etc.
        // Assuming cascade delete might not be fully set up or relying on it:
        
        const tables = ['members', 'assets', 'vehicles', 'recurring_costs', 'calendar_events', 'meals'];
        
        let completed = 0;
        
        tables.forEach(table => {
            db.run(`DELETE FROM ${table} WHERE household_id IN (${placeholders})`, allIds, function(err) {
                if (err) console.warn(`Error cleaning ${table}:`, err.message); // Warn only
                completed++;
                if (completed === tables.length) {
                    // Finally delete households
                    db.run(`DELETE FROM households WHERE id IN (${placeholders})`, allIds, function(err) {
                        if (err) console.error('Error deleting households:', err);
                        else console.log(`✅ Deleted ${this.changes} households.`);
                        db.close();
                    });
                }
            });
        });
    });
}

cleanup();
