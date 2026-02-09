module.exports = {
    SECRET_KEY: process.env.JWT_SECRET || 'super_secret_pi_key', 
    PORT: 4001,
    RP_ID: process.env.RP_ID || 'localhost',
    RP_NAME: 'Mantel Household Systems'
};