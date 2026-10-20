/* The site's only script. The build inlines it after `const DATA = { ui, tags, coming, games }`.
   Card tokens: rank + suit letter (S ♠ H ♥ D ♦ C ♣), X = face-down card, JK = joker, | = gap, trailing * = highlighted. */
const { ui: UI, tags: TAGS, coming: COMING, games: GAMES } = DATA;

const SUITS = { S: "♠", H: "♥", D: "♦", C: "♣" };
const VS = "︎"; // keep suits as text, not emoji
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
    .replace(/[֑-ׇ]/g, "")
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
const deckCount = g => g.decks === 1 ? UI.deckCount["1"] : fill(UI.deckCount.n, { n: g.decks });

function matches(g) {
  if (state.q) {
    const h = HAY.get(g.id);
    if (!norm(state.q).split(/\s+/).filter(Boolean).every(w => h.includes(w))) return false;
  }
  if (state.players && !(g.players[0] <= state.players && (g.players[1] >= state.players))) return false;
  if (state.decks && !(state.decks === 3 ? g.decks >= 3 : g.decks === state.decks)) return false;
  if (state.time && !TIMES[state.time](g)) return false;
  if (state.diff && g.difficulty !== state.diff) return false;
  for (const t of state.tags) if (!g.tags.includes(t)) return false;
  return true;
}

/* ---------- views ---------- */
const app = document.getElementById("app");
document.documentElement.lang = UI.lang;

function bar() {
  return `<div class="bar">
    <a class="brand" href="#">
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
  return `<a class="gcard" href="#${g.id}">
    <div class="gtop"><div><div class="gname">${esc(g.name)}</div><div class="galias">${esc(g.aliases[0] || "")}</div></div></div>
    <p class="ghook">${esc(g.hook)}</p>
    <div class="meta"><span>${UI.players} <b>${players(g)}</b></span><span>${UI.decks} <b>${g.decks}</b></span><span>${UI.time} <b>${minutes(g)}</b></span><span>${UI.level} <b>${UI.difficulty[g.difficulty]}</b></span></div>
    ${tagsHTML(g)}
  </a>`;
}

function renderList() {
  const usedTags = Object.keys(TAGS).filter(t => GAMES.some(g => g.tags.includes(t)));
  app.innerHTML = `${bar()}
  <header class="intro"><h1>${esc(UI.title)}</h1><p>${esc(UI.intro)}</p></header>
  <input class="search" id="q" type="search" placeholder="${esc(UI.searchPlaceholder)}" value="${esc(state.q)}" aria-label="${esc(UI.searchLabel)}">
  <div class="filters">
    <div class="frow"><span class="flabel">${UI.players}</span>${PLAYER_OPTS.map(n => chip("players", n, n === 6 ? "6+" : n, state.players === n)).join("")}</div>
    <div class="frow"><span class="flabel">${UI.decks}</span>${Object.entries(UI.deckOpts).map(([k, l]) => chip("decks", k, l, state.decks === Number(k))).join("")}</div>
    <div class="frow"><span class="flabel">${UI.time}</span>${Object.keys(TIMES).map(k => chip("time", k, UI.times[k], state.time === k)).join("")}</div>
    <div class="frow"><span class="flabel">${UI.level}</span>${[1, 2, 3].map(d => chip("diff", d, UI.difficulty[d], state.diff === d)).join("")}</div>
    <div class="frow"><span class="flabel">${UI.type}</span>${usedTags.map(t => chip("tags", t, TAGS[t], state.tags.has(t))).join("")}</div>
  </div>
  <div id="results" class="results"></div>
  <p class="foot">${COMING.length ? esc(fill(UI.comingSoon, { list: COMING.join(", ") })) + "<br>" : ""}${esc(UI.footNote)}<br>
    <a href="text/">${esc(UI.textVersion)}</a> · <a href="${DATA.repo}" target="_blank" rel="noopener">${esc(UI.contribute)}</a></p>`;
  renderResults();

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
}

function renderResults() {
  const list = GAMES.filter(matches);
  const el = document.getElementById("results");
  const count = list.length === GAMES.length ? fill(UI.countAll, { n: GAMES.length }) : fill(UI.countSome, { n: list.length, total: GAMES.length });
  el.innerHTML = `<div class="count"><span>${count}</span>${anyFilter() ? `<button class="clear" id="clear" type="button">${UI.clear}</button>` : ""}</div>
  ${list.length ? `<div class="grid">${list.map(gameCard).join("")}</div>` : `<div class="empty">${esc(UI.empty)}</div>`}`;
  const c = document.getElementById("clear");
  if (c) c.addEventListener("click", () => { state.q = ""; state.players = state.decks = state.time = state.diff = null; state.tags.clear(); renderList(); });
}

const list = items => `<ul class="bul">${items.map(s => `<li>${esc(s)}</li>`).join("")}</ul>`;

function renderGame(g) {
  const values = g.values ? `<section class="sec" id="values"><h2>${UI.values}</h2>
      <div class="values">${g.values.map(([c, v]) => `<span class="val">${cardsHTML(c)}<span>${esc(v)}</span></span>`).join("")}</div>
      ${g.valuesNote ? `<p>${esc(g.valuesNote)}</p>` : ""}</section>` : "";
  const toc = Object.entries(UI.toc).map(([k, l]) => `<a href="#${g.id}" data-to="${k}">${esc(l)}</a>`).join("");
  app.innerHTML = `${bar()}
  <a class="back-link" href="#">${UI.allGames}</a>
  <header class="ghead">
    <h1>${esc(g.name)}</h1>
    <div class="galias">${g.aliases.map(esc).join(" · ")}</div>
    <p class="ghook">${esc(g.hook)}</p>
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
  ${values}
  <section class="sec" id="setup"><h2>${UI.setup}</h2>
    <ol class="steps">${g.setup.steps.map(s => `<li><p>${esc(s)}</p></li>`).join("")}</ol>
    ${visualHTML(g.setup.visual)}
  </section>
  <section class="sec" id="turn"><h2>${UI.turn}</h2>
    <ol class="steps">${g.turn.map(s => `<li><p>${esc(s.t)}</p>${visualHTML(s.visual)}</li>`).join("")}</ol>
  </section>
  <section class="sec" id="scoring"><h2>${UI.scoring}</h2>${list(g.scoring)}</section>
  <section class="sec" id="example"><h2>${UI.example}</h2>
    <div class="story">${g.example.map(s => `<p>${esc(s)}</p>`).join("")}</div>
  </section>
  <section class="sec" id="tips"><h2>${UI.tips}</h2>${list(g.tips)}<h3>${UI.mistakes}</h3>${list(g.mistakes)}</section>
  <section class="sec" id="variants"><h2>${UI.variants}</h2>
    <p>${esc(UI.variantsNote)}</p>
    <div class="variants">${g.variants.map(([n, t]) => `<div class="variant"><b>${esc(n)}</b>${esc(t)}</div>`).join("")}</div>
  </section>
  <section class="sec" id="video"><h2>${UI.video}</h2>
    <a class="video" href="https://www.youtube.com/results?search_query=${encodeURIComponent(g.video)}" target="_blank" rel="noopener">
      <span class="play" aria-hidden="true"></span><span>${UI.videoLink}<small>${UI.videoNote}</small></span>
    </a>
  </section>
  ${tagsHTML(g)}
  <a class="back-link" href="#">${UI.allGames}</a>`;
  const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  app.querySelectorAll(".toc a").forEach(a => a.addEventListener("click", e => {
    e.preventDefault(); document.getElementById(a.dataset.to).scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }));
  bindMode();
}

function bindMode() {
  const b = document.getElementById("mode");
  b.addEventListener("click", () => {
    textMode = !textMode;
    try { localStorage.setItem("textMode", textMode ? "1" : "0"); } catch (e) {}
    applyMode(); b.setAttribute("aria-pressed", textMode);
  });
}
const applyMode = () => document.body.classList.toggle("text-mode", textMode);

function route() {
  const g = GAMES.find(x => x.id === location.hash.slice(1));
  g ? renderGame(g) : renderList();
  applyMode();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);
route();

/* Offline: cache the site after the first visit. Only on the real site (https), never inside a preview frame. */
if ("serviceWorker" in navigator && location.protocol === "https:" && DATA.offline) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
