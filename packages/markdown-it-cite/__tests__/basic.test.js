const { join } = require("path");
const { readFileSync } = require("fs");

const MarkdownIt = require("markdown-it");
const MarkdownItPluginCite = require("../index.js");

describe("basic functionality", () => {
  it("citation", () => {
    const text = readFileSync(join(__dirname, "__cases__", "basic.1.md"), "utf8");
    const md = new MarkdownIt({ xhtmlOut: true, html: true });
    md.use(MarkdownItPluginCite, { sources: [join(__dirname, "example.bib")] });
    const result = md.render(text);
    expect(result).toMatchInlineSnapshot(`
    <p>LaTeX [<a href="#citation-1" class="citation">1</a>] is a set of macros built atop TeX [<a href="#citation-2" class="citation">2</a>].</p>
    <hr class="bibliography" />
    <h2 id="bibliography-heading" class="bibliography">Bibliography</h2>
    <ul class="bibliography">
      <li id="citation-1">[1]: <a href="http://cds.cern.ch/record/270275/files/9780201529838_TOC.pdf">L<sup>A</sup>T<sub>E</sub>X: a Document <nocase><em>Preparation</em></nocase> System</a>(<a href="http://www.lamport.org/">Leslie <strong>Lamport</strong></a>)</li>
      <li id="citation-2">[2]: <a href="http://visualmatheditor.equatheque.net/doc/texbook.pdf">The <nocase><strong>TeX</strong></nocase> Book</a>(<a href="https://www-cs-faculty.stanford.edu/~knuth/">Donald E. Knuth</a> - <a href="https://creativecommons.org/licenses/by/4.0/">CC-BY 4.0</a>)</li>
    </ul>
    `);
  });

  it("citation", () => {
    const text = readFileSync(join(__dirname, "__cases__", "basic.2.md"), "utf8");
    const md = new MarkdownIt({ xhtmlOut: true, html: true });
    md.use(MarkdownItPluginCite, { sources: [join(__dirname, "example.bib")] });
    const result = md.render(text);
    expect(result).toMatchInlineSnapshot(`
    <p>LaTeX [<a href="#citation-1" class="citation">1</a>] is a set of macros built atop TeX [<a href="#citation-2" class="citation">2</a>,<a href="#citation-1" class="citation">1</a>].</p>
    <hr class="bibliography" />
    <h2 id="bibliography-heading" class="bibliography">Bibliography</h2>
    <ul class="bibliography">
      <li id="citation-1">[1]: <a href="http://cds.cern.ch/record/270275/files/9780201529838_TOC.pdf">L<sup>A</sup>T<sub>E</sub>X: a Document <nocase><em>Preparation</em></nocase> System</a>(<a href="http://www.lamport.org/">Leslie <strong>Lamport</strong></a>)</li>
      <li id="citation-2">[2]: <a href="http://visualmatheditor.equatheque.net/doc/texbook.pdf">The <nocase><strong>TeX</strong></nocase> Book</a>(<a href="https://www-cs-faculty.stanford.edu/~knuth/">Donald E. Knuth</a> - <a href="https://creativecommons.org/licenses/by/4.0/">CC-BY 4.0</a>)</li>
    </ul>
    `);
  });
});
