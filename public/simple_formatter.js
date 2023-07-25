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

function makegreentext(t) {
  return t.startsWith("&gt;") ? "<span class=\"quote\">" + t + "</span>" : t;
}

function filter(text) {
  return String(text).replace(_MATCH_HTML, encode_char);
}

function fixspan(text) {
  return text.split("</span>\n")
    .join("</span>");
}

function formatText(text) {
  const fixed = fixspan(filter(text).split("\n")
    .map(makegreentext)
    .join("\n"));

  return fixed.split(" ").map(i => (i.startsWith("https://") || i.startsWith("http://")) ? `<a class="quote" href="${i}">${i}</a>` : i).join(" ");
}

if (typeof(module) === "object") {
  module.exports = formatText;
}
