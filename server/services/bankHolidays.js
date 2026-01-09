const axios = require('axios');

let cachedBankHolidays = null;
let lastFetchTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function getBankHolidays() {
    const now = Date.now();
    if (cachedBankHolidays && (now - lastFetchTime < CACHE_DURATION)) {
        return cachedBankHolidays;
    }

    try {
        const response = await axios.get('https://www.gov.uk/bank-holidays.json');
        // We care about england-and-wales for now, but could be extended
        const events = response.data['england-and-wales'].events;
        cachedBankHolidays = events.map(e => e.date);
        lastFetchTime = now;
        return cachedBankHolidays;
    } catch (err) {
        console.error("Failed to fetch bank holidays:", err.message);
        return cachedBankHolidays || []; // Return cache if available, else empty
    }
}

function isBankHoliday(dateStr, holidays) {
    return holidays.includes(dateStr);
}

function getPriorWorkingDay(date, holidays) {
    let current = new Date(date);
    
    // Check if weekend or bank holiday
    const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;
    const isHoliday = (d) => {
        const dStr = d.toISOString().split('T')[0];
        return holidays.includes(dStr);
    };

    while (isWeekend(current) || isHoliday(current)) {
        current.setDate(current.getDate() - 1);
    }
    return current;
}

module.exports = { getBankHolidays, isBankHoliday, getPriorWorkingDay };
