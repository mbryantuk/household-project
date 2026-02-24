// global-setup.js for Jest Testcontainers (Item 138)
const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const { execSync } = require('child_process');

module.exports = async () => {
  // If we're running inside the CI pipeline which already provisions a postgres service,
  // skip starting a Testcontainer to avoid nested docker issues.
  if (process.env.GITHUB_ACTIONS) {
    console.log('Skipping Testcontainers in CI (using GitHub service container)');
    return;
  }

  // If a DB is explicitly provided, we assume it's pre-configured
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('127.0.0.1')) {
    console.log('Using explicitly provided local Database URL');
    return;
  }

  console.log('Starting PostgreSQL Testcontainer...');
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('hearthstone_test')
    .withUsername('hearth_user')
    .withPassword('hearth_password')
    .start();

  const uri = container.getConnectionUri();

  process.env.DATABASE_URL = uri;
  global.__PG_CONTAINER__ = container;

  // Run Drizzle Migrations against the ephemeral container
  console.log(`Pushing schema to test DB: ${uri}`);
  execSync('npx drizzle-kit push', {
    env: { ...process.env, DATABASE_URL: uri },
    stdio: 'inherit',
  });
};
