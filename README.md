<div dir="rtl">

# חפיסה אחת

משחקי קלפים עם חפיסה רגילה, מוסברים כך שאפשר לשחק כבר בפעם הראשונה: הכנה, תור אחרי תור, ניקוד, דוגמה לסבב, טיפים וגרסאות.

- כל משחק כאן משוחק עם חפיסת קלפים רגילה (52 קלפים, לפעמים עם ג'וקרים או בלי חלק מהקלפים).
- חיפוש וסינון לפי מספר שחקנים, זמן, רמה וסוג.
- גרסת טקסט קלה לכל משחק, לאינטרנט חלש.
- אחרי הכניסה הראשונה האתר עובד גם בלי אינטרנט.
- הכל בקוד פתוח: אפשר להוסיף משחק או תרגום בקובץ אחד. ראו [CONTRIBUTING.md](CONTRIBUTING.md).

</div>

# One Deck

Card games you can play with a regular deck of playing cards, explained so you can play on your first try. Hebrew first; more languages welcome.

## How it works

```
games/<lang>/<id>.json   one file per game per language: the content
i18n/<lang>.json         interface strings and the tag list for that language
schema/game.schema.json  the game template
site/                    the page design (index.html) and its script (app.js)
scripts/build.mjs        checks every game, then builds dist/
```

`npm run build` writes `dist/`:

- `index.html`: the whole site in one file (about 45 KB), with every game inlined.
- `text/<id>.html`: a script-free, font-free page per game (about 6 KB).
- `sw.js` + `manifest.webmanifest`: offline support after the first visit.
- `preview.html`: the same site as one file without offline mode, for previews.

Other languages build to `dist/<lang>/`. There are no dependencies. You need only Node 18+.

```
npm run check   # validate games only
npm run build   # validate and build
npm run serve   # build, then serve dist/ on http://localhost:8765
```

Every game page has a plain anchor (`/#yaniv`), so each game can get its own QR code.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). In short: copy an existing game file, write it in your own words, and run `npm run check`.

## License

- Code (`site/`, `scripts/`, `schema/`): [MIT](LICENSE).
- Game texts (`games/`, `i18n/`): [CC BY-SA 4.0](LICENSE-CONTENT.md).
