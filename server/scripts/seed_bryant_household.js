const { globalDb, getHouseholdDb, dbRun, dbGet, dbAll } = require('../db');

async function seedBryantHousehold() {
    let householdId;
    const householdName = "Bryant Household";

    console.log(`--- Seeding ${householdName} ---`);

    // 1. Check if household exists
    let household = await dbGet(globalDb, `SELECT id FROM households WHERE name = ?`, [householdName]);

    if (household) {
        householdId = household.id;
        console.log(`Household "${householdName}" already exists with ID: ${householdId}`);
    } else {
        console.log(`Creating household "${householdName}"...`);
        const result = await dbRun(globalDb, `INSERT INTO households (name) VALUES (?)`, [householdName]);
        householdId = result.id;
        console.log(`Created household "${householdName}" with ID: ${householdId}`);
    }

    const tenantDb = getHouseholdDb(householdId);

    // 2. Add Members
    const membersToCreate = [
        { name: "Matthew Bryant", type: "adult", emoji: "👨🏻" },
        { name: "Francesca Bryant", type: "adult", emoji: "👩🏼" },
        { name: "Willow Bryant", type: "child", emoji: "👧🏼" },
        { name: "Rumpus", type: "pet", species: "Cat", emoji: "🐈" }
    ];

    for (const memberData of membersToCreate) {
        let member = await dbGet(tenantDb, `SELECT id FROM members WHERE name = ? AND household_id = ?`, [memberData.name, householdId]);
        if (member) {
            console.log(`Member "${memberData.name}" already exists.`);
        } else {
            console.log(`Adding member "${memberData.name}"...`);
            await dbRun(tenantDb, 
                `INSERT INTO members (household_id, name, type, species, emoji) VALUES (?, ?, ?, ?, ?)`,
                [householdId, memberData.name, memberData.type, memberData.species || null, memberData.emoji]
            );
        }
    }

    // 3. Add Vehicle
    const vehicleMake = "Ford";
    const vehicleModel = "Puma 2021";
    let vehicle = await dbGet(tenantDb, `SELECT id FROM vehicles WHERE make = ? AND model = ? AND household_id = ?`, [vehicleMake, vehicleModel, householdId]);

    if (vehicle) {
        console.log(`Vehicle "${vehicleMake} ${vehicleModel}" already exists.`);
    } else {
        console.log(`Adding vehicle "${vehicleMake} ${vehicleModel}"...`);
        await dbRun(tenantDb,
            `INSERT INTO vehicles (household_id, make, model, type, emoji, purchase_value, monthly_maintenance_cost, depreciation_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [householdId, vehicleMake, vehicleModel, "Car", "🚗", 25000, 50, 0.10]
        );
    }
    
    tenantDb.close();
    console.log(`--- Seeding ${householdName} Complete ---`);
}

seedBryantHousehold().catch(err => {
    console.error("Seeding failed:", err);
}).finally(() => {
    globalDb.close();
});
