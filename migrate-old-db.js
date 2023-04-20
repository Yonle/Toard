const sql = require("better-sqlite3");
const db = new sql("database.db");
const olddb = require("./db.json");

for (id in olddb) {
  console.log(id);
  db.exec(`CREATE TABLE IF NOT EXISTS "${id}" (ts INTEGER, t TEXT, d TEXT);`);
  const ins = db.prepare(`INSERT INTO "${id}" VALUES (@ts, @t, @d)`);
  olddb[id].forEach(p => ins.run(p));
}

db.close();
