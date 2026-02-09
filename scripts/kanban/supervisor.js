const { spawn, execSync } = require('child_process');
const kanban = require('./kanban_api');
const args = process.argv.slice(2);
const taskId = args[args.indexOf('--taskId') + 1];

// Model Tiers
const TIER_1 = 'gemini-3-pro-preview';
const TIER_2 = 'gemini-3-flash-preview';
const TIER_3 = 'gemini-2.0-flash';

async function run(cmd, model) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Executing with model: ${model}`);
    const child = spawn(`${cmd} --model ${model} --approval-mode yolo`, { 
      shell: true, 
      env: { ...process.env, GEMINI_MODEL: model, GEMINI_SKIP_MCP: 'vibe_kanban' } 
    });
    
    let q = false;
    const checkQuota = (data) => {
      const s = data.toString().toLowerCase();
      if (s.includes('exhausted') || s.includes('quota') || s.includes('429')) {
        q = true;
        console.warn(`[${taskId.slice(0,4)}] ⚠️ Quota detected. Force killing.`);
        child.kill('SIGKILL');
      }
    };

    child.stdout.on('data', d => { process.stdout.write(`[${taskId.slice(0,4)}] ${d}`); checkQuota(d); });
    child.stderr.on('data', d => { process.stderr.write(`[${taskId.slice(0,4)}-E] ${d}`); checkQuota(d); });
    
    child.on('close', c => {
      if (q) reject('QUOTA');
      else if (c === 0) resolve();
      else reject('FAIL');
    });
  });
}

async function supervise(id, cmd, att = 1, mod = TIER_1) {
  if (att > 10) return kanban.updateTask(id, { status: 'cancelled' });
  try {
    if (!cmd) {
      const t = await kanban.getTask(id);
      cmd = `gemini -p "Task: ${t.title}. Desc: ${t.description}. No Kanban tools."`;
    }
    await run(cmd, mod);
    await kanban.updateTask(id, { status: 'done' });
  } catch (e) {
    if (e === 'QUOTA') {
      if (mod === TIER_1) return supervise(id, cmd, att, TIER_2);
      if (mod === TIER_2) return supervise(id, cmd, att, TIER_3);
      
      console.warn("🛑 ALL TIERS EXHAUSTED. Entering 30-minute Deep Sleep...");
      await new Promise(r => setTimeout(r, 1800000)); // 30 minutes
      return supervise(id, cmd, att + 1, TIER_1);
    }
    console.log("⏳ Generic failure. Waiting 60s...");
    await new Promise(r => setTimeout(r, 60000));
    return supervise(id, cmd, att + 1, mod);
  }
}

if (!taskId) { process.exit(1); }
supervise(taskId, null).catch(console.error);
