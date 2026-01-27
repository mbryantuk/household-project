const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendReport() {
    const reportPath = path.join(__dirname, '../../web/playwright-report/index.html');
    const backendLogPath = path.join(__dirname, '../../server/test-results.log');
    
    // Gmail Defaults for mbryantuk@gmail.com
    const smtpConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 465,
        secure: (process.env.SMTP_PORT == 465 || !process.env.SMTP_PORT), // True for 465, false for 587
        auth: {
            user: process.env.SMTP_USER || 'mbryantuk@gmail.com',
            pass: process.env.SMTP_PASS // Required: Google App Password
        }
    };

    const transporter = nodemailer.createTransport(smtpConfig);

    const attachments = [];
    if (fs.existsSync(reportPath)) {
        attachments.push({ filename: 'frontend-report.html', path: reportPath });
    }
    
    const backendLog = fs.existsSync(backendLogPath) ? fs.readFileSync(backendLogPath, 'utf8') : '';
    const backendPassed = backendLog.includes('PASS');

    const mailOptions = {
        from: '"Totem Nightly Bot" <mbryantuk@gmail.com>',
        to: process.env.REPORT_EMAIL || 'mbryantuk@gmail.com',
        subject: `🌙 Nightly System Health Report: ${backendPassed ? '🟢 PASS' : '🔴 FAIL'}`,
        text: `The nightly comprehensive test suite has completed.\n\nBackend Status: ${backendPassed ? 'PASSED' : 'FAILED'}\nFrontend Status: See attached report.\n\nTime: ${new Date().toLocaleString()}\n\nNote: If tests failed, logs are preserved in server/test-results.log and web/playwright-tests.log on the server.`,        attachments
    };

    try {
        if (!smtpConfig.auth.pass) {
            throw new Error("SMTP_PASS (Google App Password) not set in environment.");
        }
        await transporter.sendMail(mailOptions);
        console.log('✅ Nightly report emailed to mbryantuk@gmail.com');
    } catch (error) {
        console.error('❌ Failed to send email:', error.message);
        console.log('Results are saved locally in web/playwright-report/');
    }
}

sendReport();