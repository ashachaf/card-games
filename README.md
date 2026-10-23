<div dir="rtl">

# משחקי קלפים

משחקי קלפים עם קלפי משחק רגילים, מוסברים כך שאפשר לשחק כבר בפעם הראשונה: הכנה, תור אחרי תור, ניקוד, דוגמה לסבב, טיפים וגרסאות.

**לאתר: [card-games.win](https://card-games.win/)** · [גרסת טקסט קלה](https://card-games.win/text/)

<p align="center"><a href="https://card-games.win/"><img src="qr/site.png" alt="קוד QR לאתר משחקי קלפים" width="200"></a><br>סרקו כדי לפתוח את האתר</p>

- כל משחק כאן משוחק עם קלפי משחק רגילים: חפיסה אחת או כמה חפיסות, לפעמים עם ג'וקרים או בלי חלק מהקלפים.
- חיפוש וסינון לפי מספר שחקנים, מספר חפיסות, זמן, רמה וסוג.
- גרסת טקסט קלה לכל משחק, לאינטרנט חלש.
- אחרי הכניסה הראשונה האתר עובד גם בלי אינטרנט.
- הכל בקוד פתוח: אפשר להוסיף משחק או תרגום בקובץ אחד. ראו [CONTRIBUTING.md](CONTRIBUTING.md).

</div>

# Card Games

Card games you can play with regular playing cards (one deck or several), explained so you can play on your first try. Hebrew first; more languages welcome.

**Site: [card-games.win](https://card-games.win/)** · [Light text version](https://card-games.win/text/) · QR code: [PNG](qr/site.png), [SVG for print](qr/site.svg)

## How it works

```
games/<lang>/<id>.json   one file per game per language: the content
i18n/<lang>.json         interface strings and the tag list for that language
schema/game.schema.json  the game template
site/                    the page design (index.html) and its script (app.js)
scripts/build.mjs        checks every game, then builds dist/
```

`npm run build` writes `dist/`:

- `index.html`: the home page with every game, search and filters.
- `text/<id>.html`: a script-free, font-free page per game (about 6 KB).
- `sw.js` + `manifest.webmanifest`: offline support after the first visit.
- `preview.html`: the same site as one file without offline mode, for previews.
- `games/<id>/`: a pre-rendered page per game with its own title, description, canonical link, Open Graph preview and schema.org data (`Game`, `HowTo`, `BreadcrumbList`).
- `sitemap.xml` (dated from each game's last commit), `robots.txt`, `llms.txt`, `404.html`, the share image `og.png` and the app icon.

All of it is generated from `games/`, so a new game gets its page, its sitemap entry and a place in other games' "similar games" links on the next push. To redraw the share image and the ace-of-spades icons (`site/og.png`, `icon.png`, `apple-touch-icon.png`, `favicon-32.png`), run `python3 scripts/make-images.py`. The browser-tab icon is `site/favicon.svg`.

Other languages build to `dist/<lang>/`. There are no dependencies. You need only Node 18+.

```
npm run check   # validate games only
npm run build   # validate and build
npm run serve   # build, then serve dist/ on http://localhost:8765
```

Every game has its own address (`/games/yaniv/`), so each game can get its own QR code. Old `/#yaniv` links redirect there.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). In short: copy an existing game file, write it in your own words, and run `npm run check`.

## License

- Code (`site/`, `scripts/`, `schema/`): [MIT](LICENSE).
- Game texts (`games/`, `i18n/`): [CC BY-SA 4.0](LICENSE-CONTENT.md).
