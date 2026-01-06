const request = require('supertest');
const { app, globalDb } = require('../server');

describe('Bulk Permission & Role Verification', () => {
    let householdId = null;
    let tokens = {
        sysadmin: '',
        householdAdmin: '',
        householdMember: '',
        outsider: ''
    };

    /**
     * SETUP: Create a household and users with different roles
     */
    beforeAll(async () => {
        // 1. Create a Household using a temporary sysadmin
        const setupRes = await request(app).post('/auth/register').send({
            username: 'setup_admin',
            password: 'password',
            secretCode: 'MakeMeGod'
        });
        
        const loginRes = await request(app).post('/auth/login').send({
            username: 'setup_admin', password: 'password'
        });
        
        const hhRes = await request(app)
            .post('/households')
            .set('Authorization', `Bearer ${loginRes.body.token}`)
            .send({ name: 'Security Test Lab' });
        
        householdId = hhRes.body.householdId;

        // 2. Register and Login users for each test category
        const rolesToTest = [
            { key: 'sysadmin', code: 'MakeMeGod', hhRole: null },
            { key: 'householdAdmin', code: '', hhRole: 'admin' },
            { key: 'householdMember', code: '', hhRole: 'member' },
            { key: 'outsider', code: '', hhRole: null }
        ];

        for (const role of rolesToTest) {
            const username = `user_${role.key}_${Date.now()}`;
            await request(app).post('/auth/register').send({
                username, password: 'password', secretCode: role.code
            });

            const login = await request(app).post('/auth/login').send({
                username, password: 'password'
            });

            tokens[role.key] = login.body.token;

            // Link to household if applicable
            if (role.hhRole) {
                await globalDb.run(
                    `INSERT INTO user_households (user_id, household_id, role) 
                     SELECT id, ?, ? FROM users WHERE username = ?`,
                    [householdId, role.hhRole, username]
                );
            }
        }
    });

    /**
     * BULK TEST CASES
     * We define a matrix of (Actor, Action, Expected Status)
     */
    const permissionMatrix = [
        // Action: Adding a member to a household
        { actor: 'sysadmin', method: 'post', path: () => `/households/${householdId}/members`, expect: 200 },
        { actor: 'householdAdmin', method: 'post', path: () => `/households/${householdId}/members`, expect: 200 },
        { actor: 'householdMember', method: 'post', path: () => `/households/${householdId}/members`, expect: 403 },
        { actor: 'outsider', method: 'post', path: () => `/households/${householdId}/members`, expect: 403 },

        // Action: Updating household theme
        { actor: 'householdAdmin', method: 'put', path: () => `/households/${householdId}`, expect: 200 },
        { actor: 'householdMember', method: 'put', path: () => `/households/${householdId}`, expect: 403 },

        // Action: Accessing household user list
        { actor: 'householdMember', method: 'get', path: () => `/households/${householdId}/users`, expect: 200 },
        { actor: 'outsider', method: 'get', path: () => `/households/${householdId}/users`, expect: 403 }
    ];

    test.each(permissionMatrix)(
        'Should return $expect when $actor performs $method on $path',
        async ({ actor, method, path, expect: expectedStatus }) => {
            const res = await request(app)[method](path())
                .set('Authorization', `Bearer ${tokens[actor]}`)
                .send({ name: 'Bulk Test Member', theme: 'dark', role: 'member' });

            expect(res.statusCode).toBe(expectedStatus);
        }
    );

    afterAll((done) => {
        globalDb.run("DELETE FROM users WHERE username LIKE 'user_%'", () => {
            globalDb.run("DELETE FROM households WHERE name = 'Security Test Lab'", () => {
                done();
            });
        });
    });
});