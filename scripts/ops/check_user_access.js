const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const GLOBAL_DB_PATH = path.join(__dirname, '../../server/data/global.db');
const USER_EMAIL = 'mbryantuk@gmail.com';

const db = new sqlite3.Database(GLOBAL_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error("Failed to connect to Global DB:", err.message);
        process.exit(1);
    }
});

const query = `
    SELECT 
        u.email, 
        u.first_name,
        h.id as household_id, 
        h.name as household_name, 
        uh.role 
    FROM users u
    JOIN user_households uh ON u.id = uh.user_id
    JOIN households h ON uh.household_id = h.id
    WHERE u.email = ?
`;

db.all(query, [USER_EMAIL], (err, rows) => {
    if (err) {
        console.error("Query failed:", err.message);
        process.exit(1);
    }

    console.log(`
🔍 Access Report for: ${USER_EMAIL}`);
    console.log('='.repeat(50));
    
    if (rows.length === 0) {
        console.log("❌ No households found for this user.");
    } else {
        rows.forEach(row => {
            console.log(`🏠 [ID: ${row.household_id}] ${row.household_name} (${row.role})`);
        });
    }
    console.log('='.repeat(50));
    db.close();
});
