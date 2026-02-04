const fs = require('fs');
const path = require('path');

// Try to load dependencies from server/node_modules
const SERVER_MODULES = path.resolve(__dirname, '../../server/node_modules');
const axiosModule = require(path.join(SERVER_MODULES, 'axios'));
const axios = axiosModule.default || axiosModule;
const FormData = require(path.join(SERVER_MODULES, 'form-data'));

// Configuration
const FAILURE_CHANNEL_ID = 'C0AD07QPYMS';
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;
const BASE_URL = process.env.BASE_URL || 'http://localhost:4001';

function getSystemVersion() {
    try {
        const pkgPath = path.join(__dirname, '../../package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return pkg.version || 'Unknown';
    } catch (e) {
        return 'Unknown';
    }
}

async function uploadFile(filepath, title, channelId, threadTs = null) {
    if (!fs.existsSync(filepath)) return;

    try {
        const form = new FormData();
        form.append('token', SLACK_TOKEN);
        form.append('channels', channelId);
        form.append('file', fs.createReadStream(filepath));
        form.append('title', title);
        if (threadTs) form.append('thread_ts', threadTs);

        await axios.post('https://slack.com/api/files.upload', form, {
            headers: form.getHeaders()
        });
        console.log(`[SLACK] Uploaded: ${title}`);
    } catch (err) {
        console.error(`[SLACK] Upload Failed: ${title}`, err.message);
    }
}

async function run() {
    const reportPath = process.argv[2] || path.join(__dirname, '../../web/test-results/results.json');
    
    if (!fs.existsSync(reportPath)) {
        console.log(`No test report found at ${reportPath}. Skipping.`);
        return;
    }

    if (!SLACK_TOKEN) {
        console.warn("Missing SLACK_BOT_TOKEN. Skipping.");
        return;
    }

    try {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        const failures = [];

        // Recursive Playwright Suite Walker
        const checkSuite = (s) => {
            if (s.specs) {
                s.specs.forEach(spec => {
                    spec.tests.forEach(test => {
                        if (test.status === 'unexpected' || test.status === 'failed') {
                            const result = test.results[0]; // Get the failed result
                            failures.push({
                                title: spec.title,
                                file: s.file,
                                error: result?.error?.message || 'Unknown Error',
                                attachments: result?.attachments || []
                            });
                        }
                    });
                });
            }
            if (s.suites) s.suites.forEach(checkSuite);
        };

        if (report.suites) {
            report.suites.forEach(checkSuite);
        } else if (report.testResults) {
            // Jest Logic (No screenshots usually, but keeping text)
            report.testResults.forEach(suite => {
                if (suite.status === 'failed' || suite.numFailingTests > 0) {
                     suite.testResults.forEach(test => {
                         if (test.status === 'failed') {
                             failures.push({
                                 title: test.fullName,
                                 file: suite.testFilePath,
                                 error: test.failureMessages.join('\n'),
                                 attachments: []
                             });
                         }
                     });
                }
            });
        }

        if (failures.length > 0) {
            console.log(`Found ${failures.length} failures. Notifying Slack...`);
            const version = getSystemVersion();
            
            // 1. Send Main Alert
            const mainRes = await axios.post('https://slack.com/api/chat.postMessage', {
                channel: FAILURE_CHANNEL_ID,
                text: `🚨 *E2E Test Failures Detected* (v${version})`,
                blocks: [
                    { type: "header", text: { type: "plain_text", text: "🚨 E2E Test Failures Detected" } },
                    { type: "section", text: { type: "mrkdwn", text: `*Version:* v${version}\n*Run ID:* ${Date.now()}\n*Total Failures:* ${failures.length}` } }
                ]
            }, { headers: { Authorization: `Bearer ${SLACK_TOKEN}` } });

            const threadTs = mainRes.data.ts;

            // 2. Process Failures
            for (const f of failures.slice(0, 5)) { // Limit to 5
                // Send Failure Details in Thread
                await axios.post('https://slack.com/api/chat.postMessage', {
                    channel: FAILURE_CHANNEL_ID,
                    thread_ts: threadTs,
                    text: `*${f.title}*\n\
\
\
${f.error.substring(0, 500)}\
\
\
\
`
                }, { headers: { Authorization: `Bearer ${SLACK_TOKEN}` } });

                // Upload Attachments
                for (const att of f.attachments) {
                    // Path resolution: Report paths are often relative to project root or test dir
                    // We assume they are relative to web/ based on playwright config
                    // Actually, playwright output paths in JSON are often from the root of the project or relative to config.
                    
                    // We need to find the file.
                    // Try resolving relative to the report file location
                    let safePath = att.path;
                    if (!fs.existsSync(safePath)) {
                        // Try resolving from project root/web
                        safePath = path.resolve(__dirname, '../../web', att.path);
                    }

                    if (fs.existsSync(safePath)) {
                        if (att.name === 'error-context' && att.contentType === 'text/markdown') {
                            const content = fs.readFileSync(safePath, 'utf8');
                            await axios.post('https://slack.com/api/chat.postMessage', {
                                channel: FAILURE_CHANNEL_ID,
                                thread_ts: threadTs,
                                text: `*Error Context:*
${content}`
                            }, { headers: { Authorization: `Bearer ${SLACK_TOKEN}` } });
                        } else {
                            // Upload file
                            await uploadFile(safePath, `Attachment: ${att.name}`, FAILURE_CHANNEL_ID, threadTs);
                            
                            // Generate and send link
                            if (safePath.includes('/test-results/')) {
                                const relativePath = safePath.split('/test-results/')[1];
                                const fileUrl = `${BASE_URL}/test-results/${relativePath}`;
                                await axios.post('https://slack.com/api/chat.postMessage', {
                                    channel: FAILURE_CHANNEL_ID,
                                    thread_ts: threadTs,
                                    text: `🔗 *View Attachment:* ${fileUrl}`
                                }, { headers: { Authorization: `Bearer ${SLACK_TOKEN}` } });
                            }
                        }
                    }
                }
            }
            console.log("Slack notification sequence complete.");
        }

    } catch (err) {
        console.error("Script Error:", err.message);
    }
}

run();