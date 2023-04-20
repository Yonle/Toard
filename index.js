const sql = require("better-sqlite3");
const eps = require("express");
const com = require("compression");
const bp = require("body-parser");
const f = require("fs");
const a = eps();

// For temporary time, We're gonna use this for main topic.
// A upcoming commit will comes with channel support.

let db = new sql("database.db");
let sys = new sql("config.db");

db.pragma("journal_mode = WAL");
db.pragma('cache_size = 32000');

sys.exec("CREATE TABLE IF NOT EXISTS ip_block (ip TEXT);");

let tables = new Set(db.prepare("SELECT name FROM sqlite_schema;").all().map(i => i.name));
let newPostsFromIP = {};

a.use(com());
a.use((q, s, n) => {
  const bl = sys.prepare("SELECT * FROM ip_block WHERE ip = ?;");
  const ip = q.headers["x-forwarded-for"]?.split("?")[0] || q.socket.address().address;
  const d = new Date();

  console.log(`${d.getHours()}:${d.getMinutes()}:${d.getSeconds()} ${ip} ${q.method} ${q.path}`);

  if (q.method === "POST" && bl.get(ip)) {
    console.log(ip, "is blocked.");
    return s.status(403).end("Dong.");
  }

  let lim = 5;
  if (q.path.endsWith("/reply")) lim = 12;

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

    const id = (1000000 + tables.size - 2 + 1);

    db.exec(`CREATE TABLE "${id}" (ts INTEGER, t TEXT, d TEXT);`);

    tables.add(id.toString());

    const ins = db.prepare(`INSERT INTO "${id}" VALUES (@ts, @t, @d);`);
    ins.run({ ts: Date.now(), t, d });

    s.redirect("/" + id);
});

a.post("/search", async (q, s) => {
    if (!q.body.q || !q.body.q.length) return s.status(400).end("Invalid Body");

    q.body.q = q.body.q.toLowerCase();

    let fnd = [];
    tables.forEach(id => {
      let thr = db.prepare(`SELECT * from "${id}";`);

      for (let i of thr.iterate()) {
        i.id = id;
        if (i.t.toLowerCase().includes(q.body.q) || i.d.toLowerCase().includes(q.body.q)) return fnd.push(i);
      }
    });

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
      pst: fnd, id: "search", srch: q.body.q, bds: Array.from(tables).map(id => {
        let t = db.prepare(`SELECT ts, t, d FROM "${id}";`).all();
        t[0].id = id;
        t[0].length = t.length;
        return t[0];
      })
    });
});

a.get("/api/:id", async (q, s) => {
    if (!tables.has(q.params.id)) return s.status(404).json({ error: "Not Found" });
    let thread = db.prepare(`SELECT * FROM "${q.params.id.toLowerCase()}";`).all();

    if (!isNaN(parseInt(q.query.from)) && parseInt(q.query.from) > -1) {
      thread = thread.slice(parseInt(q.query.from));
    }

    s.json(thread);
});

a.get("/api", async (q, s) => s.json(tables));

a.use("/:id", async (q, s, n) => {
    if (tables.has(q.params.id)) {
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
        pst: q.table.iterate(), id: q.id, srch: false, bds: Array.from(tables).map(id => {
          let t = db.prepare(`SELECT ts, t, d FROM "${id}";`).all();
          t[0].id = id;
          t[0].length = t.length;
          return t[0];
        })
    });
});

a.post("/:id/reply", async (q, s) => {
    if (["hello_there", "toard_api", "search"].includes(q.id)) return s.status(400).end("Post is not replyable.");

    let { t, d } = q.body;
    if (!d || !d.length) return s.status(400).end("Invalid Body");

    if (!t) t = "Anonymous";

    try {
      const ins = db.prepare(`INSERT INTO "${q.id}" VALUES (@ts, @t, @d);`);
      ins.run({ ts: Date.now(), t, d });

      s.redirect(`/${q.id}#bottom`);
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
