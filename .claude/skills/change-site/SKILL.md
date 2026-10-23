---
name: change-site
description: The process for changing the site's code rather than game content: site/app.js, site/index.html, scripts/build.mjs, scripts/test.mjs, the schema, CI, SEO output, offline mode. Use for any feature, fix or refactor outside games/*.json.
---

# Changing the site

The site is three files and a build: `site/index.html` (styles and the head), `site/app.js` (views and browser behaviour), `scripts/build.mjs` (validation, pre-rendering, text pages, SEO files, offline mode), plus `scripts/test.mjs` (the sanity test). Read `CLAUDE.md` first, especially the codebase rules.

## Process
1. **Read the code you're about to touch**, not only the part you plan to change. Most changes affect three places: the page view, the text version, and the build or SEO.
2. **Plan in one line** which files change, and what the test should check afterwards.
3. **Make the change** following the rules below.
4. **Add or update a check in `scripts/test.mjs`** when the change can break in a way the test doesn't catch yet. Example: a new link, a new file in `dist/`, a new section.
5. **`npm test`:** must pass.
6. **Look:** `npm run serve`. Open the home page and a game page affected by the change, once at desktop width and once at phone width (375), and check the browser console has no errors. If the change involves search or filters, try them.
7. **Commit, push, check the deploy and the live page** (see `CLAUDE.md`).

## Rules
- **Views are pure strings.** `listHTML` and `gameHTML` take no input from the DOM, so the build can run them in Node. Anything that touches `document`, `window`, `localStorage` or `matchMedia` goes inside `if (typeof document !== "undefined")`.
- **The same HTML everywhere:** the pre-render and the browser render use the same functions and the same data (`DATA` includes `repo`, `base`, `page`). Something missing from the data passed to the pre-render shows up as `undefined` in the HTML, and the test catches it.
- **Links:**
  - in `app.js`, through `homeHref`, `gameHref(id)` and `BASE`, never a hard-coded path;
  - in the text pages, relative paths;
  - the preview (`preview.html`) uses `#id`.
- **Interface text** goes in `i18n/he.json`, never in code.
- **CSS:** only through the tokens in `:root`, for both themes. Text-only mode (`.text-mode`) needs a rule for every new component.
- **Escaping:** every piece of text from data goes through `esc()` in the page and `escHtml()` in the build. Characters inside regexes are written as `\u` escapes.
- **Performance:** no library. The test enforces the size budgets. A large addition calls for a check that it's really needed.
- **Offline mode:** pages load from the network first and the saved copy only offline. Never change that to cache-first for HTML.
- **SEO:** a new file in `dist/` that should be indexed goes into the sitemap, and the test checks it. Every page has a canonical link.

## Hard-won lessons
- A pre-render without `repo` produced `undefined` links that the browser render hid.
- An offline mode that served pages cache-first left returning visitors seeing old text.
- Two sessions editing the same folder: stage only your own files, and pull before you push.
