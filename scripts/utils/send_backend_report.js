const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendBackendReport() {
    const apiCoveragePath = path.join(__dirname, '../../server/api-coverage.json');
    const pkgPath = path.join(__dirname, '../../package.json');
    
    let version = "Unknown";
    try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        version = pkg.version;
    } catch (e) {}

    if (!fs.existsSync(apiCoveragePath)) {
        console.error("❌ Cannot send report: api-coverage.json missing.");
        return;
    }

    const cov = JSON.parse(fs.readFileSync(apiCoveragePath, 'utf8'));

    // Config
    const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const port = parseInt(process.env.SMTP_PORT) || 465;
    const user = (process.env.SMTP_USER || 'mbryantuk@gmail.com').trim();
    const pass = (process.env.SMTP_PASS || '').trim().replace(/["']/g, '');
    const to = (process.env.REPORT_EMAIL || 'mbryantuk@gmail.com').trim();

    const transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: port === 465,
        auth: { user: user, pass: pass },
        tls: { rejectUnauthorized: false }
    });

    let body = `🛡️ TOTEM BACKEND API SECURITY & CRUD REPORT (v${version})\n`;
    body += `Generated: ${new Date().toLocaleString()}\n`;
    body += `==========================================================\n\n`;

    body += `👤 TEST ACCOUNTS CREATED\n`;
    body += `----------------------------------------------------------\n`;
    body += `ADMIN:  ${cov.accounts?.admin || 'N/A'}\n`;
    body += `VIEWER: ${cov.accounts?.viewer || 'N/A'}\n\n`;

    body += `📋 EXECUTION STEPS\n`;
    body += `----------------------------------------------------------\n`;
    if (cov.steps) {
        cov.steps.forEach(step => body += `[STEP] ${step}\n`);
    }
    body += `\n`;

    body += `📊 SUMMARY\n`;
    body += `----------------------------------------------------------\n`;
    body += `Total Endpoints Verified: ${cov.summary.total_endpoints}\n`;
    body += `Test Status: ${cov.summary.failed === 0 ? '🟢 ALL PASSED' : '🔴 FAILURES DETECTED'}\n`;
    body += `Swagger Coverage: ${cov.summary.swagger_coverage_pct}%\n\n`;

    body += `🔗 DETAILED ENDPOINT STATUS & SWAGGER SYNC\n`;
    body += `----------------------------------------------------------\n`;
    body += `LEGEND:\n`;
    body += `TEST:    ✅ PASS | ❌ FAIL\n`;
    body += `SWAGGER: 📄 IN SYNC | ⚠️ MISSING FROM SWAGGER.JSON\n`;
    body += `----------------------------------------------------------\n\n`;

    // Sort endpoints
    const sortedEndpoints = Object.keys(cov.results).sort();
    
    sortedEndpoints.forEach(ep => {
        const testStatus = cov.results[ep];
        const isMissingInSwagger = cov.swagger_discrepancies?.missing_in_swagger?.includes(ep) || false;
        
        const testIcon = testStatus === 'PASS' ? '✅' : '❌';
        const swaggerIcon = isMissingInSwagger ? '⚠️' : '📄';
        
        body += `${testIcon} ${swaggerIcon} ${ep.padEnd(55)} [${testStatus}]\n`;
    });

    body += `\n⚠️ SWAGGER GAP ANALYSIS\n`;
    body += `----------------------------------------------------------\n`;
    if (cov.swagger_discrepancies.not_tested_from_swagger.length > 0) {
        body += `⌛ THE FOLLOWING SWAGGER ENDPOINTS WERE NOT TESTED:\n`;
        cov.swagger_discrepancies.not_tested_from_swagger.forEach(n => body += ` - ${n}\n`);
    } else {
        body += `✅ All Swagger-documented endpoints have been verified.\n`;
    }

    const mailOptions = {
        from: `"Hearth Backend Bot" <${user}>`,
        to: to,
        subject: `🛡️ Backend Security Report (v${version}): ${cov.summary.failed === 0 ? '🟢 PASS' : '🔴 FAIL'}`,
        text: body
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('✅ Detailed backend report emailed to:', to);
    } catch (error) {
        console.error('❌ Failed to send backend report:', error.message);
    }
}

sendBackendReport();