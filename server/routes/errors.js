const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const VIBE_PORT_FILE = '/tmp/vibe-kanban/vibe-kanban.port';

router.post('/report', async (req, res) => {
    try {
        const errorData = req.body;
        
        console.log("📥 Received Frontend Error Report:", errorData.message);

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

        // Determine Vibe URL (handling Docker context)
        // host.docker.internal is mapped to host-gateway in docker-compose.yml
        const vibeHost = process.env.NODE_ENV === 'production' ? 'host.docker.internal' : 'localhost';
        const vibeUrl = `http://${vibeHost}:${port}/api`;

        // 2. Find Project ID for 'household-project'
        let projectId = 'd691614b-4566-41d1-8ba9-c6636354a120'; // Default fallback
        try {
            const projectsRes = await axios.get(`${vibeUrl}/projects`);
            if (projectsRes.data && projectsRes.data.success) {
                const project = projectsRes.data.data.find(p => p.name === 'household-project');
                if (project) projectId = project.id;
            }
        } catch (e) {
            console.warn("⚠️ Failed to fetch projects from Vibe Kanban, using fallback ID:", e.message);
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
${errorData.api_path ? `- **API Path:** ${errorData.api_path}` : ''}
${errorData.api_method ? `- **API Method:** ${errorData.api_method}` : ''}

**Stack Trace:**
\`\`\`
${errorData.stack || 'No stack trace available'}
\`\`\`
`.trim();

        console.log("📤 Creating Vibe Kanban task:", taskTitle);

        const response = await axios.post(`${vibeUrl}/tasks`, {
            project_id: projectId,
            title: taskTitle,
            description: taskDescription,
            status: 'todo'
        });

        if (response.data && response.data.success) {
            console.log("✅ Successfully created task in Vibe Kanban");
        } else {
            console.warn("❓ Vibe Kanban returned success:false", response.data);
        }

        res.json({ success: true });
    } catch (err) {
        console.error("❌ Failed to report error to Vibe Kanban:", err.message);
        if (err.response) {
            console.error("   Response status:", err.response.status);
            console.error("   Response data:", JSON.stringify(err.response.data));
        }
        res.status(500).json({ error: "Failed to report error to Kanban system" });
    }
});

module.exports = router;