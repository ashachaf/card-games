---
name: add-card-game
description: Add a new game (or several) to the Card Games collection, adapt a commercial game to regular cards, or fix an existing game's rules or text. Runs the whole process: check the game belongs, research, write games/<lang>/<id>.json using the game-page, card-visuals and hebrew-style skills, review it, run npm test, look, commit and deploy. Use for "add <game>", "add games for kids", "adapt <game> to a regular deck", "fix the rules of <game>", or translating a game.
---

# Add or fix a game

This skill is the process. The details live in three skills, and you must read them before writing:
- `game-page`: which sections, in what order, how long.
- `card-visuals`: when and how to draw.
- `hebrew-style`: language and terminology.

The general process and the definition of done are in `CLAUDE.md`.

## 1. Check the game belongs
- **Regular cards only.** If it needs Uno, Taki, Tarot, an Italian or Spanish deck, a board or special pieces, stop and say so. A commercial game can be adapted when its cards map onto a regular deck: write down the mapping (which cards stand for what, and how many of each) and check the counts add up.
- **Not already in the collection:** search `games/he/` by `id`, `name`, `aliases` and `keywords`.

## 2. Get the rules right
- **Check at least two independent sources.** pagat.com is the most reliable for traditional games. For a commercial game, use its rules sheet or the publisher's page.
- **Never copy or translate a source's wording.** Read, close the source, and write fresh text.
- **Choose the most common version as the base.** Everything else goes into `variants`.
- **Write down every gap you filled yourself**, wherever the source is silent, and report it to the owner at the end.
- **A rule the owner has stated** (how they play at home) beats the sources. Write it as the base.

## 3. Write the file
- **Copy a similar game**, at the same difficulty and of the same kind, to `games/he/<id>.json`, and fill every field according to `game-page`.
- **Edit the JSON directly**, with no generator scripts.
- **Drawings** follow `card-visuals`, and **all text** follows `hebrew-style`.
- **Tags** come only from `i18n/he.json`. Never add `drinking`.
- **Remove the game from `coming`** in `i18n/he.json` if it's listed there.

## 4. Review before testing
Run the `review-card-game` checks on the new game:
- Deal and play two turns using only the page.
- Every card and number in the drawings and in `example` adds up.
- No term is used before it's explained.

Fix what you find.

## 5. Test, look, publish
- **`npm test`:** must pass. Read the warnings.
- **`npm run serve`:** open `/games/<id>/` and check the drawings and the order of sections.
- **Commit** `feat(games): <name>` (or `fix(<id>): …`), stage the file by name, push, and check the deploy and that `https://card-games.win/games/<id>/` answers.

## 6. Report to the owner
- a link to the page;
- in one or two sentences, what's on it;
- the gaps or decisions you filled in yourself, so the owner can correct them.
