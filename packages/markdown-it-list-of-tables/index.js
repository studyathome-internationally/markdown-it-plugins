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

    // should be at least 5 chars - "<<x>>"
    if (start + 4 > max) return false;

    if (state.src.charCodeAt(start) !== 0x3c /* < */) return false;
    if (state.src.charCodeAt(start + 1) !== 0x3c /* < */) return false;
    if (state.src.charCodeAt(start + 2) !== 0x74 /* t */) return false;
    if (state.src.charCodeAt(start + 3) !== 0x61 /* a */) return false;
    if (state.src.charCodeAt(start + 4) !== 0x62 /* b */) return false;
    if (state.src.charCodeAt(start + 5) !== 0x3a /* : */) return false;

    let pos = start + 6;
    for (; pos < max - 1; pos++) {
      if (state.src.charCodeAt(pos) === 0x20 /*   */) {
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

    if (state.pending) {
      state.pushPending();
    }

    let table = state.src.slice(start + 6, pos);
    let token = new Token("table_citation", "", 0);
    token.content = table;
    token.meta = { id: table };
    tokens.push(token);

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
      let token = tokens[idx],
        tokenChild;
      if (token.type !== "table_open" && token.type !== "html_block") continue;
      if (token.type === "table_open") {
        const tableOpenPos = idx;
        const tableClosePos = tokens.slice(tableOpenPos).findIndex(({ type }) => "table_close" === type) + idx;
        if (tableClosePos < 0 || tableClosePos <= tableOpenPos || tableClosePos > tokens.length) continue;
        if (tokens[tableClosePos + 1].type !== "paragraph_open") continue;
        const caption = tokens[tableClosePos + 2];
        // if (caption.children.length !== 1) continue;
        if (caption.content.charCodeAt(0) !== 0x2e /* . */) continue;
        if (isSpace(caption.content.charCodeAt(0))) continue;
        const captionText = caption.content.substring(1);

        let id = slugify(captionText);
        let title = captionText;

        if (captionText.split("#").length === 2) {
          [id, title] = captionText.split("#");
        }

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

        const tableFigureTokens = [];
        token = new Token("figure_open", "figure", 1);
        token.attrSet("id", id);
        token.block = true;
        tableFigureTokens.push(token);

        const table = tokens.slice(tableOpenPos, tableClosePos + 1);
        tableFigureTokens.push(...table);

        token = new Token("figure_caption_open", "figcaption", 1);
        tableFigureTokens.push(token);

        token = new Token("inline", "", 0);
        token.children = [];

        const position = state.env.tables.list.findIndex((table) => table.id === id);
        const label = frontmatter(state, "label", "Table");
        tokenChild = new Token("text", "", 0);
        tokenChild.content = label + " " + (position + 1) + ": ";
        token.children.push(tokenChild);

        const titleTokens = state.md.parseInline(title, state.env).find(({ type }) => "inline" === type);
        token.children.push(...titleTokens.children);

        tableFigureTokens.push(token);

        token = new Token("figure_caption_close", "figcaption", -1);
        token.block = true;
        tableFigureTokens.push(token);

        token = new Token("figure_close", "figure", -1);
        token.block = true;
        tableFigureTokens.push(token);

        tokens.splice(tableOpenPos, tableClosePos + 1 - tableOpenPos + 3, ...tableFigureTokens);
        idx += tableFigureTokens.length - 1;
      } else if (token.type === "html_block") {
        if (!token.content.startsWith("<table>")) continue;
        if (!token.content.endsWith("</table>\n")) continue;
        if (tokens[idx + 1].type !== "paragraph_open") continue;
        const caption = tokens[idx + 2];
        if (caption.content.charCodeAt(0) !== 0x2e /* . */) continue;
        if (isSpace(caption.content.charCodeAt(0))) continue;
        const captionText = caption.content.substring(1);

        let id = slugify(captionText);
        let title = captionText;

        if (captionText.split("#").length === 2) {
          [id, title] = captionText.split("#");
        }

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

        const tableFigureTokens = [];
        token = new Token("figure_open", "figure", 1);
        token.attrSet("id", id);
        token.block = true;
        tableFigureTokens.push(token);

        const table = tokens[idx];
        tableFigureTokens.push(table);

        token = new Token("figure_caption_open", "figcaption", 1);
        tableFigureTokens.push(token);

        token = new Token("inline", "", 0);
        token.children = [];

        const position = state.env.tables.list.findIndex((table) => table.id === id);
        const label = frontmatter(state, "label", "Table");
        tokenChild = new Token("text", "", 0);
        tokenChild.content = label + " " + (position + 1) + ": ";
        token.children.push(tokenChild);

        const titleTokens = state.md.parseInline(title, state.env).find(({ type }) => "inline" === type);
        token.children.push(...titleTokens.children);

        tableFigureTokens.push(token);

        token = new Token("figure_caption_close", "figcaption", -1);
        token.block = true;
        tableFigureTokens.push(token);

        token = new Token("figure_close", "figure", -1);
        token.block = true;
        tableFigureTokens.push(token);

        tokens.splice(idx, 4, ...tableFigureTokens);

        let a = token.content;
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
    let token, tokenChild;

    token = new Token("hr", "hr", 0);
    token.attrSet("class", "list-of-tables");
    token.markup = "---";
    token.block = true;
    tokens.push(token);

    token = new Token("heading_open", "h2", 1);
    token.attrSet("id", "list-of-tables");
    token.markup = "##";
    token.block = true;
    tokens.push(token);

    token = new Token("inline", "", 0);
    tokenChild = new Token("text", "", 0);
    const title = frontmatter(state, "title", "List of Tables");
    tokenChild.content = title;
    token.children = [tokenChild];
    token.content = title;
    tokens.push(token);

    token = new Token("heading_close", "h2", -1);
    token.markup = "##";
    token.block = true;
    tokens.push(token);

    token = new Token("list_of_tables_open", "ul", 1);
    token.attrSet("class", "list-of-tables");
    token.block = true;
    tokens.push(token);

    for (const [idx, table] of state.env.tables.list.entries()) {
      token = new Token("table_item_open", "li", 1);
      token.block = true;
      tokens.push(token);

      token = new Token("inline", "", 0);
      token.children = [];

      tokenChild = new Token("link_open", "a", 1);
      tokenChild.attrSet("href", `#${table.id}`);
      token.children.push(tokenChild);

      tokenChild = new Token("text", "", 0);
      const label = frontmatter(state, "label", "Table");
      tokenChild.content = label + " " + (idx + 1);
      token.children.push(tokenChild);

      tokenChild = new Token("link_close", "a", -1);
      token.children.push(tokenChild);

      tokenChild = new Token("text", "", 0);
      tokenChild.content = ": ";
      token.children.push(tokenChild);

      const titleTokens = state.md.parseInline(table.title, state.env).find(({ type }) => "inline" === type);
      token.children.push(...titleTokens.children);

      tokens.push(token);

      token = new Token("table_item_close", "li", -1);
      token.block = true;
      tokens.push(token);
    }

    token = new Token("list_of_tables_close", "ul", -1);
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

module.exports = list_of_tables;
