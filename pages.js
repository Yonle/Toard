const ejs = require("ejs");
const fs = require("fs");
const pagesfolder = __dirname + "/__pages";

fs.mkdirSync(pagesfolder, { recursive: true });

async function generate(db, id) {
  const t = db.prepare(`SELECT * FROM '${id}';`).get()
  const tab = db.prepare(`SELECT * FROM '${id}';`);

  fs.mkdirSync(pagesfolder + "/" + id, { recursive: true });
  return fs.writeFileSync(pagesfolder + "/" + id + "/index.html",
    await ejs.renderFile(__dirname + "/views/index.ejs",
      { pst: tab.iterate(), id, srch: false, t }
    ),
    "utf8"
  );
}

function checkAndGenerate(db, id) {
  fs.stat(pagesfolder + "/" + id + "/index.html", (err) => {
    if (err?.code === "ENOENT") generate(db, id);
  });
}

async function generateDiscover(db, host) {
  let bds = [];
  for (ct of db.prepare("SELECT id FROM __threadlists;").iterate()) {
    try {
      // Warning: Any mistake in this zone will resulting total destruction.
      let t = db.prepare(`SELECT ts, t, d FROM "${ct.id}";`).all();
      t[0].id = ct.id;
      t[0].length = t.length;
      bds.push(t);
      checkAndGenerate(db, ct.id);
    } catch (err) {
      console.error(err);
      console.error(`--- /${ct.id}/ is corrupted. Deleting.`);
      db.prepare("DELETE FROM __threadlists WHERE id = ?;").run(ct.id);
      try {
        db.exec(`DROP TABLE '${ct.id}';`);
      } catch {
        // That's it.
      }
    }
  };

  return fs.writeFileSync(pagesfolder + "/discover.html",
    await ejs.renderFile(__dirname + "/views/discover.ejs",
      { bds, host: host },
    ),
    "utf8"
  );
}

module.exports.checkAndGenerate = checkAndGenerate;

module.exports.generate = (db, id, host) => {
  generate(db, id);
  generateDiscover(db, host);
};

module.exports.generateDiscover = generateDiscover;
