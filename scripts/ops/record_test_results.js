const fs = require('fs');
const path = require('path');
const pkg = require('../../package.json');

const BACKEND_REPORT = path.join(__dirname, '../../server/test-report.json');
const FRONTEND_UNIT_REPORT = path.join(__dirname, '../../web/test-results/unit.json');
const FRONTEND_SMOKE_REPORT = path.join(__dirname, '../../web/test-results/smoke.json');
const FRONTEND_E2E_REPORT = path.join(__dirname, '../../web/results-all.json');

async function getDb() {
  if (process.env.DATABASE_URL) {
    try {
      const { db } = require('../../server/db/index');
      const { testResults } = require('../../server/db/schema');
      return { type: 'postgres', db, table: testResults };
    } catch (e) {
      console.warn('⚠️ Failed to load Postgres DB, falling back to SQLite:', e.message);
    }
  }
  const { globalDb, dbRun } = require('../../server/db');
  return { type: 'sqlite', db: globalDb, run: dbRun };
}

async function recordBackendResults(runId = null) {
  if (!fs.existsSync(BACKEND_REPORT)) {
    console.log('⚠️ Backend report not found at ' + BACKEND_REPORT);
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(BACKEND_REPORT, 'utf8'));
    const passes = data.numPassedTests || 0;
    const fails = data.numFailedTests || 0;
    const total = data.numTotalTests || 0;
    const duration = (Date.now() - (data.startTime || Date.now())) / 1000;

    const target = await getDb();
    if (target.type === 'postgres') {
      await target.db.insert(target.table).values({
        testType: 'backend',
        suiteName: 'Jest Integration Suite',
        passes,
        fails,
        total,
        duration,
        reportJson: JSON.stringify(data),
        version: pkg.version,
      });
    } else {
      await target.run(
        target.db,
        `INSERT INTO test_results (test_type, suite_name, passes, fails, total, duration, report_json, version, run_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'backend',
          'Jest Integration Suite',
          passes,
          fails,
          total,
          duration,
          JSON.stringify(data),
          pkg.version,
          runId,
        ]
      );
    }
    console.log(`✅ Backend test results recorded: ${passes}/${total} passed.`);
  } catch (err) {
    console.error('❌ Failed to record backend results:', err);
  }
}

async function recordFrontendResults(
  type = 'frontend',
  suiteName = 'Playwright Suite',
  reportFile,
  runId = null
) {
  if (!fs.existsSync(reportFile)) {
    console.log(`⚠️ Frontend report not found at ${reportFile}`);
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(reportFile, 'utf8'));

    let stats = {};
    let passes = 0;
    let fails = 0;
    let total = 0;
    let duration = 0;

    if (type === 'frontend_unit') {
      // Vitest JSON report
      total = data.numTotalTests || 0;
      passes = data.numPassedTests || 0;
      fails = data.numFailedTests || 0;
      duration = (Date.now() - (data.startTime || Date.now())) / 1000;
    } else {
      // Playwright JSON report
      stats = data.stats || {};
      passes = stats.expected || 0;
      fails = (stats.unexpected || 0) + (stats.flaky || 0);
      total = (stats.expected || 0) + (stats.unexpected || 0) + (stats.skipped || 0);
      duration = (stats.duration || 0) / 1000;
    }

    const target = await getDb();
    if (target.type === 'postgres') {
      await target.db.insert(target.table).values({
        testType: type,
        suiteName,
        passes,
        fails,
        total,
        duration,
        reportJson: JSON.stringify(data),
        version: pkg.version,
      });
    } else {
      await target.run(
        target.db,
        `INSERT INTO test_results (test_type, suite_name, passes, fails, total, duration, report_json, version, run_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [type, suiteName, passes, fails, total, duration, JSON.stringify(data), pkg.version, runId]
      );
    }
    console.log(`✅ Frontend test results recorded for ${type}: ${passes}/${total} passed.`);
  } catch (err) {
    console.error(`❌ Failed to record frontend results for ${type}:`, err);
  }
}

async function main() {
  const type = process.argv[2];
  const status = process.argv[3];
  const runId = process.env.RUN_ID || null;

  if (type === 'backend') {
    await recordBackendResults(runId);
  } else if (type === 'frontend_unit') {
    await recordFrontendResults('frontend_unit', 'Vitest Unit Suite', FRONTEND_UNIT_REPORT, runId);
  } else if (type === 'frontend_smoke') {
    await recordFrontendResults(
      'frontend_smoke',
      'Playwright Smoke Suite',
      FRONTEND_SMOKE_REPORT,
      runId
    );
  } else if (type === 'frontend_e2e') {
    await recordFrontendResults('frontend_e2e', 'Playwright E2E Suite', FRONTEND_E2E_REPORT, runId);
  } else if (type === 'frontend_lifecycle_1') {
    await recordFrontendResults(
      'frontend_lifecycle_1',
      'Stage 1: Brady Foundation',
      path.join(__dirname, '../../web/results-1.json'),
      runId
    );
  } else if (type === 'frontend_lifecycle_2') {
    await recordFrontendResults(
      'frontend_lifecycle_2',
      'Stage 2: Finance & Fringe',
      path.join(__dirname, '../../web/results-2.json'),
      runId
    );
  } else {
    // Fallback: Try recording everything available
    await recordBackendResults(runId);
    if (fs.existsSync(FRONTEND_SMOKE_REPORT))
      await recordFrontendResults(
        'frontend_smoke',
        'Playwright Smoke Suite',
        FRONTEND_SMOKE_REPORT,
        runId
      );
    if (fs.existsSync(FRONTEND_UNIT_REPORT))
      await recordFrontendResults(
        'frontend_unit',
        'Vitest Unit Suite',
        FRONTEND_UNIT_REPORT,
        runId
      );
  }
  process.exit(0);
}

main();
