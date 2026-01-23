const { globalDb, getHouseholdDb, dbAll, dbGet, dbRun } = require('../db');

async function migrateVehicleMaintenance() {
    console.log("🚗 Starting Vehicle Maintenance Cost Migration...");

    try {
        const households = await dbAll(globalDb, "SELECT id, name FROM households");
        console.log(`Found ${households.length} households to process.`);

        for (const hh of households) {
            const db = getHouseholdDb(hh.id);
            try {
                // Check if vehicles table exists first to avoid error spam
                const vehicles = await dbAll(db, `SELECT * FROM vehicles WHERE monthly_maintenance_cost > 0`);
                
                if (vehicles && vehicles.length > 0) {
                    console.log(`Checking Household #${hh.id} (${hh.name}) - Found ${vehicles.length} vehicles.`);
                    
                    for (const v of vehicles) {
                        const existing = await dbGet(db, 
                            `SELECT id FROM recurring_costs WHERE parent_type = 'vehicle' AND parent_id = ? AND name = 'Maintenance Estimate'`, 
                            [v.id]
                        );

                        if (!existing) {
                            await dbRun(db, 
                                `INSERT INTO recurring_costs 
                                (household_id, parent_type, parent_id, name, amount, frequency, category, is_active, notes) 
                                VALUES (?, 'vehicle', ?, 'Maintenance Estimate', ?, 'monthly', 'service', 1, 'Migrated from legacy vehicle details')`,
                                [hh.id, v.id, v.monthly_maintenance_cost]
                            );
                            console.log(`    ✅ Migrated cost £${v.monthly_maintenance_cost} for Vehicle #${v.id} (${v.make})`);
                        }
                    }
                }
            } catch (err) {
                // Ignore 'no such table' which happens if DB is fresh/empty
                if (!err.message.includes('no such table')) {
                     console.error(`  ❌ Error processing Household #${hh.id}:`, err.message);
                }
            }
            
            db.close((err) => { if (err) console.error("Error closing DB:", err.message); });
        }
    } catch (err) {
        console.error("❌ Migration Main Error:", err);
    }
    console.log("✨ Migration Complete.");
}

migrateVehicleMaintenance();