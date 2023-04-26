const fig = require("figlet");
const sql = require("better-sqlite3");
const db = new sql("captcha_sessions.db");
const randm = str => str.split("\n").map(i => i.split("").map(i => (Math.random() * 12) > (9 + Math.floor(Math.random() * 2)) ? "." : i).join("")).join("\n");

let tim = new Map();

db.unsafeMode(true); // Nothing important here. So if corrupted then let it be.
db.exec("DROP TABLE IF EXISTS verification_sessions;");
db.exec("CREATE TABLE IF NOT EXISTS verification_sessions (sess TEXT, stage INT, question TEXT, answer TEXT, body TEXT, onid TEXT);");

module.exports.newCaptchaSession = function (q, s, onid) {
  const sess = db.prepare("INSERT INTO verification_sessions VALUES (@sess, @stage, @question, @answer, @body, @onid)");
  const sessID = Buffer.from(q.ip + Date.now() + Math.random().toString(36), "base64").toString("hex");

  sess.run({
    sess: sessID,
    stage: 1,
    question: "null",
    answer: "null",
    body: JSON.stringify(q.body),
    onid
  });

  s.writeHead(302, {
    "Set-Cookie": `verify_sess=${sessID}; SameSite=Strict; Path=/verify`,
    "Location": "/verify"
  }).end();

  return tim.set(sessID, setTimeout(() => {
    db.exec(`DELETE FROM verification_sessions WHERE sess = '${sessID}';`);
  }, 60000 * 1));
}

module.exports.getCaptchaSession = function (sessid) {
  const sessdb = db.prepare("SELECT * FROM verification_sessions WHERE sess = ?");
  return sessdb.get(sessid);
}

module.exports.getNewQuestion = function (sess) {
  const updateSession = db.prepare(`UPDATE verification_sessions SET question = ?, answer = ? WHERE sess = ?;`);

  switch (sess.stage) {
    case 1: {
      const answer = Math.random().toString(36).slice(2, 8);
      const question = randm(fig.textSync(answer.split("").join(" "), { font: "Whimsy" }));
      updateSession.run(question, answer, sess.sess);

      return {
        q: question,
        t: "Solve the captcha."
      };

      break;
    }

    case 2: {
      const mathquestion = `${Math.floor(Math.random() * 50)}+${Math.floor(Math.random() * 50)}`
      const question = randm(fig.textSync(mathquestion.split("").join(" "), { font: "Whimsy" }));

      updateSession.run(question, eval(mathquestion).toString(), sess.sess);

      return {
        q: question,
        t: "Solve the math."
      };

      break;
    }
  }
}

module.exports.verifyCaptchaAnswer = function (sess, answer) {
  if (sess.answer !== answer) return false;
  if (sess.stage === 1) {
    const ses = db.prepare(`UPDATE verification_sessions SET stage = ? WHERE sess = ?;`);
    ses.run(2, sess.sess);
    return false;
  }

  db.exec(`DELETE FROM verification_sessions WHERE sess = '${sess.sess}';`);
  clearTimeout(tim.get(sess.sess));
  tim.delete(sess.sess);

  return true;
}
