const { join } = require("path");
const { readFileSync } = require("fs");

const MarkdownIt = require("markdown-it");
const MarkdownItPluginAnchor = require("markdown-it-anchor");
const MarkdownItPluginAttributionReferences = require("./../index.js");

describe("interoperability", () => {
  it("markdown-it-anchor", () => {
    const text = readFileSync(join(__dirname, "__cases__", "basic.1.md"), "utf8");
    const md = new MarkdownIt({ xhtmlOut: true, html: true });
    md.use(MarkdownItPluginAttributionReferences, {
      sources: [
        {
          key: "wiki:markdown",
          author: ["Wikipedia Authors", "https://en.wikipedia.org/w/index.php?title=Markdown&action=history"],
          title: ["Markdown", "https://en.wikipedia.org/w/index.php?title=Markdown&oldid=975764292"],
          license: ["Creative Commons: Attribution-ShareAlike 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"]
        }
      ]
    });
    md.use(MarkdownItPluginAnchor, {
      permalink: true,
      permalinkBefore: true,
      permalinkSymbol: "#",
    });
    const result = md.render(text);
    expect(result).toMatchInlineSnapshot(`
      <h1 id="markdown"><a class="header-anchor" href="#markdown">#</a> Markdown</h1>
      <div id="wiki_markdown__1" class="parent">
        <div class="child">
          <p>Markdown is a lightweight markup language with plain-text-formatting syntax, created in 2004 by John Gruber with Aaron Swartz.
            Markdown is often used for formatting readme files, for writing messages in online discussion forums, and to create rich text using a plain text editor.</p>
        </div>
        <p><a href="#wiki_markdown__1" class="anchor">§</a>[<a href="#wiki_markdown" class="label">1</a>]</p>
      </div>
      <h2 id="list-of-attributions" class="list"><a class="header-anchor" href="#list-of-attributions">#</a> List of Attributions</h2>
      <ol class="list">
        <li id="wiki_markdown" class="item"><span class="label">[1]</span>: <a href="https://en.wikipedia.org/w/index.php?title=Markdown&amp;oldid=975764292" class="title">Markdown</a> (By: <a href="https://en.wikipedia.org/w/index.php?title=Markdown&amp;action=history" class="author">Wikipedia Authors</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/" class="license">Creative Commons: Attribution-ShareAlike 4.0</a>)</li>
      </ol>
    `);
  });
});
