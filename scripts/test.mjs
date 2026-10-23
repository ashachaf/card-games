// Sanity test, run after every change: `npm test` (build + this file).
// Fails (exit 1) on anything that would ship a broken or inconsistent site.
// Warnings are printed but don't fail: they point at text worth a second look.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DIST = path.join(ROOT, "dist");
const read = p => fs.readFileSync(p, "utf8");
const readJson = p => JSON.parse(read(p));
const CONFIG = readJson(path.join(ROOT, "site.config.json"));
const STYLE = readJson(path.join(ROOT, "style", "he.json"));

const errors = [];
const warnings = [];
const fail = msg => errors.push(msg);
const warn = msg => warnings.push(msg);

if (!fs.existsSync(path.join(DIST, "index.html"))) {
  console.error("✗ dist/ is missing. Run `npm run build` first (npm test does it for you).");
  process.exit(1);
}

// ---------- content: games/<lang>/*.json ----------
const langs = fs.readdirSync(path.join(ROOT, "games")).filter(d => fs.statSync(path.join(ROOT, "games", d)).isDirectory());
const games = {};
for (const lang of langs) {
  games[lang] = fs.readdirSync(path.join(ROOT, "games", lang)).filter(f => f.endsWith(".json")).sort()
    .map(f => ({ file: `games/${lang}/${f}`, g: readJson(path.join(ROOT, "games", lang, f)) }));
}

// Every string in a game, with where it came from.
function* strings(v, where) {
  if (typeof v === "string") yield [v, where];
  else if (Array.isArray(v)) for (let i = 0; i < v.length; i++) yield* strings(v[i], `${where}[${i}]`);
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (k !== "$schema" && k !== "cards") yield* strings(x, where ? `${where}.${k}` : k);
}

const SKIP_PROSE = /^(id|video|deckType|age|best|aliases|keywords)(\b|\[)/;
for (const { file, g } of games[CONFIG.defaultLang] || []) {
  for (const [s, where] of strings(g, "")) {
    for (const b of STYLE.banned) if (s.includes(b.term)) fail(`${file} ${where}: "${b.term}" → use "${b.use}"`);
    if (SKIP_PROSE.test(where)) continue;
    for (const sentence of s.split(/[.!?]\s/)) {
      const words = sentence.trim().split(/\s+/).filter(Boolean).length;
      if (words > STYLE.limits.sentenceWords) warn(`${file} ${where}: a sentence of ${words} words; split it`);
    }
  }
  if (g.hook && g.hook.length > STYLE.limits.hookChars) warn(`${file} hook: ${g.hook.length} characters; keep it under ${STYLE.limits.hookChars}`);
  if (g.turn && g.turn.length > STYLE.limits.turnSteps) warn(`${file} turn: ${g.turn.length} steps; consider inShort, combos or merging`);
  const visuals = [g.setup?.visual, g.scoringVisual, ...(g.turn || []).map(s => s.visual)].filter(Boolean);
  visuals.forEach((v, i) => {
    if (!v.caption && !v.rows.some(r => r.note || r.label)) warn(`${file} visual ${i + 1}: no caption, label or note; the text version can't explain it`);
    if (v.rows.length > 6) warn(`${file} visual ${i + 1}: ${v.rows.length} rows; a drawing should show one idea`);
  });
}
for (const [s, where] of strings(readJson(path.join(ROOT, "i18n", `${CONFIG.defaultLang}.json`)), "")) {
  for (const b of STYLE.banned) if (s.includes(b.term)) fail(`i18n/${CONFIG.defaultLang}.json ${where}: "${b.term}" → use "${b.use}"`);
}

// ---------- the built site: dist/ ----------
const exists = rel => fs.existsSync(path.join(DIST, rel));
const prerendered = html => html.split("<script>const DATA")[0]; // the HTML before the page script
const dataOf = html => JSON.parse(html.match(/<script>const DATA = (.*?);<\/script>/s)[1]);

for (const lang of langs) {
  const prefix = lang === CONFIG.defaultLang ? "" : `${lang}/`;
  const list = games[lang];
  const home = read(path.join(DIST, prefix, "index.html"));
  const cards = (prerendered(home).match(/class="gcard"/g) || []).length;
  if (cards !== list.length) fail(`${prefix}index.html lists ${cards} games, expected ${list.length}`);
  // The list runs from the youngest age up (then difficulty), so families find kids' games first.
  const order = dataOf(home).games.map(g => [parseInt(g.age, 10) || 0, g.difficulty]);
  for (let i = 1; i < order.length; i++) {
    const [a1, d1] = order[i - 1], [a2, d2] = order[i];
    if (a2 < a1 || (a2 === a1 && d2 < d1)) { fail(`${prefix}index.html: games are not sorted by age, then difficulty (position ${i + 1})`); break; }
  }

  for (const { g } of list) {
    const rel = `${prefix}games/${g.id}/index.html`;
    if (!exists(rel)) { fail(`missing page ${rel}`); continue; }
    const html = read(path.join(DIST, rel));
    const pre = prerendered(html);
    const url = `${CONFIG.site}/${prefix}games/${g.id}/`;
    if (!pre.includes(`<link rel="canonical" href="${url}">`)) fail(`${rel}: canonical is not ${url}`);
    if (!/<h1>[^<]+<\/h1>/.test(pre)) fail(`${rel}: no pre-rendered <h1>`);
    if (/undefined|NaN|\$\{|\[object Object\]/.test(pre.replace(/<script type="application\/ld\+json">.*?<\/script>/s, ""))) fail(`${rel}: "undefined", "NaN", "\${" or "[object Object]" in the page`);
    try {
      const ld = JSON.parse(pre.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
      const types = ld["@graph"].map(x => x["@type"]);
      for (const t of ["Game", "HowTo", "BreadcrumbList"]) if (!types.includes(t)) fail(`${rel}: structured data has no ${t}`);
    } catch (e) { fail(`${rel}: structured data doesn't parse (${e.message})`); }
    const data = dataOf(html);
    const self = data.games[0];
    if (!self.related || self.related.length < 1 || self.related.length > 4) fail(`${rel}: expected 1–4 similar games, got ${self.related?.length}`);
    for (const r of self.related || []) {
      const other = list.find(x => x.g.id === r.id)?.g;
      if (!other) fail(`${rel}: similar game "${r.id}" doesn't exist`);
      else if (other.drinkingGame && !g.drinkingGame) fail(`${rel}: suggests drinking game "${r.id}" from a non-drinking game`);
    }
    const text = `${prefix}text/${g.id}.html`;
    if (!exists(text)) fail(`missing text page ${text}`);
    else if (!read(path.join(DIST, text)).includes(`<link rel="canonical" href="${url}">`)) fail(`${text}: canonical should point to ${url}`);
    const kb = Buffer.byteLength(html) / 1024, tkb = exists(text) ? fs.statSync(path.join(DIST, text)).size / 1024 : 0;
    if (kb > 120) fail(`${rel}: ${kb.toFixed(0)} KB, over the 120 KB budget`);
    if (tkb > 20) fail(`${text}: ${tkb.toFixed(0)} KB, over the 20 KB budget for the light version`);
  }
  if (Buffer.byteLength(home) / 1024 > 450) fail(`${prefix}index.html: over the 450 KB budget`);
}

// Sitemap: the home page plus every game, nothing missing, nothing extra.
const sitemap = read(path.join(DIST, "sitemap.xml"));
const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
const expected = langs.flatMap(lang => {
  const prefix = lang === CONFIG.defaultLang ? "" : `${lang}/`;
  return [`${CONFIG.site}/${prefix}`, ...games[lang].map(({ g }) => `${CONFIG.site}/${prefix}games/${g.id}/`)];
});
for (const u of expected) if (!locs.includes(u)) fail(`sitemap.xml is missing ${u}`);
for (const u of locs) if (!expected.includes(u)) fail(`sitemap.xml has an unexpected ${u}`);
for (const f of ["robots.txt", "llms.txt", "404.html", "manifest.webmanifest", "sw.js", "og.png", "favicon.svg", "CNAME", "preview.html"]) if (!exists(f)) fail(`dist/${f} is missing`);

// Every internal link and asset in the pre-rendered HTML resolves to a file.
const htmlFiles = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith(".html") && f !== "preview.html") htmlFiles.push(p);
  }
})(DIST);
for (const file of htmlFiles) {
  const pre = prerendered(read(file));
  for (const [, href] of pre.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:|#|data:)/.test(href)) continue;
    const clean = href.split("#")[0].split("?")[0];
    if (!clean) continue;
    let target = clean.startsWith("/") ? path.join(DIST, clean) : path.resolve(path.dirname(file), clean);
    if (clean.endsWith("/")) target = path.join(target, "index.html");
    if (!fs.existsSync(target)) fail(`${path.relative(DIST, file)}: broken link "${href}"`);
  }
}

// The offline cache lists only files that exist.
const swFiles = JSON.parse(read(path.join(DIST, "sw.js")).match(/const FILES = (\[.*?\]);/s)[1]);
for (const f of swFiles) {
  const p = path.join(DIST, f.replace(/^\//, ""));
  if (!fs.existsSync(f.endsWith("/") ? path.join(p, "index.html") : p)) fail(`sw.js caches "${f}", which doesn't exist`);
}

// The page script compiles, in the home page, a game page and the preview.
for (const rel of ["index.html", `games/${games[CONFIG.defaultLang][0].g.id}/index.html`, "preview.html"]) {
  for (const [, code] of read(path.join(DIST, rel)).matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    try { new Function(code); } catch (e) { fail(`${rel}: a script doesn't parse (${e.message})`); }
  }
}

// ---------- report ----------
const total = langs.reduce((n, l) => n + games[l].length, 0);
if (warnings.length) console.log(`⚠ ${warnings.length} warning(s):\n  ` + warnings.join("\n  "));
if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n  ` + errors.join("\n  "));
  process.exit(1);
}
console.log(`✓ sanity test passed: ${total} games, ${locs.length} sitemap URLs, ${htmlFiles.length} pages and their links`);
