const kanban = require('./kanban_api');

const POLL_INTERVAL = 30000; // 30 seconds
const TARGET_CONCURRENCY = 2;
const PROJECT_ID = process.env.PROJECT_ID || 'd691614b-4566-41d1-8ba9-c6636354a120';

/**
 * Ensures exactly TARGET_CONCURRENCY tasks are in 'inprogress'.
 */
async function maintainConcurrency() {
    console.log(`[${new Date().toISOString()}] 🔍 Checking Kanban concurrency...`);
    
    try {
        const response = await kanban.listTasks(PROJECT_ID);
        const tasks = response.data || [];

        const inProgressTasks = tasks.filter(t => t.status === 'inprogress');
        const todoTasks = tasks.filter(t => t.status === 'todo');

        console.log(`📊 Current State: ${inProgressTasks.length} In Progress, ${todoTasks.length} Todo`);

        if (inProgressTasks.length < TARGET_CONCURRENCY) {
            const needed = TARGET_CONCURRENCY - inProgressTasks.length;
            const toPromote = todoTasks.slice(0, needed);

            if (toPromote.length > 0) {
                console.log(`🚀 Promoting ${toPromote.length} tasks to 'inprogress'...`);
                for (const task of toPromote) {
                    console.log(`  - [${task.id.slice(0, 8)}] ${task.title}`);
                    await kanban.updateTask(task.id, { status: 'inprogress' });
                }
            } else {
                console.log("⚠️ No tasks in 'todo' to promote.");
            }
        } else if (inProgressTasks.length > TARGET_CONCURRENCY) {
            console.log(`⚠️ Alert: More than ${TARGET_CONCURRENCY} tasks are 'inprogress' (${inProgressTasks.length}).`);
            // We don't automatically demote to avoid interrupting active work, but we alert.
        } else {
            console.log("✅ Target concurrency maintained.");
        }

    } catch (err) {
        console.error(`❌ Monitor Error: ${err.message}`);
    }

    setTimeout(maintainConcurrency, POLL_INTERVAL);
}

console.log("🛠️ Vibe-Kanban Concurrency Monitor Started");
console.log(`🎯 Target: ${TARGET_CONCURRENCY} 'inprogress' tasks`);
console.log(`⏱️ Polling every ${POLL_INTERVAL / 1000}s`);

maintainConcurrency();