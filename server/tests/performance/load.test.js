const request = require('supertest');
const { app } = require('../server');
const { performance } = require('perf_hooks');

describe('Performance & Speed Tests', () => {
    jest.setTimeout(120000); // 2 minutes

    let sysAdminToken = '';
    let householdId = null;
    let adminToken = '';
    const uniqueId = Date.now();

    beforeAll(async () => {
        // Setup
        const loginRes = await request(app)
            .post('/auth/login')
            .send({ email: 'super@totem.local', password: 'superpassword' });
        sysAdminToken = loginRes.body.token;

        const hhRes = await request(app)
            .post('/admin/households')
            .set('Authorization', `Bearer ${sysAdminToken}`)
            .send({
                name: `PerfTest_${uniqueId}`,
                adminEmail: `perf_${uniqueId}@example.com`,
                adminPassword: 'password123',
                adminUsername: 'PerfAdmin'
            });
        householdId = hhRes.body.householdId;

        const adminLogin = await request(app)
            .post('/auth/login')
            .send({ email: `perf_${uniqueId}@example.com`, password: 'password123' });
        adminToken = adminLogin.body.token;

        // Seed some data for reading
        await request(app)
            .post(`/households/${householdId}/assets`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Speed Test Asset', purchase_value: 100 });
    });

    afterAll(async () => {
        if (householdId) {
            await request(app).delete(`/admin/households/${householdId}`).set('Authorization', `Bearer ${sysAdminToken}`);
        }
    });

    const measureSpeed = async (label, fn, iterations = 50) => {
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            await fn();
        }
        const end = performance.now();
        const avg = (end - start) / iterations;
        console.log(`[SPEED] ${label}: ${avg.toFixed(2)}ms (avg over ${iterations} runs)`);
        return avg;
    };

    it('should measure login speed', async () => {
        const avg = await measureSpeed('Login', () => 
            request(app)
                .post('/auth/login')
                .send({ email: `perf_${uniqueId}@example.com`, password: 'password123' }),
            10 // Login is slow due to bcrypt
        );
        expect(avg).toBeLessThan(1000); 
    });

    it('should measure GET assets speed (Database read)', async () => {
        const avg = await measureSpeed('GET Assets', () => 
            request(app)
                .get(`/households/${householdId}/assets`)
                .set('Authorization', `Bearer ${adminToken}`),
            30
        );
        expect(avg).toBeLessThan(150); 
    });

    it('should measure POST asset speed (Database write)', async () => {
        const avg = await measureSpeed('POST Asset', () => 
            request(app)
                .post(`/households/${householdId}/assets`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Perf Asset', purchase_value: 10 }),
            10
        );
        expect(avg).toBeLessThan(250);
    });

    it('should handle "Load" (Concurrent requests)', async () => {
        const concurrency = 10;
        const totalRequests = 100;
        const batches = totalRequests / concurrency;

        const start = performance.now();
        for (let i = 0; i < batches; i++) {
            const promises = [];
            for (let j = 0; j < concurrency; j++) {
                promises.push(
                    request(app)
                        .get(`/households/${householdId}/assets`)
                        .set('Authorization', `Bearer ${adminToken}`)
                );
            }
            await Promise.all(promises);
        }
        const end = performance.now();
        const totalTime = end - start;
        const rps = (totalRequests / (totalTime / 1000)).toFixed(2);
        console.log(`[LOAD] Concurrency ${concurrency}: ${rps} req/sec (${totalRequests} total requests)`);
        
        expect(Number(rps)).toBeGreaterThan(10); 
    });

    it('should handle complex calendar retrieval speed', async () => {
        // Seed 20 dates
        for(let i=0; i<20; i++) {
            await request(app)
                .post(`/households/${householdId}/dates`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: `Event ${i}`, date: '2025-01-01' });
        }

        const avg = await measureSpeed('GET Calendar', () => 
            request(app)
                .get(`/households/${householdId}/dates`)
                .set('Authorization', `Bearer ${adminToken}`),
            10
        );
        expect(avg).toBeLessThan(300);
    });
});