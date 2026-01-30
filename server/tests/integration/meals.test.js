const request = require('supertest');
const { app } = require('../../server');
const pkg = require('../../../package.json');

describe('Meal Planner API', () => {
    let agent;
    let adminToken;
    let householdId;
    let memberId;

    // We can use a unique household for isolation if we wanted, 
    // but here we will just register a new one to ensure clean state.
    const uniqueId = Date.now();
    const adminEmail = `mealadmin_${uniqueId}@test.com`;
    const adminPassword = 'password123';
    const householdName = `Meal Planner Test (v${pkg.version})`;

    beforeAll(async () => {
        agent = request(app);

        // 1. Register a new household
        const regRes = await agent.post('/auth/register').send({
            householdName: householdName,
            email: adminEmail,
            password: adminPassword,
            firstName: 'Chef',
            lastName: 'Admin'
        });
        
        // 2. Login
        const loginRes = await agent.post('/auth/login').send({
            email: adminEmail,
            password: adminPassword
        });
        adminToken = loginRes.body.token;
        householdId = loginRes.body.household.id;

        // 3. Create a secondary member for testing assignment
        const memRes = await agent.post(`/households/${householdId}/members`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'MealTester', type: 'adult', emoji: '🧑‍🍳' });
        memberId = memRes.body.id;
    });

    test('should create, list, and delete a MEAL', async () => {
        // 1. Create
        const createRes = await agent.post(`/households/${householdId}/meals`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Spaghetti', description: 'With red sauce', emoji: '🍝' });
        
        expect(createRes.status).toBe(200);
        expect(createRes.body.name).toBe('Spaghetti');
        const mealId = createRes.body.id;

        // 2. List
        const listRes = await agent.get(`/households/${householdId}/meals`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(listRes.status).toBe(200);
        expect(listRes.body.find(m => m.id === mealId)).toBeTruthy();

        // 3. Delete
        const delRes = await agent.delete(`/households/${householdId}/meals/${mealId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(delRes.status).toBe(200);
    });

    test('should assign a meal and verify copy logic', async () => {
        // Create a meal first
        const mealRes = await agent.post(`/households/${householdId}/meals`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Pizza', emoji: '🍕' });
        const mealId = mealRes.body.id;

        // Dates
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        
        // Next week date
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        // 1. Assign Meal for TODAY
        const assignRes = await agent.post(`/households/${householdId}/meal-plans`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ 
                date: dateStr, 
                member_id: memberId, 
                meal_id: mealId 
            });
        expect(assignRes.status).toBe(200);

        // 2. Verify Assignment
        const planRes = await agent.get(`/households/${householdId}/meal-plans?start=${dateStr}&end=${dateStr}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(planRes.body.length).toBeGreaterThan(0);
        expect(planRes.body[0].meal_name).toBe('Pizza');

        // 3. COPY to Next Week
        // This endpoint logic depends on how it's implemented. 
        // Assuming it takes { targetDate } and calculates source as target-7 days.
        const copyRes = await agent.post(`/households/${householdId}/meal-plans/copy-previous`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ targetDate: nextWeekStr }); 
        
        expect(copyRes.status).toBe(200);
        expect(copyRes.body.copiedCount).toBeGreaterThan(0);

        // 4. Verify Next Week
        const nextPlanRes = await agent.get(`/households/${householdId}/meal-plans?start=${nextWeekStr}&end=${nextWeekStr}`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(nextPlanRes.body.length).toBeGreaterThan(0);
        expect(nextPlanRes.body[0].date).toBe(nextWeekStr);
        expect(nextPlanRes.body[0].meal_name).toBe('Pizza');
    });
});
