module.exports = async () => {
  if (global.__PG_CONTAINER__) {
    console.log('Stopping PostgreSQL Testcontainer...');
    await global.__PG_CONTAINER__.stop();
  }
};
