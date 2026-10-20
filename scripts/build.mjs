// Builds the site from games/<lang>/*.json into dist/. No dependencies.
//   node scripts/build.mjs           check every game, then build
//   node scripts/build.mjs --check   check only (used on pull requests)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DIST = path.join(ROOT, "dist");
const REPO = "https://github.com/ashachaf/card-games";
const SITE = "https://card-games.win"; // the live address: canonical links, sitemap, previews
const DEFAULT_LANG = "he";
const CHECK_ONLY = process.argv.includes("--check");

const DECK_TYPES = ["standard", "jokers", "stripped"];
const CARD_TOKEN = /^(X|JK|\||(A|[2-9]|10|J|Q|K)[SHDC])\*?$/;
const read = p => JSON.parse(fs.readFileSync(p, "utf8"));

// ---------- validation ----------
function validate(g, file, tags) {
  const errs = [];
  const need = (cond, msg) => { if (!cond) errs.push(`${file}: ${msg}`); };
  const str = k => need(typeof g[k] === "string" && g[k].trim(), `"${k}" must be a non-empty string`);
  const strList = (v, k, min = 1) => need(Array.isArray(v) && v.length >= min && v.every(s => typeof s === "string" && s.trim()), `"${k}" must be a list of at least ${min} non-empty strings`);
  const cards = (spec, where) => {
    if (typeof spec !== "string" || !spec.trim()) return need(false, `${where}: cards must be a string like "5S 5H"`);
    for (const t of spec.trim().split(/\s+/)) need(CARD_TOKEN.test(t), `${where}: unknown card "${t}" (use e.g. AS, 10H, KD, X, JK, |)`);
  };
  const visual = (v, where) => {
    if (v === undefined) return;
    need(v && Array.isArray(v.rows) && v.rows.length, `${where}: visual needs "rows"`);
    (v.rows || []).forEach((r, i) => cards(r.cards, `${where} row ${i + 1}`));
  };

  need(g.id === path.basename(file, ".json"), `"id" must match the file name`);
  need(/^[a-z0-9-]+$/.test(g.id || ""), `"id" must be lowercase latin letters, digits and dashes`);
  ["name", "hook", "best", "age", "deck", "goal", "video"].forEach(str);
  need(Array.isArray(g.aliases), `"aliases" must be a list`);
  need(DECK_TYPES.includes(g.deckType), `"deckType" must be one of ${DECK_TYPES.join(", ")}: every game uses regular playing cards`);
  const okDecks = Number.isInteger(g.decks) ? g.decks >= 1 && g.decks <= 6
    : Array.isArray(g.decks) && g.decks.length === 2 && Number.isInteger(g.decks[0]) && g.decks[0] >= 1 && (g.decks[1] === null || (Number.isInteger(g.decks[1]) && g.decks[1] > g.decks[0]));
  need(okDecks, `"decks" must be a whole number (1–6) or a range like [1, 2] or [1, null] for "or more"`);
  need(Array.isArray(g.players) && g.players.length === 2 && g.players.every(Number.isInteger) && g.players[0] >= 1 && g.players[0] <= g.players[1], `"players" must be [min, max]`);
  need(Array.isArray(g.minutes) && g.minutes.length === 2 && g.minutes.every(Number.isInteger) && g.minutes[0] <= g.minutes[1], `"minutes" must be [min, max]`);
  need([1, 2, 3].includes(g.difficulty), `"difficulty" must be 1, 2 or 3`);
  need(Array.isArray(g.tags) && g.tags.length >= 2, `"tags" needs at least 2 tags`);
  (g.tags || []).forEach(t => need(t in tags, `unknown tag "${t}" (allowed: ${Object.keys(tags).join(", ")})`));
  if (g.values !== undefined) {
    need(Array.isArray(g.values), `"values" must be a list of [cards, meaning]`);
    (g.values || []).forEach((v, i) => { cards(v[0], `values ${i + 1}`); need(typeof v[1] === "string", `values ${i + 1}: meaning must be text`); });
  }
  need(g.setup && Array.isArray(g.setup.steps), `"setup.steps" is required`);
  if (g.setup) { strList(g.setup.steps, "setup.steps"); visual(g.setup.visual, "setup"); }
  need(Array.isArray(g.turn) && g.turn.length, `"turn" must be a list of steps`);
  (g.turn || []).forEach((s, i) => { need(typeof s.t === "string" && s.t.trim(), `turn ${i + 1}: "t" is required`); visual(s.visual, `turn ${i + 1}`); });
  strList(g.scoring, "scoring");
  visual(g.scoringVisual, "scoringVisual");
  strList(g.example, "example", 2);
  strList(g.tips, "tips", 2);
  strList(g.mistakes, "mistakes");
  if (g.drinking !== undefined) {
    need(g.drinking && typeof g.drinking === "object", `"drinking" must be an object with "rules"`);
    if (g.drinking) strList(g.drinking.rules, "drinking.rules", 2);
    need(!(g.tags || []).includes("drinking"), `don't add the "drinking" tag by hand: it is added when the game has a "drinking" section`);
  }
  if (g.inShort !== undefined) strList(g.inShort, "inShort", 2);
  if (g.glossary !== undefined) need(Array.isArray(g.glossary) && g.glossary.every(x => Array.isArray(x) && x.length === 2), `"glossary" must be a list of [word, meaning]`);
  if (g.combos !== undefined) {
    need(g.combos && Array.isArray(g.combos.items) && g.combos.items.length, `"combos.items" must be a list`);
    (g.combos?.items || []).forEach((c, i) => { need(c.name && c.points, `combos ${i + 1}: "name" and "points" are required`); cards(c.cards, `combos ${i + 1}`); });
  }
  if (g.difficulty === 3) need(g.inShort, `hard games (difficulty 3) need an "inShort" summary`);
  need(Array.isArray(g.variants) && g.variants.every(v => Array.isArray(v) && v.length === 2), `"variants" must be a list of [name, text]`);
  return errs;
}

// ---------- load ----------
const langs = fs.readdirSync(path.join(ROOT, "games")).filter(d => fs.statSync(path.join(ROOT, "games", d)).isDirectory());
const errors = [];
const bundles = {};
for (const lang of langs) {
  const i18nFile = path.join(ROOT, "i18n", `${lang}.json`);
  if (!fs.existsSync(i18nFile)) { errors.push(`games/${lang}: missing i18n/${lang}.json`); continue; }
  const i18n = read(i18nFile);
  const games = [];
  for (const f of fs.readdirSync(path.join(ROOT, "games", lang)).filter(f => f.endsWith(".json")).sort()) {
    const rel = `games/${lang}/${f}`;
    let g;
    try { g = read(path.join(ROOT, rel)); } catch (e) { errors.push(`${rel}: not valid JSON (${e.message})`); continue; }
    errors.push(...validate(g, rel, i18n.tags));
    delete g.$schema;
    if (g.drinking && !g.tags.includes("drinking")) g.tags.push("drinking");
    games.push(g);
  }
  games.sort((a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name, lang)); // easy first, then by name
  bundles[lang] = { ...i18n, games };
}
if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n  ` + errors.join("\n  "));
  process.exit(1);
}
const total = Object.values(bundles).reduce((n, b) => n + b.games.length, 0);
console.log(`✓ ${total} game(s) valid in ${langs.join(", ")}`);
if (CHECK_ONLY) process.exit(0);

// ---------- build ----------
const template = fs.readFileSync(path.join(ROOT, "site", "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(ROOT, "site", "app.js"), "utf8");
const escHtml = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const json = v => JSON.stringify(v).replace(/</g, "\\u003c");
const write = (rel, content) => { const p = path.join(DIST, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); return p; };

fs.rmSync(DIST, { recursive: true, force: true });

const SUITS = { S: "♠", H: "♥", D: "♦", C: "♣" };
const deckCount = (g, ui) => {
  const [a, b] = Array.isArray(g.decks) ? g.decks : [g.decks, g.decks], c = ui.deckCount, f = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => v[k]);
  if (b === null) return a === 1 ? c["1plus"] : f(c.nplus, { n: a });
  if (a === b) return a === 1 ? c["1"] : f(c.n, { n: a });
  return f(c.range, { a, b });
};
const cardText = (spec, ui) => spec.trim().split(/\s+/).map(t => {
  t = t.replace(/\*$/, "");
  if (t === "|") return "·";
  if (t === "X") return ui.faceDown;
  if (t === "JK") return ui.joker;
  return t.slice(0, -1) + SUITS[t.slice(-1)] + "︎";
}).join(" ");

// Card names inside Hebrew sentences get a left-to-right island, so "Q♠" doesn't render as "♠Q".
const isolateCards = html => html.replace(/>([^<]+)</g, (_, t) => ">" + t.replace(/(?:10|[2-9AJQK])[♠♥♦♣]︎?/g, m => `<bdi dir="ltr">${m}</bdi>`) + "<");
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k]);

// ---------- pages ----------
// The page script runs here too, to pre-render each page: the HTML is complete before any
// JavaScript runs, so search engines, link previews and phones without JavaScript see it all.
function views(data) {
  return new Function("DATA", `${appJs}\nreturn { listHTML, gameHTML, isolateCards };`)(data);
}

// Last change of a file in git (CI checks out full history), for the sitemap's <lastmod>.
const lastmod = rel => {
  try {
    const d = execFileSync("git", ["log", "-1", "--format=%cI", "--", rel], { cwd: ROOT, encoding: "utf8" }).trim();
    if (d) return d.slice(0, 10);
  } catch (e) {}
  return new Date(fs.statSync(path.join(ROOT, rel)).mtimeMs).toISOString().slice(0, 10);
};

const langPrefix = lang => (lang === DEFAULT_LANG ? "" : `${lang}/`);
const urlOf = (lang, rel = "") => `${SITE}/${langPrefix(lang)}${rel}`;
const OG_IMAGE = `${SITE}/og.png`;
const clip = (s, n = 160) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n - 1)) + "…");
const isoAge = a => String(a).replace("+", "-"); // "8+" -> schema.org "8-"

// Which languages have each page, for hreflang links.
const gameLangs = {};
for (const [lang, b] of Object.entries(bundles)) for (const g of b.games) (gameLangs[g.id] ||= []).push(lang);
const alternates = (langs, rel) => langs.length < 2 ? "" :
  langs.map(l => `<link rel="alternate" hreflang="${l}" href="${urlOf(l, rel)}">`).join("\n") +
  `\n<link rel="alternate" hreflang="x-default" href="${urlOf(langs.includes(DEFAULT_LANG) ? DEFAULT_LANG : langs[0], rel)}">`;

function seoHead({ lang, ui, title, description, url, type = "website", jsonld, alt = "" }) {
  return [
    `<link rel="canonical" href="${url}">`,
    alt,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:site_name" content="${escHtml(ui.siteName)}">`,
    `<meta property="og:title" content="${escHtml(title)}">`,
    `<meta property="og:description" content="${escHtml(description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:locale" content="${ui.locale || lang}">`,
    `<meta property="og:image" content="${OG_IMAGE}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<script type="application/ld+json">${json(jsonld)}</script>`
  ].filter(Boolean).join("\n");
}

function htmlPage({ lang, ui, base, title, description, seo, data, prerendered, offline = true }) {
  const head = template
    .replace("__TITLE__", escHtml(title))
    .replace("__DESCRIPTION__", escHtml(description))
    .replace("__BASE__", base)
    .replace("__SEO__", seo);
  return `<!doctype html>
<html lang="${lang}" dir="${ui.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head}
</head>
<body>
<div class="app" id="app" dir="${ui.dir}" lang="${lang}">${prerendered}</div>
<script>const DATA = ${json({ ...data, repo: REPO, base, offline })};</script>
<script>${appJs}</script>
</body>
</html>
`;
}

const outputs = [];
const sitemap = [];
const llms = [];
for (const [lang, b] of Object.entries(bundles)) {
  const prefix = langPrefix(lang);
  const { ui } = b;
  const homeUrl = urlOf(lang);
  const website = { "@type": "WebSite", "@id": `${homeUrl}#website`, name: ui.siteName, url: homeUrl, inLanguage: lang, description: ui.intro };

  // Home: every game, filters work on the pre-rendered list.
  const homeTitle = ui.homeTitle;
  outputs.push(write(`${prefix}index.html`, htmlPage({
    lang, ui, base: lang === DEFAULT_LANG ? "" : "../",
    title: homeTitle, description: clip(`${ui.intro} ${ui.footNote}`),
    seo: seoHead({ lang, ui, title: homeTitle, description: clip(ui.intro), url: homeUrl, alt: alternates(Object.keys(bundles), ""), jsonld: {
      "@context": "https://schema.org",
      "@graph": [website, { "@type": "ItemList", name: ui.title, itemListElement: b.games.map((g, i) => ({ "@type": "ListItem", position: i + 1, url: urlOf(lang, `games/${g.id}/`), name: g.name })) }]
    } }),
    data: b,
    prerendered: views({ ...b, base: lang === DEFAULT_LANG ? "" : "../" }).isolateCards(views({ ...b, base: lang === DEFAULT_LANG ? "" : "../" }).listHTML())
  })));
  sitemap.push({ loc: homeUrl, lastmod: b.games.map(g => lastmod(`games/${lang}/${g.id}.json`)).sort().pop(), langs: Object.keys(bundles), rel: "" });
  llms.push(`# ${ui.siteName}`, "", `> ${ui.title}. ${ui.intro}`, "");

  // One page per game.
  for (const g of b.games) {
    const rel = `games/${g.id}/`;
    const url = urlOf(lang, rel);
    const base = lang === DEFAULT_LANG ? "../../" : "../../../";
    const data = { ui, tags: b.tags, coming: [], games: [g], page: g.id };
    const v = views({ ...data, base });
    const title = fill(ui.gameTitle, { name: g.name });
    const description = clip(`${g.hook} ${ui.players}: ${g.players[0]}–${g.players[1]}. ${g.goal}`);
    const steps = [...g.setup.steps, ...g.turn.map(s => s.t)];
    outputs.push(write(`${prefix}${rel}index.html`, htmlPage({
      lang, ui, base, title, description, data,
      prerendered: v.isolateCards(v.gameHTML(g)),
      seo: seoHead({ lang, ui, title, description, url, type: "article", alt: alternates(gameLangs[g.id], rel), jsonld: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Game", "@id": `${url}#game`, name: g.name, alternateName: g.aliases, url, description: g.hook,
            inLanguage: lang, image: OG_IMAGE, isPartOf: { "@id": `${homeUrl}#website` },
            numberOfPlayers: { "@type": "QuantitativeValue", minValue: g.players[0], maxValue: g.players[1] },
            typicalAgeRange: isoAge(g.age), timeRequired: `PT${g.minutes[1]}M`,
            keywords: g.tags.map(t => b.tags[t]).join(", ")
          },
          {
            "@type": "HowTo", name: fill(ui.howToName, { name: g.name }), inLanguage: lang, url,
            totalTime: `PT${g.minutes[1]}M`, supply: [{ "@type": "HowToSupply", name: g.deck }],
            step: steps.map((t, i) => ({ "@type": "HowToStep", position: i + 1, text: t }))
          },
          {
            "@type": "BreadcrumbList", itemListElement: [
              { "@type": "ListItem", position: 1, name: ui.siteName, item: homeUrl },
              { "@type": "ListItem", position: 2, name: g.name, item: url }
            ]
          }
        ]
      } })
    })));
    sitemap.push({ loc: url, lastmod: lastmod(`games/${lang}/${g.id}.json`), langs: gameLangs[g.id], rel });
    llms.push(`- [${g.name}](${url}): ${g.hook}`);
  }
  llms.push("", `- [${ui.textVersion}](${urlOf(lang, "text/")})`, "");

  // The text version: one tiny page per game, no scripts, no fonts, no images.
  // Its canonical is the full game page, so search engines don't count it twice.
  const tHead = (title, canonical) => `<!doctype html><html lang="${lang}" dir="${ui.dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escHtml(title)}</title><link rel="canonical" href="${canonical}"><style>body{font:17px/1.6 Arial,sans-serif;max-width:40rem;margin:0 auto;padding:1rem}</style></head><body>`;
  const ul = items => `<ul>${items.map(s => `<li>${escHtml(s)}</li>`).join("")}</ul>`;
  const vis = v => v ? `<ul>${v.rows.map(r => `<li>${r.label ? escHtml(r.label) + ": " : ""}<bdi dir="ltr">${escHtml(cardText(r.cards, ui))}</bdi>${r.note ? ` (${escHtml(r.note)})` : ""}</li>`).join("")}</ul>${v.caption ? `<p>${escHtml(v.caption)}</p>` : ""}` : "";
  outputs.push(write(`${prefix}text/index.html`, `${tHead(ui.siteName, homeUrl)}<h1>${escHtml(ui.siteName)}</h1><p>${escHtml(ui.title)}</p><ul>${b.games.map(g => `<li><a href="${g.id}.html">${escHtml(g.name)}</a>: ${escHtml(g.hook)}</li>`).join("")}</ul><p><a href="../">${escHtml(ui.fullVersion)}</a></p></body></html>\n`));
  for (const g of b.games) {
    const players = g.players[0] === g.players[1] ? g.players[0] : `${g.players[0]}–${g.players[1]}`;
    outputs.push(write(`${prefix}text/${g.id}.html`, isolateCards(`${tHead(g.name, urlOf(lang, `games/${g.id}/`))}<p><a href="./">${escHtml(ui.allGames)}</a></p>
<h1>${escHtml(g.name)}</h1><p>${escHtml(g.hook)}</p>
<p>${ui.players}: ${players} (${ui.best}: ${escHtml(g.best)}) · ${ui.time}: ${g.minutes[0]}–${g.minutes[1]} ${ui.minutesUnit} · ${ui.level}: ${ui.difficulty[g.difficulty]} · ${ui.age}: ${escHtml(g.age)}<br>${ui.need}: ${escHtml(g.deck)} (${deckCount(g, ui)})</p>
<h2>${ui.goal}</h2><p>${escHtml(g.goal)}</p>
${g.inShort ? `<h2>${ui.inShort}</h2><ol>${g.inShort.map(s => `<li>${escHtml(s)}</li>`).join("")}</ol>` : ""}
${g.glossary ? `<h2>${ui.glossary}</h2><ul>${g.glossary.map(([w, m]) => `<li><b>${escHtml(w)}</b>: ${escHtml(m)}</li>`).join("")}</ul>` : ""}
${g.values ? `<h2>${ui.values}</h2><ul>${g.values.map(([c, v]) => `<li><bdi dir="ltr">${escHtml(cardText(c, ui))}</bdi>: ${escHtml(v)}</li>`).join("")}</ul>${g.valuesNote ? `<p>${escHtml(g.valuesNote)}</p>` : ""}` : ""}
<h2>${ui.setup}</h2><ol>${g.setup.steps.map(s => `<li>${escHtml(s)}</li>`).join("")}</ol>${vis(g.setup.visual)}
<h2>${ui.turn}</h2><ol>${g.turn.map(s => `<li>${escHtml(s.t)}${vis(s.visual)}</li>`).join("")}</ol>
${g.combos ? `<h2>${ui.combos}</h2>${g.combos.note ? `<p>${escHtml(g.combos.note)}</p>` : ""}<ul>${g.combos.items.map(c => `<li><b>${escHtml(c.name)}</b> (${escHtml(c.points)}): <bdi dir="ltr">${escHtml(cardText(c.cards, ui))}</bdi>${c.text ? `. ${escHtml(c.text)}` : ""}</li>`).join("")}</ul>` : ""}
<h2>${ui.scoring}</h2>${ul(g.scoring)}${vis(g.scoringVisual)}
<h2>${ui.example}</h2>${g.example.map(s => `<p>${escHtml(s)}</p>`).join("")}
<h2>${ui.tips}</h2>${ul(g.tips)}<h3>${ui.mistakes}</h3>${ul(g.mistakes)}
${g.drinking ? `<h2>${ui.drinking}</h2><p>${escHtml(ui.drinkingNote)}</p>${ul(g.drinking.rules)}` : ""}
<h2>${ui.variants}</h2><ul>${g.variants.map(([n, t]) => `<li><b>${escHtml(n)}</b>: ${escHtml(t)}</li>`).join("")}</ul>
<p><a href="./">${escHtml(ui.allGames)}</a> · <a href="../games/${g.id}/">${escHtml(ui.fullVersion)}</a></p></body></html>\n`)));
  }
}

// One file for previews (e.g. a claude.ai artifact): one page, games open by #id, offline off.
{
  const b = bundles[DEFAULT_LANG];
  const v = views({ ...b, hashRoutes: true });
  const head = template.replace("__TITLE__", escHtml(b.ui.siteName)).replace("__DESCRIPTION__", escHtml(b.ui.intro)).replace("__BASE__", "").replace("__SEO__", "").replace(/<link rel="manifest"[^>]*>\n?/, "");
  write("preview.html", `${head}
<div class="app" id="app" dir="${b.ui.dir}" lang="${DEFAULT_LANG}">${v.isolateCards(v.listHTML())}</div>
<script>const DATA = ${json({ ...b, repo: REPO, hashRoutes: true, offline: false })};</script>
<script>${appJs}</script>
`);
}

const ui0 = bundles[DEFAULT_LANG].ui;
write("manifest.webmanifest", JSON.stringify({
  name: ui0.siteName, short_name: ui0.siteName, lang: DEFAULT_LANG, dir: ui0.dir,
  start_url: "/", scope: "/", display: "standalone", background_color: "#f2f3f7", theme_color: "#23408f",
  icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }]
}, null, 2));
fs.copyFileSync(path.join(ROOT, "site", "og.png"), path.join(DIST, "og.png"));
fs.copyFileSync(path.join(ROOT, "site", "icon.png"), path.join(DIST, "icon.png"));

// ---------- SEO files ----------
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemap.map(s => `  <url>
    <loc>${s.loc}</loc>
    <lastmod>${s.lastmod}</lastmod>${s.langs.length > 1 ? "\n" + s.langs.map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${urlOf(l, s.rel)}"/>`).join("\n") : ""}
  </url>`).join("\n")}
</urlset>
`);
write("robots.txt", `User-agent: *\nAllow: /\nDisallow: /preview.html\n\nSitemap: ${SITE}/sitemap.xml\n`);
write("llms.txt", llms.join("\n").trim() + "\n");
write("404.html", `<!doctype html><html lang="${DEFAULT_LANG}" dir="${ui0.dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${escHtml(ui0.notFound)}</title><style>body{font:18px/1.6 Arial,sans-serif;max-width:32rem;margin:0 auto;padding:3rem 1rem;text-align:center}</style></head><body><h1>${escHtml(ui0.notFound)}</h1><p><a href="/">${escHtml(ui0.allGames)}</a></p></body></html>\n`);
write("CNAME", new URL(SITE).host + "\n");

// Service worker: caches every page on first visit, so the site works offline.
const files = outputs.map(p => "/" + path.relative(DIST, p).replace(/index\.html$/, "")).concat(["/manifest.webmanifest", "/icon.png"]);
const hash = crypto.createHash("sha256").update(outputs.map(p => fs.readFileSync(p)).join("")).digest("hex").slice(0, 10);
write("sw.js", `const CACHE = "card-games-${hash}";
const FILES = ${JSON.stringify(files)};
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && (e.request.url.startsWith(self.location.origin) || e.request.url.includes("fonts.g"))) {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy));
    }
    return res;
  }).catch(() => caches.match("/"))));
});
`);

const size = p => (fs.statSync(path.join(DIST, p)).size / 1024).toFixed(1) + " KB";
console.log(`✓ built dist/: home ${size("index.html")}, games/yaniv ${size("games/yaniv/index.html")}, ${sitemap.length} URLs in sitemap, ${files.length} cached files`);
