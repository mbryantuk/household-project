const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const dbPath = path.join(__dirname, 'server/data/totem.db');
const db = new sqlite3.Database(dbPath);

const email = 'mbryantuk@gmail.com';
const password = 'superpassword';

db.get("SELECT * FROM users WHERE email = ? OR username = ?", [email, email], (err, user) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    if (!user) {
        console.log("User not found");
    } else {
        const isValid = bcrypt.compareSync(password, user.password_hash);
        console.log("Password Valid:", isValid);
        console.log("Stored Hash:", user.password_hash);
    }
    db.close();
});
