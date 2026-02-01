const { globalDb, dbAll, dbRun, getHouseholdDb } = require('../db');

async function migrateEntityTypes() {
    console.log("🚀 Starting Entity Type Migration...");

    try {
        const households = await dbAll(globalDb, "SELECT id FROM households");
        console.log(`Found ${households.length} households to check.`);

        for (const hh of households) {
            console.log(`Checking Household #${hh.id}...`);
            const tenantDb = await getHouseholdDb(hh.id);
            
            // 1. house -> general
            const res1 = await dbRun(tenantDb, `
                UPDATE finance_recurring_charges 
                SET linked_entity_type = 'general' 
                WHERE linked_entity_type = 'house'
            `);
            if (res1.changes > 0) console.log(`  ✅ Updated ${res1.changes} 'house' -> 'general'`);

            // 2. member -> pet (where applicable)
            const res2 = await dbRun(tenantDb, `
                UPDATE finance_recurring_charges
                SET linked_entity_type = 'pet'
                WHERE linked_entity_type = 'member'
                AND linked_entity_id IN (SELECT id FROM members WHERE type = 'pet')
            `);
            if (res2.changes > 0) console.log(`  ✅ Updated ${res2.changes} 'member' -> 'pet' for pet entities`);
            
            // 3. member -> pet (legacy where type was null but species was set)
            const res3 = await dbRun(tenantDb, `
                UPDATE finance_recurring_charges
                SET linked_entity_type = 'pet'
                WHERE linked_entity_type = 'member'
                AND linked_entity_id IN (SELECT id FROM members WHERE species IS NOT NULL AND (type IS NULL OR type = ''))
            `);
            if (res3.changes > 0) console.log(`  ✅ Updated ${res3.changes} legacy 'member' -> 'pet'`);
        }

        console.log("🎉 Migration Complete.");
    } catch (err) {
        console.error("❌ Migration Failed:", err);
    }
}

migrateEntityTypes().then(() => process.exit(0));
