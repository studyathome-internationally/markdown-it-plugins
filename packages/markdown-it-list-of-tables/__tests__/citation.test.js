const { join } = require("path");
const { readFileSync } = require("fs");

const MarkdownIt = require("markdown-it");
const MarkdownItPluginListOfTables = require("../index.js");

describe("citations", () => {
  it("simple citation", () => {
    const text = readFileSync(join(__dirname, "__cases__", "citation.1.md"), "utf8");
    const md = new MarkdownIt({ xhtmlOut: true, html: true });
    md.use(MarkdownItPluginListOfTables);
    const result = md.render(text);
    expect(result).toMatchInlineSnapshot(`
      <h1>Hello World</h1>
      <p>See <a href="#client-overview" class="table-citation">Table 1</a>.</p>
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
        <figcaption>Table 1: Client overview</figcaption>
      </figure>
      <hr class="list-of-tables" />
      <h2 id="list-of-tables">List of Tables</h2>
      <ul class="list-of-tables">
        <li><a href="#client-overview">Table 1</a>: Client overview</li>
      </ul>
    `);
  });
});
