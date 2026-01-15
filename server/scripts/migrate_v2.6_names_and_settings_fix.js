const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { initializeHouseholdSchema } = require('../schema');

const DATA_DIR = path.join(__dirname, '../data');

function getHouseholdDbs() {
    return fs.readdirSync(DATA_DIR)
        .filter(file => file.startsWith('household_') && file.endsWith('.db'))
        .map(file => path.join(DATA_DIR, file));
}

async function migrate() {
    console.log('🚀 Starting Migration: Names & Settings (v2.6.1 Fix)');
    
    const dbs = getHouseholdDbs();
    
    for (const dbPath of dbs) {
        console.log(`📂 Processing ${path.basename(dbPath)}...`);
        const db = new sqlite3.Database(dbPath);

        // Ensure schema columns exist - Now Awaited
        await initializeHouseholdSchema(db);

        // 1. Migrate Names
        await new Promise((resolve) => {
            db.all(`SELECT id, name, first_name FROM members`, (err, rows) => {
                if (err) { console.error('   ❌ Error fetching members:', err.message); return resolve(); }
                if (rows.length === 0) return resolve();

                const updates = rows.map(row => {
                    // Skip if already migrated
                    if (row.first_name) return Promise.resolve();

                    const parts = (row.name || '').trim().split(' ');
                    let first = '', middle = '', last = '';

                    if (parts.length === 1) {
                        first = parts[0];
                    } else if (parts.length === 2) {
                        first = parts[0];
                        last = parts[1];
                    } else {
                        first = parts[0];
                        last = parts[parts.length - 1];
                        middle = parts.slice(1, -1).join(' ');
                    }

                    return new Promise((resUpdate) => {
                        db.run(
                            `UPDATE members SET first_name = ?, middle_name = ?, last_name = ? WHERE id = ?`,
                            [first, middle, last, row.id],
                            () => resUpdate()
                        );
                    });
                });

                Promise.all(updates).then(() => {
                    const count = updates.filter(p => p).length; // crude count
                    if (count > 0) console.log(`   ✅ Updated names for members.`);
                    resolve();
                });
            });
        });

        // 2. Migrate Settings (Enabled Modules)
        await new Promise((resolve) => {
            db.get(`SELECT enabled_modules FROM house_details WHERE id = 1`, (err, row) => {
                if (err) { console.error('   ❌ Error fetching details:', err.message); return resolve(); }
                
                // If null or empty, set default
                if (!row || !row.enabled_modules) {
                    const defaultModules = JSON.stringify(['pets', 'vehicles', 'meals']);
                    db.run(`UPDATE house_details SET enabled_modules = ? WHERE id = 1`, [defaultModules], (err) => {
                       if (!err) console.log(`   ✅ Initialized enabled_modules.`);
                       else console.error(`   ❌ Failed to init modules:`, err.message);
                       resolve(); 
                    });
                } else {
                    resolve();
                }
            });
        });

        db.close();
    }
    console.log('🎉 Migration Complete.');
}

migrate();