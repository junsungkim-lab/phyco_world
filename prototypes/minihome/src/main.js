// phyco world — minihome prank prototype.
// Throwaway prototype code (see ../README.md). Effects come from pixelfx (MIT, vendored in ../vendor/pixelfx).
import { createFrame, clearFrame, createFx, composite } from "../vendor/pixelfx/src/core/index.js";
import * as campfire from "../vendor/pixelfx/src/fx/fire/campfire.js";
import * as fireRing from "../vendor/pixelfx/src/fx/fire/fire-ring.js";
import * as poof from "../vendor/pixelfx/src/fx/spawn/poof.js";
import * as pow from "../vendor/pixelfx/src/fx/explosions/cartoon-pow.js";
import * as confetti from "../vendor/pixelfx/src/fx/ui/confetti.js";
import { Bgm, SONGS } from "./bgm.js";

// ---------- room geometry (native pixels; the canvas is scaled up with image-rendering: pixelated) ----------
const W = 320, H = 200;
const WALL_BOTTOM = 112;
const FLOOR = { x0: 10, x1: 310, y0: 124, y1: 198 };
const WALLR = { x0: 10, x1: 270, y0: 18, y1: 104 };
const DOOR = { x: 294, y: 132 };

// ---------- sprites ----------
function sprite(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  const r = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  draw(r);
  return c;
}

const CATALOG = {
  bed: { name: "침대", layer: "floor", s: sprite(56, 32, (r) => {
    r(0, 4, 6, 28, "#7b4b2a"); r(1, 2, 4, 3, "#9a643a"); r(51, 14, 5, 18, "#7b4b2a");
    r(5, 19, 46, 9, "#a86d3e"); r(5, 26, 46, 2, "#7b4b2a"); r(1, 30, 3, 2, "#4a2c18"); r(52, 30, 3, 2, "#4a2c18");
    r(5, 14, 46, 6, "#fdf6ee"); r(18, 12, 33, 9, "#f28ab2"); r(18, 12, 33, 2, "#f9b6cf"); r(18, 19, 33, 2, "#d9668f");
    r(7, 10, 11, 5, "#ffffff"); r(7, 14, 11, 1, "#dcd3e8");
  }) },
  sofa: { name: "소파", layer: "floor", s: sprite(50, 28, (r) => {
    r(4, 2, 42, 14, "#3fa7a0"); r(4, 2, 42, 2, "#6cc7bf"); r(0, 8, 8, 16, "#358f89"); r(42, 8, 8, 16, "#358f89");
    r(0, 8, 8, 2, "#5bb8b0"); r(42, 8, 8, 2, "#5bb8b0"); r(6, 14, 38, 8, "#4bbab2"); r(24, 14, 2, 8, "#358f89");
    r(2, 22, 46, 3, "#2a716c"); r(4, 25, 3, 3, "#5a3a22"); r(43, 25, 3, 3, "#5a3a22"); r(30, 5, 9, 8, "#ffd36b"); r(30, 5, 9, 2, "#ffe7a3");
  }) },
  tv: { name: "TV", layer: "floor", s: sprite(34, 36, (r) => {
    r(2, 24, 30, 9, "#6b4a8a"); r(2, 24, 30, 2, "#8e6db0"); r(4, 33, 3, 3, "#4a3260"); r(27, 33, 3, 3, "#4a3260");
    r(4, 3, 26, 20, "#2b2b3a"); r(6, 5, 22, 14, "#5ec8f2"); r(7, 6, 6, 2, "#bfeeff"); r(14, 21, 6, 3, "#2b2b3a");
    r(24, 20, 2, 2, "#ff6f91"); r(10, 0, 1, 3, "#555"); r(22, 0, 1, 3, "#555");
  }) },
  plant: { name: "화분", layer: "floor", s: sprite(16, 30, (r) => {
    r(3, 21, 10, 9, "#d0603e"); r(2, 20, 12, 3, "#e57b55"); r(7, 5, 2, 16, "#3d8b3d");
    r(2, 9, 6, 4, "#56b356"); r(8, 5, 6, 4, "#56b356"); r(1, 14, 6, 4, "#4aa14a"); r(9, 12, 6, 4, "#4aa14a"); r(5, 1, 5, 4, "#6cc96c");
  }) },
  lamp: { name: "스탠드", layer: "floor", s: sprite(14, 40, (r) => {
    r(3, 37, 8, 3, "#4a4458"); r(6, 12, 2, 25, "#6d6680"); r(1, 2, 12, 9, "#ffd36b"); r(0, 10, 14, 2, "#e8b84a"); r(3, 3, 3, 6, "#ffe9a8");
  }) },
  rug: { name: "러그", layer: "floor", flat: true, s: sprite(64, 14, (r) => {
    r(8, 0, 48, 14, "#c97bd6"); r(3, 2, 58, 10, "#c97bd6"); r(0, 4, 64, 6, "#c97bd6");
    r(12, 3, 40, 8, "#e6a7ee"); r(16, 6, 32, 2, "#c97bd6"); r(30, 4, 4, 6, "#fff2a8");
  }) },
  shelf: { name: "책장", layer: "floor", s: sprite(32, 46, (r) => {
    r(0, 0, 32, 46, "#8b5a33"); r(3, 3, 26, 40, "#5c3a20"); r(3, 16, 26, 2, "#8b5a33"); r(3, 30, 26, 2, "#8b5a33");
    const books = ["#ff6f91", "#5cc8b8", "#ffd36b", "#7a6cff", "#f2f0fa", "#56b356"];
    for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) r(4 + i * 4, 6 + row * 14 + (i % 3), 3, 10 - (i % 3), books[(i + row * 2) % 6]);
  }) },
  table: { name: "케이크 테이블", layer: "floor", s: sprite(34, 26, (r) => {
    r(11, 4, 12, 7, "#fff8f0"); r(11, 4, 12, 2, "#f28ab2"); r(16, 0, 2, 4, "#7ec8f0"); r(16, 0, 2, 1, "#ffd36b");
    r(0, 10, 34, 4, "#c08a52"); r(0, 10, 34, 1, "#dcae7a"); r(3, 14, 3, 12, "#8b5a33"); r(28, 14, 3, 12, "#8b5a33");
  }) },
  bear: { name: "곰인형", layer: "floor", s: sprite(16, 18, (r) => {
    r(2, 0, 3, 3, "#8a5a32"); r(11, 0, 3, 3, "#8a5a32"); r(3, 1, 10, 7, "#b07a4a"); r(4, 7, 8, 8, "#b07a4a");
    r(6, 4, 4, 2, "#e8c9a0"); r(5, 3, 1, 1, "#221a2e"); r(10, 3, 1, 1, "#221a2e"); r(6, 9, 4, 4, "#e8c9a0");
    r(3, 13, 4, 5, "#9c6a3e"); r(9, 13, 4, 5, "#9c6a3e"); r(5, 8, 6, 1, "#ff6f91");
  }) },
  frame: { name: "액자", layer: "wall", s: sprite(24, 20, (r) => {
    r(0, 0, 24, 20, "#c9a227"); r(2, 2, 20, 16, "#bfe3ff"); r(4, 11, 8, 7, "#6cc96c"); r(10, 8, 10, 10, "#4aa14a"); r(16, 4, 3, 3, "#ffd36b");
  }) },
  clock: { name: "시계", layer: "wall", s: sprite(16, 16, (r) => {
    r(4, 0, 8, 16, "#5c3a20"); r(0, 4, 16, 8, "#5c3a20"); r(1, 2, 14, 12, "#5c3a20"); r(2, 1, 12, 14, "#5c3a20");
    r(2, 3, 12, 10, "#fffaf3"); r(3, 2, 10, 12, "#fffaf3"); r(7, 4, 2, 5, "#2d2540"); r(8, 7, 4, 2, "#2d2540");
  }) },
  poster: { name: "하트 포스터", layer: "wall", s: sprite(20, 26, (r) => {
    r(0, 0, 20, 26, "#fffaf3"); r(0, 0, 20, 1, "#d9cde8"); r(4, 6, 4, 3, "#ff6f91"); r(12, 6, 4, 3, "#ff6f91"); r(3, 8, 14, 4, "#ff6f91");
    r(5, 12, 10, 3, "#ff6f91"); r(7, 15, 6, 2, "#ff6f91"); r(9, 17, 2, 1, "#ff6f91"); r(5, 7, 2, 1, "#ffc2d1"); r(4, 21, 12, 1, "#9a8fb0");
  }) },
};

const POOP = sprite(12, 10, (r) => {
  r(4, 0, 3, 2, "#7a4a26"); r(3, 2, 6, 3, "#8b5a2b"); r(1, 5, 10, 3, "#7a4a26"); r(0, 8, 12, 2, "#6a3e1e");
  r(4, 2, 2, 1, "#b07a4a"); r(2, 5, 3, 1, "#a06a3a"); r(1, 8, 3, 1, "#8b5a2b"); r(4, 6, 1, 1, "#fff"); r(7, 6, 1, 1, "#fff");
});

// ---------- state ----------
const KEY = "phyco-world-v1";
const today = () => new Date().toISOString().slice(0, 10);
let uid = 1;
const item = (type, x, y) => ({ id: uid++, type, x, y, dx: 0, dy: 0, rot: 0, charred: 0 });

function sampleState() {
  return {
    owner: "준", mood: "들뜸", intro: "꾸미느라 3시간 걸림. 건드리면 죽음",
    bgm: 0,
    visits: { total: 128, today: 3, date: today() },
    items: [
      item("rug", 150, 172), item("bed", 62, 150), item("shelf", 120, 138), item("lamp", 22, 150),
      item("tv", 230, 160), item("plant", 268, 168), item("table", 160, 186), item("bear", 92, 192),
      item("frame", 150, 66), item("clock", 196, 52), item("poster", 236, 78),
    ],
    poops: [], fires: [], trash: [],
    guestbook: [
      { name: "민지 (예시)", msg: "방 너무 이쁘다 ㅠㅠ 곰인형 어디서 샀어?", at: Date.now() - 3600e3 * 5, auto: false },
      { name: "동훈 (예시)", msg: "다음에 놀러 갈게 ㅋㅋ 각오해라", at: Date.now() - 3600e3 * 2, auto: false },
    ],
  };
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (s && Array.isArray(s.items)) return s;
  } catch {}
  return sampleState();
}
let state = load();
uid = Math.max(1, ...state.items.map((i) => i.id + 1));
if (state.visits.date !== today()) state.visits = { ...state.visits, today: 0, date: today() };

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

// ---------- canvas setup ----------
const canvas = document.getElementById("room");
canvas.width = W; canvas.height = H;
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const fxCanvas = document.createElement("canvas");
fxCanvas.width = W; fxCanvas.height = H;
const fxCtx = fxCanvas.getContext("2d");
const frame = createFrame(W, H);
const img = new ImageData(W, H);
const tmp = document.createElement("canvas");
const tmpCtx = tmp.getContext("2d");

// ---------- effects ----------
let fxList = [];
let seed = 1;
function spawn(mod, x, y, o = {}) {
  const fx = createFx(mod, { x: Math.round(x), y: Math.round(y), seed: seed++, ...o });
  fxList.push(fx);
  return fx;
}
const fireFx = new Map(); // fire index key -> fx
function syncFires() {
  for (const [k, fx] of fireFx) if (!state.fires.some((f) => f.k === k)) { fx.stop(); fireFx.delete(k); }
  for (const f of state.fires) if (!fireFx.has(f.k)) fireFx.set(f.k, spawn(campfire, f.x, f.y, { height: 18 }));
}
syncFires();

// ---------- tiny async timeline ----------
let clock = 0;
const timers = [];
const wait = (s) => new Promise((res) => timers.push({ at: clock + s, res }));

// ---------- visitor actor ----------
const actor = { on: false, x: DOOR.x, y: DOOR.y, tx: DOOR.x, ty: DOOR.y, speed: 60, state: "idle", dir: -1, shirt: "#5cc8b8", t: 0, arrive: null };
function walkTo(x, y, speed = 70) {
  actor.tx = x; actor.ty = y; actor.speed = speed; actor.state = speed > 100 ? "run" : "walk";
  return new Promise((res) => (actor.arrive = res));
}
function drawActor(g, x, y, st, t, shirt, dir) {
  const r = (xx, yy, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x + (dir < 0 ? -xx - w : xx)), Math.round(y + yy), w, h); };
  const squat = st === "squat";
  const moving = st === "walk" || st === "run";
  const step = moving ? Math.floor(t * (st === "run" ? 14 : 8)) % 2 : 0;
  const shake = squat ? (Math.floor(t * 20) % 2) : 0;
  const top = squat ? -14 : -20;
  // shadow
  g.fillStyle = "rgba(45,37,64,0.18)"; g.fillRect(Math.round(x - 5), Math.round(y - 1), 10, 2);
  // legs
  if (squat) { r(-4 + shake, -4, 3, 3, "#3a3550"); r(1 + shake, -4, 3, 3, "#3a3550"); }
  else { r(-3, -6 + (step ? -1 : 0), 2, 6 - (step ? 1 : 0), "#3a3550"); r(1, -6 + (step ? 0 : -1), 2, 6 - (step ? 0 : 1), "#3a3550"); }
  // body
  r(-4 + shake, top + 8, 8, squat ? 4 : 7, shirt);
  r(-5 + shake, top + 9, 1, 4, "#f5c9a3"); r(4 + shake, top + 9, 1, 4, "#f5c9a3");
  // head
  r(-4 + shake, top, 8, 8, "#f5c9a3"); r(-4 + shake, top, 8, 3, "#2d2540"); r(-5 + shake, top + 1, 1, 4, "#2d2540");
  r(1 + shake, top + 4, 1, 1, "#2d2540"); r(3 + shake, top + 4, 1, 1, "#2d2540");
  if (st === "run" || squat) r(1 + shake, top + 6, 3, 1, "#c4504e");
}

// speech bubble over the canvas (DOM, so Korean renders crisply)
const bubble = document.getElementById("bubble");
let bubbleUntil = 0;
function say(text, secs = 1.6) {
  bubble.textContent = text; bubble.hidden = false; bubbleUntil = clock + secs;
}

// ---------- room drawing ----------
const bg = sprite(W, H, (r) => {
  r(0, 0, W, WALL_BOTTOM, "#fdeef4");
  for (let x = 0; x < W; x += 12) r(x, 0, 6, WALL_BOTTOM, "#fbe3ed");
  for (let y = 8; y < WALL_BOTTOM - 6; y += 16) for (let x = 3 + ((y / 16) % 2) * 6; x < W; x += 12) r(x, y, 1, 1, "#f3c6d8");
  // window
  r(28, 22, 58, 50, "#ffffff"); r(31, 25, 52, 44, "#9fd8ff"); r(56, 25, 2, 44, "#ffffff"); r(31, 46, 52, 2, "#ffffff");
  r(36, 30, 12, 4, "#ffffff"); r(40, 28, 8, 2, "#ffffff"); r(64, 52, 14, 4, "#eaf7ff"); r(70, 30, 6, 6, "#ffe48a");
  r(22, 18, 70, 4, "#c97bd6"); r(22, 22, 8, 54, "#e6a7ee"); r(84, 22, 8, 54, "#e6a7ee");
  // door
  r(280, 44, 30, WALL_BOTTOM - 44, "#8b5a33"); r(283, 47, 24, WALL_BOTTOM - 47, "#a86d3e"); r(286, 52, 18, 22, "#9a643a"); r(286, 80, 18, 26, "#9a643a"); r(302, 78, 3, 3, "#ffd36b");
  // baseboard + floor
  r(0, WALL_BOTTOM - 2, W, 4, "#c49a76"); r(0, WALL_BOTTOM + 2, W, H - WALL_BOTTOM, "#e2b98a");
  for (let y = WALL_BOTTOM + 2, row = 0; y < H; y += 10, row++) {
    r(0, y, W, 1, "#d4a674");
    for (let x = (row % 2) * 24; x < W; x += 48) r(x, y, 1, 10, "#d4a674");
  }
});

function drawItem(it, now) {
  const def = CATALOG[it.type];
  if (!def) return;
  const s = def.s;
  let src = s;
  if (it.charred > 0.01) {
    tmp.width = s.width; tmp.height = s.height;
    tmpCtx.globalCompositeOperation = "source-over";
    tmpCtx.clearRect(0, 0, s.width, s.height);
    tmpCtx.drawImage(s, 0, 0);
    tmpCtx.globalCompositeOperation = "source-atop";
    tmpCtx.fillStyle = `rgba(28,18,16,${Math.min(0.88, it.charred * 0.88)})`;
    tmpCtx.fillRect(0, 0, s.width, s.height);
    src = tmp;
  }
  const x = it.x + it.dx, y = it.y + it.dy;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (it.rot) ctx.rotate(it.rot);
  ctx.drawImage(src, -Math.round(s.width / 2), -s.height);
  ctx.restore();
  if (it === selected && mode === "owner") {
    ctx.strokeStyle = "#ff6f91"; ctx.setLineDash([2, 2]); ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x - s.width / 2) - 1.5, Math.round(y - s.height) - 1.5, s.width + 3, s.height + 3);
    ctx.setLineDash([]);
  }
}

function drawPoop(p, now) {
  ctx.drawImage(POOP, Math.round(p.x - 6), Math.round(p.y - 10));
  // stink lines
  ctx.fillStyle = "rgba(120,170,80,0.8)";
  for (let i = 0; i < 3; i++) {
    const ph = (now * 1.2 + i / 3 + p.x * 0.01) % 1;
    const yy = p.y - 12 - ph * 10, xx = p.x - 4 + i * 4 + Math.round(Math.sin((ph + i) * 6) * 1.5);
    ctx.globalAlpha = 1 - ph; ctx.fillRect(Math.round(xx), Math.round(yy), 1, 3);
  }
  ctx.globalAlpha = 1;
  // two flies orbiting
  ctx.fillStyle = "#2d2540";
  for (let i = 0; i < 2; i++) {
    const a = now * (5 + i * 2) + i * 3 + p.x;
    ctx.fillRect(Math.round(p.x + Math.cos(a) * 8), Math.round(p.y - 12 + Math.sin(a * 1.3) * 4), 2, 1);
  }
}
const TRASH = { paper: ["#ffffff", "#d9cde8"], peel: ["#ffd36b", "#c9a227"], can: ["#e2504e", "#b33a38"], sock: ["#7a6cff", "#5a4ccc"] };
function drawTrash(t) {
  const [a, b] = TRASH[t.kind] || TRASH.paper;
  ctx.fillStyle = a; ctx.fillRect(t.x - 2, t.y - 3, 4, 3);
  ctx.fillStyle = b; ctx.fillRect(t.x - 2, t.y - 1, 4, 1);
  if (t.kind === "peel") { ctx.fillStyle = a; ctx.fillRect(t.x - 4, t.y - 1, 2, 1); ctx.fillRect(t.x + 2, t.y - 1, 2, 1); }
}

function render(now) {
  ctx.drawImage(bg, 0, 0);
  // charred scorch on floor around fires
  for (const f of state.fires) {
    ctx.fillStyle = "rgba(40,24,20,0.35)";
    ctx.fillRect(f.x - 22, f.y - 3, 44, 6); ctx.fillRect(f.x - 16, f.y - 5, 32, 10);
  }
  for (const it of state.items) if (CATALOG[it.type]?.layer === "wall") drawItem(it, now);
  for (const it of state.items) if (CATALOG[it.type]?.flat) drawItem(it, now);
  const drawables = [];
  for (const it of state.items) if (CATALOG[it.type]?.layer === "floor" && !CATALOG[it.type].flat) drawables.push([it.y + it.dy, () => drawItem(it, now)]);
  for (const t of state.trash) drawables.push([t.y - 0.5, () => drawTrash(t)]);
  for (const p of state.poops) drawables.push([p.y, () => drawPoop(p, now)]);
  if (actor.on) drawables.push([actor.y + 0.1, () => drawActor(ctx, actor.x, actor.y, actor.state, actor.t, actor.shirt, actor.dir)]);
  drawables.sort((a, b) => a[0] - b[0]).forEach((d) => d[1]());
  // pixelfx effects on top
  clearFrame(frame);
  for (const fx of fxList) fx.draw(frame);
  composite(frame, img.data, null);
  fxCtx.putImageData(img, 0, 0);
  ctx.drawImage(fxCanvas, 0, 0);
  // armed tool target preview
  if (armed && hover) {
    ctx.strokeStyle = "#ff6f91"; ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(hover.x) - 6.5, Math.round(hover.y) - 2.5, 13, 5);
  }
}

// ---------- loop ----------
let last = performance.now();
let saveSoon = 0;
function tick(nowMs) {
  const dt = Math.min(0.05, (nowMs - last) / 1000);
  last = nowMs;
  clock += dt;
  for (let i = timers.length - 1; i >= 0; i--) if (timers[i].at <= clock) { timers[i].res(); timers.splice(i, 1); }
  // actor
  if (actor.on) {
    actor.t += dt;
    if (actor.state === "walk" || actor.state === "run") {
      const ddx = actor.tx - actor.x, ddy = actor.ty - actor.y, d = Math.hypot(ddx, ddy);
      if (Math.abs(ddx) > 0.5) actor.dir = ddx < 0 ? -1 : 1;
      const stepLen = actor.speed * dt;
      if (d <= stepLen) { actor.x = actor.tx; actor.y = actor.ty; actor.state = "idle"; const a = actor.arrive; actor.arrive = null; a && a(); }
      else { actor.x += (ddx / d) * stepLen; actor.y += (ddy / d) * stepLen; }
    }
  }
  // fires char nearby furniture
  if (state.fires.length) {
    for (const it of state.items) {
      for (const f of state.fires) {
        const d = Math.hypot(it.x + it.dx - f.x, (it.y + it.dy - f.y) * 1.6);
        if (d < 90) it.charred = Math.min(1, it.charred + dt * 0.12 * (1 - d / 90));
      }
    }
    saveSoon += dt;
    if (saveSoon > 2) { saveSoon = 0; save(); updateMeter(); }
  }
  for (const fx of fxList) fx.update(dt);
  fxList = fxList.filter((fx) => !fx.done());
  if (!bubble.hidden) {
    if (clock > bubbleUntil) bubble.hidden = true;
    else {
      const rect = canvas.getBoundingClientRect();
      bubble.style.left = `${(actor.x / W) * 100}%`;
      bubble.style.top = `${((actor.y - 26) / H) * 100}%`;
    }
  }
  render(clock);
  requestAnimationFrame(tick);
}

// ---------- pranks ----------
let busy = false;
const visitorName = () => (document.getElementById("visitorName").value.trim() || "익명의 손님");
function logPrank(text) {
  state.guestbook.unshift({ name: visitorName(), msg: text, at: Date.now(), auto: true });
  save(); renderGuestbook(); updateMeter();
}
async function enter() {
  actor.on = true; actor.x = DOOR.x; actor.y = DOOR.y; actor.t = 0;
  actor.shirt = ["#5cc8b8", "#ff9a2a", "#7a6cff", "#56b356", "#ff6f91"][Math.floor(Math.random() * 5)];
  spawn(poof, DOOR.x, DOOR.y + 4);
  await wait(0.2);
}
async function escape(line) {
  say(line, 1.4);
  await walkTo(DOOR.x, DOOR.y, 150);
  spawn(poof, DOOR.x, DOOR.y + 4);
  actor.on = false;
}
const clampFloor = (x, y) => ({ x: Math.max(FLOOR.x0 + 10, Math.min(FLOOR.x1 - 30, x)), y: Math.max(FLOOR.y0 + 6, Math.min(FLOOR.y1 - 2, y)) });

async function prankMess() {
  busy = true; setBusy();
  await enter();
  say("오 방 이쁘네~?", 1.2);
  const targets = state.items.filter((i) => !CATALOG[i.type].flat).sort(() => Math.random() - 0.5).slice(0, 5);
  for (const it of targets) {
    const def = CATALOG[it.type];
    const tx = it.x + it.dx + (def.layer === "wall" ? 0 : 0), ty = def.layer === "wall" ? FLOOR.y0 + 8 : it.y + it.dy + 2;
    await walkTo(Math.max(FLOOR.x0, Math.min(FLOOR.x1 - 20, tx)), Math.min(FLOOR.y1 - 2, ty), 120);
    spawn(pow, it.x + it.dx, it.y + it.dy - def.s.height / 2, { text: ["BANG!", "OOPS!", "CRASH!", "POW!"][Math.floor(Math.random() * 4)] });
    it.dx += Math.round((Math.random() - 0.5) * 30);
    if (def.layer === "wall") { it.rot = (Math.random() - 0.5) * 1.4; it.dy += Math.round(Math.random() * 10); }
    else { it.rot = (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 1.3); it.dy += Math.round((Math.random() - 0.5) * 8); }
    { const R = def.layer === "wall" ? WALLR : FLOOR, hw = def.s.width / 2; it.dx = Math.max(R.x0 + hw - it.x, Math.min(R.x1 - hw - it.x, it.dx)); }
    for (let k = 0; k < 3; k++) {
      const p = clampFloor(it.x + (Math.random() - 0.5) * 50, it.y + (Math.random() - 0.5) * 24);
      state.trash.push({ x: Math.round(p.x), y: Math.round(p.y), kind: ["paper", "peel", "can", "sock"][Math.floor(Math.random() * 4)] });
    }
    save(); updateMeter();
    await wait(0.25);
  }
  await escape("ㅋㅋㅋㅋ 튀어!");
  logPrank("방을 엉망진창으로 어지르고 도망갔습니다 🌀");
  busy = false; setBusy();
}

async function prankFire(at) {
  busy = true; setBusy();
  const p = clampFloor(at.x, at.y);
  await enter();
  await walkTo(p.x + 14, p.y, 80);
  actor.dir = -1; actor.state = "squat"; actor.t = 0;
  say("불멍 각이다", 1.2);
  await wait(1.0);
  spawn(fireRing, p.x, p.y, { reach: 46 });
  state.fires.push({ x: Math.round(p.x), y: Math.round(p.y), k: Date.now() + Math.random() });
  syncFires(); save(); updateMeter();
  await wait(0.5);
  await escape("앗 뜨거 ㅋㅋㅋ");
  logPrank("방 한가운데 모닥불을 피우고 도망갔습니다 🔥");
  busy = false; setBusy();
}

async function prankPoop(at) {
  busy = true; setBusy();
  const p = clampFloor(at.x, at.y);
  await enter();
  await walkTo(p.x, p.y - 1, 80);
  actor.state = "squat"; actor.t = 0;
  say("끄응...", 1.4);
  await wait(1.4);
  state.poops.push({ x: Math.round(p.x), y: Math.round(p.y + 3) });
  spawn(pow, p.x, p.y - 14, { text: "PLOP!" });
  save(); updateMeter();
  await wait(0.35);
  await escape("시원하다~ 안녕!");
  logPrank("방에 똥을 싸고 도망갔습니다 💩");
  busy = false; setBusy();
}

function cleanUp() {
  for (const p of state.poops) spawn(poof, p.x, p.y);
  for (const f of state.fires) spawn(poof, f.x, f.y);
  spawn(confetti, 160, 196);
  for (const it of state.items) { it.dx = 0; it.dy = 0; it.rot = 0; it.charred = 0; }
  state.poops = []; state.fires = []; state.trash = [];
  syncFires(); save(); updateMeter();
  toast("싹 치웠어요. 원래대로 돌아왔습니다.");
}

// ---------- UI wiring ----------
let mode = "owner";
let selected = null;
let armed = null; // "fire" | "poop"
let hover = null;
let drag = null;
const $ = (id) => document.getElementById(id);

function toCanvas(e) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
}
function hit(p) {
  const order = [...state.items].sort((a, b) => {
    const la = CATALOG[a.type].layer === "wall" ? 0 : CATALOG[a.type].flat ? 1 : 2;
    const lb = CATALOG[b.type].layer === "wall" ? 0 : CATALOG[b.type].flat ? 1 : 2;
    return la - lb || a.y - b.y;
  }).reverse();
  return order.find((it) => {
    const s = CATALOG[it.type].s, x = it.x + it.dx, y = it.y + it.dy;
    return p.x >= x - s.width / 2 && p.x <= x + s.width / 2 && p.y >= y - s.height && p.y <= y;
  });
}

canvas.addEventListener("pointerdown", (e) => {
  const p = toCanvas(e);
  if (mode === "visitor") {
    if (!armed || busy) return;
    if (p.y < FLOOR.y0 - 4) { toast("바닥을 눌러 주세요."); return; }
    const tool = armed; disarm();
    tool === "fire" ? prankFire(p) : prankPoop(p);
    return;
  }
  const it = hit(p);
  selected = it || null;
  updateSelection();
  if (it) { drag = { it, ox: p.x - it.x, oy: p.y - it.y }; canvas.setPointerCapture(e.pointerId); }
});
canvas.addEventListener("pointermove", (e) => {
  const p = toCanvas(e);
  hover = p;
  if (!drag) return;
  const def = CATALOG[drag.it.type], R = def.layer === "wall" ? WALLR : FLOOR;
  drag.it.x = Math.round(Math.max(R.x0 + def.s.width / 2, Math.min(R.x1 - def.s.width / 2, p.x - drag.ox)));
  drag.it.y = Math.round(Math.max(R.y0 + (def.layer === "wall" ? def.s.height : 0), Math.min(R.y1, p.y - drag.oy)));
});
canvas.addEventListener("pointerup", () => { if (drag) { drag = null; save(); } });
canvas.addEventListener("pointerleave", () => (hover = null));

function addItem(type) {
  const def = CATALOG[type];
  const it = def.layer === "wall" ? item(type, 120 + Math.random() * 80, 70) : item(type, 140 + Math.random() * 40, 175);
  state.items.push(it); selected = it; save(); updateSelection();
}
function removeSelected() {
  if (!selected) return;
  state.items = state.items.filter((i) => i !== selected);
  selected = null; save(); updateSelection();
}
document.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea, select")) return;
  if ((e.key === "Delete" || e.key === "Backspace") && mode === "owner") removeSelected();
  if (e.key === "Escape") disarm();
});

function updateSelection() {
  $("removeBtn").disabled = !selected;
  $("selName").textContent = selected ? `선택: ${CATALOG[selected.type].name}` : "가구를 눌러서 고르고, 끌어서 옮기세요.";
}

function arm(tool) {
  if (busy) return;
  armed = armed === tool ? null : tool;
  document.querySelectorAll("[data-prank]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.prank === armed)));
  canvas.classList.toggle("aiming", !!armed);
  $("hint").textContent = armed ? (armed === "fire" ? "불 피울 바닥 자리를 누르세요. (Esc로 취소)" : "똥 쌀 바닥 자리를 누르세요. (Esc로 취소)") : visitorHint;
}
function disarm() { armed = null; arm(null); armed = null; document.querySelectorAll("[data-prank]").forEach((b) => b.setAttribute("aria-pressed", "false")); canvas.classList.remove("aiming"); $("hint").textContent = mode === "visitor" ? visitorHint : ownerHint; }
const visitorHint = "장난을 고르세요. 어지럽히기는 바로 시작하고, 나머지는 바닥 자리를 누르면 시작해요.";
const ownerHint = "아래 가구를 눌러 방에 놓고, 끌어서 옮기세요.";
function setBusy() {
  document.querySelectorAll("[data-prank]").forEach((b) => (b.disabled = busy));
  $("modeOwner").disabled = busy;
}

function setMode(m) {
  if (busy) return;
  mode = m;
  disarm();
  selected = null; updateSelection();
  $("ownerTools").hidden = m !== "owner";
  $("visitorTools").hidden = m !== "visitor";
  $("modeOwner").setAttribute("aria-pressed", String(m === "owner"));
  $("modeVisitor").setAttribute("aria-pressed", String(m === "visitor"));
  document.body.dataset.mode = m;
  $("hint").textContent = m === "visitor" ? visitorHint : ownerHint;
  if (m === "visitor") {
    state.visits.today++; state.visits.total++; save(); renderCounter();
    toast(`${state.owner}님의 홈피에 놀러 왔어요. 방문자 수가 올라갔습니다.`);
    bgm.play(state.bgm); renderBgm();
  }
}

// ---------- counter, meter, guestbook ----------
function renderCounter() { $("today").textContent = state.visits.today; $("total").textContent = state.visits.total; }
function messScore() {
  const knocked = state.items.filter((i) => i.rot || i.dx || i.dy).length;
  const char = state.items.reduce((a, i) => a + i.charred, 0);
  return Math.min(100, Math.round(knocked * 7 + state.trash.length * 1 + state.poops.length * 14 + state.fires.length * 18 + char * 6));
}
function updateMeter() {
  const s = messScore();
  $("meterFill").style.width = `${s}%`;
  $("meterNum").textContent = s;
  $("meterLabel").textContent = s === 0 ? "반짝반짝" : s < 25 ? "살짝 지저분" : s < 50 ? "누가 다녀감" : s < 80 ? "난장판" : "폐허";
  $("cleanBtn").disabled = s === 0;
}
function fmt(t) {
  const d = new Date(t);
  return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function renderGuestbook() {
  const ul = $("gbList");
  ul.replaceChildren();
  for (const g of state.guestbook.slice(0, 40)) {
    const li = document.createElement("li");
    if (g.auto) li.className = "auto";
    const head = document.createElement("div"); head.className = "gb-head";
    const n = document.createElement("b"); n.textContent = g.name;
    const tm = document.createElement("time"); tm.textContent = fmt(g.at);
    head.append(n, tm);
    if (g.auto) { const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = "장난 기록"; head.append(tag); }
    const p = document.createElement("p"); p.textContent = g.msg;
    li.append(head, p);
    ul.append(li);
  }
  $("gbCount").textContent = state.guestbook.length;
}
$("gbForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = $("gbMsg").value.trim();
  if (!msg) { $("gbMsg").focus(); return; }
  const name = $("gbName").value.trim() || (mode === "visitor" ? visitorName() : state.owner);
  state.guestbook.unshift({ name, msg, at: Date.now(), auto: false });
  $("gbMsg").value = ""; save(); renderGuestbook();
});

// ---------- profile ----------
$("ownerName").value = state.owner;
$("mood").value = state.mood;
$("intro").value = state.intro;
$("ownerName").addEventListener("change", (e) => { state.owner = e.target.value.trim() || "주인"; save(); });
$("mood").addEventListener("change", (e) => { state.mood = e.target.value; save(); });
$("intro").addEventListener("change", (e) => { state.intro = e.target.value; save(); });
const mini = $("minime").getContext("2d");
mini.imageSmoothingEnabled = false;
function drawMinime(t) {
  mini.clearRect(0, 0, 32, 32);
  mini.save(); mini.scale(1, 1);
  drawActor(mini, 16, 29 - (Math.floor(t * 2) % 2), "idle", t, "#ff6f91", 1);
  mini.restore();
}

// ---------- BGM ----------
const bgm = new Bgm();
let browse = state.bgm;
function renderBgm() {
  $("songTitle").textContent = SONGS[browse].title;
  $("songMeta").textContent = browse === state.bgm ? "우리집 BGM" : `${SONGS[browse].bpm} BPM`;
  $("playBtn").textContent = bgm.playing ? "정지" : "재생";
  $("playBtn").setAttribute("aria-pressed", String(bgm.playing));
  $("setBgmBtn").disabled = browse === state.bgm;
  $("eq").classList.toggle("on", bgm.playing);
}
$("playBtn").addEventListener("click", () => { bgm.playing ? bgm.stop() : bgm.play(browse); renderBgm(); });
$("prevBtn").addEventListener("click", () => { browse = (browse + SONGS.length - 1) % SONGS.length; if (bgm.playing) bgm.play(browse); renderBgm(); });
$("nextBtn").addEventListener("click", () => { browse = (browse + 1) % SONGS.length; if (bgm.playing) bgm.play(browse); renderBgm(); });
$("setBgmBtn").addEventListener("click", () => { state.bgm = browse; save(); renderBgm(); toast(`우리집 BGM을 "${SONGS[browse].title}"(으)로 바꿨어요.`); });

// ---------- misc ----------
let toastTimer;
function toast(t) {
  const el = $("toast"); el.textContent = t; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.hidden = true), 2600);
}
$("modeOwner").addEventListener("click", () => setMode("owner"));
$("modeVisitor").addEventListener("click", () => setMode("visitor"));
$("removeBtn").addEventListener("click", removeSelected);
$("cleanBtn").addEventListener("click", cleanUp);
$("resetBtn").addEventListener("click", () => {
  if (busy) return;
  state = sampleState(); uid = 100; syncFires(); save();
  renderAll(); toast("예시 방으로 되돌렸어요.");
});
document.querySelectorAll("[data-prank]").forEach((b) => b.addEventListener("click", () => {
  if (b.dataset.prank === "mess") { disarm(); if (!busy) prankMess(); }
  else arm(b.dataset.prank);
}));
const pal = $("palette");
for (const [type, def] of Object.entries(CATALOG)) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "pal";
  const c = document.createElement("canvas");
  const sc = Math.max(1, Math.floor(Math.min(36 / def.s.width, 36 / def.s.height) * 2) / 2);
  c.width = def.s.width; c.height = def.s.height;
  c.getContext("2d").drawImage(def.s, 0, 0);
  c.style.width = `${def.s.width * Math.min(1, sc)}px`;
  const l = document.createElement("span"); l.textContent = def.name;
  b.append(c, l);
  b.addEventListener("click", () => addItem(type));
  pal.append(b);
}

function renderAll() { renderCounter(); renderGuestbook(); updateMeter(); updateSelection(); renderBgm();
  $("ownerName").value = state.owner; $("mood").value = state.mood; $("intro").value = state.intro; }
renderAll();
setMode("owner");
(function miniLoop(t) { drawMinime(t / 1000); requestAnimationFrame(miniLoop); })(0);
requestAnimationFrame((t) => { last = t; tick(t); });
