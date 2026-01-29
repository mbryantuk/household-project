const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendReport() {
    const reportPath = path.join(__dirname, '../../web/playwright-report/index.html');
    const smokeResultPath = path.join(__dirname, '../../web/results.json');
    const routingResultPath = path.join(__dirname, '../../web/results-routing.json');
    const bradyResultPath = path.join(__dirname, '../../web/results-brady.json');
    
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

    // Helper to parse Playwright JSON
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
                
                detailed += `
${title} - Detailed Breakdown:
`;
                results.suites.forEach(suite => {
                    const processSuite = (s) => {
                        s.specs?.forEach(spec => {
                            const specTitle = spec.title;
                            const result = spec.tests[0]?.results[0];
                            const icon = result?.status === 'passed' ? '✅' : '❌';
                            detailed += `${icon} ${specTitle}
`;
                            
                            if (result?.stdout) {
                                result.stdout.forEach(entry => {
                                    if (entry.text && (entry.text.startsWith('Step') || entry.text.startsWith('Checking:'))) {
                                        detailed += `   - ${entry.text.trim()}
`;
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

    const smokeResults = parsePlaywrightJson(smokeResultPath, "Frontend Stage 1 (Smoke)");
    const routingResults = parsePlaywrightJson(routingResultPath, "Frontend Stage 2 (Routing)");
    const bradyResults = parsePlaywrightJson(bradyResultPath, "Frontend Stage 3 (Brady)");
    
    // Check if tests actually ran and passed
    const frontendPassed = smokeResults.passed && routingResults.passed && bradyResults.passed;

    // Parse Backend JSON Results
    const backendReportPath = path.join(__dirname, '../../server/test-report.json');
    let backendSummary = "Backend Tests: No JSON report found.";
    let backendDetailed = "";
    let backendPassed = false;

    if (fs.existsSync(backendReportPath)) {
        try {
            const results = JSON.parse(fs.readFileSync(backendReportPath, 'utf8'));
            const total = results.numTotalTests;
            const passed = results.numPassedTests;
            const failed = results.numFailedTests;
            
            backendPassed = failed === 0 && results.numFailedTestSuites === 0;
            backendSummary = `Backend Tests: ${backendPassed ? 'PASSED' : 'FAILED'}\n` +
                             `Total: ${total}, Passed: ${passed}, Failed: ${failed}`;
            
            backendDetailed += "\nFile-by-File Breakdown:\n";
            results.testResults.forEach(suite => {
                const fileName = path.basename(suite.testFilePath);
                const suitePassed = suite.numFailingTests === 0;
                const icon = suitePassed ? '✅' : '❌';
                backendDetailed += `${icon} ${fileName} (${suite.numPassingTests} tests)\n`;
                
                if (!suitePassed) {
                     suite.testResults.forEach(test => {
                         if (test.status === 'failed') {
                             backendDetailed += `   - ❌ ${test.title}\n`;
                         }
                     });
                }
            });
        } catch (e) {
             backendSummary = `Backend Tests: Error parsing JSON report (${e.message})`;
        }
    }

    const smtpConfig = {
        host: host,
        port: port,
        secure: port === 465, 
        auth: { user: user, pass: pass },
        tls: { rejectUnauthorized: false }
    };

    const transporter = nodemailer.createTransport(smtpConfig);

    const attachments = [];
    if (fs.existsSync(reportPath)) {
        attachments.push({ filename: 'frontend-report.html', path: reportPath });
    }

    const mailOptions = {
        from: `"Totem Nightly Bot" <${user}>`,
        to: to,
        subject: `🌙 Nightly System Health Report (v${version}): ${backendPassed && frontendPassed ? '🟢 PASS' : '🔴 FAIL'}`,
        text: `The nightly comprehensive test suite has completed.\n` +
              `System Version: v${version}\n\n` +
              `================================\n` +
              `BACKEND STATUS\n` +
              `================================\n` +
              `${backendSummary}\n` +
              `${backendDetailed}\n` +
              `\n` +
              `================================\n` +
              `FRONTEND STATUS\n` +
              `================================\n` +
              `${smokeResults.summary}\n` +
              `${smokeResults.detailed}\n` +
              `\n` +
              `${routingResults.summary}\n` +
              `${routingResults.detailed}\n` +
              `\n` +
              `${bradyResults.summary}\n` +
              `${bradyResults.detailed}\n` +
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
