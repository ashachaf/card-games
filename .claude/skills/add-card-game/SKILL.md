---
name: add-card-game
description: Add a new game (or several) to the One Deck card-game collection, or fix an existing one. Researches the rules, rejects games that need a special deck, writes games/<lang>/<id>.json in the fixed template in plain first-game language, and runs the check. Use when asked to "add <game>", "add games for 2 players", "fix the rules of <game>", or to translate a game.
---

# Add a card game

The collection is `games/<lang>/<id>.json`, one file per game per language. The template is `schema/game.schema.json`; `scripts/build.mjs` enforces it. Hebrew (`he`) is the main language.

## 1. Check the game belongs

- It must be playable with **regular playing cards**: a 52-card deck, 52 + jokers, a standard deck with some ranks removed, or two standard decks. If it needs Uno, Taki, Tarot, an Italian or Spanish deck, a board or special pieces, stop and say so.
- It must not already exist: look in `games/he/` by `id`, and search `name` and `aliases`.

## 2. Get the rules right

- Check the rules in at least two independent sources (pagat.com is the most reliable for traditional games). Note where sources disagree.
- **Never copy or translate a source's wording.** Read, close the source, and write the explanation fresh.
- Choose the most common version as the base. Everything else goes into `variants`.

## 3. Write the file

Start from an existing file such as `games/he/yaniv.json`, and fill every field:

- `id`: the English name, lowercase with dashes. `aliases`: the English name first, then other names people search for.
- `hook`: one or two sentences. `goal`: what wins or loses, in one or two sentences.
- `deck` in words, and `deckType` (`standard`, `jokers`, `stripped`, `double`).
- `values`: card ranks or points, as `[cards, meaning]` pairs, with `valuesNote` for trump or special cards.
- `setup.steps` plus one `setup.visual` showing the deal. `turn`: one action per step, with a `visual` wherever cards make the rule clearer (allowed or not allowed, a combination, what beats what).
- `scoring`: how a round ends and how the game ends.
- `example`: 3–5 short paragraphs of one real round with named players and real cards, including one moment where a rule matters.
- `tips` (2–4) and `mistakes` (2–3): what a first-time player needs, and what they really get wrong.
- `variants`: `[name, text]` pairs for common house rules.
- `video`: a YouTube search phrase (Hebrew if videos exist in Hebrew, otherwise English).
- `tags`: 2–6 tags from `i18n/he.json` only.

Card codes: rank + `S`/`H`/`D`/`C` (`AS`, `10H`, `KD`), `X` face down, `JK` joker, `|` gap, trailing `*` highlight. Give each visual a `caption` or `note` that says what it shows, because the text version reads it instead of the drawing.

**Hebrew style:** short sentences, everyday words, address the reader in the plural ("מניחים", "לוקחים"). Explain a term the first time it appears (שליט, לקיחה). Use digits for numbers and card codes inside sentences like `7♥`.

## 4. Verify

Run `npm run check`. Then `npm run build` and open `dist/index.html#<id>` (or `npm run serve`) to see the page. Read the page once as someone who has never played: could they start a game from it alone?

When you add the game, remove it from `coming` in `i18n/he.json` if it's listed there.
