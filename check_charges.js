const { getHouseholdDb } = require('./server/db');

async function checkCharges(hhId) {
    const db = getHouseholdDb(hhId);
    db.all("SELECT id, name, frequency, day_of_week, day_of_month, linked_entity_type, linked_entity_id FROM finance_recurring_charges", [], (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log(JSON.stringify(rows, null, 2));
        }
        db.close();
    });
}

checkCharges(18);