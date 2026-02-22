const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendReport() {
  const backendReportPath = path.join(__dirname, '../../server/test-report.json');
  const unitReportPath = path.join(__dirname, '../../web/test-results/unit.json');
  const smokeReportPath = path.join(__dirname, '../../web/test-results/smoke.json');
  const e2eReportPath = path.join(__dirname, '../../web/results-all.json');
  const apiCoveragePath = path.join(__dirname, '../../server/api-coverage.json');

  // Read Version
  let version = 'Unknown';
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
    version = pkg.version;
  } catch (e) {
    console.error('Warning: Could not read package version');
  }

  // Config
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = parseInt(process.env.SMTP_PORT) || 587;
  const user = (process.env.SMTP_USER || 'mbryantuk@gmail.com').trim();
  const pass = (process.env.SMTP_PASS || '').trim().replace(/["']/g, '');
  const to = (process.env.REPORT_EMAIL || 'mbryantuk@gmail.com').trim();

  console.log(`Debug: Attempting to send email via ${host}:${port} as ${user}`);

  // --- PARSERS ---

  const parseJestJson = (filePath, title) => {
    let summary = `${title}: SKIPPED (No JSON report found).`;
    let detailed = '';
    let passed = true; // Default to true so skipped doesn't fail the build
    let skipped = true;

    if (fs.existsSync(filePath)) {
      try {
        const results = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const total = results.numTotalTests || 0;
        const passedCount = results.numPassedTests || 0;
        const failed = results.numFailedTests || 0;

        skipped = false;
        passed = failed === 0 && (results.numFailedTestSuites || 0) === 0;
        summary = `${title}: ${passed ? 'PASSED' : 'FAILED'} (Total: ${total}, Passed: ${passedCount}, Failed: ${failed})`;

        detailed += `\n${title} Breakdown:\n`;
        if (results.testResults && Array.isArray(results.testResults)) {
          results.testResults.forEach((suite) => {
            const filePath = suite.name || suite.testFilePath || 'Unknown';
            const fileName = path.basename(filePath);
            const suitePassed = suite.status === 'passed' || suite.numFailingTests === 0;
            const icon = suitePassed ? '✅' : '❌';
            const tests = suite.testResults || suite.assertionResults || [];
            detailed += `${icon} ${fileName} (${tests.length} tests)\n`;

            if (!suitePassed && tests.length > 0) {
              tests.forEach((test) => {
                if (test.status === 'failed') {
                  detailed += `   - ❌ ${test.title}\n`;
                }
              });
            }
          });
        }
      } catch (e) {
        passed = false;
        skipped = false;
        summary = `${title}: ERROR (Parsing failed: ${e.message})`;
      }
    }
    return { summary, detailed, passed, skipped };
  };

  const parsePlaywrightJson = (filePath, title) => {
    let summary = `${title}: SKIPPED (No JSON report found).`;
    let detailed = '';
    let passed = true;
    let skipped = true;

    if (fs.existsSync(filePath)) {
      try {
        const results = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const stats = results.stats;
        const total = stats.expected + stats.unexpected + stats.flaky + stats.skipped;
        const failed = stats.unexpected + stats.flaky;
        const passedCount = stats.expected;
        const duration = (stats.duration / 1000).toFixed(2);

        skipped = false;
        passed = failed === 0 && (total > 0 || title.includes('Smoke'));
        summary = `${title}: ${passed ? 'PASSED' : 'FAILED'} (Total: ${total}, Passed: ${passedCount}, Failed: ${failed}, Duration: ${duration}s)`;

        detailed += `\n${title} Breakdown:\n`;
        results.suites?.forEach((suite) => {
          const processSuite = (s) => {
            s.specs?.forEach((spec) => {
              const specTitle = spec.title;
              const result = spec.tests[0]?.results[0];
              const icon = result?.status === 'passed' ? '✅' : '❌';
              detailed += `${icon} ${specTitle}\n`;

              if (result?.steps) {
                result.steps.forEach((step) => {
                  const stepIcon = step.error ? '❌' : '✅';
                  detailed += `   ${stepIcon} ${step.title}\n`;
                });
              }
            });
            s.suites?.forEach(processSuite);
          };
          processSuite(suite);
        });
      } catch (e) {
        passed = false;
        skipped = false;
        summary = `${title}: ERROR (Parsing failed: ${e.message})`;
      }
    }
    return { summary, detailed, passed, skipped };
  };

  // --- PROCESSING ---

  const backendResults = parseJestJson(backendReportPath, 'Backend Tests');
  const unitResults = parseJestJson(unitReportPath, 'Frontend Unit Tests');
  const smokeResults = parsePlaywrightJson(smokeReportPath, 'Frontend Smoke Tests (Routing)');
  const e2eResults = parsePlaywrightJson(e2eReportPath, 'Frontend E2E Tests (All)');

  // Coverage Analysis
  let swaggerGaps = '';
  if (fs.existsSync(apiCoveragePath)) {
    try {
      const cov = JSON.parse(fs.readFileSync(apiCoveragePath, 'utf8'));
      swaggerGaps = `\n================================\n`;
      swaggerGaps += `API COVERAGE & SWAGGER SYNC\n`;
      swaggerGaps += `================================\n`;
      swaggerGaps += `Total Endpoints Tested: ${cov.summary.total_endpoints}\n`;
      swaggerGaps += `Swagger Coverage: ${cov.summary.swagger_coverage_pct}%\n`;

      if (cov.swagger_discrepancies.missing_in_swagger.length > 0) {
        swaggerGaps += `\n🚨 MISSING IN SWAGGER (Document these!):\n`;
        cov.swagger_discrepancies.missing_in_swagger.forEach((ep) => {
          swaggerGaps += ` - ${ep}\n`;
        });
      } else {
        swaggerGaps += `\n✅ All tested endpoints are documented in Swagger.\n`;
      }

      if (cov.swagger_discrepancies.not_tested_from_swagger.length > 0) {
        swaggerGaps += `\n⚠️  SWAGGER ENDPOINTS NOT TESTED:\n`;
        cov.swagger_discrepancies.not_tested_from_swagger.forEach((ep) => {
          swaggerGaps += ` - ${ep}\n`;
        });
      }
    } catch (e) {
      console.error('Error parsing api-coverage.json', e);
    }
  }

  const overallPass =
    backendResults.passed && unitResults.passed && smokeResults.passed && e2eResults.passed;
  const allSkipped =
    backendResults.skipped && unitResults.skipped && smokeResults.skipped && e2eResults.skipped;
  const finalStatus =
    overallPass && !allSkipped ? '🟢 PASS' : allSkipped ? '⚪ SKIPPED' : '🔴 FAIL';

  const smtpConfig = {
    host: host,
    port: port,
    secure: port === 465,
    auth: { user: user, pass: pass },
    tls: { rejectUnauthorized: false },
  };

  const transporter = nodemailer.createTransport(smtpConfig);

  const attachments = [];
  if (fs.existsSync(path.join(__dirname, '../../web/playwright-report/index.html'))) {
    attachments.push({
      filename: 'frontend-report.html',
      path: path.join(__dirname, '../../web/playwright-report/index.html'),
    });
  }

  const mailOptions = {
    from: `"Hearth Nightly Bot" <${user}>`,
    to: to,
    subject: `${finalStatus} - Nightly System Health Report (v${version})`,
    text:
      `The nightly comprehensive test suite has completed.\n` +
      `System Version: v${version}\n\n` +
      `================================\n` +
      `BACKEND STATUS\n` +
      `================================\n` +
      `${backendResults.summary}\n` +
      `${backendResults.detailed}\n` +
      `${swaggerGaps}\n` +
      `\n` +
      `================================\n` +
      `FRONTEND STATUS\n` +
      `================================\n` +
      `${smokeResults.summary}\n` +
      `${smokeResults.detailed}\n` +
      `\n` +
      `${unitResults.summary}\n` +
      `${unitResults.detailed}\n` +
      `\n` +
      `${e2eResults.summary}\n` +
      `${e2eResults.detailed}\n` +
      `\n` +
      `Time: ${new Date().toLocaleString()}\n`,
    html: `
            <div style="font-family: monospace; white-space: pre-wrap; background: #f4f4f4; padding: 20px; border-radius: 8px;">
                <h2 style="color: ${overallPass ? '#2e7d32' : '#d32f2f'}">${finalStatus} - Nightly System Health</h2>
                <p><strong>Version:</strong> v${version}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                <hr/>
                <h3 style="background: #333; color: #fff; padding: 5px;">BACKEND STATUS</h3>
                <p>${backendResults.summary.replace(/\n/g, '<br>')}</p>
                <pre style="background: #e0e0e0; padding: 10px;">${backendResults.detailed}</pre>
                <div style="background: #fff; border: 1px solid #ccc; padding: 10px; margin-top: 10px;">
                    ${swaggerGaps.replace(/\n/g, '<br>')}
                </div>
                <hr/>
                <h3 style="background: #333; color: #fff; padding: 5px;">FRONTEND STATUS</h3>
                <p><strong>Smoke Tests:</strong> ${smokeResults.summary}</p>
                <pre style="background: #e0e0e0; padding: 10px;">${smokeResults.detailed}</pre>
                
                <p><strong>Unit Tests:</strong> ${unitResults.summary}</p>
                <pre style="background: #e0e0e0; padding: 10px;">${unitResults.detailed}</pre>
                
                <p><strong>E2E Tests:</strong> ${e2eResults.summary}</p>
                <pre style="background: #e0e0e0; padding: 10px;">${e2eResults.detailed}</pre>
            </div>
        `,
    attachments,
  };

  try {
    if (!pass) throw new Error('SMTP_PASS not set');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Nightly report emailed to:', to);
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
  }
}

sendReport();
