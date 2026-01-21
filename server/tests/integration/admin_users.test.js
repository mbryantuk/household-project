const request = require('supertest');
const { app } = require('../../server');

describe('Feature: Admin User Management', () => {
    jest.setTimeout(30000);

    const uniqueId = Date.now();
    let token = '';
    let householdId = null;
    let createdUserId = null;

    beforeAll(async () => {
        const reg = await request(app).post('/auth/register').send({
            householdName: `AdminTest_${uniqueId}`,
            email: `admin_${uniqueId}@test.com`,
            password: 'password',
            firstName: 'SuperAdmin'
        });
        
        const login = await request(app).post('/auth/login').send({ email: `admin_${uniqueId}@test.com`, password: 'password' });
        token = login.body.token;
        householdId = login.body.household?.id;
    });

    afterAll(async () => {
        if (householdId) await request(app).delete(`/households/${householdId}`).set('Authorization', `Bearer ${token}`);
    });

    describe('User Management', () => {
        it('should create a new member', async () => {
            const res = await request(app)
                .post('/admin/create-user')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    username: 'NewMember',
                    email: `member_${uniqueId}@test.com`,
                    password: 'password123',
                    role: 'member',
                    householdId: householdId
                });
            expect(res.statusCode).toBe(200);
            createdUserId = res.body.id;
        });

        it('should list users', async () => {
            const res = await request(app)
                .get('/admin/users')
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.find(u => u.id === createdUserId)).toBeDefined();
        });

        it('should update user', async () => {
            const res = await request(app)
                .put(`/admin/users/${createdUserId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ first_name: 'UpdatedName' });
            expect(res.statusCode).toBe(200);
        });

        it('should remove user from household', async () => {
            const res = await request(app)
                .delete(`/admin/users/${createdUserId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(200);
        });
    });
});
