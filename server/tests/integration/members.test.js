const request = require('supertest');
const { app } = require('../../server');

describe('Feature: Members & Residents', () => {
    jest.setTimeout(30000);

    const uniqueId = Date.now();
    let token = '';
    let householdId = null;

    beforeAll(async () => {
        const reg = await request(app).post('/auth/register').send({
            householdName: `MembersTest_${uniqueId}`,
            email: `members_${uniqueId}@test.com`,
            password: 'password',
            firstName: 'Head'
        });
        
        const login = await request(app).post('/auth/login').send({ email: `members_${uniqueId}@test.com`, password: 'password' });
        token = login.body.token;
        householdId = login.body.household?.id || login.body.tokenPayload?.householdId;
        
        if (!householdId) {
            const profile = await request(app).get('/auth/profile').set('Authorization', `Bearer ${token}`);
            householdId = profile.body.default_household_id;
        }
    });

    afterAll(async () => {
        if (householdId) await request(app).delete(`/households/${householdId}`).set('Authorization', `Bearer ${token}`);
    });

    // --- USERS (Login Access) ---
    describe('User Management', () => {
        let newUserId;
        it('should invite/create a new Member user', async () => {
            const res = await request(app)
                .post(`/households/${householdId}/users`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    email: `newmember_${uniqueId}@test.com`,
                    role: 'member',
                    firstName: 'New',
                    password: 'password'
                });
            expect(res.statusCode).toBe(200);
            newUserId = res.body.userId;
        });

        it('should update the user', async () => {
            const res = await request(app)
                .put(`/households/${householdId}/users/${newUserId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ firstName: 'Updated' });
            expect(res.statusCode).toBe(200);
        });
    });

    // --- RESIDENTS (Data only) ---
    describe('Residents (Members List)', () => {
        let memberId;

        it('should create a resident (non-login) with split names', async () => {
            const res = await request(app)
                .post(`/households/${householdId}/members`)
                .set('Authorization', `Bearer ${token}`)
                .send({ 
                    first_name: 'Kiddo', 
                    last_name: 'Test', 
                    type: 'child', 
                    dob: '2015-01-01', 
                    emoji: '👶' 
                });
            expect(res.statusCode).toBe(200);
            expect(res.body.name).toBe('Kiddo Test'); // Verify name construction
            memberId = res.body.id;
        });

        it('should verify auto-created birthday event', async () => {
             const res = await request(app)
                .get(`/households/${householdId}/dates`)
                .set('Authorization', `Bearer ${token}`);
            
            const bday = res.body.find(d => d.member_id === memberId && d.type === 'birthday');
            expect(bday).toBeDefined();
            expect(bday.title).toContain('Kiddo Test');
        });

        it('should delete the resident', async () => {
            await request(app).delete(`/households/${householdId}/members/${memberId}`).set('Authorization', `Bearer ${token}`);
        });
    });
});
