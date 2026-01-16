const request = require('supertest');
const { app } = require('../../server');

describe('Feature: Expanded Financial Management', () => {
    jest.setTimeout(30000);

    const uniqueId = Date.now();
    let token = '';
    let viewerToken = '';
    let householdId = null;

    beforeAll(async () => {
        // Admin/Member User
        const reg = await request(app).post('/auth/register').send({
            householdName: `FinanceExp_${uniqueId}`,
            email: `finance_exp_${uniqueId}@test.com`,
            password: 'password',
            firstName: 'MoneyAdmin'
        });
        
        const login = await request(app).post('/auth/login').send({ email: `finance_exp_${uniqueId}@test.com`, password: 'password' });
        token = login.body.token;
        householdId = login.body.household?.id || login.body.tokenPayload?.householdId;
        
        if (!householdId) {
            const profile = await request(app).get('/auth/profile').set('Authorization', `Bearer ${token}`);
            householdId = profile.body.default_household_id;
        }

        // Viewer User
        const vReg = await request(app).post('/households/' + householdId + '/users/invite').set('Authorization', `Bearer ${token}`).send({
            email: `viewer_${uniqueId}@test.com`,
            role: 'viewer'
        });
        
        // Login as viewer (simulated or real depending on flow, but simpler to just register another if invite flow is complex in tests. 
        // Actually, invite returns a password now in recent changes? Or we just register a separate user and add them.
        // For simplicity, let's just register a NEW separate user and hack them into the household as viewer directly via DB if needed, 
        // OR better, just use the main user and degrade their role for a test case? 
        // No, let's stick to the main user for CRUD first. RBAC is heavily tested in `security/` suites.)
    });

    afterAll(async () => {
        if (householdId) await request(app).delete(`/households/${householdId}`).set('Authorization', `Bearer ${token}`);
    });

    describe('Income', () => {
        let itemId;
        it('should create income source', async () => {
            const res = await request(app).post(`/households/${householdId}/finance/income`)
                .set('Authorization', `Bearer ${token}`)
                .send({ source: 'Salary', amount: 2500, frequency: 'monthly' });
            expect(res.statusCode).toBe(200);
            itemId = res.body.id;
        });
        it('should list income', async () => {
            const res = await request(app).get(`/households/${householdId}/finance/income`).set('Authorization', `Bearer ${token}`);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0].source).toBe('Salary');
        });
        it('should update income', async () => {
            await request(app).put(`/households/${householdId}/finance/income/${itemId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ amount: 3000 });
        });
        it('should delete income', async () => {
            await request(app).delete(`/households/${householdId}/finance/income/${itemId}`).set('Authorization', `Bearer ${token}`);
        });
    });

    describe('Savings & Pots', () => {
        let savingsId;
        let potId;

        it('should create savings account', async () => {
            const res = await request(app).post(`/households/${householdId}/finance/savings`)
                .set('Authorization', `Bearer ${token}`)
                .send({ institution: 'Chase', account_name: 'Rainy Day', current_balance: 1000 });
            expect(res.statusCode).toBe(200);
            savingsId = res.body.id;
        });

        it('should create a savings pot', async () => {
            const res = await request(app).post(`/households/${householdId}/finance/savings/${savingsId}/pots`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Holiday', target_amount: 500 });
            expect(res.statusCode).toBe(200);
            potId = res.body.id;
        });

        it('should list pots', async () => {
            const res = await request(app).get(`/households/${householdId}/finance/savings/${savingsId}/pots`).set('Authorization', `Bearer ${token}`);
            expect(res.body.length).toBe(1);
            expect(res.body[0].name).toBe('Holiday');
        });

        it('should delete pot', async () => {
            await request(app).delete(`/households/${householdId}/finance/savings/${savingsId}/pots/${potId}`).set('Authorization', `Bearer ${token}`);
        });

        it('should delete parent savings account', async () => {
             await request(app).delete(`/households/${householdId}/finance/savings/${savingsId}`).set('Authorization', `Bearer ${token}`);
        });
    });

    describe('Credit Cards', () => {
        let cardId;
        it('should create credit card', async () => {
            const res = await request(app).post(`/households/${householdId}/finance/credit-cards`)
                .set('Authorization', `Bearer ${token}`)
                .send({ provider: 'Amex', card_name: 'Gold', credit_limit: 5000 });
            expect(res.statusCode).toBe(200);
            cardId = res.body.id;
        });
        it('should delete credit card', async () => {
            await request(app).delete(`/households/${householdId}/finance/credit-cards/${cardId}`).set('Authorization', `Bearer ${token}`);
        });
    });

    describe('Loans', () => {
        let loanId;
        it('should create loan', async () => {
            const res = await request(app).post(`/households/${householdId}/finance/loans`)
                .set('Authorization', `Bearer ${token}`)
                .send({ lender: 'Bank', total_amount: 10000 });
            expect(res.statusCode).toBe(200);
            loanId = res.body.id;
        });
        it('should delete loan', async () => {
            await request(app).delete(`/households/${householdId}/finance/loans/${loanId}`).set('Authorization', `Bearer ${token}`);
        });
    });

     describe('Mortgages', () => {
        let mortId;
        it('should create mortgage', async () => {
            const res = await request(app).post(`/households/${householdId}/finance/mortgages`)
                .set('Authorization', `Bearer ${token}`)
                .send({ lender: 'Halifax', total_amount: 300000 });
            expect(res.statusCode).toBe(200);
            mortId = res.body.id;
        });
        it('should delete mortgage', async () => {
            await request(app).delete(`/households/${householdId}/finance/mortgages/${mortId}`).set('Authorization', `Bearer ${token}`);
        });
    });

    describe('Pensions', () => {
        let pensionId;
        it('should create pension', async () => {
            const res = await request(app).post(`/households/${householdId}/finance/pensions`)
                .set('Authorization', `Bearer ${token}`)
                .send({ provider: 'Aviva', current_value: 50000 });
            expect(res.statusCode).toBe(200);
            pensionId = res.body.id;
        });

        it('should add pension history', async () => {
             const res = await request(app).post(`/households/${householdId}/finance/pensions/${pensionId}/history`)
                .set('Authorization', `Bearer ${token}`)
                .send({ value: 51000 });
            expect(res.statusCode).toBe(200);
        });

        it('should delete pension', async () => {
            await request(app).delete(`/households/${householdId}/finance/pensions/${pensionId}`).set('Authorization', `Bearer ${token}`);
        });
    });

});
