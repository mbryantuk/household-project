const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const VIBE_PORT_FILE = '/tmp/vibe-kanban/vibe-kanban.port';

router.post('/report', async (req, res) => {
    try {
        const errorData = req.body;
        
        // Log locally
        if (process.env.NODE_ENV !== 'test') {
            console.error("🚨 Frontend Error Reported:", errorData.message);
        }

        // 1. Find Vibe Kanban Port
        let port = 8089;
        if (fs.existsSync(VIBE_PORT_FILE)) {
            try {
                const portContent = fs.readFileSync(VIBE_PORT_FILE, 'utf8').trim();
                if (portContent) port = parseInt(portContent);
            } catch (e) {
                // Fallback handled by default port value
            }
        }

        const vibeUrl = `http://localhost:${port}/api`;

        // 2. Find Project ID for 'household-project'
        let projectId = 'd691614b-4566-41d1-8ba9-c6636354a120'; // Default fallback
        try {
            const projectsRes = await axios.get(`${vibeUrl}/projects`);
            if (projectsRes.data && projectsRes.data.success) {
                const project = projectsRes.data.data.find(p => p.name === 'household-project');
                if (project) projectId = project.id;
            }
        } catch (e) {
            // Fallback handled by default projectId value
        }

        // 3. Create Todo
        const taskTitle = `[FRONTEND ERROR] ${errorData.message.substring(0, 100)}`;
        const taskDescription = `
**Error Details:**
- **Message:** ${errorData.message}
- **User:** ${errorData.user || 'Anonymous'}
- **Household ID:** ${errorData.household_id || 'N/A'}
- **URL:** ${errorData.url}
- **Timestamp:** ${errorData.timestamp}

**Stack Trace:**
\`\`\`
${errorData.stack || 'No stack trace available'}
\`\`\`
`.trim();

        await axios.post(`${vibeUrl}/tasks`, {
            project_id: projectId,
            title: taskTitle,
            description: taskDescription,
            status: 'todo'
        });

        res.json({ success: true });
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
            console.error("Failed to report error to Vibe Kanban:", err.message);
        }
        res.status(500).json({ error: "Failed to report error to Kanban system" });
    }
});

module.exports = router;