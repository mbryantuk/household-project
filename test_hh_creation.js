const { getHouseholdDb } = require('./server/db');
const fs = require('fs');
const path = require('path');

const testHouseholdId = 999;
const dbPath = path.join(__dirname, 'server', 'data', `household_${testHouseholdId}.db`);

try {
    console.log(`Creating test household DB: ${dbPath}`);
    const db = getHouseholdDb(testHouseholdId);
    
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
        if (err) {
            console.error("Error listing tables:", err);
            process.exit(1);
        }
        
        console.log("Tables created in household DB:");
        rows.forEach(row => console.log("- " + row.name));
        
        db.close(() => {
            if (fs.existsSync(dbPath)) {
                console.log("✅ Household DB file created successfully.");
                // fs.unlinkSync(dbPath); // Clean up
            } else {
                console.error("❌ Household DB file was NOT created.");
            }
        });
    });
} catch (e) {
    console.error("❌ Failed to create household DB:", e);
}
