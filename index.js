const eps = require("express");
const bp = require("body-parser");
const a = eps();
let db = new Map();

db.set("hello_there", [	
	{
		t: "Welcome to Toard",
		ts: 1639575229137,
		d: "Toard is a open source social Bulletin board, That used to discuss some stuff in real, internet, Music, or tech."
	},
	{
		t: "What is Toard?",
		ts: 1639575229137,
		d: "Toard is a Text only Bulletin board. And it's supposed to be anonymous for everyone. No registration is required, 0% Javascript is included in frontend.\n\nToard is written in Javascript (NodeJS)"
	},
	{
		t: "Is Toard 4chan clone?",
		ts: 1639575229137,
		d: "4chan is a Image bulletin board, While Toard is a complete text-only bulletin board. Both is different when you see of how it works."
	},
	{
		t: "How to create a post?",
		ts: 1639575229137,
		d: "You see a button at the near top bar? Press it. You need to write your post title, and your description. Same as how do you reply to a post."
	},
	{
		t: "Where's the source code?",
		ts: 1639575229137,
		d: "https://github.com/Yonle/Toard"
	}
]);

a.set("views", __dirname + "/views");
a.set("view engine", "ejs");
a.use(eps.static(__dirname + "/public"));
a.use(bp());

a.get("/", (q, s) => s.redirect("/hello_there"));
a.post("/create", (q, s) => {
	let { t, d } = q.body;
	if (!t || !d || !t.length || !d.length) return s.status(400).end("Invalid Body");
	
	let id = Math.floor(Math.random() * 10000000).toString();

	db.set(id.toLowerCase(), [{ t, ts: Date.now(), d }]);
	s.redirect("/" + id);
});

a.use("/:id", (q, s, n) => {
	if (q.params.id && db.has(q.params.id.toLowerCase())) return n();
	s.end("Not found or deleted");
});

a.get("/:id", (q, s) => {
	s.render("index.ejs", {
		posts: db.get(q.params.id.toLowerCase()), id: q.params.id
	});
});

a.post("/:id/reply", (q, s) => {
	if (q.params.id.toLowerCase() == "hello_there") return s.end("Post is unreplyable.");
	let post = db.get(q.params.id.toLowerCase());
	if (!post) return s.end("Post is unavailable.");

	q.body.ts = Date.now();
	let cnum = post.push(q.body);

	s.redirect(`/${q.params.id}#c${cnum-1}`);
});

a.listen(3000)
