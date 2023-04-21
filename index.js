const sql = require("better-sqlite3");
const eps = require("express");
const com = require("compression");
const fig = require("figlet");
const bp = require("body-parser");
const f = require("fs");
const a = eps();

// For temporary time, We're gonna use this for main topic.
// A upcoming commit will comes with channel support.

let randm = str => str.split("\n").map(i => i.split("").map(i => (Math.random() * 12) > (9 + Math.floor(Math.random() * 2)) ? "." : i).join("")).join("\n");
let getCookie = (c, n) => c && c.split("; ").filter(i => i.startsWith(n)).pop()?.slice(n.length+1);

let db = new sql("database.db");
let sys = new sql("config.db");
let tmp = new sql("captcha_sessions.db");
let tim = new Map();

db.pragma("journal_mode = WAL");
db.pragma('cache_size = 32000');

sys.exec("CREATE TABLE IF NOT EXISTS ip_block (ip TEXT);");
sys.exec("CREATE TABLE IF NOT EXISTS ip_white (ip TEXT);");
sys.exec("CREATE TABLE IF NOT EXISTS config (name TEXT, value TEXT);");

tmp.exec("DROP TABLE IF EXISTS verification_sessions;");
tmp.exec("DROP TABLE IF EXISTS verified_sessions;");
tmp.exec("CREATE TABLE IF NOT EXISTS verification_sessions (sess TEXT, stage INT, question TEXT, answer TEXT, body TEXT, onid TEXT);");
tmp.exec("CREATE TABLE IF NOT EXISTS verified_sessions (sess TEXT);");

let tables = new Set(db.prepare("SELECT name FROM sqlite_schema;").all().map(i => i.name));
let newPostsFromIP = {};

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

    if (q.ct && !q.wl) {
      const sess = tmp.prepare("INSERT INTO verification_sessions VALUES (@sess, @stage, @question, @answer, @body, @onid)");
      let sessID = Buffer.from(q.ip + Date.now() + Math.random().toString(36), "base64").toString("hex");
      let question = Math.random().toString(36).slice(2);
      sess.run({
        sess: sessID,
        stage: 1,
        question: "null",
        answer: "null",
        body: JSON.stringify(q.body),
        onid: "create"
      });

      s.writeHead(302, {
        "Set-Cookie": `verify_sess=${sessID}; SameSite=Strict; Path=/verify`,
        "Location": "/verify"
      }).end();

      return tim.set(sessID, setTimeout(() => {
        tmp.exec(`DELETE FROM verification_sessions WHERE sess = '${sessID}';`);
      }, 60000 * 3));
    }

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
      pst: fnd, id: "search", srch: q.body.q, ct: q.ct, bds: Array.from(tables).map(id => {
        let t = db.prepare(`SELECT ts, t, d FROM "${id}";`).all();
        t[0].id = id;
        t[0].length = t.length;
        return t[0];
      })
    });
});

a.get("/api/verify", async(q, s) => {
    const sessdb = tmp.prepare("SELECT * FROM verification_sessions WHERE sess = ?");
    const sess = sessdb.get(q.getCookie("verify_sess"));
    if (!q.getCookie("verify_sess") || !sess) return s.status(400).end("Session expired. try again.");
    const ses = tmp.prepare(`UPDATE verification_sessions SET question = ?, answer = ? WHERE sess = ?;`);

    switch (sess.stage) {
      case 1: {
        const answer = Math.random().toString(36).slice(2, 8);
        const question = randm(fig.textSync(answer.split("").join(" ")));
        ses.run(question, answer, sess.sess);

        s.json({
          q: question,
          t: "Solve the captcha."
        });
        break;
      }

      case 2: {
        const mathquestion = `${Math.floor(Math.random() * 50)}+${Math.floor(Math.random() * 50)}`
        const question = randm(fig.textSync(mathquestion.split("").join(" ")));

        ses.run(question, eval(mathquestion).toString(), sess.sess);

        s.json({
          q: question,
          t: "Solve the math."
        });
        break;
      }
    }
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

a.get("/verify", async (q, s) => {
    const sessdb = tmp.prepare("SELECT * FROM verification_sessions WHERE sess = ?");
    const sess = sessdb.get(q.getCookie("verify_sess"));
    if (!q.getCookie("verify_sess") || !sess) return s.status(400).end("Session expired. try again.");
    const ses = tmp.prepare(`UPDATE verification_sessions SET question = ?, answer = ? WHERE sess = ?;`);

    switch (sess.stage) {
      case 1: {
        const answer = Math.random().toString(36).slice(2, 8);
        const question = randm(fig.textSync(answer.split("").join(" ")));
        ses.run(question, answer, sess.sess);

        s.render("verify.ejs", {
          q: question,
          t: "Solve the captcha."
        });
        break;
      }

      case 2: {
        const mathquestion = `${Math.floor(Math.random() * 50)}+${Math.floor(Math.random() * 50)}`
        const question = randm(fig.textSync(mathquestion.split("").join(" ")));

        ses.run(question, eval(mathquestion).toString(), sess.sess);

        s.render("verify.ejs", {
          q: question,
          t: "Solve the math."
        });
        break;
      }
    }
});

a.post("/verify", (q, s) => {
    const sessdb = tmp.prepare("SELECT * FROM verification_sessions WHERE sess = ?");
    let sess = sessdb.get(q.getCookie("verify_sess"));
    if (!q.getCookie("verify_sess") || !sess || sess.question === "null" || sess.answer === "null") return s.redirect("/");

    if (q.body.answer === sess.answer) {
      if (sess.stage === 1) {
        const ses = tmp.prepare(`UPDATE verification_sessions SET stage = ? WHERE sess = ?;`);
        ses.run(2, sess.sess);
        return s.redirect("/verify");
      }

      let { t, d } = JSON.parse(sess.body);
      if (!d || !d.length) return s.status(400).end("Invalid Body");
      if (!t) t = "Anonymous";

      try {
        if (sess.onid === "create") {
          sess.onid = (1000000 + tables.size - 2 + 1);
          tables.add(sess.onid.toString());
          db.exec(`CREATE TABLE "${sess.onid}" (ts INTEGER, t TEXT, d TEXT);`);
        }

        const ins = db.prepare(`INSERT INTO "${sess.onid}" VALUES (@ts, @t, @d);`);
        const ts = Date.now();
        ins.run({ ts, t, d });

        tmp.exec(`DELETE FROM verification_sessions WHERE sess = '${sess.sess}';`);
        clearTimeout(tim.get(sess.sess));
        tim.delete(sess.sess);

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
        pst: q.table.iterate(), id: q.id, srch: false, ct: q.ct, bds: Array.from(tables).map(id => {
          let t = db.prepare(`SELECT ts, t, d FROM "${id}";`).all();
          t[0].id = id;
          t[0].length = t.length;
          return t[0];
        })
    });
});

a.post("/:id/reply", async (q, s) => {
    if (["hello_there", "toard_api", "search"].includes(q.id)) return s.status(400).end("Post is not replyable.");
    if (q.ct && !q.wl) {
      const sess = tmp.prepare("INSERT INTO verification_sessions VALUES (@sess, @stage, @question, @answer, @body, @onid)");
      let sessID = Buffer.from(q.ip + Date.now() + Math.random().toString(36), "base64").toString("hex");
      let question = Math.random().toString(36).slice(2);
      sess.run({
        sess: sessID,
        stage: 1,
        question: "null",
        answer: "null",
        body: JSON.stringify(q.body),
        onid: q.id
      });

      s.writeHead(302, {
        "Set-Cookie": `verify_sess=${sessID}; SameSite=Strict; Path=/verify`,
        "Location": "/verify"
      }).end();

      return tim.set(sessID, setTimeout(() => {
        tmp.exec(`DELETE FROM verification_sessions WHERE sess = '${sessID}';`);
      }, 60000 * 3));
    }

    let { t, d } = q.body;
    if (!d || !d.length) return s.status(400).end("Invalid Body");

    if (!t) t = "Anonymous";

    try {
      const ins = db.prepare(`INSERT INTO "${q.id}" VALUES (@ts, @t, @d);`);
      const ts = Date.now()
      ins.run({ ts, t, d });

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
