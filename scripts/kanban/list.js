const kanban = require('./kanban_api');

async function run() {
    try {
        const response = await kanban.listTasks();
        const tasks = response.data || [];

        console.log(`
📋 Kanban Board Status
`);
        
        const statuses = ['todo', 'inprogress', 'inreview', 'done', 'cancelled'];
        
        statuses.forEach(status => {
            const filtered = tasks.filter(t => t.status === status);
            if (filtered.length > 0) {
                console.log(`--- ${status.toUpperCase()} (${filtered.length}) ---`);
                filtered.forEach(t => {
                    console.log(`[${t.id.slice(0, 8)}] ${t.title}`);
                });
                console.log('');
            }
        });
    } catch (err) {
        console.error("Failed to list tasks:", err.message);
    }
}

run();
