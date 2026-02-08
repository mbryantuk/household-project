const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendEmail = async (to, subject, html) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[EmailService] ✉️ MOCK SEND to ${to}: ${subject}`);
        console.log(`[EmailService] Body: ${html.substring(0, 100)}...`);
        return true;
    }

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Mantel" <noreply@mantel.com>',
            to,
            subject,
            html
        });
        console.log(`[EmailService] ✅ Sent to ${to}`);
        return true;
    } catch (err) {
        console.error(`[EmailService] ❌ Failed to send to ${to}:`, err.message);
        return false;
    }
};

module.exports = { sendEmail };
