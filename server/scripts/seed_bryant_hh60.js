const { globalDb, getHouseholdDb, dbRun, dbGet, dbAll } = require('../db');

async function seedBryantToSpecificId(targetId) {
    console.log(`--- Seeding Bryant Family to Household ID: ${targetId} ---`);

    // 1. Verify household exists in global
    let household = await dbGet(globalDb, `SELECT id, name FROM households WHERE id = ?`, [targetId]);

    if (!household) {
        console.log(`Household ${targetId} not found. Creating it...`);
        await dbRun(globalDb, `INSERT INTO households (id, name) VALUES (?, ?)`, [targetId, "Bryant Household"]);
    } else {
        console.log(`Found household: ${household.name} (ID: ${targetId})`);
    }

    const tenantDb = getHouseholdDb(targetId);

    // 2. Add Members
    const membersToCreate = [
        { name: "Matthew Bryant", type: "adult", emoji: "👨🏻" },
        { name: "Francesca Bryant", type: "adult", emoji: "👩🏼" },
        { name: "Willow Bryant", type: "child", emoji: "👧🏼" },
        { name: "Rumpus", type: "pet", species: "Cat", emoji: "🐈" }
    ];

    for (const memberData of membersToCreate) {
        let member = await dbGet(tenantDb, `SELECT id FROM members WHERE name = ? AND household_id = ?`, [memberData.name, targetId]);
        if (member) {
            console.log(`Member "${memberData.name}" already exists in HH ${targetId}.`);
        } else {
            console.log(`Adding member "${memberData.name}" to HH ${targetId}...`);
            await dbRun(tenantDb, 
                `INSERT INTO members (household_id, name, type, species, emoji) VALUES (?, ?, ?, ?, ?)`,
                [targetId, memberData.name, memberData.type, memberData.species || null, memberData.emoji]
            );
        }
    }

    // 3. Add Vehicle
    const vehicleMake = "Ford";
    const vehicleModel = "Puma 2021";
    let vehicle = await dbGet(tenantDb, `SELECT id FROM vehicles WHERE make = ? AND model = ? AND household_id = ?`, [vehicleMake, vehicleModel, targetId]);

    if (vehicle) {
        console.log(`Vehicle "${vehicleMake} ${vehicleModel}" already exists in HH ${targetId}.`);
    } else {
        console.log(`Adding vehicle "${vehicleMake} ${vehicleModel}" to HH ${targetId}...`);
        await dbRun(tenantDb,
            `INSERT INTO vehicles (household_id, make, model, type, emoji, purchase_value, monthly_maintenance_cost, depreciation_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [targetId, vehicleMake, vehicleModel, "Car", "🚗", 25000, 50, 0.10]
        );
    }
    
    tenantDb.close();
    console.log(`--- Seeding Complete for HH ${targetId} ---`);
}

seedBryantToSpecificId(60).catch(err => {
    console.error("Seeding failed:", err);
}).finally(() => {
    globalDb.close();
});
