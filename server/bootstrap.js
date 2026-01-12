function bootstrap(db) {
    return new Promise((resolve, reject) => {
        // No longer creating default superuser
        resolve();
    });
}

module.exports = { bootstrap };