const whois = require("whois");
const sql = require("better-sqlite3");
const cache = new sql("./whoiscache.db");

cache.exec("CREATE TABLE IF NOT EXISTS cached (ip TEXT, data TEXT);");

module.exports = sys => (q, s, n) => {
  const ip = q.headers["x-forwarded-for"]?.split(",")[0] || q.socket.address().address;
  const wl = sys.prepare("SELECT ip FROM ip_white WHERE ip = ?;");
  const bl = sys.prepare("SELECT name FROM isp_block;").all().map(i => i.name);
  const ch = cache.prepare("SELECT data FROM cached WHERE ip = ?").get(ip);

  q.bip = false;
  if (wl.get(ip)) return n();
  if (ch) {
    if (bl.find(n => ch.data.includes(n))) q.bip = true;
    return n();
  }

  whois.lookup(ip, (err, data) => {
    if (err) return n();
    if (bl.find(n => data.includes(n))) q.bip = true;

    cache.prepare("INSERT INTO cached VALUES (?, ?);").run(ip, data);
    return n();
  });
};
