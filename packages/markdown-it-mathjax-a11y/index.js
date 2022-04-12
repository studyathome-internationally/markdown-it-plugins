const { mathjax } = require("mathjax-full/js/mathjax.js");
const { TeX } = require("mathjax-full/js/input/tex.js");
const { SVG } = require("mathjax-full/js/output/svg.js");
const { liteAdaptor } = require("mathjax-full/js/adaptors/liteAdaptor.js");
// const { browserAdaptor } = require("mathjax-full/js/adaptors/browserAdaptor.js");
// const { jsdomAdaptor } = require("mathjax-full/js/adaptors/jsdomAdaptor");
const { RegisterHTMLHandler } = require("mathjax-full/js/handlers/html.js");
const { AssistiveMmlHandler } = require("mathjax-full/js/a11y/assistive-mml.js");
// const { LazyHandler } = require("mathjax-full/js/ui/lazy/LazyHandler.js");
const { MenuHandler } = require("mathjax-full/js/ui/menu/MenuHandler.js");
const { AllPackages } = require("mathjax-full/js/input/tex/AllPackages.js");
const juice = require("juice/client");
// const { JSDOM } = require("jsdom");

// require("mathjax-full/js/ui/menu/")

// const MATHJAX_DEFAULT_FONT_URL = "https://cdn.jsdelivr.net/npm/mathjax@3.2.0/es5/output/chtml/fonts/woff-v2/";

/* This version is based on: https://github.com/tani/markdown-it-mathjax3 */

const math_jax = (md, opts) => {
  const documentOptions = {
    InputJax: new TeX({ packages: AllPackages }),
    // OutputJax: new CHTML({ fontURL: MATHJAX_DEFAULT_FONT_URL }),
    // OutputJax: new CHTML(),
    OutputJax: new SVG({ fontCache: "none" }),
  };
  const convertOptions = {
    display: false,
  };

  md.inline.ruler.after("escape", "math_inline", math_inline_rule(opts));
  md.block.ruler.after("blockquote", "math_block", math_block_rule(opts), {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
  md.renderer.rules.math_inline = math_inline_renderer(opts, documentOptions, convertOptions);
  md.renderer.rules.math_block = math_block_renderer(opts, documentOptions, convertOptions);
};

function math_inline_rule(opts) {
  const math_inline = (state, silent) => {
    if (state.src[state.pos] !== "$") {
      return false;
    }

    let res = isValidDelim(state, state.pos);
    if (!res.can_open) {
      if (!silent) {
        state.pending += "$";
      }
      state.pos += 1;
      return true;
    }

    // First check for and bypass all properly escaped delimieters
    // This loop will assume that the first leading backtick can not
    // be the first character in state.src, which is known since
    // we have found an opening delimieter already.
    const start = state.pos + 1;
    let match = start;
    while ((match = state.src.indexOf("$", match)) !== -1) {
      // Found potential $, look for escapes, pos will point to
      // first non escape when complete
      let pos = match - 1;
      while (state.src[pos] === "\\") {
        pos -= 1;
      }

      // Even number of escapes, potential closing delimiter found
      if ((match - pos) % 2 == 1) {
        break;
      }
      match += 1;
    }

    // No closing delimter found.  Consume $ and continue.
    if (match === -1) {
      if (!silent) {
        state.pending += "$";
      }
      state.pos = start;
      return true;
    }

    // Check if we have empty content, ie: $$.  Do not parse.
    if (match - start === 0) {
      if (!silent) {
        state.pending += "$$";
      }
      state.pos = start + 1;
      return true;
    }

    // Check for valid closing delimiter
    res = isValidDelim(state, match);
    if (!res.can_close) {
      if (!silent) {
        state.pending += "$";
      }
      state.pos = start;
      return true;
    }

    if (!silent) {
      const token = state.push("math_inline", "math", 0);
      token.markup = "$";
      token.content = state.src.slice(start, match);
    }

    state.pos = match + 1;
    return true;
  };
  return math_inline;
}

function math_block_rule(opts) {
  const math_block = (state, start, end, silent) => {
    let next, lastPos;
    let found = false,
      pos = state.bMarks[start] + state.tShift[start],
      max = state.eMarks[start],
      lastLine = "";

    if (pos + 2 > max) {
      return false;
    }
    if (state.src.slice(pos, pos + 2) !== "$$") {
      return false;
    }

    pos += 2;
    let firstLine = state.src.slice(pos, max);

    if (silent) {
      return true;
    }
    if (firstLine.trim().slice(-2) === "$$") {
      // Single line expression
      firstLine = firstLine.trim().slice(0, -2);
      found = true;
    }

    for (next = start; !found; ) {
      next++;

      if (next >= end) {
        break;
      }

      pos = state.bMarks[next] + state.tShift[next];
      max = state.eMarks[next];

      if (pos < max && state.tShift[next] < state.blkIndent) {
        // non-empty line with negative indent should stop the list:
        break;
      }

      if (state.src.slice(pos, max).trim().slice(-2) === "$$") {
        lastPos = state.src.slice(0, max).lastIndexOf("$$");
        lastLine = state.src.slice(pos, lastPos);
        found = true;
      }
    }

    state.line = next + 1;

    const token = state.push("math_block", "math", 0);
    token.block = true;
    token.content =
      (firstLine && firstLine.trim() ? firstLine + "\n" : "") +
      state.getLines(start + 1, next, state.tShift[start], true) +
      (lastLine && lastLine.trim() ? lastLine : "");
    token.map = [start, state.line];
    token.markup = "$$";
    return true;
  };
  return math_block;
}

function math_inline_renderer(opts, documentOptions, convertOptions) {
  return (tokens, idx, options, env /* , self */) => {
    convertOptions.display = false;
    return renderMath(tokens[idx].content, documentOptions, convertOptions).replace(
      "<mjx-container",
      "<mjx-container v-pre"
    );
  };
}

function math_block_renderer(opts, documentOptions, convertOptions) {
  return (tokens, idx, options, env /* , self */) => {
    convertOptions.display = true;
    return renderMath(tokens[idx].content, documentOptions, convertOptions).replace(
      "<mjx-container",
      "<mjx-container v-pre"
    );
  };
}

// Test if potential opening or closing delimieter
// Assumes that there is a "$" at state.src[pos]
function isValidDelim(state, pos) {
  let max = state.posMax,
    can_open = true,
    can_close = true;

  const prevChar = pos > 0 ? state.src.charCodeAt(pos - 1) : -1,
    nextChar = pos + 1 <= max ? state.src.charCodeAt(pos + 1) : -1;

  // Check non-whitespace conditions for opening and closing, and
  // check that closing delimeter isn't followed by a number
  if (
    prevChar === 0x20 /* " " */ ||
    prevChar === 0x09 /* \t */ ||
    (nextChar >= 0x30 /* "0" */ && nextChar <= 0x39) /* "9" */
  ) {
    can_close = false;
  }
  if (nextChar === 0x20 /* " " */ || nextChar === 0x09 /* \t */) {
    can_open = false;
  }

  return {
    can_open: can_open,
    can_close: can_close,
  };
}

function renderMath(content, documentOptions, convertOptions) {
  const adaptor = liteAdaptor();
  // const adaptor = browserAdaptor();
  // const adaptor = jsdomAdaptor(JSDOM);
  const handler = RegisterHTMLHandler(adaptor);
  const aHandler = AssistiveMmlHandler(handler);
  // const lHandler = LazyHandler(handler);
  // const mHandler = MenuHandler(handler);
  const mathDocument = mathjax.document(content, documentOptions);
  const html = adaptor.outerHTML(mathDocument.convert(content, convertOptions));
  const stylesheet = adaptor.outerHTML(documentOptions.OutputJax.styleSheet(mathDocument));
  return juice(html + stylesheet);
}

module.exports = math_jax;
