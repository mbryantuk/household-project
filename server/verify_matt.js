const axios = require('axios');

const BASE_URL = 'http://localhost:4001';

async function runVerification() {
    console.log("--- STARTING VERIFICATION: USER 'MATT' ---");

    try {
        // 1. Setup SysAdmin (The Creator)
        console.log("\n1. Setting up SysAdmin...");
        let adminToken;
        try {
            // Try login first
            const res = await axios.post(`${BASE_URL}/auth/login`, { username: 'SysMaster', password: 'password' });
            adminToken = res.data.token;
        } catch {
            // Register if not exists
            const res = await axios.post(`${BASE_URL}/auth/register`, { 
                username: 'SysMaster', password: 'password', email: 'sys@admin.com', secretCode: 'MakeMeGod' 
            });
            const login = await axios.post(`${BASE_URL}/auth/login`, { username: 'SysMaster', password: 'password' });
            adminToken = login.data.token;
        }
        console.log("✅ SysAdmin Ready");

        // 2. Setup User "Matt"
        console.log("\n2. Setting up User 'Matt'...");
        let mattToken;
        let mattId;
        try {
            const res = await axios.post(`${BASE_URL}/auth/register`, { 
                username: 'Matt', password: 'password', email: 'matt@test.com' 
            });
            mattId = res.data.id;
        } catch (e) {
             // If already exists, we need his ID. 
             // Since we can't query ID easily without admin list, let's login.
        }
        
        const mattLogin = await axios.post(`${BASE_URL}/auth/login`, { username: 'Matt', password: 'password' });
        mattToken = mattLogin.data.token;
        // Decode token to get ID (simple base64 decode of payload)
        const payload = JSON.parse(Buffer.from(mattToken.split('.')[1], 'base64').toString());
        mattId = payload.id;
        console.log(`✅ User 'Matt' Ready (ID: ${mattId})`);

        // 3. Create 3 Households (by SysAdmin)
        console.log("\n3. Creating 3 Households...");
        const houses = [];
        for (let i = 1; i <= 3; i++) {
            const res = await axios.post(`${BASE_URL}/households`, 
                { name: `Matt's House ${i}`, theme: 'default' },
                { headers: { Authorization: `Bearer ${adminToken}` } }
            );
            houses.push(res.data.householdId);
        }
        console.log("✅ Households Created:", houses);

        // 4. Assign Different Permissions
        console.log("\n4. Assigning Permissions to Matt...");
        const roles = ['admin', 'member', 'viewer'];
        for (let i = 0; i < 3; i++) {
            await axios.post(`${BASE_URL}/households/${houses[i]}/users`, 
                { username: 'Matt', role: roles[i] },
                { headers: { Authorization: `Bearer ${adminToken}` } }
            );
            console.log(`   - House ${houses[i]}: Assigned 'Matt' as '${roles[i]}'`);
        }
        console.log("✅ Permissions Assigned");

        // 5. Verify Access as Matt
        console.log("\n5. Verifying Access (Logged in as Matt)...");
        const myHousesRes = await axios.get(`${BASE_URL}/my-households`, { 
            headers: { Authorization: `Bearer ${mattToken}` } 
        });
        const myHouses = myHousesRes.data;
        
        console.table(myHouses);

        if (myHouses.length < 3) throw new Error("Matt should see at least 3 households");
        
        // Check roles
        const check1 = myHouses.find(h => h.id === houses[0] && h.role === 'admin');
        const check2 = myHouses.find(h => h.id === houses[1] && h.role === 'member');
        const check3 = myHouses.find(h => h.id === houses[2] && h.role === 'viewer');

        if (check1 && check2 && check3) {
            console.log("✅ SUCCESS: Matt has correct unique access to all 3 households.");
        } else {
            throw new Error("❌ FAIL: Role mismatch found.");
        }

        // 6. Rename Matt -> Matthew
        console.log("\n6. Renaming 'Matt' to 'Matthew'...");
        await axios.put(`${BASE_URL}/auth/profile`, 
            { username: 'Matthew' },
            { headers: { Authorization: `Bearer ${mattToken}` } }
        );
        console.log("✅ Rename API Call Successful");

        // 7. Verify Login as Matthew
        console.log("\n7. Verifying Login as 'Matthew'...");
        const matthewLogin = await axios.post(`${BASE_URL}/auth/login`, { username: 'Matthew', password: 'password' });
        if (matthewLogin.data.token) {
            console.log("✅ SUCCESS: Logged in as 'Matthew'.");
        } else {
            throw new Error("❌ FAIL: Could not login as Matthew");
        }

    } catch (err) {
        console.error("❌ ERROR:", err.response ? err.response.data : err.message);
        process.exit(1);
    }
}

runVerification();
