const _ENCODE_HTML_RULES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&#34;',
  "'": '&#39;'
};
const _MATCH_HTML = /[&<>'"]/g;

function encode_char(c) {
  return _ENCODE_HTML_RULES[c] || c;
}

function makeGreenText(t) {
  return t.startsWith("&gt;") ? "<span class=\"quote\">" + t + "</span>" : t;
}

function makeClickableLinks(t) {
  return t.split(" ").map(i =>
    (i.startsWith("https://") || i.startsWith("http://")) ? `<a class="quote" href="${i}">${i}</a>` : i
  ).join(" ");
}

function filter(text) {
  return String(text).replace(_MATCH_HTML, encode_char);
}

function fixspan(text) {
  return text.split(">\n")
    .join(">");
}

function formatText(text) {
  const fixed = fixspan(filter(text)
    .split("\n").map(makeGreenText).map(makeClickableLinks).join("\n"));

  return fixed;
}

if (typeof(module) === "object") {
  module.exports = formatText;
}
