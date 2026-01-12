const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'household.db');
const db = new sqlite3.Database(dbPath);

const BUDGET_DATA = [
    { name: "Mortgage", amount: 1117.00, parent_type: 'house', parent_id: 1, category: 'housing' },
    { name: "LifeInsurance/aviva", amount: 39.00, parent_type: 'person', parent_id: 1, category: 'insurance' },
    { name: "HouseInsurance - Tesco", amount: 39.00, parent_type: 'house', parent_id: 1, category: 'insurance' },
    { name: "TvLicence", amount: 15.00, parent_type: 'house', parent_id: 1, category: 'entertainment' },
    { name: "Gas/Electric", amount: 195.00, parent_type: 'house', parent_id: 1, category: 'utilities' },
    { name: "pet insur", amount: 40.00, parent_type: 'pet', parent_id: 3, category: 'insurance' }, // Rumpus
    { name: "spotify", amount: 22.00, parent_type: 'general', category: 'entertainment' },
    { name: "rumpus food", amount: 55.00, parent_type: 'pet', parent_id: 3, category: 'food' },
    { name: "rumpus arun vet", amount: 7.99, parent_type: 'pet', parent_id: 3, category: 'health' },
    { name: "amazon", amount: 8.99, parent_type: 'general', category: 'entertainment' },
    { name: "council tax", amount: 251.00, parent_type: 'house', parent_id: 1, category: 'tax' },
    { name: "water (1)", amount: 26.00, parent_type: 'house', parent_id: 1, category: 'utilities' },
    { name: "window clean", amount: 10.00, parent_type: 'house', parent_id: 1, category: 'maintenance' },
    { name: "water (2)", amount: 58.00, parent_type: 'house', parent_id: 1, category: 'utilities' },
    { name: "hp", amount: 1.50, parent_type: 'general', category: 'maintenance' },
    { name: "DISHWASHER", amount: 5.00, parent_type: 'general', category: 'maintenance' },
    { name: "fran money for card", amount: 800.00, parent_type: 'person', parent_id: 5, category: 'finance' }, // Fran
    { name: "tesco mobiles", amount: 28.00, parent_type: 'general', category: 'utilities' },
    { name: "green belt", amount: 14.99, parent_type: 'house', parent_id: 1, category: 'tax' },
    { name: "food petrol", amount: 950.00, parent_type: 'person', parent_id: 5, category: 'living' }, // Fran's f1 tag
    { name: "easter dinner", amount: 100.00, parent_type: 'general', category: 'food' },
    { name: "botox", amount: 75.00, parent_type: 'person', parent_id: 5, category: 'health' },
    { name: "dental", amount: 20.00, parent_type: 'general', category: 'health' },
    { name: "car insurance lv", amount: 27.70, parent_type: 'vehicle', parent_id: 1, category: 'insurance' },
    { name: "child benefit", amount: 90.00, parent_type: 'person', parent_id: 5, category: 'income' },
    { name: "zoom", amount: 18.00, parent_type: 'general', category: 'utilities' },
    { name: "5 week month", amount: 150.00, parent_type: 'general', category: 'savings' },
    { name: "boiler", amount: 14.50, parent_type: 'house', parent_id: 1, category: 'maintenance' },
    { name: "service", amount: 35.00, parent_type: 'person', parent_id: 5, category: 'maintenance' },
    { name: "matt", amount: 55.00, parent_type: 'person', parent_id: 4, category: 'allowance' }, // Matt
    { name: "pocket money", amount: 25.00, parent_type: 'general', category: 'allowance' },
    { name: "help to by", amount: 142.00, parent_type: 'general', category: 'savings' },
    { name: "lunch", amount: 20.00, parent_type: 'person', parent_id: 6, category: 'food' }, // f2 tag? assuming another person or tag
    { name: "nails", amount: 65.00, parent_type: 'person', parent_id: 5, category: 'health' },
    { name: "christmas", amount: 150.00, parent_type: 'general', category: 'savings' },
    { name: "green waste", amount: 8.00, parent_type: 'house', parent_id: 1, category: 'utilities' },
    { name: "gym", amount: 33.00, parent_type: 'general', category: 'health' }
];

db.serialize(() => {
    console.log("🚀 Starting Budget Seeding for Household 1...");

    // 1. Ensure Members exist
    db.run(`INSERT OR IGNORE INTO members (id, household_id, name, type, emoji) VALUES (3, 1, 'Rumpus', 'pet', '🐶')`);
    db.run(`INSERT OR IGNORE INTO members (id, household_id, name, type, emoji) VALUES (4, 1, 'Matt', 'adult', '👨‍💻')`);
    db.run(`INSERT OR IGNORE INTO members (id, household_id, name, type, emoji) VALUES (5, 1, 'Fran', 'adult', '👩')`);
    db.run(`INSERT OR IGNORE INTO members (id, household_id, name, type, emoji) VALUES (6, 1, 'Child', 'child', '👶')`);

    // 2. Clear existing recurring costs for HH1 to avoid duplicates
    db.run(`DELETE FROM recurring_costs WHERE household_id = 1`);

    // 3. Insert new budget items
    const stmt = db.prepare(`INSERT INTO recurring_costs (household_id, name, amount, parent_type, parent_id, frequency, payment_day, nearest_working_day, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    
    BUDGET_DATA.forEach(item => {
        stmt.run(
            1, 
            item.name, 
            item.amount, 
            item.parent_type, 
            item.parent_id || null, 
            'Monthly', 
            1, // Default to 1st of month
            1, // Nearest Working Day logic enabled
            item.category
        );
    });

    stmt.finalize();
    console.log("✅ Budget Seeding Complete!");
    db.close();
});
