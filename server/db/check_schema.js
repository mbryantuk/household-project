const { pool } = require('./index');

async function checkSchema() {
  const res = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users'
  `);
  console.log('Columns in "users" table:');
  res.rows.forEach((row) => {
    console.log(`- ${row.column_name} (${row.data_type})`);
  });
  process.exit(0);
}

checkSchema();
