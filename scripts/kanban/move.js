const kanban = require('./kanban_api');

const args = process.argv.slice(2);
const taskId = args[0];
const newStatus = args[1];

if (!taskId || !newStatus) {
    console.error("Usage: node move.js <taskId> <status>");
    console.error("Statuses: todo, inprogress, inreview, done, cancelled");
    process.exit(1);
}

async function run() {
    try {
        const task = await kanban.updateTask(taskId, { status: newStatus });
        console.log(`✅ Task [${task.title}] moved to ${newStatus}`);
    } catch (err) {
        console.error("Failed to move task:", err.message);
    }
}

run();
