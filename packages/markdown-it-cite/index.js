const { BibLatexParser } = require("biblatex-csl-converter");
const { readFileSync } = require("fs");

const Token = require("markdown-it/lib/token");

const cite = (md, opts) => {
  const [bib, bibKeys] = loadBib(opts);
  md.inline.ruler.push("cite", cite_rule({ ...opts, bib, bibKeys }));
  md.core.ruler.push("bibliography", bibliography_rule({ ...opts, bib, bibKeys }));
  // md.renderer.rules.cite = cite_renderer(opts);
};

function loadBib(opts) {
  let input = "";
  for (const source of opts.sources) {
    try {
      const text = readFileSync(source, "utf8");
      input += text;
    } catch (e) {}
  }
  const parser = new BibLatexParser(input, { processUnexpected: true, processUnknown: true });
  const bib = parser.parse();
  const bibKeys = Object.entries(bib.entries)
    .map((v) => v[1])
    .map(({ entry_key }) => entry_key);
  return [bib, bibKeys];
}

// @key | @key[post] | @key[pre][post]
function cite_rule(opts) {
  const cite = (state, silent) => {
    if (silent) return false;
    const { tokens, posMax: max, pos: start } = state;

    if (start + 2 >= max) return false;
    if (state.src.charCodeAt(start) !== 0x40 /* @ */) return false;

    let end = start;
    for (; end <= max; end++) {
      if (state.src.charCodeAt(end) === 0x20 /* */) break;
      if (state.src.charCodeAt(end) === 0x0a /* \n */) break;
    }

    const candidate = state.src.slice(start + 1, end);
    const result = opts.bibKeys.find((key) => candidate.startsWith(key));
    if (!result) return false;

    if (!state.env.citations) {
      state.env.citations = {};
    }

    if (!state.env.citations.list) {
      state.env.citations.list = [];
    }

    if (!state.env.citations.list.includes(result)) {
      state.env.citations.list.push(result);
    }

    if (state.pending) {
      state.pushPending();
    }

    let token = new Token("link_open", "a", 1);
    token.attrSet("href", `citation-${state.env.citations.list.length}`);
    token.attrSet("class", "citation");
    token.meta = { key: result };
    tokens.push(token);

    token = new Token("text", "", 0);
    token.content = state.env.citations.list.length;
    tokens.push(token);

    token = new Token("link_close", "a", -1);
    tokens.push(token);

    state.pos = start + 1 + result.length;
    state.posMax = max;
    return true;
  };
  return cite;
}

function bibliography_rule(opts) {
  const { bib, bibKeys } = opts;
  const bibliography = (state) => {
    if (!state.env.citations || !state.env.citations.list || !state.env.citations.list.length > 0) {
      return false;
    }

    const tokens = state.tokens;
    let token, tokenChild;

    token = new Token("hr", "hr", 0);
    token.attrSet("class", "bibliography");
    token.markup = "---";
    token.block = true;
    tokens.push(token);

    token = new Token("heading_open", "h2", 1);
    token.attrSet("id", "bibliography-heading");
    token.attrSet("class", "bibliography");
    token.markup = "##";
    token.block = true;
    tokens.push(token);

    token = new Token("inline", "", 0);
    tokenChild = new Token("text", "", 0);
    tokenChild.content = "Bibliography";
    token.children = [tokenChild];
    token.content = "Bibliography";
    tokens.push(token);

    token = new Token("heading_close", "h2", -1);
    token.markup = "##";
    tokens.push(token);

    token = new Token("bibliography_list_open", "ul", 1);
    token.attrSet("class", "bibliography");
    token.block = true;
    tokens.push(token);

    for (const [idx, citation] of state.env.citations.list.entries()) {
      token = new Token("bibliography_entry_open", "li", 1);
      token.attrSet("id", `citation-${idx + 1}`);
      token.block = true;
      tokens.push(token);

      token = new Token("inline", "", 0);
      token.children = [];

      tokenChild = new Token("text", "", 0);
      tokenChild.content = "[" + (idx + 1) + "]: ";
      token.children.push(tokenChild);

      bibEntry = Object.entries(bib.entries)
        .map((v) => v[1])
        .find(({ entry_key }) => citation === entry_key);

      generateTitle(token, bibEntry);
      generateAuthors(token, bibEntry);
      generateLicense(token, bibEntry);

      tokens.push(token);

      token = new Token("bibliography_entry_close", "li", -1);
      tokens.push(token);
    }

    token = new Token("bibliography_list_close", "ul", -1);
    tokens.push(token);
  };
  return bibliography;
}

function generateTitle(token, bibEntry) {
  let childToken;
  if (!bibEntry.fields.title) return;
  const titleUrl =
    bibEntry.unknown_fields.titleurl && bibEntry.unknown_fields.titleurl.length === 1
      ? bibEntry.unknown_fields.titleurl[0].text
      : false;
  if (titleUrl) {
    childToken = new Token("link_open", "a", 1);
    childToken.attrSet("href", titleUrl);
    token.children.push(childToken);
  }
  for (const titleChunk of bibEntry.fields.title) {
    if (titleChunk.type !== "text") continue;
    if (titleChunk.marks) {
      for (const mark of titleChunk.marks) {
        childToken = new Token("mark_open", mark.type, 1);
        token.children.push(childToken);
      }
    }
    childToken = new Token("text", "", 0);
    childToken.content = titleChunk.text;
    token.children.push(childToken);
    if (titleChunk.marks) {
      for (const mark of titleChunk.marks.reverse()) {
        childToken = new Token("mark_close", mark.type, -1);
        token.children.push(childToken);
      }
    }
  }
  if (titleUrl) {
    childToken = new Token("link_close", "a", -1);
    token.children.push(childToken);
  }
  // token.content = bibEntry.
}

function generateAuthors(token, bibEntry) {
  let child = new Token("text", "", 0);
}

function generateLicense(token, bibEntry) {
  let child = new Token("text", "", 0);
}

// function cite_renderer(opts) {
//   return (tokens, idx, options, env /* , self */) => {
//     const token = tokens[idx];
//     const position = env.citations.list.findIndex((citation) => citation === token.meta.key) + 1;
//     return `<a href="citation-${position}" class="citation">${position}</a>`;
//   };
// }

module.exports = cite;
