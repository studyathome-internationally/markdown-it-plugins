const { join } = require("path");
const { readFileSync } = require("fs");

const MarkdownIt = require("markdown-it");
const MarkdownItPluginListOfTables = require("../index.js");

describe("HTML", () => {
  it("plain HTML", () => {
    const text = readFileSync(join(__dirname, "__cases__", "html.1.md"), "utf8");
    const md = new MarkdownIt({ xhtmlOut: true, html: true });
    md.use(MarkdownItPluginListOfTables);
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
          <p><span>Table 1</span>: Client overview</p>
        </figcaption>
      </figure>
      <hr class="list-of-tables" />
      <h2 id="list-of-tables">List of Tables</h2>
      <ul class="list-of-tables">
        <li>
          <p><a href="#client-overview">Table 1</a>: Client overview</p>
        </li>
      </ul>
    `);
  });

  it("plain HTML", () => {
    const text = readFileSync(join(__dirname, "__cases__", "html.2.md"), "utf8");
    const md = new MarkdownIt({ xhtmlOut: true, html: true });
    md.use(MarkdownItPluginListOfTables);
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
          <p><span>Table 1</span>: Client overview</p>
        </figcaption>
      </figure>
      <hr class="list-of-tables" />
      <h2 id="list-of-tables">List of Tables</h2>
      <ul class="list-of-tables">
        <li>
          <p><a href="#client-overview">Table 1</a>: Client overview</p>
        </li>
      </ul>
    `);
  });
});
