const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data', 'household_1.db');
const db = new sqlite3.Database(dbPath);

const budgetData = [
  { name: 'Mortgage', amount: -1117.00, parent_type: 'house', day: 1, emoji: '🏠' },
  { name: 'Save', amount: 0, parent_type: 'general', notes: 's', day: 1, emoji: '💰' },
  { name: 'LifeInsurance/aviva', amount: -39.00, parent_type: 'general', day: 1, emoji: '🛡️' },
  { name: 'HouseInsurance - Tesco', amount: -39.00, parent_type: 'house', day: 1, emoji: '🏡' },
  { name: 'TvLicence', amount: -15.00, parent_type: 'house', day: 1, emoji: '📺' },
  { name: 'Gas/Electric', amount: -195.00, parent_type: 'house', day: 2, emoji: '⚡' },
  { name: 'pet insur', amount: -40.00, parent_type: 'pet', notes: 's', day: 3, emoji: '🐶' },
  { name: 'spotify', amount: -22.00, parent_type: 'general', day: 5, emoji: '🎵' },
  { name: 'rumpus food', amount: -55.00, parent_type: 'pet', day: 7, emoji: '🍲' },
  { name: 'rumpus arun vet', amount: -7.99, parent_type: 'pet', notes: 'f1', day: 10, emoji: '🩺' },
  { name: 'amazon', amount: -8.99, parent_type: 'general', day: 12, emoji: '📦' },
  { name: 'council tax', amount: -251.00, parent_type: 'house', day: 15, emoji: '🏛️' },
  { name: 'water', amount: -26.00, parent_type: 'house', day: 18, emoji: '💧' },
  { name: 'window clean', amount: -10.00, parent_type: 'house', day: 20, emoji: '🪟' },
  { name: 'water', amount: -58.00, parent_type: 'house', day: 18, emoji: '💧' },
  { name: 'hp', amount: -1.50, parent_type: 'general', day: 22, emoji: '💻' },
  { name: 'DISHWASHER', amount: -5.00, parent_type: 'general', day: 23, emoji: '🍽️' },
  { name: 'fran money for card', amount: -800.00, parent_type: 'person', notes: 'f1', day: 25, emoji: '💳' },
  { name: 'tesco mobiles', amount: -28.00, parent_type: 'general', notes: 'f2', day: 26, emoji: '📱' },
  { name: 'green belt', amount: -14.99, parent_type: 'general', day: 27, emoji: '🌳' },
  { name: 'food petrol', amount: -950.00, parent_type: 'general', notes: 'f1', day: 28, emoji: '⛽' },
  { name: 'easter dinner', amount: -100.00, parent_type: 'general', day: 12, emoji: '🐣' }, // Random day in Jan for test
  { name: 'botox', amount: -75.00, parent_type: 'person', notes: 'f1', day: 14, emoji: '💉' },
  { name: 'dental', amount: -20.00, parent_type: 'person', day: 16, emoji: '🦷' },
  { name: 'car insurance lv', amount: -27.70, parent_type: 'vehicle', day: 1, emoji: '🚗' },
  { name: 'child benefit shit', amount: -90.00, parent_type: 'general', notes: 'f1', day: 4, emoji: '👶' },
  { name: 'zoom', amount: -18.00, parent_type: 'general', day: 8, emoji: '📹' },
  { name: '5 week month', amount: -150.00, parent_type: 'general', day: 30, emoji: '📅' },
  { name: 'boiler', amount: -14.50, parent_type: 'house', day: 1, emoji: '🔥' },
  { name: 'service', amount: -35.00, parent_type: 'vehicle', notes: 'f1', day: 15, emoji: '🔧' },
  { name: 'matt', amount: -55.00, parent_type: 'person', notes: 'Matt', day: 28, emoji: '🧔' },
  { name: 'pocket money', amount: -25.00, parent_type: 'general', day: 1, emoji: '🪙' },
  { name: 'help to by', amount: -142.00, parent_type: 'general', day: 1, emoji: '🤝' },
  { name: 'lunch', amount: -20.00, parent_type: 'person', notes: 'f2', day: 12, emoji: '🥪' },
  { name: 'nails', amount: -65.00, parent_type: 'person', notes: 'f1', day: 20, emoji: '💅' },
  { name: 'christmas', amount: -150.00, parent_type: 'general', day: 25, emoji: '🎄' }, // Random test
  { name: 'green waste', amount: -8.00, parent_type: 'house', day: 22, emoji: '♻️' },
  { name: 'gym', amount: -33.00, parent_type: 'general', day: 1, emoji: '💪' }
];

db.serialize(() => {
    // Clear existing
    db.run("DELETE FROM recurring_costs WHERE household_id = 1");
    db.run("DELETE FROM dates WHERE household_id = 1 AND type = 'budget'");

    const costStmt = db.prepare("INSERT INTO recurring_costs (household_id, parent_type, name, amount, frequency, notes, payment_day) VALUES (?, ?, ?, ?, ?, ?, ?)");
    const dateStmt = db.prepare("INSERT INTO dates (household_id, title, date, type, emoji, description) VALUES (?, ?, ?, ?, ?, ?)");
    
    budgetData.forEach(item => {
        costStmt.run(1, item.parent_type, item.name, item.amount, 'Monthly', item.notes || '', item.day);
        
        // Add date for Jan 2026
        const dateStr = `2026-01-${String(item.day).padStart(2, '0')}`;
        dateStmt.run(1, `${item.name}: £${Math.abs(item.amount)}`, dateStr, 'budget', item.emoji, item.notes || '');
        
        // Add date for Feb 2026
        const dateStrFeb = `2026-02-${String(item.day).padStart(2, '0')}`;
        dateStmt.run(1, `${item.name}: £${Math.abs(item.amount)}`, dateStrFeb, 'budget', item.emoji, item.notes || '');
    });

    costStmt.finalize();
    dateStmt.finalize();
    console.log("Seeded recurring_costs and dates for household 1.");
});

db.close();
