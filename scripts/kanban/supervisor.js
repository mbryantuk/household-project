/**
 * Kanban Supervisor Script
 * Handles execution of AI tasks with automatic retries, model fallbacks, and 400 error mitigation.
 * 
 * Usage: node scripts/kanban/supervisor.js --taskId <ID> [--cmd "<command>"]
 */

const { exec } = require('child_process');
const kanban = require('./kanban_api');
const path = require('path');

const args = process.argv.slice(2);
const taskId = args[args.indexOf('--taskId') + 1];
let baseCommand = args.includes('--cmd') ? args[args.indexOf('--cmd') + 1] : null;

if (!taskId) {
    console.error("Usage: node supervisor.js --taskId <ID> [--cmd \"<command>\"]");
    process.exit(1);
}

async function runCommand(cmd) {
    return new Promise((resolve, reject) => {
        const proc = exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr });
            } else {
                resolve({ stdout, stderr });
            }
        });
        
        proc.stdout.on('data', data => process.stdout.write(data));
        proc.stderr.on('data', data => process.stderr.write(data));
    });
}

async function supervise(currentTaskId, cmd, attempt = 1, currentModel = 'gemini-3-pro-preview') {
    if (attempt > 5) {
        console.error("💀 Max retries reached. Moving to cancelled.");
        await kanban.updateTask(currentTaskId, { status: 'cancelled' });
        return;
    }

    console.log(`\n--- [Attempt ${attempt}] Task: ${currentTaskId} | Model: ${currentModel} ---`);
    
    try {
        // Fetch task details if no command was provided
        if (!cmd) {
            console.log(`🔍 Fetching task details for ${currentTaskId}...`);
            const task = await kanban.getTask(currentTaskId);
            if (!task) throw new Error("Task not found");
            
            // Construct the gemini prompt command
            // We use -p for non-interactive mode so the script can finish
            const prompt = `Task: ${task.title}\n\nDescription: ${task.description}`;
            cmd = `gemini -p \"${prompt.replace(/"/g, '\\"')}\" --approval-mode yolo`;
            console.log(`📝 Generated Command: ${cmd}`);
        }

        // Move task to inprogress
        await kanban.updateTask(currentTaskId, { status: 'inprogress' });
        
        const fullCmd = `${cmd} --model ${currentModel}`;
        await runCommand(fullCmd);
        
        console.log("\n✅ Task Completed Successfully.");
        await kanban.updateTask(currentTaskId, { status: 'done' });
        
    } catch (fail) {
        const stderr = fail.stderr || '';
        const errorMsg = fail.error ? fail.error.message : (fail.message || 'Unknown error');
        console.error(`\n❌ Attempt ${attempt} failed: ${errorMsg}`);

        // 1. Token Exhaustion Fallback
        if ((stderr.includes('exhausted') || stderr.includes('quota') || stderr.includes('429')) && currentModel !== 'gemini-3-flash-preview') {
            console.warn("⚠️  Token/Quota limit reached. Falling back to Gemini 3 Flash Preview...");
            return supervise(currentTaskId, cmd, attempt, 'gemini-3-flash-preview');
        }

        // 2. 400 Invalid Argument (Context Corruption/Size)
        if (stderr.includes('400') || stderr.includes('invalid argument')) {
            console.error("🧨 Invalid Argument error detected. Duplicating task to clear context...");
            await kanban.updateTask(currentTaskId, { status: 'cancelled' });
            const newTask = await kanban.duplicateTask(currentTaskId);
            console.log(`🆕 Restarting with fresh Task ID: ${newTask.id}`);
            return supervise(newTask.id, cmd, 1, 'gemini-3-pro-preview');
        }

        // 3. Generic Retry
        console.log(`⏳ Retrying in 15 seconds... (${attempt}/5)`);
        await new Promise(r => setTimeout(r, 15000));
        return supervise(currentTaskId, cmd, attempt + 1, currentModel);
    }
}

supervise(taskId, baseCommand).catch(err => {
    console.error("Supervisor Crashed:", err);
    process.exit(1);
});