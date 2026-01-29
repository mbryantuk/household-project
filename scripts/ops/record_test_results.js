const fs = require('fs');
const path = require('path');
const { globalDb, dbRun } = require('../../server/db');
const pkg = require('../../package.json');

const BACKEND_REPORT = path.join(__dirname, '../../server/test-report.json');
const FRONTEND_REPORT = path.join(__dirname, '../../web/results.json');

async function recordBackendResults() {
    if (!fs.existsSync(BACKEND_REPORT)) {
        console.log("⚠️ Backend report not found at " + BACKEND_REPORT);
        return;
    }

    try {
        const data = JSON.parse(fs.readFileSync(BACKEND_REPORT, 'utf8'));
        const passes = data.numPassedTests || 0;
        const fails = data.numFailedTests || 0;
        const total = data.numTotalTests || 0;
        const duration = (Date.now() - (data.startTime || Date.now())) / 1000;

        await dbRun(globalDb, 
            `INSERT INTO test_results (test_type, suite_name, passes, fails, total, duration, report_json, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            ['backend', 'Jest Integration Suite', passes, fails, total, duration, JSON.stringify(data), pkg.version]
        );
        console.log("✅ Backend test results recorded.");
    } catch (err) {
        console.error("❌ Failed to record backend results:", err);
    }
}

async function recordFrontendResults(type = 'frontend', suiteName = 'Playwright Smoke Suite') {
    if (!fs.existsSync(FRONTEND_REPORT)) {
        console.log("⚠️ Frontend report not found at " + FRONTEND_REPORT);
        return;
    }

    try {
        const data = JSON.parse(fs.readFileSync(FRONTEND_REPORT, 'utf8'));
        const stats = data.stats || {};
        const passes = stats.expected || 0;
        const fails = (stats.unexpected || 0) + (stats.flaky || 0);
        const total = (stats.expected || 0) + (stats.unexpected || 0) + (stats.skipped || 0);
        const duration = (stats.duration || 0) / 1000;

        await dbRun(globalDb, 
            `INSERT INTO test_results (test_type, suite_name, passes, fails, total, duration, report_json, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [type, suiteName, passes, fails, total, duration, JSON.stringify(data), pkg.version]
        );
        console.log(`✅ Frontend test results recorded for ${type}.`);
    } catch (err) {
        console.error(`❌ Failed to record frontend results for ${type}:`, err);
    }
}

async function main() {
    const type = process.argv[2];
    const status = process.argv[3]; // Not currently used for logic but passed by script

    if (type === 'backend') {
        await recordBackendResults();
    } else if (type === 'frontend_routing') {
        await recordFrontendResults('frontend_routing', 'Routing & Availability');
    } else if (type === 'frontend_lifecycle') {
        await recordFrontendResults('frontend_lifecycle', 'Comprehensive Lifecycle');
    } else if (type === 'frontend') {
        await recordFrontendResults();
    } else {
        await recordBackendResults();
        await recordFrontendResults();
    }
    process.exit(0);
}

main();
