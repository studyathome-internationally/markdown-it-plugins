const { BibLatexParser } = require("biblatex-csl-converter");
const { readFileSync } = require("fs");

const Token = require("markdown-it/lib/token");

const cite = (md, opts) => {
  const [bib, bibKeys] = loadBib(opts);
  md.inline.ruler.push("cite", cite_rule({ ...opts, bib, bibKeys }));
  md.core.ruler.before("smartquotes", "bibliography", bibliography_rule({ ...opts, bib, bibKeys }));
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
    const { posMax: max, pos: start } = state;

    if (start + 2 >= max) return false;
    if (state.src.charCodeAt(start) !== 0x40 /* @ */) return false;

    let end = start;
    for (; end <= max; end++) {
      if (state.src.charCodeAt(end) === 0x20 /* */) break;
      if (state.src.charCodeAt(end) === 0x0a /* \n */) break;
    }

    const id = getId(state, start + 1, end, opts);
    if (!id) return false;
    saveCitation(state, id);

    const position = state.env.citations.list.findIndex((citation) => citation === id);

    let token = state.push("link_open", "a", 1);
    token.attrSet("href", `#citation-${position + 1}`);
    token.attrSet("class", "citation");
    token.meta = { key: id };

    token = state.push("text", "", 0);
    token.content = position + 1;

    token = state.push("link_close", "a", -1);

    state.pos = start + 1 + id.length;
    state.posMax = max;
    return true;
  };
  return cite;
}

function bibliography_rule(opts) {
  const { bib } = opts;
  const bibliography = (state) => {
    if (state.inlineMode || !state.env.citations || !state.env.citations.list || !state.env.citations.list.length > 0) {
      return false;
    }

    const tokens = state.tokens;
    let token;

    token = createListSeparator();
    tokens.push(token);

    token = createHeadingTokens(state);
    tokens.push(...token);

    token = createListOpening();
    tokens.push(token);

    for (const [idx, citation] of state.env.citations.list.entries()) {
      token = createListItemTokens(state, bib, citation, idx + 1, { level: 1 });
      tokens.push(...token);
    }

    token = createListClosing();
    tokens.push(token);
  };
  return bibliography;
}

function createListSeparator({ block = true, className = "bibliography", level = 0 } = {}) {
  const token = new Token("hr", "hr", 0);
  token.attrSet("class", className);
  token.markup = "---";
  token.block = block;
  token.level = level;
  return token;
}

function createHeadingTokens(state, { block = true, level = 0 } = {}) {
  const headingLevel = 2;
  const headingId = "bibliography";
  const tokens = [];
  let token, tokenChild;

  token = new Token("heading_open", `h${headingLevel}`, 1);
  token.attrSet("id", headingId);
  token.markup = "#".repeat(headingLevel);
  token.block = block;
  token.level = level++;
  tokens.push(token);

  const title = frontmatter(state, "title", "Bibliography");
  tokenChild = new Token("text", "", 0);
  tokenChild.level = 0;
  tokenChild.content = title;

  token = new Token("inline", "", 0);
  token.level = level;
  token.content = title;
  token.children = [tokenChild];
  tokens.push(token);

  token = new Token("heading_close", `h${headingLevel}`, -1);
  token.markup = "#".repeat(headingLevel);
  token.block = block;
  token.level = level--;
  tokens.push(token);

  return tokens;
}

function createListOpening({ block = true, className = "bibliography", level = 0 } = {}) {
  const token = new Token("bibliography_list_open", "ul", 1);
  token.attrSet("class", className);
  token.block = block;
  token.level = level;
  token.markup = "*";
  return token;
}

function createListClosing({ block = true, level = 0 } = {}) {
  const token = new Token("bibliography_list_close", "ul", -1);
  token.block = block;
  token.level = level;
  token.markup = "*";
  return token;
}

function createListItemTokens(state, bib, citation, position, { block = true, level = 0 } = {}) {
  const tokens = [];
  let token;

  token = new Token("bibliography_entry_open", "li", 1);
  token.attrSet("id", `citation-${position}`);
  token.level = level++;
  token.block = block;
  tokens.push(token);

  token = new Token("paragraph_open", "p", 1);
  token.level = level++;
  token.block = block;
  tokens.push(token);

  token = new Token("inline", "", 0);
  token.level = level;
  token.block = false;
  token.children = [];

  let levelChild = 0;
  tokenChild = new Token("text", "", 0);
  tokenChild.level = levelChild;
  tokenChild.content = "[" + position + "]: ";
  token.children.push(tokenChild);

  const bibEntry = Object.entries(bib.entries)
    .map((v) => v[1])
    .find(({ entry_key }) => citation === entry_key);

  createTitle(token, levelChild, bibEntry);
  createBracketOpen(token, levelChild, bibEntry);
  createAuthors(token, levelChild, bibEntry);
  createISBNSeparator(token, levelChild, bibEntry);
  createISBN(token, levelChild, bibEntry);
  createDOISeparator(token, levelChild, bibEntry);
  createDOI(token, levelChild, bibEntry);
  createNoteSeparator(token, levelChild, bibEntry);
  createNote(token, levelChild, bibEntry);
  createLicenseSeparator(token, levelChild, bibEntry);
  createLicense(token, levelChild, bibEntry);
  createBracketClose(token, levelChild, bibEntry);

  token.content = getListItemContent(token);
  tokens.push(token);

  token = new Token("paragraph_close", "p", -1);
  token.level = --level;
  token.block = block;
  tokens.push(token);

  token = new Token("bibliography_entry_close", "li", -1);
  token.level = --level;
  token.block = block;
  tokens.push(token);

  return tokens;
}

function getListItemContent(token) {
  return token.children
    .filter(({ type }) => "text" === type)
    .map(({ content }) => content)
    .join("");
}

function createBracketOpen(token, level, bibEntry) {
  if (
    !getBibField(bibEntry, "author") &&
    !getBibField(bibEntry, "license") &&
    !getBibField(bibEntry, "isbn") &&
    !getBibField(bibEntry, "doi")
  ) {
    return;
  }
  let tokenChild = new Token("text", "", 0);
  tokenChild.content = " (";
  tokenChild.level = level;
  token.children.push(tokenChild);
}

function createBracketClose(token, level, bibEntry) {
  if (
    !getBibField(bibEntry, "author") &&
    !getBibField(bibEntry, "license") &&
    !getBibField(bibEntry, "isbn") &&
    !getBibField(bibEntry, "doi")
  ) {
    return;
  }
  let tokenChild = new Token("text", "", 0);
  tokenChild.content = ")";
  tokenChild.level = level;
  token.children.push(tokenChild);
}

function injectLinkOpen(token, url, { level = 0 } = {}) {
  if (url && url.length === 1) {
    let tokenChild = new Token("link_open", "a", 1);
    tokenChild.attrSet("href", url[0].text);
    tokenChild.level = level++;
    tokenChild.block = false;
    token.children.push(tokenChild);
  }
  return level;
}

function injectLinkClose(token, url, { level = 0 } = {}) {
  if (url && url.length === 1) {
    let tokenChild = new Token("link_close", "a", -1);
    tokenChild.level = --level;
    tokenChild.block = false;
    token.children.push(tokenChild);
  }
  return level;
}

function injectFieldChunks(token, field, { level = 0 } = {}) {
  for (const chunk of field) {
    if (chunk.type !== "text") continue;

    if (chunk.marks) {
      for (const mark of chunk.marks) {
        if (mark.type === "nocase") continue;
        tokenChild = new Token("mark_open", mark.type, 1);
        tokenChild.level = level++;
        tokenChild.block = false;
        token.children.push(tokenChild);
      }
    }

    tokenChild = new Token("text", "", 0);
    tokenChild.content = chunk.text;
    tokenChild.level = level;
    tokenChild.block = false;
    token.children.push(tokenChild);

    if (chunk.marks) {
      for (const mark of chunk.marks.reverse()) {
        if (mark.type === "nocase") continue;
        tokenChild = new Token("mark_close", mark.type, -1);
        tokenChild.level = --level;
        tokenChild.block = false;
        token.children.push(tokenChild);
      }
    }
  }
  return level;
}

function createTitle(token, level, bibEntry) {
  if (!getBibField(bibEntry, "title")) return;
  level = injectLinkOpen(token, getBibField(bibEntry, "titleurl"), { level });
  level = injectFieldChunks(token, getBibField(bibEntry, "title"), { level });
  level = injectLinkClose(token, getBibField(bibEntry, "titleurl"), { level });
}

function createAuthors(token, level, bibEntry) {
  if (!getBibField(bibEntry, "author")) return;
  level = injectLinkOpen(token, getBibField(bibEntry, "authorurl"), { level });

  for (const [idx, author] of getBibField(bibEntry, "author").entries()) {
    const { prefix, given, family } = author;
    if (prefix) {
      level = injectFieldChunks(token, prefix, { level });
    }
    if (given) {
      if (prefix) {
        let tokenChild = new Token("text", "", 0);
        tokenChild.content = " ";
        token.children.push(tokenChild);
      }
      level = injectFieldChunks(token, given, { level });
    }
    if (family) {
      if (given || prefix) {
        let tokenChild = new Token("text", "", 0);
        tokenChild.content = " ";
        token.children.push(tokenChild);
      }

      level = injectFieldChunks(token, family, { level });
    }
    if (idx !== getBibField(bibEntry, "author").length - 1) {
      let tokenChild = new Token("text", "", 0);
      tokenChild.content = ", ";
      token.children.push(tokenChild);
    }
  }

  level = injectLinkClose(token, getBibField(bibEntry, "authorurl"), { level });
}

function createLicenseSeparator(token, level, bibEntry) {
  if (
    !getBibField(bibEntry, "license") ||
    !(
      getBibField(bibEntry, "author") ||
      getBibField(bibEntry, "isbn") ||
      getBibField(bibEntry, "doi") ||
      getBibField(bibEntry, "note")
    )
  ) {
    return;
  }
  let tokenChild = new Token("text", "", 0);
  tokenChild.content = " - ";
  tokenChild.level = level;
  token.children.push(tokenChild);
}

function createLicense(token, level, bibEntry) {
  if (!getBibField(bibEntry, "license")) return;
  level = injectLinkOpen(token, getBibField(bibEntry, "licenseurl"), { level });
  level = injectFieldChunks(token, getBibField(bibEntry, "license"), { level });
  level = injectLinkClose(token, getBibField(bibEntry, "licenseurl"), { level });
}

function createISBNSeparator(token, level, bibEntry) {
  if (!getBibField(bibEntry, "isbn") || !getBibField(bibEntry, "author")) {
    return;
  }
  let tokenChild = new Token("text", "", 0);
  tokenChild.content = ", ";
  tokenChild.level = level;
  token.children.push(tokenChild);
}

function createISBN(token, level, bibEntry) {
  if (!getBibField(bibEntry, "isbn")) {
    return;
  }

  let tokenChild = new Token("text", "", 0);
  tokenChild.block = false;
  tokenChild.level = level;
  tokenChild.content = "ISBN: ";
  token.children.push(tokenChild);

  level = injectFieldChunks(token, getBibField(bibEntry, "isbn"), { level });
}

function createDOISeparator(token, level, bibEntry) {
  if (!getBibField(bibEntry, "doi") || !(getBibField(bibEntry, "author") || getBibField(bibEntry, "isbn"))) {
    return;
  }
  let tokenChild = new Token("text", "", 0);
  tokenChild.content = ", ";
  tokenChild.level = level;
  token.children.push(tokenChild);
}

function createDOI(token, level, bibEntry) {
  const doi = getBibField(bibEntry, "doi");
  if (!doi) return;

  let tokenChild = new Token("text", "", 0);
  tokenChild.block = false;
  tokenChild.level = level;
  tokenChild.content = "DOI: ";
  token.children.push(tokenChild);

  const doiUrl = `https://doi.org/${doi}`;
  level = injectLinkOpen(token, [{ text: doiUrl }], { level });
  level = injectFieldChunks(token, [{ text: getBibField(bibEntry, "doi"), type: "text" }], { level });
  level = injectLinkClose(token, [{ text: doiUrl }], { level });
}

function createNoteSeparator(token, level, bibEntry) {
  if (
    !getBibField(bibEntry, "note").length > 0 ||
    !(getBibField(bibEntry, "author") || getBibField(bibEntry, "isbn") || getBibField(bibEntry, "doi"))
  ) {
    return;
  }
  let tokenChild = new Token("text", "", 0);
  tokenChild.content = ", ";
  tokenChild.level = level;
  token.children.push(tokenChild);
}

function createNote(token, level, bibEntry) {
  if (!getBibField(bibEntry, "note")) {
    return;
  }
  level = injectFieldChunks(token, getBibField(bibEntry, "note"), { level });
}

function getBibField(bibEntry, fieldname) {
  if (bibEntry.fields && fieldname in bibEntry.fields) {
    return bibEntry.fields[fieldname];
  } else if (bibEntry.unexpected_fields && fieldname in bibEntry.unexpected_fields) {
    return bibEntry.unexpected_fields[fieldname];
  } else if (bibEntry.unknown_fields && fieldname in bibEntry.unknown_fields) {
    return bibEntry.unknown_fields[fieldname];
  }
  return false;
}

function frontmatter(state, key, alternative) {
  const frontmatterKey = "cite";
  return state &&
    state.env &&
    state.env.frontmatter &&
    state.env.frontmatter[frontmatterKey] &&
    state.env.frontmatter[frontmatterKey][key]
    ? state.env.frontmatter[frontmatterKey][key]
    : alternative;
}

function getId(state, start, end, opts) {
  const candidate = state.src.slice(start, end);
  return opts.bibKeys.find((key) => candidate.startsWith(key));
}

function saveCitation(state, id) {
  if (!state.env.citations) {
    state.env.citations = {};
  }

  if (!state.env.citations.list) {
    state.env.citations.list = [];
  }

  if (!state.env.citations.list.includes(id)) {
    state.env.citations.list.push(id);
  }
}

module.exports = cite;
