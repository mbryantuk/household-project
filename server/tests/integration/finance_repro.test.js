const request = require('supertest');
const { app } = require('../../server');

describe('Bug Repro: HH18 Budget Loading', () => {
    jest.setTimeout(30000);

    const uniqueId = Date.now();
    let token = '';
    let householdId = null;
    let bankId = null;
    let incomeId = null;

    beforeAll(async () => {
        // 1. Create Household
        const reg = await request(app).post('/auth/register').send({
            householdName: `HH18_Repro_${uniqueId}`,
            email: `hh18_${uniqueId}@test.com`,
            password: 'password',
            firstName: 'HH18Admin'
        });
        
        const login = await request(app).post('/auth/login').send({ email: `hh18_${uniqueId}@test.com`, password: 'password' });
        token = login.body.token;
        householdId = login.body.household?.id || login.body.tokenPayload?.householdId;
        
        if (!householdId) {
            const profile = await request(app).get('/auth/profile').set('Authorization', `Bearer ${token}`);
            householdId = profile.body.default_household_id;
        }
        console.log(`Created Test Household: ${householdId}`);
    });

    afterAll(async () => {
        if (householdId) await request(app).delete(`/households/${householdId}`).set('Authorization', `Bearer ${token}`);
    });

    it('should create a bank account', async () => {
        const res = await request(app)
            .post(`/households/${householdId}/finance/current-accounts`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                bank_name: 'Monzo',
                account_name: 'Main',
                account_number: '12345678',
                sort_code: '00-00-00'
            });
        expect(res.statusCode).toBe(201);
        bankId = res.body.id;
        expect(bankId).toBeTruthy();
    });

    it('should create an income source linked to the bank account', async () => {
        const res = await request(app)
            .post(`/households/${householdId}/finance/income`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                employer: 'Acme Corp',
                amount: 2500,
                frequency: 'monthly',
                payment_day: 25,
                bank_account_id: bankId,
                is_primary: 1
            });
        
        if (res.statusCode !== 201) {
            console.error("Create Income Error:", res.body);
        }
        expect(res.statusCode).toBe(201);
        incomeId = res.body.id;
    });

    it('should retrieve the income list and verify fields', async () => {
        const res = await request(app)
            .get(`/households/${householdId}/finance/income`)
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);

        const income = res.body.find(i => i.id === incomeId);
        expect(income).toBeDefined();
        expect(income.employer).toBe('Acme Corp');
        expect(income.payment_day).toBe(25);
        expect(income.is_primary).toBe(1);
        
        // Check types
        expect(typeof income.payment_day).toBe('number');
    });

    it('should retrieve savings pots without error (Repro 500)', async () => {
        // First create a savings account
        const saveRes = await request(app)
            .post(`/households/${householdId}/finance/savings`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                institution: 'Test Bank',
                account_name: 'Rainy Day',
                current_balance: 100
            });
        expect(saveRes.statusCode).toBe(201);
        const savingsId = saveRes.body.id;

        // Create a pot
        await request(app)
            .post(`/households/${householdId}/finance/savings/${savingsId}/pots`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Holiday',
                target_amount: 1000,
                current_amount: 100
            });

        const res = await request(app)
            .get(`/households/${householdId}/finance/savings/pots`)
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('should handle payment_day as string "25" and convert or store correctly', async () => {
         const res = await request(app)
            .post(`/households/${householdId}/finance/income`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                employer: 'String Pay Day',
                amount: 1000,
                frequency: 'monthly',
                payment_day: "20", // String
                is_primary: 0
            });
        expect(res.statusCode).toBe(201);
        
        const list = await request(app)
            .get(`/households/${householdId}/finance/income`)
            .set('Authorization', `Bearer ${token}`);
            
        const item = list.body.find(i => i.employer === 'String Pay Day');
        // SQLite might return it as number if column is integer, or string if affinity matches
        // The check in BudgetView is: parseInt(payment_day)
        expect(parseInt(item.payment_day)).toBe(20);
    });
});