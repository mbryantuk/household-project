const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('test.db');
db.serialize(() => {
  db.run("CREATE TABLE test (id int)");
});
console.log('done');
