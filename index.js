const jng = require("jsoning");
const eps = require("express");
const bp = require("body-parser");
const a = eps();

// For temporary time, We're gonna use this for main topic.
// A upcoming commit will comes with channel support.

let db = new jng(__dirname + "/db.json");

a.set("views", __dirname + "/views");
a.set("view engine", "ejs");
a.use(eps.static(__dirname + "/public"));
a.use(bp());

a.get("/", (q, s) => s.redirect("/hello_there"));
a.post("/create", async (q, s) => {
	let { t, d } = q.body;
	if (!t || !d || !t.length || !d.length) return s.status(400).end("Invalid Body");
	
	let id = Math.floor(Math.random() * 10000000).toString();

	await db.push(id.toLowerCase(), { t, ts: Date.now(), d });
	s.redirect("/" + id);
});

a.use("/:id", async (q, s, n) => {
	if (q.params.id && await db.has(q.params.id.toLowerCase())) {
		q.id = q.params.id.toLowerCase();
		n();
	} else s.status(400).end("Not found or deleted");
});

a.get("/:id", async (q, s) => {
	s.render("index.ejs", {
		posts: await db.get(q.id), id: q.id
	});
});

a.post("/:id/reply", async (q, s) => {
	if (q.id == "hello_there") return s.status(400).end("Post is unreplyable.");	
	if (!(await db.has(q.id))) return s.status(404).end("Post is unavailable.");

	q.body.ts = Date.now();
	await db.push(q.id, q.body);

	s.redirect(`/${q.id}#reply`);
});

a.listen(process.env.PORT || 3000);
