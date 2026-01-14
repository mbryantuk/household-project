const request = require('supertest');
const { app } = require('../../server');

describe('Feature: Household Management', () => {
    jest.setTimeout(30000);

    const uniqueId = Date.now();
    let token = '';
    let householdId = null;

    beforeAll(async () => {
        const reg = await request(app).post('/auth/register').send({
            householdName: `HouseTest_${uniqueId}`,
            email: `house_${uniqueId}@test.com`,
            password: 'password',
            firstName: 'HouseAdmin'
        });
        
        const login = await request(app).post('/auth/login').send({ email: `house_${uniqueId}@test.com`, password: 'password' });
        token = login.body.token;
        householdId = login.body.household?.id || login.body.tokenPayload?.householdId;
        
        if (!householdId) {
            const profile = await request(app).get('/auth/profile').set('Authorization', `Bearer ${token}`);
            householdId = profile.body.default_household_id;
        }
    });

    // Note: We test deletion at the end, which covers the "Delete Household" feature.

    describe('Details & Settings', () => {
        it('should update household details', async () => {
            // 1. Update Global Household Identity (Name)
            const resIdent = await request(app)
                .put(`/households/${householdId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Updated Manor'
                });
            expect(resIdent.statusCode).toBe(200);

            // 2. Update Property Specific Details
            const resDetails = await request(app)
                .put(`/households/${householdId}/details`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    property_type: 'Detached',
                    construction_year: 1990
                });
            expect(resDetails.statusCode).toBe(200);
            
            const checkIdent = await request(app).get(`/households/${householdId}`).set('Authorization', `Bearer ${token}`);
            expect(checkIdent.body.name).toBe('Updated Manor');

            const checkDetails = await request(app).get(`/households/${householdId}/details`).set('Authorization', `Bearer ${token}`);
            expect(checkDetails.body.property_type).toBe('Detached');
        });
    });

    describe('Waste Management', () => {
        let wasteId;
        it('should create a waste collection schedule', async () => {
            const res = await request(app)
                .post(`/households/${householdId}/waste`)
                .set('Authorization', `Bearer ${token}`)
                .send({ waste_type: 'General', frequency: 'Weekly', collection_day: 'Tuesday' });
            expect(res.statusCode).toBe(200);
            wasteId = res.body.id;
        });

        it('should update the waste schedule', async () => {
            const res = await request(app)
                .put(`/households/${householdId}/waste/${wasteId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ collection_day: 'Wednesday' });
            expect(res.statusCode).toBe(200);
        });

        it('should delete the waste schedule', async () => {
            const res = await request(app)
                .delete(`/households/${householdId}/waste/${wasteId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(200);
        });
    });

    describe('Household Deletion', () => {
        it('should delete the entire household', async () => {
            const res = await request(app)
                .delete(`/households/${householdId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(200);
        });

        it('should fail to access deleted household', async () => {
            const res = await request(app)
                .get(`/households/${householdId}/details`)
                .set('Authorization', `Bearer ${token}`);
            // Expect 403 (Forbidden/Not Found context) or 401
            expect([401, 403, 404]).toContain(res.statusCode);
        });
    });
});
