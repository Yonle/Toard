const net = require("net");

module.exports = sys => (q, s, n) => {
  if (q.method !== "POST") return n();
  const ip = q.headers["x-forwarded-for"]?.split(",")[0] || q.socket.address().address;
  const wl = sys.prepare("SELECT ip FROM ip_white WHERE ip = ?;");
  const ib = sys.prepare("SELECT ip FROM ip_block WHERE ip = ?;");
  const bl = sys.prepare("SELECT port FROM blocked_open_ports;").all().map(i => i.port);

  if (wl.get(ip) || ib.get(ip) || !bl.length) return n();

  const sock = new net.Socket();
  sock.on('error', _ => null);
  sock.on('close', _ => {
    if (!bl.length || !sock.destroyed) {
      sock.removeAllListeners('error');
      sock.removeAllListeners('close');
      sock.removeAllListeners('connect');
      return n();
    };
    sock.connect(bl.shift(), ip);
  });

  sock.on('connect', _ => {
    console.log(`Detected open port at [${ip}]:${sock.remotePort}. Adding to blacklist.`);
    sys.prepare("INSERT INTO ip_block VALUES (?);").run(ip);
    sock.destroy();
  });

  sock.connect(bl.shift(), ip);
};
