const request = require('supertest');
const { app } = require('../../App');
const { globalDb, dbRun, dbGet } = require('../../db');

describe('Security & Isolation: Module Configuration', () => {
    let household1Id, household2Id;

    beforeAll(async () => {
        // Create two households
        const h1 = await dbRun(globalDb, "INSERT INTO households (name, enabled_modules) VALUES (?, ?)", ['Household 1', JSON.stringify(['pets'])]);
        household1Id = h1.id;

        const h2 = await dbRun(globalDb, "INSERT INTO households (name, enabled_modules) VALUES (?, ?)", ['Household 2', JSON.stringify(['vehicles'])]);
        household2Id = h2.id;
    });

    it('should NOT allow changes in one household to affect another', async () => {
        const initialH2 = await dbGet(globalDb, "SELECT enabled_modules FROM households WHERE id = ?", [household2Id]);
        
        // Update H1
        await dbRun(globalDb, "UPDATE households SET enabled_modules = ? WHERE id = ?", [JSON.stringify(['meals']), household1Id]);
        
        const finalH2 = await dbGet(globalDb, "SELECT enabled_modules FROM households WHERE id = ?", [household2Id]);
        
        expect(finalH2.enabled_modules).toBe(initialH2.enabled_modules);
        expect(JSON.parse(finalH2.enabled_modules)).toContain('vehicles');
        expect(JSON.parse(finalH2.enabled_modules)).not.toContain('meals');
    });
});
