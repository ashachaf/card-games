---
name: review-card-game
description: Review one or more games in the Card Games collection for clarity and correctness, as a first-time player would read them, against the game-page, card-visuals and hebrew-style skills. Use when asked to "review <game>", "check that the guides make sense", "is <game> clear", after writing a game, or before publishing.
---

# Review a game page

Read `games/he/<id>.json`, or `dist/text/<id>.html` after `npm test`, which is exactly what the reader gets, **as someone who has never played and only has this page.** Don't fill gaps from your own knowledge: a gap you fill silently is a gap the reader falls into.

## 1. Play it in your head
Deal exactly according to `setup`, then play two full turns according to `turn` with 3 players (or the minimum). Stop wherever you'd have to guess. Common gaps:
- who starts, and which direction play goes;
- what happens when the draw pile runs out, or you have no legal move;
- when a round ends versus when the whole game ends;
- a term used before it's explained (it belongs in `glossary`);
- a rule that appears only in `example` or `tips` and not in `turn`.

## 2. Check against the skills
- **`game-page`:**
  - section order, lengths, one action per step;
  - `inShort` where required;
  - combinations in `combos`, not inside a step.
- **`card-visuals`:**
  - every drawing agrees with its sentence;
  - suits, colours, ranks and arithmetic are right;
  - a trick shows who played first;
  - no drawing that adds nothing.
- **`hebrew-style`:**
  - fixed terminology;
  - short sentences, plural address;
  - cards written as `7♥`.
- **`example`:**
  - uses only rules that are on the page;
  - turn order makes sense;
  - the arithmetic adds up.
- **`mistakes`:** real beginner mistakes, not repeats of the rules.

## 3. Correctness
Compare with at least one reliable source. Report disagreements, and don't silently change a rule the owner chose.

## 4. Report
For each game:
- **a verdict:** clear, needs fixes, or confusing;
- **a short list of problems**, each with the section, what a reader would do wrong, and the fix.

Worst games first. Fix only when asked, and then follow the process in `add-card-game` (test, look, publish).

Reader reports arrive as GitHub issues labelled `clarity`, from the "משהו לא ברור?" link on every page: `gh issue list --label clarity`. Include them.
