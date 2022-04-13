const { join } = require("path");
const { readFileSync } = require("fs");

const MarkdownIt = require("markdown-it");
const MarkdownItPluginListOfFigures = require("../index.js");

describe("basic functionality", () => {
  it("list of figures", () => {
    const text = readFileSync(join(__dirname, "__cases__", "basic.1.md"), "utf8");
    const md = new MarkdownIt({ xhtmlOut: true, html: true });
    md.use(MarkdownItPluginListOfFigures);
    const result = md.render(text);
    expect(result).toMatchInlineSnapshot(`
    <h1>Hello World</h1>
    <figure id="the-stormtroopocat"><img src="https://octodex.github.com/images/stormtroopocat.jpg" alt="Stormtroopocat" title="The Stormtroopocat" />
      <figcaption>
        <p><span>Figure 1</span>: The Stormtroopocat</p>
      </figcaption>
    </figure>
    <hr class="list-of-figures" />
    <h2 id="list-of-figures">List of Figures</h2>
    <ul class="list-of-figures">
      <li>
        <p><a href="#the-stormtroopocat">Figure 1</a>: The Stormtroopocat</p>
      </li>
    </ul>
    `);
  });

  it("list of figures with markup", () => {
    const text = readFileSync(join(__dirname, "__cases__", "basic.2.md"), "utf8");
    const md = new MarkdownIt({ xhtmlOut: true, html: true });
    md.use(MarkdownItPluginListOfFigures);
    const result = md.render(text);
    expect(result).toMatchInlineSnapshot(`
    <h1>Hello World</h1>
    <figure id="the-stormtroopocat"><img src="https://octodex.github.com/images/stormtroopocat.jpg" alt="Stormtroopocat" title="The Stormtroopocat" />
      <figcaption>
        <p><span>Figure 1</span>: The <strong>Stormtroopocat</strong></p>
      </figcaption>
    </figure>
    <hr class="list-of-figures" />
    <h2 id="list-of-figures">List of Figures</h2>
    <ul class="list-of-figures">
      <li>
        <p><a href="#the-stormtroopocat">Figure 1</a>: The <strong>Stormtroopocat</strong></p>
      </li>
    </ul>
    `);
  });

  it("list of figures with markup", () => {
    const text = readFileSync(join(__dirname, "__cases__", "basic.3.md"), "utf8");
    const md = new MarkdownIt({ xhtmlOut: true, html: true });
    md.use(MarkdownItPluginListOfFigures);
    const result = md.render(text);
    expect(result).toMatchInlineSnapshot(`
    <h1>Hello World</h1>
    <figure id="the-stormtroopocat"><img src="https://octodex.github.com/images/stormtroopocat.jpg" alt="Stormtroopocat" title="The Stormtroopocat" />
      <figcaption>
        <p><span>Figure 1</span>: <em>The</em> <strong>Stormtroopocat</strong></p>
      </figcaption>
    </figure>
    <hr class="list-of-figures" />
    <h2 id="list-of-figures">List of Figures</h2>
    <ul class="list-of-figures">
      <li>
        <p><a href="#the-stormtroopocat">Figure 1</a>: <em>The</em> <strong>Stormtroopocat</strong></p>
      </li>
    </ul>
    `);
  });
});
