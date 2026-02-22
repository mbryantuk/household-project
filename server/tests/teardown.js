const cleanupTestData = require('../scripts/cleanup_test_data');

module.exports = async () => {
  console.log('\n🛑 Jest Global Teardown: Cleaning up test data...');
  await cleanupTestData();
};
