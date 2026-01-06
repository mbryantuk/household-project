// seed_data.js
const API_URL = 'http://localhost:4002';

// Helper for making requests
async function post(endpoint, body, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
}

async function main() {
    console.log("🌱 Starting Bat-Family Data Seed...");

    try {
        // 1. Create SuperAdmin
        console.log("1. Registering SuperAdmin...");
        try {
            await post('/register', {
                username: "SuperAdmin",
                password: "superpassword123",
                email: "admin@hq.com",
                secretCode: "MakeMeGod"
            });
        } catch (e) {
            console.log("   (SuperAdmin might already exist, proceeding...)");
        }

        // 2. Login as SuperAdmin
        console.log("2. Logging in as SuperAdmin...");
        const loginData = await post('/login', {
            username: "SuperAdmin",
            password: "superpassword123"
        });
        const token = loginData.token;
        console.log("   Success! Token acquired.");

        // 3. Create Household: Wayne Manor
        console.log("3. Creating 'Wayne Manor'...");
        const hhData = await post('/households', { name: "Wayne Manor" }, token);
        const hhId = hhData.householdId;
        console.log(`   Household created with ID: ${hhId}`);

        // 4. Create The Bat-Family
        const batFamily = [
            // ADMINS (Can manage users)
            { user: "BruceWayne", pass: "batsuit", role: "admin", email: "bruce@wayne.com" },
            { user: "BarbaraGordon", pass: "oracle", role: "admin", email: "babs@oracle.net" }, // Oracle runs the network
            
            // MEMBERS (Can edit data/chores, but not users)
            { user: "DickGrayson", pass: "nightwing", role: "member", email: "dick@bludhaven.com" },
            { user: "JasonTodd", pass: "redhood", role: "member", email: "jason@outlaws.com" },
            { user: "TimDrake", pass: "detective", role: "member", email: "tim@teentitans.com" },
            { user: "DamianWayne", pass: "tt", role: "member", email: "damian@league.com" },
            { user: "CassandraCain", pass: "orphan", role: "member", email: "cass@gotham.com" },
            { user: "StephanieBrown", pass: "spoiler", role: "member", email: "steph@gotham.com" },

            // VIEWERS (Read-only access)
            { user: "Alfred", pass: "butler", role: "viewer", email: "alfred@wayne.com" },
            { user: "SelinaKyle", pass: "cats", role: "viewer", email: "cat@woman.com" } // Guest access
        ];

        for (const u of batFamily) {
            console.log(`4. Creating User: ${u.user.padEnd(15)} \t[${u.role}]...`);
            await post('/admin/create-user', {
                username: u.user,
                password: u.pass,
                email: u.email,
                householdId: hhId,
                role: u.role
            }, token);
        }

        console.log("\n✅ Bat-Family Assembled!");
        console.log("   Login as BruceWayne / batsuit at http://localhost:4002");

    } catch (err) {
        console.error("\n❌ Error:", err.message);
    }
}

main();