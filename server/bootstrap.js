const bcrypt = require('bcryptjs');

const SUPERUSER_NAME = "superuser";
const SUPERUSER_PASS = "superpassword";
const SUPERUSER_EMAIL = "super@totem.local";

function bootstrap(db) {
    return new Promise((resolve, reject) => {
        db.get("SELECT id FROM users WHERE username = ?", [SUPERUSER_NAME], (err, row) => {
            if (err) {
                console.error("❌ Bootstrap Check Failed:", err.message);
                return reject(err);
            }

            if (row) {
                console.log("✅ Superuser already exists.");
                return resolve();
            }

            console.log("⚡ Creating Default Superuser...");
            const hash = bcrypt.hashSync(SUPERUSER_PASS, 8);
            
            db.run(
                `INSERT INTO users (username, password_hash, email, system_role) VALUES (?, ?, ?, 'sysadmin')`, 
                [SUPERUSER_NAME, hash, SUPERUSER_EMAIL], 
                (err) => {
                    if (err) {
                        console.error("❌ Failed to create superuser:", err.message);
                        return reject(err);
                    }
                    console.log(`✅ Superuser created: ${SUPERUSER_NAME} / ${SUPERUSER_PASS}`);
                    resolve();
                }
            );
        });
    });
}

module.exports = { bootstrap };
