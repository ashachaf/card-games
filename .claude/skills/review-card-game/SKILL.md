---
name: review-card-game
description: Review one or more games in the Card Games collection for clarity and correctness, as a first-time player would read them. Use when asked to "review <game>", "check that the guides make sense", "is <game> clear", or before publishing new games. Reports problems per game and fixes them on request.
---

# Review a card game page

Read `games/he/<id>.json` (or `dist/text/<id>.html` after `npm run build`, which is exactly what readers see) **as someone who has never played this game and has only this page.** Don't use your own knowledge of the game to fill gaps; a gap you fill silently is a gap a reader falls into.

## 1. Play it in your head

Deal the cards from `setup` exactly as written, then play two full turns from `turn` with 3 players (or the game's minimum). Stop at every point where you'd have to guess. Typical gaps:

- Who goes first, and in which direction play moves.
- What happens when the draw pile runs out, or a player has no legal move.
- When the round ends versus when the whole game ends.
- A word used before it's explained (trick, trump, meld, declare, frozen). Each one belongs in `glossary`.
- A rule that only appears in `example` or `tips` but not in `turn`.

## 2. Check each section against the rules of the collection

- `inShort` exists for every game with difficulty 3, and for any game where the turn has more than 6 steps. Two to four sentences that explain the whole game with no jargon.
- One action per `turn` step. A step with two "and then"s should be split.
- Long lists (scoring combinations, special cards) live in `combos` or `values`, not inside a turn step.
- Every drawing agrees with its sentence. Check each card code: suits, colors and ranks (for example, a pair in Old Maid is the same rank **and** the same color).
- The `example` uses only rules stated on the page, and its arithmetic is right.
- `mistakes` are real first-timer mistakes, not rule restatements.
- The base rules are one consistent version; alternatives are in `variants`.

## 3. Check correctness

Compare the rules with at least one reliable source (pagat.com for traditional games). Report disagreements; don't silently change a rule the owner chose. Never copy a source's wording.

## 4. Report

For each game: a verdict (clear / needs fixes / confusing), then the problems as a short list, each with the section, what a reader would do wrong, and the fix. Order games worst first. Make the fixes only when asked, then run `npm run check`.

Open GitHub issues labelled `clarity` come from readers (the "משהו לא ברור?" link on every game page). Read them with `gh issue list --label clarity` and include them.
