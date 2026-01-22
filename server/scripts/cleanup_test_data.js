const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use the same path as db.js
const DB_PATH = path.resolve(__dirname, '../data/totem.db');
const db = new sqlite3.Database(DB_PATH);

function cleanup() {
    console.log('🧹 Starting Test Data Cleanup...');
    
    // 1. Find all test users
    db.all(`SELECT id FROM users WHERE email LIKE '%@test.com' OR email LIKE '%test_user%'`, [], (err, users) => {
        if (err) {
            console.error('Error finding test users:', err);
            return;
        }

        const userIds = users.map(u => u.id);
        
        // 2. Find households created by these users or named "Test Household"
        const userIdsClause = userIds.length > 0 ? `id IN (SELECT household_id FROM user_households WHERE user_id IN (${userIds.join(',')})) OR` : '';
        const query = `SELECT id FROM households WHERE ${userIdsClause} name LIKE '%Test Household%' OR name LIKE 'Test Family' OR name LIKE 'Test Manor'`;

        db.all(query, [], (err, households) => {
            if (err) console.error('Error finding test households:', err);
            
            // CRITICAL: Filter out household 19 to preserve it
            let householdIds = households ? households.map(h => h.id) : [];
            householdIds = householdIds.filter(id => id !== 19 && id !== '19');
            
            if (userIds.length === 0 && householdIds.length === 0) {
                console.log('✨ No test data found.');
                db.close();
                return;
            }

            console.log(`Found ${userIds.length} test users and ${householdIds.length} test households (excluding protected IDs).`);

            // 3. Delete household data (all tenant tables)
            if (householdIds.length > 0) {
                const hhPlaceholders = householdIds.map(() => '?').join(',');
                const tables = [
                    'members', 'assets', 'vehicles', 'recurring_costs', 'dates', 
                    'meals', 'meal_plans', 'house_details', 'water_accounts', 
                    'council_accounts', 'waste_collections', 'energy_accounts', 
                    'vehicle_services', 'vehicle_finance', 'vehicle_insurance',
                    'finance_income', 'finance_current_accounts', 'finance_budget_cycles', 'finance_budget_progress'
                ];
                
                tables.forEach(table => {
                    db.run(`DELETE FROM ${table} WHERE household_id IN (${hhPlaceholders})`, householdIds, (err) => {
                       // Ignore if table doesn't exist
                    });
                });

                // Delete from user_households link table
                db.run(`DELETE FROM user_households WHERE household_id IN (${hhPlaceholders})`, householdIds);

                // Finally delete households
                db.run(`DELETE FROM households WHERE id IN (${hhPlaceholders})`, householdIds, function(err) {
                    if (err) console.error('Error deleting households:', err);
                    else console.log(`✅ Deleted ${this.changes} households.`);
                });
            }

            // 4. Delete users
            if (userIds.length > 0) {
                const userPlaceholders = userIds.map(() => '?').join(',');
                db.run(`DELETE FROM user_households WHERE user_id IN (${userPlaceholders})`, userIds);
                db.run(`DELETE FROM users WHERE id IN (${userPlaceholders})`, userIds, function(err) {
                    if (err) console.error('Error deleting users:', err);
                    else console.log(`✅ Deleted ${this.changes} users.`);
                });
            }
            
            setTimeout(() => {
                console.log("Cleanup complete.");
                db.close();
            }, 1000);
        });
    });
}

cleanup();