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
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.ok) resolve(parsed);
        else reject(new Error(parsed.error));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function postOrUpdate(testType, blocks, fallbackText) {
  const state = loadState();
  const channelId = process.env.SLACK_CHANNEL_ID;
  const existingTs = state[testType];

  const payload = {
    channel: channelId,
    blocks: blocks,
    text: fallbackText,
  };

  try {
    if (existingTs) {
      console.log(`[SLACK] Updating ${testType} message...`);
      try {
        await slackRequest('chat.update', { ...payload, ts: existingTs });
        return;
      } catch (e) {
        console.warn(`[SLACK] Update failed (${e.message}), posting new message.`);
      }
    }

    console.log(`[SLACK] Posting new ${testType} message...`);
    const result = await slackRequest('chat.postMessage', payload);
    state[testType] = result.ts;
    saveState(state);
  } catch (err) {
    console.error(`[SLACK] Critical Error: ${err.message}`);
    process.exit(1);
  }
}

async function run() {
  const apiCoveragePath = path.join(__dirname, '../../server/api-coverage.json');
  const pkgPath = path.join(__dirname, '../../package.json');
  const swaggerPath = path.join(__dirname, '../../server/swagger.json');

  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_CHANNEL_ID) {
    console.error('❌ Missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID in env.');
    process.exit(1);
  }

  if (!fs.existsSync(apiCoveragePath)) return;

  const cov = JSON.parse(fs.readFileSync(apiCoveragePath, 'utf8'));
  const version = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
  const swaggerRaw = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));
  const swaggerPaths = Object.keys(swaggerRaw.paths).flatMap((p) =>
    Object.keys(swaggerRaw.paths[p]).map((m) => `${m.toUpperCase()} ${p}`)
  );

  // 1. SEEDING DASHBOARD
  if (cov.results['BRADY SEED'] || cov.results['BRADY DATA']) {
    const steps = cov.steps || [];
    const blocks = [
      { type: 'section', text: { type: 'mrkdwn', text: '`[SEEDING-DASHBOARD]`' } },
      { type: 'header', text: { type: 'plain_text', text: `🏡 Brady Household (v${version})` } },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Status:* 🟢 LIVE\n*Last Activity:* <!date^${Math.floor(Date.now() / 1000)}^{date_num} {time_secs}|Just now>\n\n*Current State:*\n${steps.map((s) => `• ${s}`).join('\n')}`,
        },
      },
    ];
    await postOrUpdate('SEEDING', blocks, `Brady Household v${version} Seeded`);
  }

  // 2. CORE-API DASHBOARD
  const modules = {
    Utilities: '/water',
    People: '/members',
    Assets: '/assets',
    Finance: '/finance',
    Meals: '/meals',
  };
  let coverageText = '';
  Object.keys(modules).forEach((m) => {
    const passed = Object.keys(cov.results)
      .filter((ep) => ep.includes(modules[m]))
      .every((ep) => cov.results[ep] === 'PASS');
    coverageText += `${passed ? '✅' : '❌'} *${m} Node*\n`;
  });
  const apiBlocks = [
    { type: 'section', text: { type: 'mrkdwn', text: '`[CORE-API-DASHBOARD]`' } },
    { type: 'header', text: { type: 'plain_text', text: `🛡️ API Health Monitor (v${version})` } },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Health Check:* <!date^${Math.floor(Date.now() / 1000)}^{date_num} {time_secs}|Just now>\n\n${coverageText}`,
      },
    },
  ];
  await postOrUpdate('CORE-API', apiBlocks, `API Health v${version}`);

  // 3. INTEGRITY & PERFORMANCE (Combined for a clean dash)
  const integrityItems = ['Friday Rule', 'Backup', 'Path Traversal', 'Idempotency'];
  let integrityText = '';
  Object.keys(cov.results).forEach((key) => {
    if (integrityItems.some((i) => key.includes(i))) {
      integrityText += `${cov.results[key] === 'PASS' ? '✅' : '❌'} *${key}*\n`;
    }
  });
  const stressResult = Object.keys(cov.results).find(
    (k) => k.toLowerCase().includes('concurrency') || k.toLowerCase().includes('stress')
  );
  if (integrityText || stressResult) {
    const intBlocks = [
      { type: 'section', text: { type: 'mrkdwn', text: '`[SYSTEM-INTEGRITY-DASHBOARD]`' } },
      { type: 'header', text: { type: 'plain_text', text: `💎 Security & Stress (v${version})` } },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Last Verification:* <!date^${Math.floor(Date.now() / 1000)}^{date_num} {time_secs}|Just now>\n\n${integrityText}${stressResult ? (cov.results[stressResult] === 'PASS' ? '✅ *Concurrency Stable*' : '❌ *Concurrency Unstable*') : ''}`,
        },
      },
    ];
    await postOrUpdate('INTEGRITY', intBlocks, `System Integrity v${version}`);
  }

  console.log('🏁 Dashboard Update Complete.');
}

run();
