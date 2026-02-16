const { globalDb } = require('../../server/db');

globalDb.all("SELECT * FROM test_results ORDER BY created_at DESC LIMIT 5", [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log(JSON.stringify(rows, null, 2));
    }
});
