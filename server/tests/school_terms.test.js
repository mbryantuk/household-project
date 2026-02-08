const request = require('supertest');
const { app } = require('../server');

describe('🏫 School Terms API', () => {
    let householdId;
    let token;
    let childId;
    let testEmail = `school_test_${Date.now()}@test.com`;

    beforeAll(async () => {
        // Register and login
        await request(app).post('/api/auth/register').send({
            householdName: 'School Test House',
            email: testEmail,
            password: 'Password123!'
        });
        const loginRes = await request(app).post('/api/auth/login').send({
            email: testEmail,
            password: 'Password123!'
        });
        token = loginRes.body.token;
        householdId = loginRes.body.household?.id;
        
        // Select household
        await request(app).post(`/api/households/${householdId}/select`).set('Authorization', `Bearer ${token}`);

        // Create a child member
        const memberRes = await request(app)
            .post(`/api/households/${householdId}/members`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                first_name: 'Child',
                last_name: 'Test',
                type: 'child',
                emoji: '👶'
            });
        childId = memberRes.body.id;
    });

    test('POST /api/households/:id/school-terms should create a new term', async () => {
        const res = await request(app)
            .post(`/api/households/${householdId}/school-terms`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                member_id: childId,
                term_name: 'Autumn Term 2026',
                start_date: '2026-09-01',
                end_date: '2026-12-18'
            });
        
        expect(res.status).toBe(200);
        expect(res.body.term_name).toBe('Autumn Term 2026');
        expect(res.body.id).toBeDefined();
    });

    test('GET /api/households/:id/school-terms should return terms', async () => {
        const res = await request(app)
            .get(`/api/households/${householdId}/school-terms`)
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].term_name).toBe('Autumn Term 2026');
    });

    test('GET /api/households/:id/school-terms?member_id=:memberId should filter by member', async () => {
        const res = await request(app)
            .get(`/api/households/${householdId}/school-terms?member_id=${childId}`)
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
        expect(res.body.every(t => t.member_id === childId)).toBe(true);
    });

    test('PUT /api/households/:id/school-terms/:termId should update a term', async () => {
        const listRes = await request(app)
            .get(`/api/households/${householdId}/school-terms`)
            .set('Authorization', `Bearer ${token}`);
        const termId = listRes.body[0].id;

        const res = await request(app)
            .put(`/api/households/${householdId}/school-terms/${termId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                term_name: 'Updated Term',
                start_date: '2026-09-02',
                end_date: '2026-12-19'
            });
        
        expect(res.status).toBe(200);
        expect(res.body.term_name).toBe('Updated Term');
    });

    test('GET /api/households/:id/dates should include school terms', async () => {
        const res = await request(app)
            .get(`/api/households/${householdId}/dates`)
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
        const schoolTerm = res.body.find(d => d.type === 'school_term');
        expect(schoolTerm).toBeDefined();
        expect(schoolTerm.title).toContain('Updated Term');
    });

    test('DELETE /api/households/:id/school-terms/:termId should remove a term', async () => {
        const listRes = await request(app)
            .get(`/api/households/${householdId}/school-terms`)
            .set('Authorization', `Bearer ${token}`);
        const termId = listRes.body[0].id;

        const res = await request(app)
            .delete(`/api/households/${householdId}/school-terms/${termId}`)
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);

        const checkRes = await request(app)
            .get(`/api/households/${householdId}/school-terms`)
            .set('Authorization', `Bearer ${token}`);
        expect(checkRes.body.find(t => t.id === termId)).toBeUndefined();
    });
});
