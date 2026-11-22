<div align="center">
  <img src="roshan.svg" width="76" height="76" alt="" />
  <h1>Roshan | روشن</h1>
  <p><strong>From Words to Understanding</strong></p>
  <p>A browser-based study companion for learning words, checking recall, and reading Persian at your own pace.</p>
  <p><a href="https://morgan-bros.github.io/roshan-demo/"><strong>Open Roshan →</strong></a></p>
</div>

---

## Find your next five minutes

| Mode | What to do |
| --- | --- |
| **Study** | Flip a Persian vocabulary card to check its meaning. |
| **Quiz** | Pick an answer, get immediate feedback, and try again. |
| **Timed reading** | Choose your level, read against the clock, then answer questions and check the English review. |

Roshan is a Persian word for *bright* or *clear*. The public edition is a small, standalone demo built with original practice material. It is not the private course package or an official training resource.

## Run it locally

No build step, dependencies, or account needed. Open `index.html` in a browser, or serve the folder over HTTP:

```sh
python -m http.server 8000
```

Then open `http://localhost:8000`. The site also works when served under a project subdirectory on GitHub Pages.

## Privacy and scope

Roshan saves practice progress in this browser. There are no accounts, analytics, or uploaded progress. Optional pronunciation works only if the browser has a local Persian voice; Roshan does not send sample text to a speech service. The public demo does not include private lessons, third-party recordings, or the local authoring pipeline.

```text
index.html  Page shell
style.css   Layout and visual design
app.js      Study, quiz, reading, and sample content
roshan.svg  Roshan mark
```
