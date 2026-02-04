const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const FAILURE_CHANNEL_ID = 'C0AD07QPYMS';

async function slackRequest(endpoint, payload) {
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

function getSystemVersion() {
    try {
        const pkgPath = path.join(__dirname, '../../package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return pkg.version || 'Unknown';
    } catch (e) {
        return 'Unknown';
    }
}

async function run() {
    const reportPath = process.argv[2] || path.join(__dirname, '../../web/test-results/results.json');
    
    if (!fs.existsSync(reportPath)) {
        console.log(`No test report found at ${reportPath}. Skipping Slack notification.`);
        return;
    }

    if (!process.env.SLACK_BOT_TOKEN) {
        console.warn("Missing SLACK_BOT_TOKEN. Skipping notification.");
        return;
    }

    try {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        const failures = [];

        // DETECT FORMAT
        if (report.suites) {
            // PLAYWRIGHT FORMAT
            report.suites.forEach(suite => {
                const checkSuite = (s) => {
                    if (s.specs) {
                        s.specs.forEach(spec => {
                            spec.tests.forEach(test => {
                                if (test.status === 'unexpected' || test.status === 'failed') {
                                    failures.push({
                                        title: spec.title,
                                        file: suite.file,
                                        error: test.results[0]?.error?.message || 'Unknown Error'
                                    });
                                }
                            });
                        });
                    }
                    if (s.suites) s.suites.forEach(checkSuite);
                };
                checkSuite(suite);
            });
        } else if (report.testResults) {
            // JEST FORMAT
            report.testResults.forEach(suite => {
                if (suite.status === 'failed' || suite.numFailingTests > 0) {
                     suite.testResults.forEach(test => {
                         if (test.status === 'failed') {
                             failures.push({
                                 title: test.fullName || test.title,
                                 file: suite.testFilePath,
                                 error: test.failureMessages.join('\n') || 'Unknown Error'
                             });
                         }
                     });
                     // Catch suite level errors if no specific test failed but suite did
                     if (suite.failureMessage && failures.length === 0) {
                         failures.push({
                             title: "Suite Failure",
                             file: suite.testFilePath,
                             error: suite.failureMessage
                         });
                     }
                }
            });
        }

        if (failures.length > 0) {
            console.log(`Found ${failures.length} failures. Notifying Slack channel ${FAILURE_CHANNEL_ID}...`);
            const version = getSystemVersion();
            
            const blocks = [
                {
                    type: "header",
                    text: { type: "plain_text", text: "🚨 E2E Test Failures Detected" }
                },
                {
                    type: "section",
                    text: { type: "mrkdwn", text: `*Version:* v${version}\n*Run ID:* ${Date.now()}\n*Total Failures:* ${failures.length}` }
                }
            ];

            failures.slice(0, 5).forEach(f => {
                blocks.push({
                    type: "section",
                    text: { 
                        type: "mrkdwn", 
                        text: `*${f.title}*\n> ${f.error.replace(/\n/g, ' ').substring(0, 200)}...` 
                    }
                });
            });

            if (failures.length > 5) {
                blocks.push({
                    type: "section",
                    text: { type: "mrkdwn", text: `...and ${failures.length - 5} more.` }
                });
            }

            await slackRequest('chat.postMessage', {
                channel: FAILURE_CHANNEL_ID,
                blocks: blocks,
                text: `🚨 ${failures.length} E2E Tests Failed (v${version})!`
            });
            console.log("Notification sent.");
        } else {
            console.log("No failures found in report.");
        }

    } catch (err) {
        console.error("Failed to process test report or send notification:", err);
    }
}

run();
