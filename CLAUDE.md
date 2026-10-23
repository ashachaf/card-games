# CLAUDE.md: Card Games (משחקי קלפים)

A Hebrew-first site of card games for **regular playing cards**, explained so anyone can play on the first try. Live at https://card-games.win, built from this repo by GitHub Actions. Every rule here applies to every change, however small.

## Read first
1. This file: the process and the codebase rules.
2. The skill for the job. Skills live in `.claude/skills/`. If your session doesn't list them (for example it started in another folder), read the `SKILL.md` files directly.

| Job | Skill |
|---|---|
| Add a game, or change a game's rules or text | `add-card-game`, which uses the three below |
| How a game page is built: sections, order, lengths | `game-page` |
| Card drawings | `card-visuals` |
| Hebrew wording and terminology | `hebrew-style` |
| Review games for clarity and correctness | `review-card-game` |
| Change the site, the build, the tests or the CI | `change-site` |

## The process: every change, in this order
1. **Understand.** Read the relevant skill. For a game, also read 2 existing game files of a similar kind.
2. **Plan in one line** what changes and in which files. Ask the owner only when the answer changes the work: a rule nobody plays the same way, a name, a decision with no default. Otherwise choose the common version and say what you chose.
3. **Change only what's needed**, following the codebase rules below.
4. **Sanity test:** `npm test`. It builds the site and checks content and output. It must pass. Read and fix its warnings too, unless a warning is deliberate.
5. **Look**, if the change is visible: `npm run serve` and open the page you changed (the home page for list or filter changes) once in a browser, at phone width.
6. **Commit** with a conventional message (`feat(games): …`, `fix(hearts): …`, `feat: …` for site changes), ending with the Co-Authored-By line. Stage files by name. Never `git add -A` while another session may be editing the same folder.
7. **Push to `main`.** The pre-push hook runs `npm test` again. Then confirm the GitHub Actions run succeeded and the live page answers 200.
8. **Report** what changed, what you checked, and anything you decided on your own.

### Definition of done
- `npm test` green, warnings read.
- The page checked in a browser (visible changes).
- Pushed, deploy green, live URL checked.
- Docs updated when a rule changed: this file, the skill, `CONTRIBUTING.md`, `README.md`.

## Codebase rules
- **Content is data.** A game is one file, `games/<lang>/<id>.json`, matching `schema/game.schema.json`. Edit the JSON directly. Never put game text in code.
- **The check in `scripts/build.mjs` is the law.** A new field goes into the schema, the build's validation, the page (`site/app.js`) and the text version (the text-page section of `build.mjs`), all in the same change.
- **One renderer.** `site/app.js` holds pure string views (`listHTML`, `gameHTML`). The build runs the same code to pre-render pages, and anything browser-only stays inside the `typeof document` block. Don't create a second renderer.
- **No dependencies.** Node 18+ and Python only for `scripts/make-images.py`. No npm packages, no frameworks, no CDN scripts.
- **Never edit generated files.** `dist/` is rebuilt on every build and is not committed.
- **Settings in one place:** `site.config.json` (site URL, repo, main language), `i18n/<lang>.json` (interface text and tags), `style/he.json` (terminology and limits).
- **Generated automatically, never by hand:** the `drinking` tag, similar games, the sitemap, the text pages and the offline file list.
- **Budgets** (enforced by the test): game page ≤ 120 KB, text page ≤ 20 KB, home page ≤ 450 KB.
- **Accessibility and both themes:** colours only through the CSS tokens in `site/index.html`, visible focus, nothing that works in only one theme.
- **Links never break.** Game ids (and so their URLs) don't change once published. Old `/#id` links keep redirecting.

## The collection's rules
- **Regular playing cards only:** one or more 52-card decks, with or without jokers, or with ranks removed. Nothing else, except household items like spoons or tokens.
- **Write everything yourself.** Never copy or translate a rulebook or a website. Check the rules against sources, then write fresh text.
- **One base version per game**, the most common one. Everything else goes in `variants`.
- **Drinking:** an optional `drinking` section on a regular game, or `drinkingGame: true` with `age: "18+"` and a required `sober` section. Sips only, capped at about 5.

## Commands
```
npm test        # build + sanity test: run after every change
npm run check   # validate game files only (fast)
npm run serve   # build and serve dist/ on http://localhost:8765
npm run setup   # once per clone: turn on the pre-push hook
python3 scripts/make-images.py   # redraw the share image and icons
```
