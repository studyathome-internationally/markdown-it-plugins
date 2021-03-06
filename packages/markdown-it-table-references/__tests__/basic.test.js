const { join } = require("path");
const { readFileSync } = require("fs");

const MarkdownIt = require("markdown-it");
const MarkdownItPluginTableReferences = require("./../index.js");

describe("basic functionality", () => {
  it("no caption", () => {
    const text = readFileSync(join(__dirname, "__cases__", "basic.0.md"), "utf8");
    const md = new MarkdownIt({ xhtmlOut: true, html: true });
    md.use(MarkdownItPluginTableReferences);
    const result = md.render(text);
    expect(result).toMatchInlineSnapshot(`
      <h1>Hello World</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Client</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Alice</td>
            <td>Mobile</td>
          </tr>
          <tr>
            <td>Bob</td>
            <td>Desktop</td>
          </tr>
        </tbody>
      </table>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Server</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Chris</td>
            <td>nginx</td>
          </tr>
          <tr>
            <td>Debra</td>
            <td>apache</td>
          </tr>
        </tbody>
      </table>
      <p>New paragraph.</p>
    `);
  });

  it("automatic id insertion", () => {
    const text = readFileSync(join(__dirname, "__cases__", "basic.1.md"), "utf8");
    const md = new MarkdownIt({ xhtmlOut: true, html: true });
    md.use(MarkdownItPluginTableReferences);
    const result = md.render(text);
    expect(result).toMatchInlineSnapshot(`
      <h1>Hello World</h1>
      <figure id="client-overview">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Client</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Alice</td>
              <td>Mobile</td>
            </tr>
            <tr>
              <td>Bob</td>
              <td>Desktop</td>
            </tr>
          </tbody>
        </table>
        <figcaption>
          <a href="#client-overview" class="anchor">??</a><a href="#client-overview" class="label">Table 1</a>: Client overview
        </figcaption>
      </figure>
      <h2 id="list-of-tables" class="list">List of Tables</h2>
      <ol class="list">
        <li class="item"><a href="#client-overview" class="label">Table 1</a>: Client overview</li>
      </ol>
    `);
  });

  it("manual id insertion", () => {
    const text = readFileSync(join(__dirname, "__cases__", "basic.2.md"), "utf8");
    const md = new MarkdownIt({ xhtmlOut: true, html: true });
    md.use(MarkdownItPluginTableReferences);
    const result = md.render(text);
    expect(result).toMatchInlineSnapshot(`
      <h1>Hello World</h1>
      <figure id="overview">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Client</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Alice</td>
              <td>Mobile</td>
            </tr>
            <tr>
              <td>Bob</td>
              <td>Desktop</td>
            </tr>
          </tbody>
        </table>
        <figcaption>
          <a href="#overview" class="anchor">??</a><a href="#overview" class="label">Table 1</a>: Client overview
        </figcaption>
      </figure>
      <h2 id="list-of-tables" class="list">List of Tables</h2>
      <ol class="list">
        <li class="item"><a href="#overview" class="label">Table 1</a>: Client overview</li>
      </ol>
    `);
  });

  it("multiple tables", () => {
    const text = readFileSync(join(__dirname, "__cases__", "basic.3.md"), "utf8");
    const md = new MarkdownIt({ xhtmlOut: true, html: true });
    md.use(MarkdownItPluginTableReferences);
    const result = md.render(text);
    expect(result).toMatchInlineSnapshot(`
      <h1>Hello World</h1>
      <figure id="client-overview">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Client</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Alice</td>
              <td>Mobile</td>
            </tr>
            <tr>
              <td>Bob</td>
              <td>Desktop</td>
            </tr>
          </tbody>
        </table>
        <figcaption>
          <a href="#client-overview" class="anchor">??</a><a href="#client-overview" class="label">Table 1</a>: Client overview
        </figcaption>
      </figure>
      <figure id="server-overview">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Server</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Chris</td>
              <td>nginx</td>
            </tr>
            <tr>
              <td>Debra</td>
              <td>apache</td>
            </tr>
          </tbody>
        </table>
        <figcaption>
          <a href="#server-overview" class="anchor">??</a><a href="#server-overview" class="label">Table 2</a>: Server overview
        </figcaption>
      </figure>
      <h2 id="list-of-tables" class="list">List of Tables</h2>
      <ol class="list">
        <li class="item"><a href="#client-overview" class="label">Table 1</a>: Client overview</li>
        <li class="item"><a href="#server-overview" class="label">Table 2</a>: Server overview</li>
      </ol>
    `);
  });
});
