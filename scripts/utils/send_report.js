const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendReport() {
    const reportPath = path.join(__dirname, '../../web/playwright-report/index.html');
    const jsonResultPath = path.join(__dirname, '../../web/test-results/results.json');
    const backendLogPath = path.join(__dirname, '../../server/test-results.log');
    
    // Config
    const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const port = parseInt(process.env.SMTP_PORT) || 587;
    const user = (process.env.SMTP_USER || 'mbryantuk@gmail.com').trim();
    const pass = (process.env.SMTP_PASS || '').trim().replace(/["']/g, '');
    const to = (process.env.REPORT_EMAIL || 'mbryantuk@gmail.com').trim();

    console.log(`Debug: Attempting to send email via ${host}:${port} as ${user}`);

    // Parse Frontend JSON Results
    let frontendSummary = "Frontend Tests: No JSON report found.";
    let frontendDetailed = "";
    let frontendPassed = false;
    
    if (fs.existsSync(jsonResultPath)) {
        try {
            const results = JSON.parse(fs.readFileSync(jsonResultPath, 'utf8'));
            const total = results.stats.expected;
            const passed = results.stats.expected - results.stats.unexpected - results.stats.flaky;
            const failed = results.stats.unexpected;
            const duration = (results.stats.duration / 1000).toFixed(2);
            
            frontendPassed = failed === 0;
            frontendSummary = `Frontend Tests: ${frontendPassed ? 'PASSED' : 'FAILED'}\n` +
                              `Total: ${total}, Passed: ${passed}, Failed: ${failed}\n` +
                              `Duration: ${duration}s`;
            
            // Extract details for Asset, Finance, Meal
            frontendDetailed += "\nKey Feature Verification:\n";
            results.suites.forEach(suite => {
                suite.specs.forEach(spec => {
                    const title = spec.title;
                    const status = spec.tests[0].results[0].status;
                    const icon = status === 'passed' ? '✅' : '❌';
                    
                    if (title.match(/Asset|Finance|Meal/i)) {
                        frontendDetailed += `${icon} ${title}\n`;
                    }
                    
                    if (status !== 'passed') {
                        frontendDetailed += `⚠️ FAILED: ${title}\n`;
                    }
                });
            });

        } catch (e) {
            frontendSummary = `Frontend Tests: Error parsing JSON report (${e.message})`;
        }
    }

    // Parse Backend JSON Results
    const backendReportPath = path.join(__dirname, '../../server/test-report.json');
    let backendSummary = "Backend Tests: No JSON report found.";
    let backendPassed = false;

    if (fs.existsSync(backendReportPath)) {
        try {
            const results = JSON.parse(fs.readFileSync(backendReportPath, 'utf8'));
            const total = results.numTotalTests;
            const passed = results.numPassedTests;
            const failed = results.numFailedTests;
            const pending = results.numPendingTests;
            
            // Fix: Jest might return success: false for non-test reasons (e.g. empty suites),
            // so we strictly check if any tests actually failed.
            backendPassed = results.numFailedTests === 0 && results.numFailedTestSuites === 0;
            
            backendSummary = `Backend Tests: ${backendPassed ? 'PASSED' : 'FAILED'}\n` +
                             `Total: ${total}, Passed: ${passed}, Failed: ${failed}, Pending: ${pending}`;
            
            if (failed > 0) {
                backendSummary += "\n\nFailed Backend Tests:\n";
                results.testResults.forEach(suite => {
                    if (suite.status === 'failed') {
                         suite.assertionResults.forEach(test => {
                             if (test.status === 'failed') {
                                 backendSummary += `- ${test.ancestorTitles.join(' > ')} > ${test.title}\n`;
                             }
                         });
                    }
                });
            }
        } catch (e) {
             backendSummary = `Backend Tests: Error parsing JSON report (${e.message})`;
             const backendLog = fs.existsSync(backendLogPath) ? fs.readFileSync(backendLogPath, 'utf8') : '';
             if (backendLog.includes('SUCCESS') || backendLog.includes('PASS')) backendPassed = true;
        }
    } else {
        const backendLog = fs.existsSync(backendLogPath) ? fs.readFileSync(backendLogPath, 'utf8') : '';
        backendPassed = backendLog.includes('SUCCESS') || backendLog.includes('PASS');
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
        subject: `🌙 Nightly System Health Report: ${backendPassed && frontendPassed ? '🟢 PASS' : '🔴 FAIL'}`,
        text: `The nightly comprehensive test suite has completed.\n\n` +
              `================================\n` +
              `BACKEND STATUS\n` +
              `================================\n` +
              `${backendSummary}\n` +
              `\n` +
              `================================\n` +
              `FRONTEND STATUS\n` +
              `================================\n` +
              `${frontendSummary}\n` +
              `${frontendDetailed}\n` +
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
