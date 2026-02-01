const https = require('https');
const fs = require('fs');
const path = require('path');

function send(webhookUrl, payload) {
    return new Promise((resolve, reject) => {
        const url = new URL(webhookUrl);
        const body = JSON.stringify(payload);
        const req = https.request({
            hostname: url.hostname, path: url.pathname + url.search, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
            timeout: 10000
        }, (res) => {
            res.on('data', () => {});
            res.on('end', () => resolve());
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function postToSlack() {
    const apiCoveragePath = path.join(__dirname, '../../server/api-coverage.json');
    const pkgPath = path.join(__dirname, '../../package.json');
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl || !fs.existsSync(apiCoveragePath)) return;

    const cov = JSON.parse(fs.readFileSync(apiCoveragePath, 'utf8'));
    const version = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;

    try {
        // 1. BRADY SEEDING MESSAGE [TAG: SEEDING]
        if (cov.results["BRADY SEED"] || cov.results["BRADY DATA"]) {
            const steps = cov.steps || ["Data persistence verified"];
            await send(webhookUrl, {
                attachments: [{
                    color: "#3AA3E3", // Blue
                    blocks: [
                        { type: "section", text: { type: "mrkdwn", text: "`[SEEDING]`" } },
                        { type: "header", text: { type: "plain_text", text: `🏡 Brady Household (v${version})` } },
                        { type: "section", text: { type: "mrkdwn", text: `*Status:* 🟢 SEEDED\n${steps.map(s => `• ${s}`).join('\n')}` } }
                    ]
                }]
            });
        }

        // 2. CORE API COVERAGE [TAG: CORE-API]
        const modules = { "Utilities": "/water", "People": "/members", "Assets": "/assets", "Finance": "/finance", "Meals": "/meals" };
        let coverageText = "";
        Object.keys(modules).forEach(m => {
            const passed = Object.keys(cov.results).filter(ep => ep.includes(modules[m])).every(ep => cov.results[ep] === 'PASS');
            coverageText += `${passed ? "✅" : "❌"} *${m}*\n`;
        });

        await send(webhookUrl, {
            attachments: [{
                color: "#2EB886", // Green
                blocks: [
                    { type: "section", text: { type: "mrkdwn", text: "`[CORE-API]`" } },
                    { type: "header", text: { type: "plain_text", text: `🛡️ Node Health (v${version})` } },
                    { type: "section", text: { type: "mrkdwn", text: coverageText } }
                ]
            }]
        });

        // 3. ADVANCED INTEGRITY [TAG: INTEGRITY]
        const integrityItems = ["Friday Rule", "Backup", "Path Traversal", "Idempotency"];
        let integrityText = "";
        Object.keys(cov.results).forEach(key => {
            if (integrityItems.some(i => key.includes(i))) {
                integrityText += `${cov.results[key] === 'PASS' ? "✅" : "❌"} *${key}*\n`;
            }
        });

        if (integrityText) {
            await send(webhookUrl, {
                attachments: [{
                    color: "#9B59B6", // Purple
                    blocks: [
                        { type: "section", text: { type: "mrkdwn", text: "`[INTEGRITY]`" } },
                        { type: "header", text: { type: "plain_text", text: `💎 Logic & Security (v${version})` } },
                        { type: "section", text: { type: "mrkdwn", text: integrityText } }
                    ]
                }]
            });
        }

        // 4. CONCURRENCY STRESS [TAG: PERFORMANCE]
        const stressResult = Object.keys(cov.results).find(k => k.toLowerCase().includes("concurrency") || k.toLowerCase().includes("stress"));
        if (stressResult) {
            await send(webhookUrl, {
                attachments: [{
                    color: "#E67E22", // Orange
                    blocks: [
                        { type: "section", text: { type: "mrkdwn", text: "`[PERFORMANCE]`" } },
                        { type: "header", text: { type: "plain_text", text: `⚡ Concurrency Stress (v${version})` } },
                        { type: "section", text: { type: "mrkdwn", text: `*Status:* ${cov.results[stressResult] === 'PASS' ? "🟢 STABLE" : "🔴 UNSTABLE"}\nAtomic write lock verification complete.` } }
                    ]
                }]
            });
        }

        process.exit(0);
    } catch (err) {
        console.error("❌ Slack Posting Failed:", err.message);
        process.exit(1);
    }
}

postToSlack();