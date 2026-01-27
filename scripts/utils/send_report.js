const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendReport() {
    const reportPath = path.join(__dirname, '../../web/playwright-report/index.html');
    const backendLogPath = path.join(__dirname, '../../server/test-results.log');
    
    // Config
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER || 'mbryantuk@gmail.com';
    const pass = process.env.SMTP_PASS;
    const to = process.env.REPORT_EMAIL || 'mbryantuk@gmail.com';

    console.log(`Debug: Attempting to send email via ${host}:${port} as ${user}`);

    const smtpConfig = {
        host: host,
        port: port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
            user: user,
            pass: pass
        }
    };

    const transporter = nodemailer.createTransport(smtpConfig);

    const attachments = [];
    if (fs.existsSync(reportPath)) {
        attachments.push({ filename: 'frontend-report.html', path: reportPath });
    }
    
    const backendLog = fs.existsSync(backendLogPath) ? fs.readFileSync(backendLogPath, 'utf8') : 'No backend log found.';
    const backendPassed = backendLog.includes('SUCCESS') || backendLog.includes('PASS');

    const mailOptions = {
        from: `"Totem Nightly Bot" <${user}>`,
        to: to,
        subject: `🌙 Nightly System Health Report: ${backendPassed ? '🟢 PASS' : '🔴 FAIL'}`,
        text: `The nightly comprehensive test suite has completed.\n\nBackend Status: ${backendPassed ? 'PASSED' : 'FAILED'}\nFrontend Status: See attached report.\n\nTime: ${new Date().toLocaleString()}\n\nNote: If tests failed, logs are preserved in server/test-results.log and web/playwright-tests.log on the server.`,
        attachments
    };

    try {
        if (!pass) {
            throw new Error("SMTP_PASS (Google App Password) not set in environment or .env.nightly");
        }
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Nightly report emailed to:', to);
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ Failed to send email:', error.message);
        if (error.message.includes('EAUTH')) {
            console.error('Tip: Check your Google App Password. Ensure 2FA is on and you generated a specifically for this App.');
        }
    }
}

sendReport();
