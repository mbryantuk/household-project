const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendReport() {
    const reportPath = path.join(__dirname, '../../web/playwright-report/index.html');
    const backendLogPath = path.join(__dirname, '../../server/test-results.log');
    
    const smtpConfig = {
        host: process.env.SMTP_HOST || 'localhost',
        port: process.env.SMTP_PORT || 587,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    };

    const transporter = nodemailer.createTransport(smtpConfig);

    const attachments = [];
    if (fs.existsSync(reportPath)) {
        attachments.push({ filename: 'frontend-report.html', path: reportPath });
    }
    
    const backendPassed = fs.existsSync(backendLogPath) && fs.readFileSync(backendLogPath, 'utf8').includes('PASS');

    const mailOptions = {
        from: '"Totem Nightly Bot" <nightly@totem-saas.com>',
        to: process.env.REPORT_EMAIL || 'admin@example.com',
        subject: `🌙 Nightly System Health Report: ${backendPassed ? '🟢 PASS' : '🔴 FAIL'}`,
        text: `The nightly comprehensive test suite has completed.\n\nBackend Status: ${backendPassed ? 'PASSED' : 'FAILED'}\nFrontend Status: See attached report.\n\nTime: ${new Date().toLocaleString()}`,
        attachments
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('✅ Nightly report emailed.');
    } catch (error) {
        console.error('❌ Failed to send email:', error.message);
        console.log('Results are saved locally in web/playwright-report/');
    }
}

sendReport();
