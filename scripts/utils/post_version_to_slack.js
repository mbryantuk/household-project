const https = require('https');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '../ops/slack_state.json');

function loadState() {
    if (!fs.existsSync(STATE_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (e) {
        return {};
    }
}

function saveState(state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function slackRequest(endpoint, payload) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const options = {
            hostname: 'slack.com',
            path: `/api/${endpoint}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.ok) resolve(parsed);
                    else reject(new Error(parsed.error || 'Unknown Slack Error'));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function run() {
    // 1. Validate Inputs
    let commitMessage = process.argv[2] || "No description provided.";
    if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_CHANNEL_ID) {
        console.error("❌ Missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID.");
        process.exit(1);
    }

    // 2. Read Version
    let version = "0.0.0";
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
        version = pkg.version;
    } catch (e) {
        console.error("❌ Failed to read package.json:", e.message);
        process.exit(1);
    }

    // 3. Check State (Idempotency)
    const state = loadState();
    if (state.last_announced_version === version) {
        console.log(`ℹ️ Version ${version} was already announced. Skipping.`);
        return;
    }

    // 3.5 Deduplicate version in commit message if present
    // Remove "vX.Y.Z - " or "vX.Y.Z: " or just "vX.Y.Z " from start of message
    const versionCleanPattern = new RegExp(`^v?${version.replace(/\./g, '\\.')}\s*[-:]?\s*`, 'i');
    commitMessage = commitMessage.replace(versionCleanPattern, '');

    // 4. Construct Message
    const blocks = [
        {
            type: "header",
            text: {
                type: "plain_text",
                text: `🚀 New Version Deployed: v${version}`,
                emoji: true
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*Summary of Change:*
${commitMessage}`
            }
        },
        {
            type: "divider"
        },
        {
            type: "context",
            elements: [
                {
                    type: "mrkdwn",
                    text: `📅 ${new Date().toLocaleString()}   |   🛡️ Hearth DevOps`
                }
            ]
        }
    ];

    // 5. Send to Slack
    console.log(`[SLACK] Announcing v${version}...`);
    try {
        await slackRequest('chat.postMessage', {
            channel: process.env.SLACK_CHANNEL_ID,
            blocks: blocks,
            text: `New Deployment: v${version} - ${commitMessage}`
        });

        // 6. Update State
        state.last_announced_version = version;
        saveState(state);
        console.log("✅ Announcement sent.");
    } catch (err) {
        console.error("❌ Failed to post announcement:", err.message);
        process.exit(1);
    }
}

run();