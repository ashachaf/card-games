---
name: hebrew-style
description: How game pages are written in Hebrew: tone, sentence shape, the fixed terminology (קופה, לקיחה, שליט, הצורה שהפותח קבע…), how to write cards and numbers inside sentences, and what never to write. Use whenever you write or edit any text in games/he/*.json or i18n/he.json.
---

# Hebrew style

The reader is holding cards and has never played. Every sentence has to be easy to understand on first reading, at a table, maybe on a phone with weak internet.

## Tone and sentence shape
- **Address everyone in the plural, without "you":** "מניחים", "לוקחים", "מחלקים". Address one player only when the step really is about one person's decision: "בתורך", "יש לך". Never "אתה/את" + a verb when the impersonal form works.
- **Short sentences:** up to about 20 words. The test warns from 32. If there's a comma followed by "ו", consider two sentences.
- **One action per sentence in `turn`.** A step with "and then" and another "and then" gets split in two.
- **Everyday words.** No translated jargon. A term the reader doesn't know is explained the first time it appears, in `glossary` or in the sentence itself.
- **No decoration:** no "חשוב לציין", no "שימו לב!" at the start of a step, no exclamation marks except in shouts that are part of the game ("קמס!", "יניב").
- **No em-dash (—).** Use a comma, a colon or a new sentence. The test enforces this.
- **A question as a condition** is fine and clear: "אין לך קלף מתאים? לוקחים מהקופה."

## Fixed terminology
The full list, with its banned spellings, is in `style/he.json`. The test fails on a banned spelling. The main terms:

| Concept | Write | Never |
|---|---|---|
| suit (♠ ♥ ♦ ♣) | צורה | חליפה, סוג. "צבע" is only red or black |
| rank | מספר (J, Q, K and A too) | ערך, when the rank is meant |
| face-down draw pile | קופה | חפיסה, when the draw pile is meant |
| discard pile | ערימת זריקה | ערימת השלכה |
| trick | לקיחה | סיבוב, when a trick is meant |
| trump | שליט | טרמפ |
| suit led | הצורה שהפותח קבע | הצורה שפתחו בה |
| same-rank set | סדרה | קבוצה (except in games where "group" is the game's own term, like Total 10) |
| same-suit run | רצף | |
| wild card | קלף פרא | קלף פראי, ג'וקר (when it isn't a real joker) |
| face down / face up | הפוך / גלוי | |
| direction of play | לשמאל | עם כיוון השעון |
| joker | ג'וקר (ASCII apostrophe) | ג׳וקר (geresh) |

## Cards and numbers in a sentence
- **A specific card:** rank + suit symbol, no space: `7♥`, `Q♠`, `10♦`. The page keeps the order right automatically. Not "שבע לב".
- **A rank without a suit:** a digit or letter: "שני 7", "ה-K", "כל ה-A".
- **Numbers as digits:** "3 קלפים", "עד 5 לגימות", "1,000 נקודות" (comma from 1,000 up).
- **Arithmetic** with spaces: "4 + 2 + 4 = 10", "2 × 5". Use × and ÷, not x or /.

## Names
- **The game's name** is what Israelis call it (רביעיות, טאקי קלפים, העז). The English name and other names go in `aliases`, which are shown on the page. An old or competing name that shouldn't appear goes in `keywords`, which are search only.
- **People in examples:** common Israeli names, a different set for each game, 3–5 people. No names of real public figures.

## Before you finish
Read each sentence once as someone who doesn't know the game: is any word unexplained? Is any sentence trying to do two things?
