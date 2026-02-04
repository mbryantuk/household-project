import { expect } from '@playwright/test';

export async function createTestUserAndHousehold(request, prefix = 'test') {
    const RUN_ID = Date.now();
    const email = `${prefix}.${RUN_ID}@test.com`;
    const password = 'Password123!';
    const householdName = `${prefix.charAt(0).toUpperCase() + prefix.slice(1)} House ${RUN_ID}`;

    // 1. Register
    const regRes = await request.post('/api/auth/register', {
        data: {
            householdName,
            email,
            password,
            firstName: 'Test',
            lastName: 'User',
            is_test: 1
        }
    });
    expect(regRes.ok()).toBeTruthy();

    // 2. Login to get token
    const loginRes = await request.post('/api/auth/login', {
        data: { email, password }
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();

    return {
        email,
        password,
        householdName,
        token: loginData.token,
        householdId: loginData.user.default_household_id,
        user: loginData.user
    };
}
