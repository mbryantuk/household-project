const axios = require('axios');

const KANBAN_URL = process.env.KANBAN_URL || 'http://10.10.2.0:8089';
const PROJECT_ID = 'd691614b-4566-41d1-8ba9-c6636354a120';

const client = axios.create({
    baseURL: KANBAN_URL,
    timeout: 10000
});

/**
 * Normalizes Vibe-Board responses.
 */
async function listTasks(projectId = PROJECT_ID) {
    const res = await client.get(`/api/tasks?project_id=${projectId}`);
    return res.data;
}

async function getTask(taskId) {
    const res = await client.get(`/api/tasks/${taskId}`);
    return res.data.data;
}

async function updateTask(taskId, updates) {
    const res = await client.put(`/api/tasks/${taskId}`, updates);
    return res.data.data;
}

async function createTask(title, description, status = 'todo') {
    const res = await client.post(`/api/tasks`, {
        project_id: PROJECT_ID,
        title, 
        description, 
        status
    });
    return res.data.data;
}

async function duplicateTask(taskId) {
    const task = await getTask(taskId);
    return await createTask(
        `[RETRY] ${task.title}`,
        `Retried from ${taskId}\n\nOriginal Description:\n${task.description}`,
        'todo'
    );
}

module.exports = {
    listTasks,
    getTask,
    updateTask,
    createTask,
    duplicateTask
};
