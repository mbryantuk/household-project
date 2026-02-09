const { spawn, execSync } = require('child_process');
const kanban = require('./kanban_api');
const path = require('path');

const POLL_INTERVAL = 60000; // 1 minute
const TARGET_CONCURRENCY = 2;
const PROJECT_ID = 'd691614b-4566-41d1-8ba9-c6636354a120';

function isTaskRunning(taskId) {
    try {
        const stdout = execSync(`ps aux | grep "supervisor.js --taskId ${taskId}" | grep -v grep`).toString();
        return stdout.length > 0;
    } catch (e) {
        return false;
    }
}

async function monitor() {
    console.log(`[${new Date().toISOString()}] 🔍 Watchdog scanning...`);
    
    try {
        const response = await kanban.listTasks(PROJECT_ID);
        const tasks = response.data || [];

        const inProgressTasks = tasks.filter(t => t.status === 'inprogress');
        const todoTasks = tasks.filter(t => t.status === 'todo');
        const actuallyRunning = inProgressTasks.filter(t => isTaskRunning(t.id));
        
        console.log(`📊 Board: ${inProgressTasks.length} | Running: ${actuallyRunning.length} | Todo: ${todoTasks.length}`);

        // 1. Start marked tasks that are not running locally
        for (const task of inProgressTasks) {
            if (!isTaskRunning(task.id)) {
                console.log(`🎬 Resuming Agent: [${task.id.slice(0,8)}] ${task.title}`);
                const supervisorPath = path.resolve(__dirname, 'supervisor.js');
                const child = spawn('node', [supervisorPath, '--taskId', task.id], {
                    detached: true,
                    stdio: 'inherit',
                    env: { ...process.env, KANBAN_URL: 'http://10.10.2.0:8089' }
                });
                child.unref();
            }
        }

        // 2. Promote from Todo if we have slots AND we aren't already over the running limit
        const slotsAvailable = TARGET_CONCURRENCY - actuallyRunning.length;
        if (slotsAvailable > 0 && todoTasks.length > 0) {
            // Check board count too to prevent over-marking
            if (inProgressTasks.length < TARGET_CONCURRENCY) {
                const toPromote = todoTasks.slice(0, 1); // Promote one at a time for safety
                for (const task of toPromote) {
                    console.log(`🚀 Promoting: [${task.id.slice(0,8)}] ${task.title}`);
                    await kanban.updateTask(task.id, { status: 'inprogress' });
                    // Supervisor will be started by the next tick or immediately
                }
            }
        }

    } catch (err) {
        console.error(`❌ Watchdog Error: ${err.message}`);
    }

    setTimeout(monitor, POLL_INTERVAL);
}

console.log("🛠️ Kanban Watchdog V4.2 (Resilient) Started");
monitor();
