const jng = require("jsoning");
const eps = require("express");
const bp = require("body-parser");
const f = require("fs");
const a = eps();

// For temporary time, We're gonna use this for main topic.
// A upcoming commit will comes with channel support.

try {
  f.accessSync(__dirname + "/db.base.json");
  f.accessSync(__dirname + "/db.json");
} catch {
  f.copyFileSync(__dirname + "/db.base.json", __dirname + "/db.json");
}

let db = new jng(__dirname + "/db.json");

a.set("views", __dirname + "/views");
a.set("view engine", "ejs");
a.use(eps.static(__dirname + "/public"));
a.use(bp());

a.get("/", (q, s) => s.redirect("/hello_there"));
a.post("/create", async (q, s) => {
    let { t, d } = q.body;
    if (!t || !d || !t.length || !d.length) return s.status(400).end("Invalid Body");

    let id = 1000000 + Object.keys(await db.all()).length - 2 + 1;

    await db.push(id, { t, ts: Date.now(), d });
    s.redirect("/" + id);
});

a.post("/search", async (q, s) => {
    if (!q.body.q || !q.body.q.length) return s.status(400).end("Invalid Body");

    q.body.q = q.body.q.toLowerCase();

    let fnd = [];
    let thrs = await db.all();
    Object.keys(thrs).forEach(id => {
      let thr = thrs[id];

      let res = thr.map((i, n) => {
        i.n = n;
        i.id = id;
        return i;
      }).filter(i => i.t.toLowerCase().includes(q.body.q) || i.d.toLowerCase().includes(q.body.q));

      if (res.length) fnd.push(res);
    });

    fnd = fnd.flat();

    if (!fnd.length) fnd = [{
      t: "No result",
      d: "No result for \"" + q.body.q + "\". ",
      ts: Date.now(),
      id: "search",
      n: 0
    }];

    s.render("index.ejs", {
      pst: fnd, id: "search", bds: thrs, srch: q.body.q
    });
});

a.get("/api/:id", async (q, s) => {
    if (!(await db.has(q.params.id.toLowerCase()))) return s.status(404).json({ error: "Not Found" });
    s.json(await db.get(q.params.id.toLowerCase()));
});

a.get("/api", async (q, s) => s.json(await db.all()));

a.use("/:id", async (q, s, n) => {
    if (q.params.id && await db.has(q.params.id.toLowerCase())) {
        q.id = q.params.id.toLowerCase();
        n();
    } else s.status(400).end("Not found or deleted");
});

a.get("/:id", async (q, s) => {
    let trd = await db.all();
    s.render("index.ejs", {
        pst: trd[q.id], id: q.id, bds: await db.all(), srch: false
    });
});

a.post("/:id/reply", async (q, s) => {
    if (["hello_there", "toard_api", "search"].includes(q.id)) return s.status(400).end("Post is not replyable.");
    if (!(await db.has(q.id))) return s.status(404).end("Post is unavailable.");

    let { t, d } = q.body;
    if (!d || !d.length) s.status(400).end("Invalid Body");

    !t ? q.body.t = "Re: " + (await db.get(q.id))[0].t : null;
    q.body.ts = Date.now();
    await db.push(q.id, q.body);

    s.redirect(`/${q.id}#reply`);
});

a.listen(process.env.PORT || 3000);
