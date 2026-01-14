const { globalDb } = require('../db');

globalDb.all("SELECT id, name FROM households", [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Households:", rows);
    }
    // Exit after a brief pause to allow console flush
    setTimeout(() => process.exit(0), 500);
});
