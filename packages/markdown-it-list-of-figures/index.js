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
    const { posMax: max, pos: start } = state;

    // should be at least 9 chars - "<<fig:x>>"
    if (start + 8 > max) return false;

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

    let figure = state.src.slice(start + 6, pos);
    let token = state.push("figure_citation", "", 0);
    token.content = figure;
    token.meta = { id: figure };

    state.pos = pos + 2;
    state.posMax = max;
    return true;
  };
  return figure_citation;
}

function figure_citation_renderer(opts) {
  return (tokens, idx, options, env /* , self */) => {
    const token = tokens[idx];
    if (token.hidden) return "";
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

    for (let idx = 0; idx < tokens.length; idx++) {
      if (!isValidTokenTriplet(tokens, idx)) continue;

      const [id, title] = getFigureData(tokens, idx + 1);
      saveFigure(state, { id, title });

      replaceWithFigureOpen(tokens, idx, { id });
      injectFigureCaption(tokens, idx + 1, state, { id, title });
      replaceWithFigureClose(tokens, idx + 2);
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
    let token;

    token = createListSeparator();
    tokens.push(token);

    token = createHeadingTokens(state);
    tokens.push(...token);

    token = createListOpening();
    tokens.push(token);

    for (const [idx, figure] of state.env.figures.list.entries()) {
      token = createListItemTokens(state, figure, idx + 1, { level: 1 });
      tokens.push(...token);
    }

    token = createListClosing();
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

function isValidTokenTriplet(tokens, idx) {
  if (idx + 2 >= tokens.length) return false;
  return (
    "paragraph_open" === tokens[idx].type &&
    "inline" === tokens[idx + 1].type &&
    1 === tokens[idx + 1].children.length &&
    "image" === tokens[idx + 1].children[0].type &&
    "paragraph_close" === tokens[idx + 2].type
  );
}

function getFigureData(tokens, idx) {
  const token = tokens[idx].children[0];
  const titleContent = token.attrGet("title");
  let id = slugify(titleContent);
  let title = titleContent;

  if (titleContent.split("#").length === 2) {
    [id, title] = titleContent.split("#");
  }
  return [id, title];
}

function saveFigure(state, { id, title }) {
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
}

function replaceWithFigureOpen(tokens, idx, { id }) {
  const token = tokens[idx];
  token.block = true;
  token.type = "figure_open";
  token.tag = "figure";
  token.nesting = 1;
  if (id) token.attrSet("id", id);
}

function injectFigureCaption(tokens, idx, state, { id, title }) {
  const children = tokens[idx].children;
  const image = children[0];

  const captionTokens = [];
  state.md.inline.parse(title, state.md, state.env, captionTokens);

  // Update image title with text only.
  const titleText = captionTokens
    .filter(({ type }) => "text" === type)
    .map(({ content }) => content)
    .join("");
  image.attrSet("title", titleText);

  let token = new Token("figure_caption_open", "figcaption", 1);
  token.level = image.level;
  children.push(token);

  const position = state.env.figures.list.findIndex((figure) => figure.id === id);
  const label = frontmatter(state, "label", "Figure");

  token = new Token("text", "", 0);
  token.level = image.level + 1;
  token.content = `${label} ${position + 1}: `;
  children.push(token);

  captionTokens.forEach(({ level }) => (level += image.level + 1));
  children.push(...captionTokens);

  token = new Token("figure_caption_close", "figcaption", -1);
  token.level = image.level;
  children.push(token);
}

function replaceWithFigureClose(tokens, idx) {
  const token = tokens[idx];
  token.block = true;
  token.type = "figure_close";
  token.tag = "figure";
  token.nesting = -1;
}

function createListSeparator({ block = true, className = "list-of-figures", level = 0 } = {}) {
  const token = new Token("hr", "hr", 0);
  token.attrSet("class", className);
  token.markup = "---";
  token.block = block;
  token.level = level;
  return token;
}

function createHeadingTokens(state, { block = true, level = 0 } = {}) {
  const headingLevel = 2;
  const headingId = "list-of-figures";
  const tokens = [];
  let token, tokenChild;

  token = new Token("heading_open", `h${headingLevel}`, 1);
  token.attrSet("id", headingId);
  token.markup = "#".repeat(headingLevel);
  token.block = block;
  token.level = level++;
  tokens.push(token);

  const title = frontmatter(state, "title", "List of Figures");
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

function createListOpening({ block = true, className = "list-of-figures", level = 0 } = {}) {
  const token = new Token("list_of_figures_open", "ul", 1);
  token.attrSet("class", className);
  token.block = block;
  token.level = level;
  token.markup = "*";
  return token;
}

function createListClosing({ block = true, level = 0 } = {}) {
  const token = new Token("list_of_figures_close", "ul", -1);
  token.block = block;
  token.level = level;
  token.markup = "*";
  return token;
}

function createListItemTokens(state, figure, position, { block = true, level = 0 } = {}) {
  const tokens = [];
  let token, tokenChild;
  const label = frontmatter(state, "label", "Figure");

  token = new Token("figure_item_open", "li", 1);
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
  token.block = block;
  token.content = `${label} ${position}: ${figure.title}`;
  token.children = [];

  let levelChild = 0;
  tokenChild = new Token("link_open", "a", 1);
  tokenChild.level = levelChild++;
  tokenChild.attrSet("href", `#${figure.id}`);
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
  state.md.inline.parse(figure.title, state.md, state.env, captionTokens);
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

module.exports = list_of_figures;
