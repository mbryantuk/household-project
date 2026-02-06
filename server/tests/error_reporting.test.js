const request = require('supertest');
const axios = require('axios');
const app = require('../App');

jest.mock('axios');

describe('🚨 Error Reporting to Vibe Kanban', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should receive a frontend error and post it to Vibe Kanban', async () => {
        // Mock Projects response
        axios.get.mockResolvedValueOnce({
            data: {
                success: true,
                data: [{ id: 'test-project-id', name: 'household-project' }]
            }
        });

        // Mock Task creation response
        axios.post.mockResolvedValueOnce({
            data: { success: true, data: { id: 'new-task-id' } }
        });

        const errorPayload = {
            message: 'Test React Error',
            stack: `Error: Test React Error
    at App.jsx:123`,
            url: 'http://localhost:3000/dashboard',
            timestamp: new Date().toISOString(),
            user: 'test@example.com',
            household_id: 1
        };

        const response = await request(app)
            .post('/api/errors/report')
            .send(errorPayload);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify axios calls
        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/projects'));
        expect(axios.post).toHaveBeenCalledWith(
            expect.stringContaining('/tasks'),
            expect.objectContaining({
                project_id: 'test-project-id',
                title: expect.stringContaining('Test React Error'),
                description: expect.stringContaining('test@example.com'),
                status: 'todo'
            })
        );
    });

    it('should gracefully handle Vibe Kanban API failures', async () => {
        axios.get.mockRejectedValueOnce(new Error('Network Error'));
        axios.post.mockRejectedValueOnce(new Error('API Down'));

        const errorPayload = { message: 'Failed Error' };

        const response = await request(app)
            .post('/api/errors/report')
            .send(errorPayload);

        expect(response.status).toBe(500);
        expect(response.body.error).toBeDefined();
    });
});