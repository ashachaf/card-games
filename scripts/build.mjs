// Builds the site from games/<lang>/*.json into dist/. No dependencies.
//   node scripts/build.mjs           check every game, then build
//   node scripts/build.mjs --check   check only (used on pull requests)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DIST = path.join(ROOT, "dist");
const REPO = "https://github.com/ashachaf/card-games";
const DEFAULT_LANG = "he";
const CHECK_ONLY = process.argv.includes("--check");

const DECK_TYPES = ["standard", "jokers", "stripped", "double"];
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
  strList(g.example, "example", 2);
  strList(g.tips, "tips", 2);
  strList(g.mistakes, "mistakes");
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
    games.push(g);
  }
  games.sort((a, b) => a.name.localeCompare(b.name, lang));
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
const cardText = (spec, ui) => spec.trim().split(/\s+/).map(t => {
  t = t.replace(/\*$/, "");
  if (t === "|") return "·";
  if (t === "X") return ui.faceDown;
  if (t === "JK") return ui.joker;
  return t.slice(0, -1) + SUITS[t.slice(-1)] + "︎";
}).join(" ");

function page(lang, b, base, { offline }) {
  const { ui } = b;
  const head = template.replace("__SITE_NAME__", escHtml(ui.siteName)).replace("__DESCRIPTION__", escHtml(ui.title + ". " + ui.intro));
  const body = `<div class="app" id="app" dir="${ui.dir}" lang="${lang}"></div>
<script>const DATA = ${json({ ...b, repo: REPO, offline })};</script>
<script>${appJs}</script>`;
  return { head, body };
}

const outputs = [];
for (const [lang, b] of Object.entries(bundles)) {
  const prefix = lang === DEFAULT_LANG ? "" : `${lang}/`;
  const { ui } = b;
  const { head, body } = page(lang, b, prefix, { offline: true });
  outputs.push(write(`${prefix}index.html`, `<!doctype html>
<html lang="${lang}" dir="${ui.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head}
</head>
<body>
${body}
</body>
</html>
`));

  // The text version: one tiny page per game, no scripts, no fonts, no images.
  const tHead = title => `<!doctype html><html lang="${lang}" dir="${ui.dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escHtml(title)}</title><style>body{font:17px/1.6 Arial,sans-serif;max-width:40rem;margin:0 auto;padding:1rem}</style></head><body>`;
  const ul = items => `<ul>${items.map(s => `<li>${escHtml(s)}</li>`).join("")}</ul>`;
  const vis = v => v ? `<ul>${v.rows.map(r => `<li>${r.label ? escHtml(r.label) + ": " : ""}<bdi dir="ltr">${escHtml(cardText(r.cards, ui))}</bdi>${r.note ? ` (${escHtml(r.note)})` : ""}</li>`).join("")}</ul>${v.caption ? `<p>${escHtml(v.caption)}</p>` : ""}` : "";
  outputs.push(write(`${prefix}text/index.html`, `${tHead(ui.siteName)}<h1>${escHtml(ui.siteName)}</h1><p>${escHtml(ui.title)}</p><ul>${b.games.map(g => `<li><a href="${g.id}.html">${escHtml(g.name)}</a>: ${escHtml(g.hook)}</li>`).join("")}</ul><p><a href="../">${escHtml(ui.fullVersion)}</a></p></body></html>\n`));
  for (const g of b.games) {
    const players = g.players[0] === g.players[1] ? g.players[0] : `${g.players[0]}–${g.players[1]}`;
    outputs.push(write(`${prefix}text/${g.id}.html`, `${tHead(g.name)}<p><a href="./">${escHtml(ui.allGames)}</a></p>
<h1>${escHtml(g.name)}</h1><p>${escHtml(g.hook)}</p>
<p>${ui.players}: ${players} (${ui.best}: ${escHtml(g.best)}) · ${ui.time}: ${g.minutes[0]}–${g.minutes[1]} ${ui.minutesUnit} · ${ui.level}: ${ui.difficulty[g.difficulty]} · ${ui.age}: ${escHtml(g.age)}<br>${ui.need}: ${escHtml(g.deck)}</p>
<h2>${ui.goal}</h2><p>${escHtml(g.goal)}</p>
${g.values ? `<h2>${ui.values}</h2><ul>${g.values.map(([c, v]) => `<li><bdi dir="ltr">${escHtml(cardText(c, ui))}</bdi>: ${escHtml(v)}</li>`).join("")}</ul>${g.valuesNote ? `<p>${escHtml(g.valuesNote)}</p>` : ""}` : ""}
<h2>${ui.setup}</h2><ol>${g.setup.steps.map(s => `<li>${escHtml(s)}</li>`).join("")}</ol>${vis(g.setup.visual)}
<h2>${ui.turn}</h2><ol>${g.turn.map(s => `<li>${escHtml(s.t)}${vis(s.visual)}</li>`).join("")}</ol>
<h2>${ui.scoring}</h2>${ul(g.scoring)}
<h2>${ui.example}</h2>${g.example.map(s => `<p>${escHtml(s)}</p>`).join("")}
<h2>${ui.tips}</h2>${ul(g.tips)}<h3>${ui.mistakes}</h3>${ul(g.mistakes)}
<h2>${ui.variants}</h2><ul>${g.variants.map(([n, t]) => `<li><b>${escHtml(n)}</b>: ${escHtml(t)}</li>`).join("")}</ul>
<p><a href="./">${escHtml(ui.allGames)}</a> · <a href="../#${g.id}">${escHtml(ui.fullVersion)}</a></p></body></html>\n`));
  }
}

// One file for previews (e.g. a claude.ai artifact): no doctype wrapper, offline off.
{
  const b = bundles[DEFAULT_LANG];
  const { head, body } = page(DEFAULT_LANG, b, "", { offline: false });
  write("preview.html", head.replace(/<link rel="manifest"[^>]*>\n?/, "") + "\n" + body + "\n");
}

const ui0 = bundles[DEFAULT_LANG].ui;
write("manifest.webmanifest", JSON.stringify({
  name: ui0.siteName, short_name: ui0.siteName, lang: DEFAULT_LANG, dir: ui0.dir,
  start_url: "./", display: "standalone", background_color: "#f2f3f7", theme_color: "#23408f"
}, null, 2));

// Service worker: caches every page on first visit, so the site works offline.
const files = outputs.map(p => "./" + path.relative(DIST, p).replace(/index\.html$/, "")).concat(["./manifest.webmanifest"]);
const hash = crypto.createHash("sha256").update(outputs.map(p => fs.readFileSync(p)).join("")).digest("hex").slice(0, 10);
write("sw.js", `const CACHE = "cards-${hash}";
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
  }).catch(() => caches.match("./"))));
});
`);

const size = p => (fs.statSync(path.join(DIST, p)).size / 1024).toFixed(1) + " KB";
console.log(`✓ built dist/: index.html ${size("index.html")}, text/yaniv.html ${fs.existsSync(path.join(DIST, "text/yaniv.html")) ? size("text/yaniv.html") : "-"}, ${files.length} cached files`);
