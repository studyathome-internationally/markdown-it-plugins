const { BibLatexParser } = require("biblatex-csl-converter");
const { readFileSync } = require("fs");

const Token = require("markdown-it/lib/token");

const cite = (md, opts) => {
  const [bib, bibKeys] = loadBib(opts);
  md.inline.ruler.push("cite", cite_rule({ ...opts, bib, bibKeys }));
  md.core.ruler.after("inline", "bibliography", bibliography_rule({ ...opts, bib, bibKeys }));
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
    const position = state.env.citations.list.findIndex((citation) => citation === result);
    token.attrSet("href", `#citation-${position + 1}`);
    token.attrSet("class", "citation");
    token.meta = { key: result };
    tokens.push(token);

    token = new Token("text", "", 0);
    token.content = position + 1;
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
    token.attrSet("id", "bibliography");
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
    token.block = true;
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
      generateBracketOpen(token, bibEntry);
      generateAuthors(token, bibEntry);
      generateSeparator(token, bibEntry);
      generateLicense(token, bibEntry);
      generateBracketClose(token, bibEntry);

      tokens.push(token);

      token = new Token("bibliography_entry_close", "li", -1);
      tokens.push(token);
    }

    token = new Token("bibliography_list_close", "ul", -1);
    tokens.push(token);
  };
  return bibliography;
}

function generateBracketOpen(token, bibEntry) {
  if (!bibEntry.fields.author && !bibEntry.unknown_fields.license) return;
  let tokenChild = new Token("text", "", 0);
  tokenChild.content = " (";
  token.children.push(tokenChild);
}

function generateBracketClose(token, bibEntry) {
  if (!bibEntry.fields.author && !bibEntry.unknown_fields.license) return;
  let tokenChild = new Token("text", "", 0);
  tokenChild.content = ")";
  token.children.push(tokenChild);
}

function generateSeparator(token, bibEntry) {
  if (!bibEntry.fields.author || !bibEntry.unknown_fields.license) return;
  let tokenChild = new Token("text", "", 0);
  tokenChild.content = " - ";
  token.children.push(tokenChild);
}

function generateTitle(token, bibEntry) {
  if (!bibEntry.fields.title) return;
  let tokenChild;
  const titleUrl =
    bibEntry.unknown_fields.titleurl && bibEntry.unknown_fields.titleurl.length === 1
      ? bibEntry.unknown_fields.titleurl[0].text
      : false;
  if (titleUrl) {
    tokenChild = new Token("link_open", "a", 1);
    tokenChild.attrSet("href", titleUrl);
    token.children.push(tokenChild);
  }
  for (const titleChunk of bibEntry.fields.title) {
    if (titleChunk.type !== "text") continue;
    if (titleChunk.marks) {
      for (const mark of titleChunk.marks) {
        tokenChild = new Token("mark_open", mark.type, 1);
        token.children.push(tokenChild);
      }
    }
    tokenChild = new Token("text", "", 0);
    tokenChild.content = titleChunk.text;
    token.children.push(tokenChild);
    if (titleChunk.marks) {
      for (const mark of titleChunk.marks.reverse()) {
        tokenChild = new Token("mark_close", mark.type, -1);
        token.children.push(tokenChild);
      }
    }
  }
  if (titleUrl) {
    tokenChild = new Token("link_close", "a", -1);
    token.children.push(tokenChild);
  }
}

function generateAuthors(token, bibEntry) {
  if (!bibEntry.fields.author) return;
  let tokenChild;
  const authorUrl =
    bibEntry.unknown_fields.authorurl && bibEntry.unknown_fields.authorurl.length === 1
      ? bibEntry.unknown_fields.authorurl[0].text
      : false;
  if (authorUrl) {
    tokenChild = new Token("link_open", "a", 1);
    tokenChild.attrSet("href", authorUrl);
    token.children.push(tokenChild);
  }
  for (const [idx, author] of bibEntry.fields.author.entries()) {
    const { given, family } = author;
    for (const givenChunk of given) {
      if (givenChunk.type !== "text") continue;
      if (givenChunk.marks) {
        for (const mark of givenChunk.marks) {
          tokenChild = new Token("mark_open", mark.type, 1);
          token.children.push(tokenChild);
        }
      }
      tokenChild = new Token("text", "", 0);
      tokenChild.content = givenChunk.text;
      token.children.push(tokenChild);
      if (givenChunk.marks) {
        for (const mark of givenChunk.marks.reverse()) {
          tokenChild = new Token("mark_close", mark.type, -1);
          token.children.push(tokenChild);
        }
      }
    }
    if (family) {
      tokenChild = new Token("text", "", 0);
      tokenChild.content = " ";
      token.children.push(tokenChild);
    }
    for (const familyChunk of family) {
      if (familyChunk.type !== "text") continue;
      if (familyChunk.marks) {
        for (const mark of familyChunk.marks) {
          tokenChild = new Token("mark_open", mark.type, 1);
          token.children.push(tokenChild);
        }
      }
      tokenChild = new Token("text", "", 0);
      tokenChild.content = familyChunk.text;
      token.children.push(tokenChild);
      if (familyChunk.marks) {
        for (const mark of familyChunk.marks.reverse()) {
          tokenChild = new Token("mark_close", mark.type, -1);
          token.children.push(tokenChild);
        }
      }
    }
    if (idx !== bibEntry.fields.author.length - 1) {
      tokenChild = new Token("text", "", 0);
      tokenChild.content = ", ";
      token.children.push(tokenChild);
    }
  }
  if (authorUrl) {
    tokenChild = new Token("link_close", "a", -1);
    token.children.push(tokenChild);
  }
}

function generateLicense(token, bibEntry) {
  if (!bibEntry.unknown_fields.license) return;
  let tokenChild;
  const licenseUrl =
    bibEntry.unknown_fields.licenseurl && bibEntry.unknown_fields.licenseurl.length === 1
      ? bibEntry.unknown_fields.licenseurl[0].text
      : false;
  if (licenseUrl) {
    tokenChild = new Token("link_open", "a", 1);
    tokenChild.attrSet("href", licenseUrl);
    token.children.push(tokenChild);
  }
  for (const licenseChunk of bibEntry.unknown_fields.license) {
    if (licenseChunk.type !== "text") continue;
    if (licenseChunk.marks) {
      for (const mark of licenseChunk.marks) {
        tokenChild = new Token("mark_open", mark.type, 1);
        token.children.push(tokenChild);
      }
    }
    tokenChild = new Token("text", "", 0);
    tokenChild.content = licenseChunk.text;
    token.children.push(tokenChild);
    if (licenseChunk.marks) {
      for (const mark of licenseChunk.marks.reverse()) {
        tokenChild = new Token("mark_close", mark.type, -1);
        token.children.push(tokenChild);
      }
    }
  }
  if (licenseUrl) {
    tokenChild = new Token("link_close", "a", -1);
    token.children.push(tokenChild);
  }
}

module.exports = cite;
