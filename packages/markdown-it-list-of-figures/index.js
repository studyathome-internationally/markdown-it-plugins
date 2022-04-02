const Token = require("markdown-it/lib/token");

const list_of_figures = (md, opts) => {
  md.core.ruler.push("figure", figure_rule(opts));
  md.core.ruler.push("figure-list", figure_list_rule(opts));
};

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

        const titleTokens = state.md.parseInline(title, { ...state.env, figures: {} });
        let newTitle = "";
        for (const titleToken of titleTokens) {
          newTitle += titleToken.children
            .filter(({ type }) => "text" === type)
            .map(({ content }) => content)
            .join("");
        }
        tokenChild.attrSet("title", newTitle);
        figureTokens.push(tokenChild);

        token2 = new Token("figure_caption_open", "figcaption", 1);
        figureTokens.push(token2);

        const position = state.env.figures.list.findIndex((figure) => figure.id === id);
        token2 = new Token("text", "", 0);
        token2.content = `Figure ${position + 1}: `;
        figureTokens.push(token2);

        for (const titleToken of titleTokens) {
          figureTokens.push(...titleToken.children);
        }

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
    if (!state.env.figures || !state.env.figures.list || !state.env.figures.list.length > 0) {
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
    tokenChild.content = "List of Figures";
    token.children = [tokenChild];
    token.content = "List of Figures";
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
      tokenChild.content = `Figure ${idx + 1}`;
      token.children.push(tokenChild);

      tokenChild = new Token("link_close", "a", -1);
      token.children.push(tokenChild);

      tokenChild = new Token("text", "", 0);
      tokenChild.content = ": ";
      token.children.push(tokenChild);

      const titleTokens = state.md.parseInline(figure.title, { ...state.env, figures: {} });
      for (const titleToken of titleTokens) {
        token.children.push(...titleToken.children);
      }

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

module.exports = list_of_figures;
