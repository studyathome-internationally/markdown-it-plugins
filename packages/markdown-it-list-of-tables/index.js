const { isSpace } = require("markdown-it/lib/common/utils");
const Token = require("markdown-it/lib/token");

const list_of_tables = (md, opts) => {
  md.inline.ruler.after("text", "table_citation", table_citation_rule(opts));
  md.renderer.rules.table_citation = table_citation_renderer(opts);
  md.core.ruler.after("inline", "table_figure", table_figure_rule(opts));
  md.core.ruler.before("smartquotes", "table_list", table_list_rule(opts));
};

function table_citation_rule(opts) {
  const table_citation = (state, silent) => {
    if (silent) return false;
    const { tokens, posMax: max, pos: start } = state;

    // should be at least 9 chars - "<<tab:x>>"
    if (start + 8 > max) return false;

    if (state.src.charCodeAt(start) !== 0x3c /* < */) return false;
    if (state.src.charCodeAt(start + 1) !== 0x3c /* < */) return false;
    if (state.src.charCodeAt(start + 2) !== 0x74 /* t */) return false;
    if (state.src.charCodeAt(start + 3) !== 0x61 /* a */) return false;
    if (state.src.charCodeAt(start + 4) !== 0x62 /* b */) return false;
    if (state.src.charCodeAt(start + 5) !== 0x3a /* : */) return false;

    let pos = start + 6;
    for (; pos < max - 1; pos++) {
      if (isSpace(state.src.charCodeAt(pos))) {
        return false;
      }
      if (state.src.charCodeAt(pos) === 0x0a /* \n */) {
        return false;
      }
      if (state.src.charCodeAt(pos) === 0x3e /* > */ && state.src.charCodeAt(pos + 1) === 0x3e) {
        break;
      }
    }

    // no empty references
    if (pos === start + 6) {
      return false;
    }

    let table = state.src.slice(start + 6, pos);
    let token = state.push("table_citation", "", 0);
    token.content = table;
    token.meta = { id: table };

    state.pos = pos + 2;
    state.posMax = max;
    return true;
  };
  return table_citation;
}

function table_citation_renderer(opts) {
  return (tokens, idx, options, env /* , self */) => {
    const token = tokens[idx];
    const id = token.meta.id;

    if (id && env && env.tables && env.tables.list) {
      const index = env.tables.list.findIndex((table) => table.id === id);
      if (index > -1) {
        const label = frontmatter({ env }, "label", "Table");
        return `<a href="#${id}" class="table-citation">${label} ${index + 1}</a>`;
      }
    }

    return `&lt;&lt;${token.meta.id}&gt;&gt;`;
  };
}

function table_figure_rule(opts) {
  const table_figure = (state) => {
    const tokens = state.tokens;

    for (let idx = 0; idx < tokens.length; idx++) {
      if (!isValidToken(tokens, idx)) continue;

      if ("table_open" === tokens[idx].type) {
        idx = processTableOpen(state, tokens, idx);
      } else if ("html_block" === tokens[idx].type) {
        idx = processHtmlBlock(state, tokens, idx);
      }
    }
  };
  return table_figure;
}

function table_list_rule(opts) {
  const table_list = (state) => {
    if (state.inlineMode || !state.env.tables || !state.env.tables.list || !state.env.tables.list.length > 0) {
      return false;
    }

    const tokens = state.tokens;
    let token;

    token = new createListSeparator();
    tokens.push(token);

    token = new createHeadingTokens(state);
    tokens.push(...token);

    token = new createListOpening();
    tokens.push(token);

    for (const [idx, table] of state.env.tables.list.entries()) {
      token = createListItemTokens(state, table, idx + 1, { level: 1 });
      tokens.push(...token);
    }

    token = createListClosing();
    tokens.push(token);
  };
  return table_list;
}

function slugify(text) {
  return text
    .replace(/[^\w]/g, "-")
    .replace(/\-+/g, "-")
    .replace(/\-$/, "")
    .replace(/^\-+/g, "")
    .replace(/\-+$/g, "")
    .toLowerCase();
}

function frontmatter(state, key, alternative) {
  const frontmatterKey = "list-of-tables";
  return state &&
    state.env &&
    state.env.frontmatter &&
    state.env.frontmatter[frontmatterKey] &&
    state.env.frontmatter[frontmatterKey][key]
    ? state.env.frontmatter[frontmatterKey][key]
    : alternative;
}

function getTableData(tokens, idx) {
  const token = tokens[idx];
  const caption = token.content.substring(1);
  let id = slugify(caption);
  let title = caption;

  if (caption.split("#").length === 2) {
    [id, title] = caption.split("#");
  }

  return [id, title];
}

function saveTable(state, { id, title }) {
  if (!state.env.tables) {
    state.env.tables = {};
  }

  if (!state.env.tables.list) {
    state.env.tables.list = [];
  }

  if (!state.env.tables.list.includes(id)) {
    state.env.tables.list.push({
      id,
      title,
    });
  }
}

function isValidToken(tokens, idx) {
  return "table_open" === tokens[idx].type || "html_block" === tokens[idx].type;
}

function isValidTablePos(tokens, tableOpenPos, tableClosePos) {
  return tableClosePos > 0 && tableClosePos > tableOpenPos && tableClosePos <= tokens.length;
}

function isValidCaption(tokens, tableClosePos) {
  if (tableClosePos + 3 > tokens.length) return false;
  if ("paragraph_open" !== tokens[tableClosePos + 1].type) return false;
  const caption = tokens[tableClosePos + 2];
  if (caption.content.charCodeAt(0) !== 0x2e /* . */) return false;
  if (isSpace(caption.content.charCodeAt(0))) return false;
  return true;
}

function isValidHtmlTable(tokens, idx) {
  return tokens[idx].content.startsWith("<table>") && tokens[idx].content.endsWith("</table>\n");
}

function processTableOpen(state, tokens, tableOpenPos) {
  let tableClosePos = getTableClosePos(tokens, tableOpenPos);
  if (!isValidTablePos(tokens, tableOpenPos, tableClosePos) || !isValidCaption(tokens, tableClosePos)) {
    return tableOpenPos;
  }

  const [id, title] = getTableData(tokens, tableClosePos + 2);
  saveTable(state, { id, title });

  [tableOpenPos, tableClosePos] = injectFigureOpen(tokens, tableOpenPos, tableClosePos, id);
  tokens.forEach((token, idx) =>
    idx >= tableOpenPos && idx < tableClosePos + 3 ? (token.level += 1) : (token.level = token.level)
  );
  injectFigureCaption(state, { id, title }, tokens, tableClosePos);
  injectFigureClose(tokens, tableClosePos);

  return tableClosePos + 4;
}

function getTableClosePos(tokens, tableOpenPos) {
  return tokens.slice(tableOpenPos).findIndex(({ type }) => "table_close" === type) + tableOpenPos;
}

function processHtmlBlock(state, tokens, idx) {
  if (!isValidHtmlTable(tokens, idx) || !isValidCaption(tokens, idx)) return idx;

  const [id, title] = getTableData(tokens, idx + 2);
  saveTable(state, { id, title });

  [idx] = injectFigureOpen(tokens, idx, idx, id);
  tokens.forEach((token, idy) => {
    idy >= idx && idy < idx + 3 ? (token.level += 1) : (token.level = token.level);
  });
  injectFigureCaption(state, { id, title }, tokens, idx);
  injectFigureClose(tokens, idx);

  return idx + 4;
}

function injectFigureOpen(tokens, tableOpenPos, tableClosePos, id) {
  const tableOpen = tokens[tableOpenPos];
  let token = createFigureOpen({ id, block: tableOpen.block, level: tableOpen.level });
  tokens.splice(tableOpenPos, 0, token);
  return [tableOpenPos + 1, tableClosePos + 1];
}

function injectFigureCaption(state, table, tokens, tableClosePos) {
  injectFigureCaptionOpen(tokens, tableClosePos);
  // replaceWithFigureCaptionOpen(tokens, tableClosePos + 1);
  injectTableLabel(state, table, tokens, tableClosePos + 3);
  processTableCaption(tokens, tableClosePos + 3);
  injectFigureCaptionClose(tokens, tableClosePos);
  // replaceWithFigureCaptionClose(tokens, tableClosePos + 3);

  // let token = createFigureCaptionToken(state, table, position + 1, { level: 0 });
  // tokens.splice(idx + 1, 3, ...token);
}

function injectFigureClose(tokens, tableClosePos) {
  const tableClose = tokens[tableClosePos];
  const token = createFigureClose({ block: tableClose.block, level: tableClose.level });
  tokens.splice(tableClosePos + 6, 0, token);
}

function injectFigureCaptionOpen(tokens, tableClosePos) {
  let token = new Token("figure_caption_open", "figcaption", 1);
  token.block = true;
  token.level = tokens[tableClosePos].level;
  tokens.splice(tableClosePos + 1, 0, token);

  // token = new Token("paragraph_open", "p", 1);
  // token.block = true;
  // token.level * tokens[tableClosePos].level + 1;
  // tokens.splice(tableClosePos + 3, 0, token);
}

function injectFigureCaptionClose(tokens, tableClosePos) {
  let token = new Token("figure_caption_close", "figcaption", -1);
  token.block = true;
  token.level = tokens[tableClosePos].level - 1;
  tokens.splice(tableClosePos + 5, 0, token);
}

function replaceWithFigureCaptionOpen(tokens, idx) {
  const token = tokens[idx];
  token.block = true;
  token.type = "figure_caption_open";
  token.tag = "figcaption";
  token.nesting = 1;
}

function injectTableLabel(state, table, tokens, idx) {
  const labelTokens = [];
  const label = frontmatter(state, "label", "Table");
  const position = state.env.tables.list.findIndex(({ id }) => table.id === id);

  let token = new Token("table_label_open", "span", 1);
  token.block = false;
  token.level = 0;
  token.meta = { label, position: position + 1 };
  labelTokens.push(token);

  token = new Token("text", "", 0);
  token.block = false;
  token.level = 1;
  token.content = `${label} ${position + 1}`;
  labelTokens.push(token);

  token = new Token("table_label_close", "span", -1);
  token.block = false;
  token.level = 0;
  labelTokens.push(token);

  token = new Token("text", "", 0);
  token.block = false;
  token.level = 0;
  token.content = ": ";
  labelTokens.push(token);

  tokens[idx].children.unshift(...labelTokens);
}

function processTableCaption(tokens, idx) {
  const caption = tokens[idx].children[4];
  if (caption.content.split("#").length === 2) {
    caption.content = caption.content.split("#")[1];
  } else {
    caption.content = caption.content.substring(1);
  }
}

function replaceWithFigureCaptionClose(tokens, idx) {
  const token = tokens[idx];
  token.block = true;
  token.type = "figure_caption_close";
  token.tag = "figcaption";
  token.nesting = -1;
}

function createFigureCaptionToken(state, table, position, { block = true, level = 0 } = {}) {
  let tokens = [];
  let token, tokenChild;
  const label = frontmatter(state, "label", "Table");

  token = new Token("figure_caption_open", "figcaption", 1);
  token.block = block;
  token.level = level++;
  tokens.push(token);

  token = new Token("inline", "", 0);
  token.level = level;
  token.children = [];

  tokenChild = new Token("text", "", 0);
  tokenChild.content = label + " " + position + ": ";
  tokenChild.level = 0;
  token.children.push(tokenChild);

  const captionToken = [];
  state.md.inline.parse(table.title, state.md, state.env, captionToken);
  token.children.push(...captionToken);

  tokens.push(token);

  token = new Token("figure_caption_close", "figcaption", -1);
  token.block = block;
  token.level = --level;
  tokens.push(token);

  return tokens;
}

function createFigureOpen({ id, block = true, level = 0 } = {}) {
  const token = new Token("figure_open", "figure", 1);
  if (id) token.attrSet("id", id);
  token.level = level;
  token.block = block;
  return token;
}

function createFigureClose({ block = true, level = 0 } = {}) {
  const token = new Token("figure_close", "figure", -1);
  token.level = level;
  token.block = block;
  return token;
}

function createListSeparator({ block = true, className = "list-of-tables", level = 0 } = {}) {
  const token = new Token("hr", "hr", 0);
  token.attrSet("class", className);
  token.markup = "---";
  token.block = block;
  token.level = level;
  return token;
}

function createHeadingTokens(state, { block = true, level = 0 } = {}) {
  const headingLevel = 2;
  const headingId = "list-of-tables";
  const tokens = [];
  let token, tokenChild;

  token = new Token("heading_open", `h${headingLevel}`, 1);
  token.attrSet("id", headingId);
  token.markup = "#".repeat(headingLevel);
  token.block = block;
  token.level = level++;
  tokens.push(token);

  const title = frontmatter(state, "title", "List of Tables");
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

function createListOpening({ block = true, className = "list-of-tables", level = 0 } = {}) {
  const token = new Token("list_of_tables_open", "ul", 1);
  token.attrSet("class", className);
  token.block = block;
  token.level = level;
  token.markup = "*";
  return token;
}

function createListClosing({ block = true, level = 0 } = {}) {
  const token = new Token("list_of_tables_close", "ul", -1);
  token.block = block;
  token.level = level;
  token.markup = "*";
  return token;
}

function createListItemTokens(state, table, position, { block = true, level = 0 } = {}) {
  const tokens = [];
  let token, tokenChild;
  const label = frontmatter(state, "label", "Table");

  token = new Token("table_item_open", "li", 1);
  token.level = level++;
  token.markup = "*";
  token.block = block;
  tokens.push(token);

  token = new Token("paragraph_open", "p", 1);
  token.level = level++;
  token.block = block;
  tokens.push(token);

  token = new Token("inline", "", 0);
  token.level = level;
  token.block = false;
  token.content = `${label} ${position}: ${table.title}`;
  token.children = [];

  let levelChild = 0;
  tokenChild = new Token("link_open", "a", 1);
  tokenChild.level = levelChild++;
  tokenChild.attrSet("href", `#${table.id}`);
  token.children.push(tokenChild);

  tokenChild = new Token("text", "", 0);
  tokenChild.level = levelChild;
  tokenChild.content = `${label} ${position}`;
  token.children.push(tokenChild);

  tokenChild = new Token("link_close", "a", -1);
  tokenChild.level = levelChild--;
  token.children.push(tokenChild);

  tokenChild = new Token("text", "", 0);
  tokenChild.level = levelChild;
  tokenChild.content = ": ";
  token.children.push(tokenChild);

  let captionTokens = [];
  state.md.inline.parse(table.title, state.md, state.env, captionTokens);
  token.children.push(...captionTokens);

  tokens.push(token);

  token = new Token("paragraph_close", "p", -1);
  token.level = --level;
  token.block = block;
  tokens.push(token);

  token = new Token("figure_item_close", "li", -1);
  token.level = --level;
  token.block = block;
  tokens.push(token);

  return tokens;
}

module.exports = list_of_tables;
