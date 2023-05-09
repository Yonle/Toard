const net = require("net");

module.exports = sys => (q, s, n) => {
  if (q.method !== "POST") return n();
  const ip = q.headers["x-forwarded-for"]?.split(",")[0] || q.socket.address().address;
  const wl = sys.prepare("SELECT ip FROM ip_white WHERE ip = ?;");
  const ib = sys.prepare("SELECT ip FROM ip_block WHERE ip = ?;");
  const bl = sys.prepare("SELECT port FROM blocked_open_ports;").all().map(i => i.port);

  if (wl.get(ip) || ib.get(ip) || !bl.length) return n();

  const sock = new net.Socket();

  let timeout = null;
  sock.on('error', _ => null);
  sock.on('close', _ => {
    if (!bl.length || !sock.destroyed) {
      sock.removeAllListeners('error');
      sock.removeAllListeners('close');
      sock.removeAllListeners('connect');
      return;
    };
    sock.connect(bl.shift(), ip);
    timeout = setTimeout(_ => sock.end(), 2000);
  });

  sock.on('connect', _ => {
    clearTimeout(timeout);
    console.log(`Detected open port at [${ip}]:${sock.remotePort}. Adding to blacklist.`);
    sys.prepare("INSERT OR IGNORE INTO ip_block VALUES (?);").run(ip);
    sock.destroy();
  });

  sock.connect(bl.shift(), ip);
  timeout = setTimeout(_ => sock.end(), 2000);

  n();
};
