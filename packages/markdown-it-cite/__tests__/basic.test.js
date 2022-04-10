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
    <h2 id="bibliography">Bibliography</h2>
    <ul class="bibliography">
      <li id="citation-1">
        <p>[1]: <a href="http://cds.cern.ch/record/270275/files/9780201529838_TOC.pdf">L<sup>A</sup>T<sub>E</sub>X: a Document <em>Preparation</em> System</a> (<a href="http://www.lamport.org/">Leslie <strong>Lamport</strong></a>)</p>
      </li>
      <li id="citation-2">
        <p>[2]: <a href="http://visualmatheditor.equatheque.net/doc/texbook.pdf">The <strong>TeX</strong> Book</a> (<a href="https://www-cs-faculty.stanford.edu/~knuth/">Donald E. Knuth</a> - <a href="https://creativecommons.org/licenses/by/4.0/">CC-BY 4.0</a>)</p>
      </li>
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
    <h2 id="bibliography">Bibliography</h2>
    <ul class="bibliography">
      <li id="citation-1">
        <p>[1]: <a href="http://cds.cern.ch/record/270275/files/9780201529838_TOC.pdf">L<sup>A</sup>T<sub>E</sub>X: a Document <em>Preparation</em> System</a> (<a href="http://www.lamport.org/">Leslie <strong>Lamport</strong></a>)</p>
      </li>
      <li id="citation-2">
        <p>[2]: <a href="http://visualmatheditor.equatheque.net/doc/texbook.pdf">The <strong>TeX</strong> Book</a> (<a href="https://www-cs-faculty.stanford.edu/~knuth/">Donald E. Knuth</a> - <a href="https://creativecommons.org/licenses/by/4.0/">CC-BY 4.0</a>)</p>
      </li>
    </ul>
    `);
  });

  it("citation with ISBN, DOI, and note", () => {
    const text = readFileSync(join(__dirname, "__cases__", "basic.3.md"), "utf8");
    const md = new MarkdownIt({ xhtmlOut: true, html: true });
    md.use(MarkdownItPluginCite, { sources: [join(__dirname, "example.bib")] });
    const result = md.render(text);
    expect(result).toMatchInlineSnapshot(`
    <p>Es wäre daher ein vollkommen falscher Blickwinkel, sie pauschal als Behinderte oder Patienten und nicht als Konsumenten zu betrachten [<a href="#citation-1" class="citation">1</a>].</p>
    <hr class="bibliography" />
    <h2 id="bibliography">Bibliography</h2>
    <ul class="bibliography">
      <li id="citation-1">
        <p>[1]: <a href="https://ebooks.iospress.nl/volumearticle/16948">Ergonomics and Ageing: The Role of Interactions</a> (Neil Charness, ISBN: 978-90-5199-367-7, 978-1-60750-892-2, DOI: <a href="https://doi.org/10.3233/978-1-60750-892-2-62">10.3233/978-1-60750-892-2-62</a>, PMID: 10186576 - <a href="https://creativecommons.org/licenses/by/4.0/">CC-BY 4.0</a>)</p>
      </li>
    </ul>
    `);
  });

  it("citation with ISBN only", () => {
    const text = readFileSync(join(__dirname, "__cases__", "basic.4.md"), "utf8");
    const md = new MarkdownIt({ xhtmlOut: true, html: true });
    md.use(MarkdownItPluginCite, { sources: [join(__dirname, "example.bib")] });
    const result = md.render(text);
    expect(result).toMatchInlineSnapshot(`
    <p>„Behinderte“ sind Menschen in allen Altersgruppen, die durch einen angeborenen oder erworbenen gesundheitlichen Schaden in der Ausübung der im entsprechenden Lebensalter üblichen Funktionen beeinträchtigt sind [<a href="#citation-1" class="citation">1</a>].</p>
    <hr class="bibliography" />
    <h2 id="bibliography">Bibliography</h2>
    <ul class="bibliography">
      <li id="citation-1">
        <p>[1]: Brockhaus-Enzyklopädie: Band 24, WEK-ZZ (ISBN: 3-7653-1124-3, 3-7653-1224-X)</p>
      </li>
    </ul>
    `);
  });
});
