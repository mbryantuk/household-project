const { globalDb } = require('./server/db');

const email = 'mbryantuk@gmail.com';
const householdId = 289;

globalDb.get(
    "SELECT u.email, uh.household_id, uh.role FROM users u JOIN user_households uh ON u.id = uh.user_id WHERE u.email = ? AND uh.household_id = ?",
    [email, householdId],
    (err, row) => {
        if (err) {
            console.error(err);
        } else {
            console.log("User Role Info:", row);
        }
        process.exit(0);
    }
);
