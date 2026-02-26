/**
 * MODERN TEST RESULTS RECORDER
 * Item 5: Migrated to Centralized PostgreSQL.
 */
import fs from 'fs';
import path from 'path';
import pkg from '../../package.json';
import { db } from '../../server/db/index';
import { testResults } from '../../server/db/schema';

const PROJECT_ROOT = path.join(__dirname, '../../');
const BACKEND_REPORT = path.join(PROJECT_ROOT, 'server/test-report.json');
const FRONTEND_UNIT_REPORT = path.join(PROJECT_ROOT, 'web/test-results/unit.json');
const FRONTEND_SMOKE_REPORT = path.join(PROJECT_ROOT, 'web/test-results/smoke.json');
const FRONTEND_E2E_REPORT = path.join(PROJECT_ROOT, 'web/results-all.json');

async function recordBackendResults() {
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

    await db.insert(testResults).values({
      testType: 'backend',
      suiteName: 'Jest Integration Suite',
      passes,
      fails,
      total,
      duration,
      reportJson: JSON.stringify(data),
      version: pkg.version,
    });

    console.log(`✅ Backend test results recorded: ${passes}/${total} passed.`);
  } catch (err) {
    console.error('❌ Failed to record backend results:', err.message);
  }
}

async function recordFrontendResults(
  type = 'frontend',
  suiteName = 'Playwright Suite',
  reportFile
) {
  if (!fs.existsSync(reportFile)) {
    console.log(`⚠️ Frontend report not found at ${reportFile}`);
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(reportFile, 'utf8'));

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
      const stats = data.stats || {};
      passes = stats.expected || 0;
      fails = (stats.unexpected || 0) + (stats.flaky || 0);
      total = (stats.expected || 0) + (stats.unexpected || 0) + (stats.skipped || 0);
      duration = (stats.duration || 0) / 1000;
    }

    await db.insert(testResults).values({
      testType: type,
      suiteName,
      passes,
      fails,
      total,
      duration,
      reportJson: JSON.stringify(data),
      version: pkg.version,
    });

    console.log(`✅ Frontend test results recorded for ${type}: ${passes}/${total} passed.`);
  } catch (err) {
    console.error(`❌ Failed to record frontend results for ${type}:`, err.message);
  }
}

async function main() {
  const type = process.argv[2];

  if (type === 'backend') {
    await recordBackendResults();
  } else if (type === 'frontend_unit') {
    await recordFrontendResults('frontend_unit', 'Vitest Unit Suite', FRONTEND_UNIT_REPORT);
  } else if (type === 'frontend_smoke') {
    await recordFrontendResults('frontend_smoke', 'Playwright Smoke Suite', FRONTEND_SMOKE_REPORT);
  } else if (type === 'frontend_e2e') {
    await recordFrontendResults('frontend_e2e', 'Playwright E2E Suite', FRONTEND_E2E_REPORT);
  } else if (type === 'frontend_lifecycle_1') {
    await recordFrontendResults(
      'frontend_lifecycle_1',
      'Stage 1: Brady Foundation',
      path.join(PROJECT_ROOT, 'web/results-1.json')
    );
  } else if (type === 'frontend_lifecycle_2') {
    await recordFrontendResults(
      'frontend_lifecycle_2',
      'Stage 2: Finance & Fringe',
      path.join(PROJECT_ROOT, 'web/results-2.json')
    );
  } else {
    // Default: Try recording everything available
    await recordBackendResults();
    if (fs.existsSync(FRONTEND_SMOKE_REPORT))
      await recordFrontendResults(
        'frontend_smoke',
        'Playwright Smoke Suite',
        FRONTEND_SMOKE_REPORT
      );
    if (fs.existsSync(FRONTEND_UNIT_REPORT))
      await recordFrontendResults('frontend_unit', 'Vitest Unit Suite', FRONTEND_UNIT_REPORT);
  }
  process.exit(0);
}

main();
