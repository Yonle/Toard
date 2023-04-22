const sql = require("better-sqlite3");
const eps = require("express");
const com = require("compression");
const fig = require("figlet");
const bp = require("body-parser");
const c = require("./captcha");
const f = require("fs");
const a = eps();

// For temporary time, We're gonna use this for main topic.
// A upcoming commit will comes with channel support.

let getCookie = (c, n) => c && c.split("; ").filter(i => i.startsWith(n)).pop()?.slice(n.length+1);

let db = new sql("database.db");
let sys = new sql("config.db");

// If 2 iterates executed, better-sqlite3 prevents you to do other stuffs while this happens.
// Though, we only do reading.

// So, Enable unsafe mode. No guaratee whenever it will protect you from corruption.
// I REPEAT, THERE IS NO GUARANTEE THAT YOUR DATABASE IS SAFE FROM CORRUPTION.
// ===== REMEMBER TO DO A DAILY BACKUP =====

db.unsafeMode(true);
sys.unsafeMode(true);

db.pragma("journal_mode = WAL");
db.pragma('cache_size = 32000');

db.exec("CREATE TABLE IF NOT EXISTS __threadlists (id TEXT, UNIQUE(id));");

const __tl_sqlite_schema = db.prepare("SELECT name FROM sqlite_schema;");
const ita = _ => db.prepare("SELECT id FROM __threadlists WHERE id = ?;").get(_); // Is thread available?

db.transaction(_ => {
  try {
    for (i of __tl_sqlite_schema.iterate()) {
      if (!i.name || i.name.startsWith("_") || i.name.startsWith("sqlite_")) return;
      db.prepare("INSERT OR IGNORE INTO __threadlists VALUES (?);").run(i.name);
    };
  } catch (err) {
    console.log(err);
    if (!db.inTransaction) throw err;
  }
})();

sys.exec("CREATE TABLE IF NOT EXISTS ip_block (ip TEXT);");
sys.exec("CREATE TABLE IF NOT EXISTS ip_white (ip TEXT);");
sys.exec("CREATE TABLE IF NOT EXISTS config (name TEXT, value TEXT);");

let ts = db.prepare("SELECT id FROM __threadlists;").all().length;
let newPostsFromIP = {};

let lth = _ => db.prepare("SELECT id FROM __threadlists;").all().map(({ id }) => {
  try {
    // Warning: Any mistake in this zone will resulting total destruction.
    let t = db.prepare(`SELECT ts, t, d FROM "${id}";`).all();
    t[0].id = id;
    t[0].length = t.length;
    return t[0];
  } catch (err) {
    console.error(err);
    console.error(`--- /${id}/ is corrupted. Deleting.`);
    db.prepare("DELETE FROM __threadlists WHERE id = ?;").run(id);
    db.exec(`DROP TABLE '${id}';`);
    return null;
  }
}).filter(i => i);

a.use(com());
a.use((q, s, n) => {
  const bl = sys.prepare("SELECT * FROM ip_block WHERE ip = ?;");
  const wl = sys.prepare("SELECT * FROM ip_white WHERE ip = ?;");
  const cf = sys.prepare("SELECT * FROM config WHERE name = ?;");
  const ip = q.headers["x-forwarded-for"]?.split(",")[0] || q.socket.address().address;
  const d = new Date();

  console.log(`${d.getHours()}:${d.getMinutes()}:${d.getSeconds()} ${ip} ${q.method} ${q.path}`);

  q.ip = ip; // IP address
  q.wl = wl.get(ip); // Whenever this IP is whitelisted
  q.ct = cf.get("captcha"); // Whenever we enabled captcha or no
  q.getCookie = n => getCookie(q.headers.cookie, n);

  if (wl.get(ip)) return next();
  if (q.method === "POST" && bl.get(ip)) {
    console.log(ip, "is blocked.");
    return s.status(403).end("Dong.");
  }

  let lim = 5;
  if (q.path.endsWith("/reply")) lim = 8;

  if (q.method === "POST") {
    if (!newPostsFromIP[ip]) {
      newPostsFromIP[ip] = 0;
      setInterval(() => {
        newPostsFromIP[ip] = 0;
      }, 30000);
    };

    newPostsFromIP[ip]++;

    if (newPostsFromIP[ip] > (lim*2))
      sys.prepare(`INSERT INTO ip_block VALUES (@ip);`).run({ ip }); // Bye.

    if (newPostsFromIP[ip] > lim) return s.status(403).end("Dong.");
  }

  n();
});

a.set("views", __dirname + "/views");
a.set("view engine", "ejs");
a.use(eps.static(__dirname + "/public"));
a.use(bp.urlencoded({ extended: true }));
a.use(bp.json());

a.get("/", (q, s) => s.redirect("/hello_there"));
a.post("/create", async (q, s) => {
    const { t, d } = q.body;
    if (!t || !d || !t.length || !d.length) return s.status(400).end("Invalid Body");

    if (q.ct && !q.wl)
      return c.newCaptchaSession(q, s, "create");

    const id = (1000000 + ts - 2 + 1);

    db.exec(`CREATE TABLE "${id}" (ts INTEGER, t TEXT, d TEXT);`);
    db.prepare("INSERT OR IGNORE INTO __threadlists VALUES (?);").run(id.toString());
    ts++;

    const ins = db.prepare(`INSERT INTO "${id}" VALUES (@ts, @t, @d);`);
    ins.run({ ts: Date.now(), t, d });

    s.redirect("/" + id);
});

a.post("/search", async (q, s) => {
    if (!q.body.q || !q.body.q.length) return s.status(400).end("Invalid Body");

    q.body.q = q.body.q.toLowerCase();

    let fnd = [];
    for (th of db.prepare("SELECT id FROM __threadlists;").iterate()) {
      for (let i of db.prepare(`SELECT * from "${th.id}";`).iterate()) {
        i.id = th.id;
        if (i.t.toLowerCase().includes(q.body.q) || i.d.toLowerCase().includes(q.body.q)) return fnd.push(i);
      }
    }

    fnd.unshift({
      t: "Showing results for: " + q.body.q,
      d: "There are " + fnd.length + " results for \"" + q.body.q + "\".",
      ts: Date.now(),
      id: "search",
    });

    if (!fnd.length) fnd = [{
      t: "No result",
      d: "No result for \"" + q.body.q + "\". ",
      ts: Date.now(),
      id: "search",
    }];

    s.render("index.ejs", {
      pst: fnd, id: "search", srch: q.body.q, ct: q.ct, bds: lth()
    });
});

a.get("/api/verify", async(q, s) => {
    const sess = c.getCaptchaSession(q.getCookie("verify_sess"));
    if (!q.getCookie("verify_sess") || !sess) return s.status(400).end("Session expired. try again.");
    return s.json(c.getNewQuestion(sess));
});

a.get("/api/:id", async (q, s) => {
    if (!ita(q.params.id)) return s.status(404).json({ error: "Not Found" });
    let thread = db.prepare(`SELECT * FROM "${q.params.id.toLowerCase()}";`).all();

    if (!isNaN(parseInt(q.query.from)) && parseInt(q.query.from) > -1) {
      thread = thread.slice(parseInt(q.query.from));
    }

    s.json(thread);
});

a.get("/api", async (q, s) => s.json(tables));

a.get("/verify", async (q, s) => {
    const sess = c.getCaptchaSession(q.getCookie("verify_sess"));
    if (!q.getCookie("verify_sess") || !sess) return s.status(400).end("Session expired. try again.");
    return s.render("verify.ejs", c.getNewQuestion(sess));
});

a.post("/verify", (q, s) => {
    let sess = c.getCaptchaSession(q.getCookie("verify_sess"));
    if (!q.getCookie("verify_sess") || !sess || sess.question === "null" || sess.answer === "null") return s.status(400).end("Session expired. try again");

    if (c.verifyCaptchaAnswer(sess, q.body?.answer)) {
      let { t, d } = JSON.parse(sess.body);
      if (!d || !d.length) return s.status(400).end("Invalid Body");
      if (!t) t = "Anonymous";

      try {
        if (sess.onid === "create") {
          sess.onid = (1000000 + ts - 2 + 1);
          db.exec(`CREATE TABLE "${sess.onid}" (ts INTEGER, t TEXT, d TEXT);`);
          ts++;
        }

        const ins = db.prepare(`INSERT INTO "${sess.onid}" VALUES (@ts, @t, @d);`);
        const ts = Date.now();
        ins.run({ ts, t, d });

        db.prepare(`DELETE FROM __threadlists WHERE id = ?;`).run(sess.onid.toString());
        db.prepare("INSERT OR IGNORE INTO __threadlists VALUES (?);").run(sess.onid.toString());

        s.redirect(`/${sess.onid}#t${ts}`);
      } catch (err) {
        console.error(err);
        s.status(500).end(err.toString());
      }
    } else {
      return s.redirect("/verify");
    }
});

a.use("/:id", async (q, s, n) => {
    if (q.params.id === "verify") return n();
    if (ita(q.params.id)) {
        q.id = q.params.id.toLowerCase();
        try {
          q.table = db.prepare(`SELECT * FROM "${q.id}"`);
          n();
        } catch (err) {
          return s.status(404).end("Not found or deleted");
        }
    } else s.status(404).end("Not found or deleted");
});

a.get("/:id", async (q, s) => {
    s.render("index.ejs", {
        pst: q.table.iterate(), id: q.id, srch: false, ct: q.ct, bds: lth()
    });
});

a.post("/:id/reply", async (q, s) => {
    let { t, d } = q.body;
    if (!d || !d.length) return s.status(400).end("Invalid Body");

    if (["hello_there", "toard_api", "search"].includes(q.id)) return s.status(400).end("Post is not replyable.");
    if (q.ct && !q.wl)
      return c.newCaptchaSession(q, s, q.id);

    if (!t) t = "Anonymous";

    try {
      const ins = db.prepare(`INSERT INTO "${q.id}" VALUES (@ts, @t, @d);`);
      const ts = Date.now()
      ins.run({ ts, t, d });

      db.prepare(`DELETE FROM __threadlists WHERE id = ?;`).run(q.id);
      db.prepare("INSERT OR IGNORE INTO __threadlists VALUES (?);").run(q.id);

      s.redirect(`/${q.id}#t${ts}`);
    } catch (err) {
      s.status(500).end(err.toString());
      console.error(err);
    }
});

let l = a.listen(process.env.PORT || 3000, _ => {
  console.log("Toard is now listening at", l.address().port);
});

process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));
