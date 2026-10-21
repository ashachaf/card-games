# Contributing

Thanks for helping. Most contributions are a new game, a fix to a rule, or a translation, and each one is a single JSON file.

## The rules of the collection

1. **Regular playing cards only.** One or more standard 52-card decks, with or without jokers, or with some ranks removed (like Durak's 36 cards). No Uno, no Taki, no special decks. Set `deckType` to match, and `decks` to how many decks the game needs: a number like `1`, or a range like `[1, 2]`. Use `[1, null]` for a game that works with any number of decks.
2. **Write it yourself.** Explain the game in your own words. Don't copy or translate text from other sites or books. Rules themselves can't be owned, but their wording can. Using other sources to check that the rules are right is fine.
3. **Written for a first game.** Short sentences, one action per step. Someone who has never played should be able to start after reading the page once.
4. **One base version.** Many games have no single official rulebook. Pick the most common version as the base and put the rest under `variants`.

## Add a game

1. Copy a file from `games/he/`, for example `yaniv.json`, to `games/he/<id>.json`. The `id` is the English name in lowercase with dashes (`go-fish`).
2. Fill in every field. The template, with a description of each field, is in [`schema/game.schema.json`](schema/game.schema.json). If your editor supports JSON Schema, keep the `$schema` line for autocomplete.
3. Use only tags that exist in `i18n/he.json`. If you need a new tag, add it there in the same pull request.
4. Run `npm run check`, then `npm run serve` and look at your game in the browser.
5. Open a pull request.

### Card drawings

A drawing is a list of rows. Each row has `cards`, an optional `label` and an optional `note`:

```json
{ "label": "רצף באותה צורה", "cards": "4D 5D 6D", "note": "3 קלפים לפחות" }
```

Write cards as rank plus suit letter: `S` ♠, `H` ♥, `D` ♦, `C` ♣. For example `AS`, `10H`, `KD`. Use `X` for a face-down card, `JK` for a joker, `|` for a gap between two groups, and add `*` to highlight a card (`5H*`). Give each drawing a `caption` or `note` that says what it shows, because the text version reads those instead of the drawing.

### Helping with hard games

Three optional sections make a complicated game easier to follow, and the first is required for difficulty 3:

- `inShort`: 2–4 plain sentences that explain the whole game before any detail.
- `glossary`: `[word, meaning]` pairs for every term a first-timer won't know (trick, trump, meld).
- `combos`: scoring combinations, each with `name`, `points`, `cards` and an optional `text`. Use it instead of listing combinations inside a turn step.

### Review before you publish

Read your page as someone who has never played: deal from `setup`, play two turns from `turn`, and stop wherever you'd have to guess. The repo's `review-card-game` skill does this check with Claude. Readers report unclear parts through the "משהו לא ברור?" link on each game page, which opens an issue labelled `clarity`.

### Drinking version (optional)

A game can add a `drinking` section: 2–5 extra rules on top of the normal game, such as who drinks when they pick up the pile. Don't change the base rules for it, and don't add the `drinking` tag yourself, because the build adds it. Keep it moderate: sips, not shots, and the loser of the whole game finishes a drink at most. The page always shows a note that it's for adults and works with water or juice.

### Drinking games

A game that is a drinking game at its core (Kings Cup, Ride the Bus) sets `"drinkingGame": true` and `"age": "18+"`. The page then opens with the adults-only note, and the build adds the `drinking` tag. Keep amounts in sips and cap any single penalty at about 5.

### Writing style

- Use plain words. Explain any term of art the first time it appears, like "trump" or "trick".
- Put one action in each `turn` step.
- In `example`, play a short round with named players and real cards, including one moment where a rule matters.
- In `mistakes`, list what first-time players actually get wrong.
- `video` is a YouTube search phrase, not a link, so it never breaks.

## Translate

1. Copy `i18n/he.json` to `i18n/<lang>.json` and translate it. Set `dir` to `ltr` or `rtl`.
2. Copy the games you want into `games/<lang>/`, keeping the same file names and `id`s, and translate the text. Don't change the numbers, tags or card codes.
3. That language builds to `/<lang>/` on the site.

## Licensing of contributions

By contributing you agree that code is licensed under MIT and game texts under CC BY-SA 4.0, as described in the README.
