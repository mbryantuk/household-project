const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendReport() {
    const backendReportPath = path.join(__dirname, '../../server/test-report.json');
    const unitReportPath = path.join(__dirname, '../../web/test-results/unit.json');
    const e2eReportPath = path.join(__dirname, '../../web/results-all.json');
    const apiCoveragePath = path.join(__dirname, '../../server/api-coverage.json');
    
    // Read Version
    let version = "Unknown";
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
        version = pkg.version;
    } catch (e) {
        console.error("Warning: Could not read package version");
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
        let summary = `${title}: No JSON report found (Skipped or Failed Fast).`;
        let detailed = "";
        let passed = false;

        if (fs.existsSync(filePath)) {
            try {
                const results = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const total = results.numTotalTests || 0;
                const passedCount = results.numPassedTests || 0;
                const failed = results.numFailedTests || 0;
                
                passed = failed === 0 && (results.numFailedTestSuites || 0) === 0;
                summary = `${title}: ${passed ? 'PASSED' : 'FAILED'} (Total: ${total}, Passed: ${passedCount}, Failed: ${failed})`;
                
                detailed += `\n${title} Breakdown:\n`;
                if (results.testResults && Array.isArray(results.testResults)) {
                    results.testResults.forEach(suite => {
                        const filePath = suite.name || suite.testFilePath || "Unknown";
                        const fileName = path.basename(filePath);
                        const suitePassed = (suite.status === 'passed') || (suite.numFailingTests === 0);
                        const icon = suitePassed ? '✅' : '❌';
                        detailed += `${icon} ${fileName} (${suite.assertionResults ? suite.assertionResults.length : 0} tests)\n`;
                        
                        if (!suitePassed && suite.assertionResults) {
                             suite.assertionResults.forEach(test => {
                                 if (test.status === 'failed') {
                                     detailed += `   - ❌ ${test.title}\n`;
                                 }
                             });
                        }
                    });
                }
            } catch (e) {
                summary = `${title}: Error parsing JSON report (${e.message})`;
            }
        }
        return { summary, detailed, passed };
    };

    const parsePlaywrightJson = (filePath, title) => {
        let summary = `${title}: No JSON report found (Skipped or Failed Fast).`;
        let detailed = "";
        let passed = false;

        if (fs.existsSync(filePath)) {
            try {
                const results = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const stats = results.stats;
                const total = stats.expected + stats.unexpected + stats.flaky + stats.skipped;
                const failed = stats.unexpected + stats.flaky;
                const passedCount = stats.expected;
                const duration = (stats.duration / 1000).toFixed(2);
                
                passed = failed === 0 && total > 0;
                summary = `${title}: ${passed ? 'PASSED' : 'FAILED'} (Total: ${total}, Passed: ${passedCount}, Failed: ${failed}, Duration: ${duration}s)`;
                
                detailed += `\n${title} Breakdown:\n`;
                results.suites?.forEach(suite => {
                    const processSuite = (s) => {
                        s.specs?.forEach(spec => {
                            const specTitle = spec.title;
                            const result = spec.tests[0]?.results[0];
                            const icon = result?.status === 'passed' ? '✅' : '❌';
                            detailed += `${icon} ${specTitle}\n`;
                            
                            if (result?.stdout) {
                                result.stdout.forEach(entry => {
                                    if (entry.text && (entry.text.startsWith('Step') || entry.text.startsWith('Checking:'))) {
                                        detailed += `   - ${entry.text.trim()}\n`;
                                    }
                                });
                            }
                        });
                        s.suites?.forEach(processSuite);
                    };
                    processSuite(suite);
                });
            } catch (e) {
                summary = `${title}: Error parsing JSON report (${e.message})`;
            }
        }
        return { summary, detailed, passed };
    };

    // --- PROCESSING ---

    const backendResults = parseJestJson(backendReportPath, "Backend Tests");
    const unitResults = parseJestJson(unitReportPath, "Frontend Unit Tests");
    const e2eResults = parsePlaywrightJson(e2eReportPath, "Frontend E2E Tests (All)");

    // Coverage Analysis
    let swaggerGaps = "";
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
                cov.swagger_discrepancies.missing_in_swagger.forEach(ep => {
                    swaggerGaps += ` - ${ep}\n`;
                });
            } else {
                swaggerGaps += `\n✅ All tested endpoints are documented in Swagger.\n`;
            }

            if (cov.swagger_discrepancies.not_tested_from_swagger.length > 0) {
                swaggerGaps += `\n⚠️  SWAGGER ENDPOINTS NOT TESTED:\n`;
                cov.swagger_discrepancies.not_tested_from_swagger.forEach(ep => {
                    swaggerGaps += ` - ${ep}\n`;
                });
            }
        } catch (e) {
            console.error("Error parsing api-coverage.json", e);
        }
    }

    const overallPass = backendResults.passed && unitResults.passed && e2eResults.passed;

    const smtpConfig = {
        host: host,
        port: port,
        secure: port === 465, 
        auth: { user: user, pass: pass },
        tls: { rejectUnauthorized: false }
    };

    const transporter = nodemailer.createTransport(smtpConfig);

    const attachments = [];
    if (fs.existsSync(path.join(__dirname, '../../web/playwright-report/index.html'))) {
        attachments.push({ filename: 'frontend-report.html', path: path.join(__dirname, '../../web/playwright-report/index.html') });
    }

    const mailOptions = {
        from: `"Hearth Nightly Bot" <${user}>`,
        to: to,
        subject: `🌙 Nightly System Health Report (v${version}): ${overallPass ? '🟢 PASS' : '🔴 FAIL'}`,
        text: `The nightly comprehensive test suite has completed.\n` + 
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
              `${unitResults.summary}\n` + 
              `${unitResults.detailed}\n` + 
              `\n` + 
              `${e2eResults.summary}\n` + 
              `${e2eResults.detailed}\n` + 
              `\n` + 
              `Time: ${new Date().toLocaleString()}\n`,
        attachments
    };

    try {
        if (!pass) throw new Error("SMTP_PASS not set");
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Nightly report emailed to:', to);
    } catch (error) {
        console.error('❌ Failed to send email:', error.message);
    }
}

sendReport();