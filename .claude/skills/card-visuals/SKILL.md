---
name: card-visuals
description: How to draw cards on a game page: when a drawing helps and when it's noise, the card-code syntax, rows, labels, notes and captions, highlighting, and the checks every drawing must pass. Use whenever you add or change a `visual`, `scoringVisual`, `values`, `combos` or any `cards` string in games/*.json.
---

# Card drawings

A drawing exists to show something that's hard to describe in words: what's allowed and what isn't, who wins, what a winning hand looks like. If the sentence is already clear without it, don't draw.

## When to draw
**Draw:**
- **The deal** (one `setup.visual` per game): what's in your hand, what's in the middle.
- **Allowed versus not allowed:** one "מותר" row and one "אסור" row.
- **Who wins:** a trick, a war, a pair. The winning card is highlighted.
- **A combination or a winning hand:** a set, a run, a group of 10, a poker hand.
- **The moment that confuses beginners**, as found in a review or a reader report.

**Don't draw:**
- a process that's only a direction or an order (passing left or right, whose turn), which is written in words;
- the same thing repeated per round or per player (Hearts used to have 5 identical rows: a mistake);
- something abstract with no cards (a bet, a shout, a hand signal);
- decoration.

## Syntax
```json
{ "rows": [ { "label": "…", "cards": "…", "note": "…" } ], "caption": "…" }
```
- **`cards`:** tokens separated by spaces.
  - Rank + suit letter: `AS 10H KD 7C` (S ♠, H ♥, D ♦, C ♣).
  - `X` is a face-down card, `JK` is a joker, and `|` is a gap between groups (two players, two piles).
  - A trailing `*` highlights a card, only the one card the step is about: the winner, the new card, the card that breaks the rule.
- **`label`:** what this row is ("ביד שלך", "מותר", "פתח 8♣, ענה A♦"). Short.
- **`note`:** what to understand from it, in one sentence ("A♠ חזק מ-K♠, אז הוא זוכה"). Notes carry the meaning.
- **`caption`:** one sentence summing up the whole drawing. Required for `setup.visual`.
- **The text version** reads label + cards in text + note + caption instead of the drawing. So every drawing needs at least a label or note that explains it. The test warns otherwise.

## Rules every drawing must pass
1. **It agrees with its sentence:** same cards, same numbers, same outcome.
2. **Every card is right:**
   - the suits really match (a run means the same suit);
   - colours where they matter (Old Maid: a pair is the same colour);
   - ranks in order (no skipped number in a run);
   - arithmetic adds up (4 + 2 + 4 = 10).
3. **It agrees with `example`:** if the sample round uses the same moment, the cards match.
4. **One idea per drawing:** up to about 4 rows. The test warns from 7.
5. **Who played first is visible** in a trick: put it in `label` ("פתח K♠, ענה A♠"), because the drawing has no direction.
6. **A real deck:** no card that the game removes (Durak has no 2–5), and no more copies than exist.
7. **No more than one highlighted card per row**, unless the row shows a winning combination as a whole.

## Other places with cards
- **`values`:** a `[cards, meaning]` pair. Use one or two example cards per meaning ("2H 10C" = by number). Long meanings automatically show as a list.
- **`combos`:** a scoring combination or a hand ranking. `cards` shows the full combination.
