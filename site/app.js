/* The site's only script. The build inlines it after `const DATA = { ui, tags, coming, games, base, page, ... }`,
   and also runs it in Node to pre-render each page (everything outside the browser-only block is pure).
   Card tokens: rank + suit letter (S ♠ H ♥ D ♦ C ♣), X = face-down card, JK = joker, | = gap, trailing * = highlighted. */
const { ui: UI, tags: TAGS, coming: COMING, games: GAMES } = DATA;

const SUITS = { S: "♠", H: "♥", D: "♦", C: "♣" };
const VS = "\uFE0E"; // keep suits as text, not emoji
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k]);

function cardsHTML(spec) {
  const vis = [], txt = [];
  for (let tok of spec.trim().split(/\s+/)) {
    if (tok === "|") { vis.push('<span class="gap"></span>'); txt.push("·"); continue; }
    const hl = tok.endsWith("*"); if (hl) tok = tok.slice(0, -1);
    const h = hl ? " hl" : "";
    if (tok === "X") { vis.push(`<span class="card back${h}"></span>`); txt.push(UI.faceDown); continue; }
    if (tok === "JK") { vis.push(`<span class="card joker${h}"><span class="r">JOKER</span><span class="s">★</span></span>`); txt.push(UI.joker); continue; }
    const s = tok.slice(-1), r = tok.slice(0, -1);
    const red = s === "H" || s === "D" ? " red" : "";
    vis.push(`<span class="card${red}${h}"><span class="r">${r}</span><span class="s">${SUITS[s]}${VS}</span></span>`);
    txt.push(r + SUITS[s] + VS);
  }
  const label = txt.join(" ");
  return `<span class="cards" role="img" aria-label="${esc(label)}">${vis.join("")}<span class="ctext" aria-hidden="true">${esc(label)}</span></span>`;
}

function visualHTML(v) {
  if (!v) return "";
  const rows = v.rows.map(r => `<div class="vrow">${r.label ? `<span class="vlabel">${esc(r.label)}</span>` : ""}${cardsHTML(r.cards)}${r.note ? `<span class="vnote">${esc(r.note)}</span>` : ""}</div>`).join("");
  return `<figure class="visual">${rows}${v.caption ? `<figcaption>${esc(v.caption)}</figcaption>` : ""}</figure>`;
}

const players = g => g.players[0] === g.players[1] ? `${g.players[0]}` : `${g.players[0]}–${g.players[1]}`;
const minutes = g => `${g.minutes[0]}–${g.minutes[1]} ${UI.minutesUnit}`;

function norm(s) {
  return String(s).toLowerCase()
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/[ךםןףץ]/g, c => ({ "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" }[c]))
    .replace(/['"׳״\-–]/g, "");
}
const HAY = new Map(GAMES.map(g => [g.id, norm([g.name, ...g.aliases, g.hook, g.deck, ...g.tags.map(t => TAGS[t])].join(" "))]));

/* ---------- state ---------- */
const state = { q: "", players: null, decks: null, time: null, diff: null, tags: new Set() };
let textMode = false;
try { textMode = localStorage.getItem("textMode") === "1"; } catch (e) {}

const TIMES = { s: g => g.minutes[0] <= 15, m: g => g.minutes[0] <= 30 && g.minutes[1] >= 15, l: g => g.minutes[1] > 30 };
const PLAYER_OPTS = [2, 3, 4, 5, 6];
const anyFilter = () => Boolean(state.q || state.players || state.decks || state.time || state.diff || state.tags.size);
// decks is a number (1) or a range [min, max]; max null means "or more".
const deckRange = g => Array.isArray(g.decks) ? g.decks : [g.decks, g.decks];
const deckShort = g => { const [a, b] = deckRange(g); return b === null ? `${a}+` : a === b ? `${a}` : `${a}–${b}`; };
const deckCount = g => {
  const [a, b] = deckRange(g), c = UI.deckCount;
  if (b === null) return a === 1 ? c["1plus"] : fill(c.nplus, { n: a });
  if (a === b) return a === 1 ? c["1"] : fill(c.n, { n: a });
  return fill(c.range, { a, b });
};

function matches(g) {
  if (state.q) {
    const h = HAY.get(g.id);
    if (!norm(state.q).split(/\s+/).filter(Boolean).every(w => h.includes(w))) return false;
  }
  if (state.players && !(g.players[0] <= state.players && (g.players[1] >= state.players))) return false;
  if (state.decks) {
    const [a, b] = deckRange(g), k = state.decks;
    if (k === 3 ? !(b === null || b >= 3) : !(a <= k && (b === null || b >= k))) return false;
  }
  if (state.time && !TIMES[state.time](g)) return false;
  if (state.diff && g.difficulty !== state.diff) return false;
  for (const t of state.tags) if (!g.tags.includes(t)) return false;
  return true;
}

/* ---------- links ----------
   On the real site every game has its own page (games/<id>/). In a one-file preview there is
   only one page, so games open by #<id> instead. DATA.base is the path back to the site root. */
const BASE = DATA.base || "";
const homeHref = DATA.hashRoutes ? "#" : (BASE || "./");
const gameHref = id => DATA.hashRoutes ? `#${id}` : `${BASE}games/${id}/`;

/* ---------- views: plain strings, so the build can pre-render them ---------- */
function bar() {
  return `<div class="bar">
    <a class="brand" href="${homeHref}">
      <span class="brand-fan" aria-hidden="true">${cardsHTML("AS KH QD")}</span>
      <span class="brand-name">${esc(UI.siteName)}</span>
    </a>
    <button class="mode-btn" id="mode" type="button" aria-pressed="${textMode}">${esc(UI.textOnly)}</button>
  </div>`;
}

const chip = (group, value, label, on) =>
  `<button type="button" class="chip" data-g="${group}" data-v="${value}" aria-pressed="${on}">${esc(label)}</button>`;
const tagsHTML = g => `<div class="tags">${g.tags.map(t => `<span class="tag">${esc(TAGS[t])}</span>`).join("")}</div>`;

function gameCard(g) {
  return `<a class="gcard" href="${gameHref(g.id)}">
    <div class="gtop"><div><h2 class="gname">${esc(g.name)}</h2><div class="galias">${esc(g.aliases[0] || "")}</div></div></div>
    <p class="ghook">${esc(g.hook)}</p>
    <div class="meta"><span>${UI.players} <b>${players(g)}</b></span><span>${UI.decks} <b>${deckShort(g)}</b></span><span>${UI.time} <b>${minutes(g)}</b></span><span>${UI.level} <b>${UI.difficulty[g.difficulty]}</b></span></div>
    ${tagsHTML(g)}
  </a>`;
}

function resultsHTML() {
  const list = GAMES.filter(matches);
  const count = list.length === GAMES.length ? fill(UI.countAll, { n: GAMES.length }) : fill(UI.countSome, { n: list.length, total: GAMES.length });
  return `<div class="count"><span>${count}</span>${anyFilter() ? `<button class="clear" id="clear" type="button">${UI.clear}</button>` : ""}</div>
  ${list.length ? `<div class="grid">${list.map(gameCard).join("")}</div>` : `<div class="empty">${esc(UI.empty)}</div>`}`;
}

function listHTML() {
  const usedTags = Object.keys(TAGS).filter(t => GAMES.some(g => g.tags.includes(t)));
  return `${bar()}
  <header class="intro"><h1>${esc(UI.title)}</h1><p>${esc(UI.intro)}</p></header>
  <input class="search" id="q" type="search" placeholder="${esc(UI.searchPlaceholder)}" value="${esc(state.q)}" aria-label="${esc(UI.searchLabel)}">
  <div class="filters">
    <div class="frow"><span class="flabel">${UI.players}</span>${PLAYER_OPTS.map(n => chip("players", n, n === 6 ? "6+" : n, state.players === n)).join("")}</div>
    <div class="frow"><span class="flabel">${UI.decks}</span>${Object.entries(UI.deckOpts).map(([k, l]) => chip("decks", k, l, state.decks === Number(k))).join("")}</div>
    <div class="frow"><span class="flabel">${UI.time}</span>${Object.keys(TIMES).map(k => chip("time", k, UI.times[k], state.time === k)).join("")}</div>
    <div class="frow"><span class="flabel">${UI.level}</span>${[1, 2, 3].map(d => chip("diff", d, UI.difficulty[d], state.diff === d)).join("")}</div>
    <div class="frow"><span class="flabel">${UI.type}</span>${usedTags.map(t => chip("tags", t, TAGS[t], state.tags.has(t))).join("")}</div>
  </div>
  <div id="results" class="results">${resultsHTML()}</div>
  <p class="foot">${COMING.length ? esc(fill(UI.comingSoon, { list: COMING.join(", ") })) + "<br>" : ""}${esc(UI.footNote)}<br>
    <a href="${BASE}text/">${esc(UI.textVersion)}</a> · <a href="${DATA.repo}" target="_blank" rel="noopener">${esc(UI.contribute)}</a></p>`;
}

const list = items => `<ul class="bul">${items.map(s => `<li>${esc(s)}</li>`).join("")}</ul>`;

function gameHTML(g) {
  const values = g.values ? `<section class="sec" id="values"><h2>${UI.values}</h2>
      <div class="values${g.values.some(([, v]) => v.length > 24) ? " long" : ""}">${g.values.map(([c, v]) => `<span class="val">${cardsHTML(c)}<span>${esc(v)}</span></span>`).join("")}</div>
      ${g.valuesNote ? `<p>${esc(g.valuesNote)}</p>` : ""}</section>` : "";
  const toc = Object.entries(UI.toc).filter(([k]) => (k !== "drinking" || g.drinking) && (k !== "combos" || g.combos)).map(([k, l]) => `<a href="#${k}" data-to="${k}">${esc(l)}</a>`).join("");
  return `${bar()}
  <a class="back-link" href="${homeHref}">${UI.allGames}</a>
  <header class="ghead">
    <h1>${esc(g.name)}</h1>
    <div class="galias">${g.aliases.map(esc).join(" · ")}</div>
    <p class="ghook">${esc(g.hook)}</p>
    ${g.drinkingGame ? `<p class="drink-note">${esc(UI.drinkingGameNote)}</p>` : ""}
  </header>
  <div class="facts">
    <div class="fact"><span>${UI.players}</span><b>${players(g)} (${UI.best}: ${esc(g.best)})</b></div>
    <div class="fact"><span>${UI.time}</span><b>${minutes(g)}</b></div>
    <div class="fact"><span>${UI.level}</span><b>${UI.difficulty[g.difficulty]}</b></div>
    <div class="fact"><span>${UI.age}</span><b>${esc(g.age)}</b></div>
    <div class="fact wide"><span>${UI.need}</span><b>${esc(deckCount(g))}: ${esc(g.deck)}</b></div>
  </div>
  <nav class="toc" aria-label="${UI.pageNav}">${toc}</nav>
  <div class="goal"><h2>${UI.goal}</h2><p>${esc(g.goal)}</p></div>
  ${g.inShort ? `<section class="sec" id="inshort"><h2>${UI.inShort}</h2><ol class="short">${g.inShort.map(s => `<li>${esc(s)}</li>`).join("")}</ol></section>` : ""}
  ${g.glossary ? `<section class="sec" id="glossary"><h2>${UI.glossary}</h2><dl class="gloss">${g.glossary.map(([w, m]) => `<div><dt>${esc(w)}</dt><dd>${esc(m)}</dd></div>`).join("")}</dl></section>` : ""}
  ${values}
  <section class="sec" id="setup"><h2>${UI.setup}</h2>
    <ol class="steps">${g.setup.steps.map(s => `<li><p>${esc(s)}</p></li>`).join("")}</ol>
    ${visualHTML(g.setup.visual)}
  </section>
  <section class="sec" id="turn"><h2>${UI.turn}</h2>
    <ol class="steps">${g.turn.map(s => `<li><p>${esc(s.t)}</p>${visualHTML(s.visual)}</li>`).join("")}</ol>
  </section>
  ${g.combos ? `<section class="sec" id="combos"><h2>${UI.combos}</h2>
    ${g.combos.note ? `<p>${esc(g.combos.note)}</p>` : ""}
    <div class="combos">${g.combos.items.map(c => `<div class="combo"><div class="combo-head"><b>${esc(c.name)}</b><span class="pts">${esc(c.points)}</span></div>${cardsHTML(c.cards)}${c.text ? `<p>${esc(c.text)}</p>` : ""}</div>`).join("")}</div>
  </section>` : ""}
  <section class="sec" id="scoring"><h2>${UI.scoring}</h2>${list(g.scoring)}${visualHTML(g.scoringVisual)}</section>
  <section class="sec" id="example"><h2>${UI.example}</h2>
    <div class="story">${g.example.map(s => `<p>${esc(s)}</p>`).join("")}</div>
  </section>
  <section class="sec" id="tips"><h2>${UI.tips}</h2>${list(g.tips)}<h3>${UI.mistakes}</h3>${list(g.mistakes)}</section>
  <section class="sec" id="variants"><h2>${UI.variants}</h2>
    <p>${esc(UI.variantsNote)}</p>
    <div class="variants">${g.variants.map(([n, t]) => `<div class="variant"><b>${esc(n)}</b>${esc(t)}</div>`).join("")}</div>
  </section>
  ${g.drinking ? `<section class="sec" id="drinking"><h2>${UI.drinking}</h2>
    <p class="drink-note">${esc(UI.drinkingNote)}</p>${list(g.drinking.rules)}</section>` : ""}
  <section class="sec" id="video"><h2>${UI.video}</h2>
    <a class="video" href="https://www.youtube.com/results?search_query=${encodeURIComponent(g.video)}" target="_blank" rel="noopener">
      <span class="play" aria-hidden="true"></span><span>${UI.videoLink}<small>${UI.videoNote}</small></span>
    </a>
  </section>
  ${tagsHTML(g)}
  <p class="foot"><a href="${BASE}text/${g.id}.html">${esc(UI.textVersion)}</a> · <a href="${DATA.repo}/issues/new?template=unclear.yml&title=${encodeURIComponent(g.name + " (" + g.id + "): ")}" target="_blank" rel="noopener">${esc(UI.unclear)}</a></p>
  <a class="back-link" href="${homeHref}">${UI.allGames}</a>`;
}

/* Card names inside Hebrew sentences ("Q♠", "10♥") need their own left-to-right island,
   or the suit symbol jumps to the wrong side of the rank. Works on an HTML string, so the
   build and the browser produce the same markup. Skips card drawings and attributes. */
function isolateCards(html) {
  return html.replace(/(<span class="cards"[\s\S]*?class="ctext"[^>]*>[^<]*<\/span><\/span>)|>([^<]+)</g, (m, drawing, text) =>
    drawing ? drawing : ">" + text.replace(/(?:10|[2-9AJQK])[♠♥♦♣]︎?/g, c => `<bdi dir="ltr">${c}</bdi>`) + "<");
}

/* ---------- browser only ---------- */
if (typeof document !== "undefined") {
  const app = document.getElementById("app");

  const bindMode = () => {
    const b = document.getElementById("mode");
    b.addEventListener("click", () => {
      textMode = !textMode;
      try { localStorage.setItem("textMode", textMode ? "1" : "0"); } catch (e) {}
      applyMode(); b.setAttribute("aria-pressed", textMode);
    });
  };
  const applyMode = () => document.body.classList.toggle("text-mode", textMode);

  const renderResults = () => {
    const el = document.getElementById("results");
    el.innerHTML = isolateCards(resultsHTML());
    const c = document.getElementById("clear");
    if (c) c.addEventListener("click", () => { state.q = ""; state.players = state.decks = state.time = state.diff = null; state.tags.clear(); renderList(); });
  };

  const renderList = () => {
    app.innerHTML = isolateCards(listHTML());
    const q = document.getElementById("q");
    q.addEventListener("input", () => { state.q = q.value; renderResults(); });
    app.querySelectorAll(".chip").forEach(b => b.addEventListener("click", () => {
      const g = b.dataset.g, raw = b.dataset.v;
      const v = g === "players" || g === "diff" || g === "decks" ? Number(raw) : raw;
      if (g === "tags") { state.tags.has(v) ? state.tags.delete(v) : state.tags.add(v); b.setAttribute("aria-pressed", state.tags.has(v)); }
      else {
        state[g] = state[g] === v ? null : v;
        app.querySelectorAll(`.chip[data-g="${g}"]`).forEach(o => o.setAttribute("aria-pressed", String(o.dataset.v) === String(state[g])));
      }
      renderResults();
    }));
    bindMode();
  };

  const renderGame = g => {
    app.innerHTML = isolateCards(gameHTML(g));
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    app.querySelectorAll(".toc a").forEach(a => a.addEventListener("click", e => {
      e.preventDefault(); document.getElementById(a.dataset.to).scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }));
    bindMode();
  };

  const route = () => {
    const fromHash = GAMES.find(x => x.id === location.hash.slice(1));
    // Old links like card-games.win/#yaniv now live at games/yaniv/.
    if (!DATA.hashRoutes && !DATA.page && fromHash) { location.replace(gameHref(fromHash.id)); return; }
    const g = DATA.page ? GAMES.find(x => x.id === DATA.page) : DATA.hashRoutes ? fromHash : null;
    g ? renderGame(g) : renderList();
    applyMode();
    if (DATA.hashRoutes) window.scrollTo(0, 0);
  };
  document.documentElement.lang = UI.lang;
  if (DATA.hashRoutes) window.addEventListener("hashchange", route);
  route();

  /* Offline: cache the site after the first visit. Only on the real site (https), never inside a preview frame. */
  if ("serviceWorker" in navigator && location.protocol === "https:" && DATA.offline) {
    navigator.serviceWorker.register(`${BASE}sw.js`).catch(() => {});
  }
}
