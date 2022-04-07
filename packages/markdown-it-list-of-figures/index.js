const Token = require("markdown-it/lib/token");

const list_of_figures = (md, opts) => {
  md.inline.ruler.after("text", "figure_citation", figure_citation_rule(opts));
  md.renderer.rules.figure_citation = figure_citation_renderer(opts);
  md.core.ruler.after("inline", "figure", figure_rule(opts));
  md.core.ruler.before("smartquotes", "figure_list", figure_list_rule(opts));
};

function figure_citation_rule(opts) {
  const figure_citation = (state, silent) => {
    if (silent) return false;
    const { tokens, posMax: max, pos: start } = state;

    // should be at least 5 chars - "<<x>>"
    if (start + 4 > max) return false;

    if (state.src.charCodeAt(start) !== 0x3c /* < */) return false;
    if (state.src.charCodeAt(start + 1) !== 0x3c /* < */) return false;
    if (state.src.charCodeAt(start + 2) !== 0x66 /* f */) return false;
    if (state.src.charCodeAt(start + 3) !== 0x69 /* i */) return false;
    if (state.src.charCodeAt(start + 4) !== 0x67 /* g */) return false;
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
    if (pos === start + 2) {
      return false;
    }

    if (state.pending) {
      state.pushPending();
    }

    let figure = state.src.slice(start + 6, pos);
    let token = new Token("figure_citation", "", 0);
    token.content = figure;
    token.meta = { id: figure };
    tokens.push(token);

    state.pos = pos + 2;
    state.posMax = max;
    return true;
  };
  return figure_citation;
}

function figure_citation_renderer(opts) {
  return (tokens, idx, options, env /* , self */) => {
    const token = tokens[idx];
    const id = token.meta.id;

    if (id && env && env.figures && env.figures.list) {
      const index = env.figures.list.findIndex((figure) => figure.id === id);
      if (index > -1) {
        const label = frontmatter({ env }, "label", "Figure");
        return `<a href="#${id}" class="figure-citation">${label} ${index + 1}</a>`;
      }
    }

    return `&lt;&lt;${token.meta.id}&gt;&gt;`;
  };
}

function figure_rule(opts) {
  const figure = (state) => {
    const tokens = state.tokens;
    for (const token of tokens) {
      if (token.type !== "inline") continue;
      for (let idx = 0; idx < token.children.length; idx++) {
        const tokenChild = token.children[idx];
        if (tokenChild.type !== "image") continue;
        const titleContent = tokenChild.attrGet("title");
        if (!titleContent) continue;

        let id = slugify(titleContent);
        let title = titleContent;

        if (titleContent.split("#").length === 2) {
          [id, title] = titleContent.split("#");
        }

        if (!state.env.figures) {
          state.env.figures = {};
        }

        if (!state.env.figures.list) {
          state.env.figures.list = [];
        }

        if (!state.env.figures.list.includes(id)) {
          state.env.figures.list.push({
            id,
            title,
          });
        }

        const figureTokens = [];
        let token2 = new Token("figure_open", "figure", 1);
        token2.attrSet("id", id);
        token2.block = true;
        figureTokens.push(token2);

        const titleTokens = state.md.parseInline(title, state.env).find(({ type }) => "inline" === type);
        let newTitle = titleTokens.children
          .filter(({ type }) => "text" === type)
          .map(({ content }) => content)
          .join("");

        tokenChild.attrSet("title", newTitle);
        figureTokens.push(tokenChild);

        token2 = new Token("figure_caption_open", "figcaption", 1);
        figureTokens.push(token2);

        const position = state.env.figures.list.findIndex((figure) => figure.id === id);
        const label = frontmatter(state, "label", "Figure");
        token2 = new Token("text", "", 0);
        token2.content = label + " " + (position + 1) + ": ";
        figureTokens.push(token2);

        figureTokens.push(...titleTokens.children);

        token2 = new Token("figure_caption_close", "figcaption", -1);
        figureTokens.push(token2);

        token2 = new Token("figure_close", "figure", -1);
        token2.block = true;
        figureTokens.push(token2);

        token.children.splice(idx, 1, ...figureTokens);
        idx += figureTokens.length - 1;
      }
    }
  };
  return figure;
}

function figure_list_rule(opts) {
  const figure_list = (state) => {
    if (state.inlineMode || !state.env.figures || !state.env.figures.list || !state.env.figures.list.length > 0) {
      return false;
    }

    const tokens = state.tokens;
    let token, tokenChild;

    token = new Token("hr", "hr", 0);
    token.attrSet("class", "list-of-figures");
    token.markup = "---";
    token.block = true;
    tokens.push(token);

    token = new Token("heading_open", "h2", 1);
    token.attrSet("id", "list-of-figures");
    token.markup = "##";
    token.block = true;
    tokens.push(token);

    token = new Token("inline", "", 0);
    tokenChild = new Token("text", "", 0);
    const title = frontmatter(state, "title", "List of Figures");
    tokenChild.content = title;
    token.children = [tokenChild];
    token.content = title;
    tokens.push(token);

    token = new Token("heading_close", "h2", -1);
    token.markup = "##";
    token.block = true;
    tokens.push(token);

    token = new Token("list_of_figures_open", "ul", 1);
    token.attrSet("class", "list-of-figures");
    token.block = true;
    tokens.push(token);

    for (const [idx, figure] of state.env.figures.list.entries()) {
      token = new Token("figure_item_open", "li", 1);
      token.block = true;
      tokens.push(token);

      token = new Token("inline", "", 0);
      token.children = [];

      tokenChild = new Token("link_open", "a", 1);
      tokenChild.attrSet("href", `#${figure.id}`);
      token.children.push(tokenChild);

      tokenChild = new Token("text", "", 0);
      const label = frontmatter(state, "label", "Figure");
      tokenChild.content = label + " " + (idx + 1);
      token.children.push(tokenChild);

      tokenChild = new Token("link_close", "a", -1);
      token.children.push(tokenChild);

      tokenChild = new Token("text", "", 0);
      tokenChild.content = ": ";
      token.children.push(tokenChild);

      const titleTokens = state.md.parseInline(figure.title, state.env).find(({ type }) => "inline" === type);
      token.children.push(...titleTokens.children);

      tokens.push(token);

      token = new Token("figure_item_close", "li", -1);
      token.block = true;
      tokens.push(token);
    }

    token = new Token("list_of_figures_close", "ul", -1);
    tokens.push(token);
  };
  return figure_list;
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
  const frontmatterKey = "list-of-figures";
  return state &&
    state.env &&
    state.env.frontmatter &&
    state.env.frontmatter[frontmatterKey] &&
    state.env.frontmatter[frontmatterKey][key]
    ? state.env.frontmatter[frontmatterKey][key]
    : alternative;
}

module.exports = list_of_figures;
