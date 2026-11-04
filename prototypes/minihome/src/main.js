// phyco world v2 — a minihome where friends come over and wreck your room, together, live.
// Throwaway prototype code (see ../README.md). Effects: pixelfx (MIT, vendored in ../vendor/pixelfx).
import { createFrame, clearFrame, createFx, composite } from "../vendor/pixelfx/src/core/index.js";
import * as campfire from "../vendor/pixelfx/src/fx/fire/campfire.js";
import * as fireRing from "../vendor/pixelfx/src/fx/fire/fire-ring.js";
import * as poof from "../vendor/pixelfx/src/fx/spawn/poof.js";
import * as pow from "../vendor/pixelfx/src/fx/explosions/cartoon-pow.js";
import * as smallBoom from "../vendor/pixelfx/src/fx/explosions/small-explosion.js";
import * as confetti from "../vendor/pixelfx/src/fx/ui/confetti.js";
import * as blunt from "../vendor/pixelfx/src/fx/impacts/blunt-hit.js";
import * as hitSpark from "../vendor/pixelfx/src/fx/impacts/hit-spark.js";
import * as lightning from "../vendor/pixelfx/src/fx/lightning/lightning-strike.js";
import * as zap from "../vendor/pixelfx/src/fx/lightning/zap-hit.js";
import * as sparkArc from "../vendor/pixelfx/src/fx/lightning/spark-arc.js";
import * as snowflake from "../vendor/pixelfx/src/fx/ice/snowflake-burst.js";
import * as acid from "../vendor/pixelfx/src/fx/nature/acid-splash.js";
import * as poison from "../vendor/pixelfx/src/fx/nature/poison-cloud.js";
import * as splash from "../vendor/pixelfx/src/fx/water/splash.js";
import * as ripples from "../vendor/pixelfx/src/fx/water/ripples.js";
import * as ghost from "../vendor/pixelfx/src/fx/critters/ghost.js";
import * as frog from "../vendor/pixelfx/src/fx/critters/frog.js";
import * as slime from "../vendor/pixelfx/src/fx/critters/slime.js";
import * as swordSlash from "../vendor/pixelfx/src/fx/melee/sword-slash.js";
import * as doubleSlash from "../vendor/pixelfx/src/fx/melee/double-slash.js";
import * as thrustFx from "../vendor/pixelfx/src/fx/melee/thrust.js";
import * as damageNum from "../vendor/pixelfx/src/fx/ui/damage-number.js";
import * as critHit from "../vendor/pixelfx/src/fx/impacts/crit-hit.js";
import { Bgm, SONGS } from "./bgm.js";
import { CATALOG, WALLS, FLOORS, LOOK_OPTIONS, DEFAULT_LOOK, drawMinimi, randomLook, mulberry, hashStr, sprite, POOP, TRASH } from "./sprites.js";
import { connect, newId, today, pairId } from "./net.js";
import { JOBS, KEYS, jobById, skillOf, aimSkill, skillTargets } from "./skills.js";

const $ = (id) => document.getElementById(id);

// ---------- room geometry (native pixels; canvas is scaled up with image-rendering: pixelated) ----------
// An isometric room like the old mini rooms: two walls meeting at a back corner over a diamond floor.
// The game still works in screen pixels; the floor is the diamond, walls rise from its two back edges.
const W = 320, H = 200;
const CX = 160, CY = 66, HW = 150, WALL_H = 60;          // back corner, half width, wall height
const backY = (x) => CY + Math.abs(x - CX) / 2;           // where floor meets wall
const frontY = (x) => CY + HW - Math.abs(x - CX) / 2;     // the diamond's front edges
function clampP(x, y, m = 3) {
  x = Math.max(CX - HW + m * 4 + 4, Math.min(CX + HW - m * 4 - 4, x));
  const lo = backY(x) + m, hi = Math.min(H - 2, frontY(x) - m);
  return { x, y: lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, y)) };
}
const wallSide = (x) => (x < CX ? -1 : 1);                // -1 left wall, 1 right wall
const DOOR = { x: 266, y: backY(266) + 7 };
const ESCAPE_SECS = 10;

// ---------- what you can do ----------
// Item actions: walk up to a piece of furniture and click it (or press E).
const ACTIONS = {
  kick: { label: "발로 차기", ico: "🦶" }, jump: { label: "방방 뛰다 부수기", ico: "🤸" }, burn: { label: "불 지르기", ico: "🔥" },
  slash: { label: "칼로 찢기", ico: "🗡️" }, zap: { label: "번개 내리꽂기", ico: "⚡" }, shock: { label: "감전시키기", ico: "🔌" },
  freeze: { label: "꽁꽁 얼리기", ico: "🧊" }, acid: { label: "독 뿌리기", ico: "🧪" }, boom: { label: "폭파하기", ico: "💣" },
  splat: { label: "케이크 엎기", ico: "🎂" }, haunt: { label: "유령 씌우기", ico: "👻" }, water: { label: "물 쏟기", ico: "💦" },
  doodle: { label: "낙서하기", ico: "🖍️" }, cut: { label: "칼로 긋기", ico: "🔪" }, drop: { label: "떨어뜨리기", ico: "⬇️" },
};
const BY_TYPE = {
  bed: ["jump", "burn", "kick"], sofa: ["slash", "burn", "kick"], tv: ["zap", "kick"], lamp: ["shock", "kick"],
  plant: ["freeze", "acid", "kick"], shelf: ["boom", "kick"], table: ["splat", "kick"], bear: ["haunt", "slash", "kick"],
  rug: ["water", "burn"], fishbowl: ["freeze", "kick"], guitar: ["shock", "slash", "kick"],
  frame: ["doodle", "cut", "drop"], clock: ["doodle", "drop"], poster: ["doodle", "cut", "drop"],
};
// Free actions: anywhere on the floor, keys 1-5.
// What is switched on right now. For now only two pranks, big and easy to see; the furniture pranks and
// the Q W E R jobs stay in the code, switched off.
const FEATURES = { itemPranks: false, skills: false };
const ALL_FREE = [
  { kind: "poop", label: "똥 싸기", ico: "💩" },
  { kind: "slime", label: "슬라임 풀기", ico: "🟢" },
  { kind: "fart", label: "방귀 뀌기", ico: "💨", off: true },
  { kind: "fire", label: "모닥불", ico: "🔥", off: true },
  { kind: "frog", label: "개구리 풀기", ico: "🐸", off: true },
];
const FREE = ALL_FREE.filter((f) => !f.off).map((f, i) => ({ ...f, key: String(i + 1) }));
// coins
// basic attacks: start bare-handed, buy the rest with coins. Furniture has HP and breaks when it runs out.
const WEAPONS = {
  fist: { name: "맨주먹", ico: "👊", dmg: 1, reach: 12, cd: 0.32, price: 0 },
  sword: { name: "칼", ico: "🗡️", dmg: 2, reach: 20, cd: 0.45, price: 20 },
  spear: { name: "창", ico: "🔱", dmg: 2, reach: 32, cd: 0.55, price: 30 },
  hammer: { name: "망치", ico: "🔨", dmg: 4, reach: 14, cd: 0.9, price: 50 },
};
const HP = { bed: 8, sofa: 7, tv: 4, plant: 3, lamp: 3, rug: 4, shelf: 8, table: 5, bear: 3, frame: 2, clock: 2, poster: 2, fishbowl: 2, guitar: 4 };
const hpOf = (it) => HP[it.type] || 3;
const COIN_CATCH = 10;   // the owner, per wrecker caught in the act
const COIN_GUEST = 1;    // writing in someone else's guestbook, every time
const COIN_RUIN = 2;     // a visitor, for turning someone's room into a ruin (mess 80+)
const RUIN_AT = 80;
const LOG = {
  kick: (n) => `${n}을(를) 걷어찼어요`, jump: (n) => `${n} 위에서 방방 뛰다 부쉈어요`, burn: (n) => `${n}에 불을 질렀어요`,
  slash: (n) => `${n}을(를) 칼로 찢었어요`, zap: (n) => `${n}에 번개를 내리꽂았어요`, shock: (n) => `${n}을(를) 감전시켰어요`,
  freeze: (n) => `${n}을(를) 꽁꽁 얼렸어요`, acid: (n) => `${n}에 독을 뿌렸어요`, boom: (n) => `${n}을(를) 폭파했어요`,
  splat: () => `케이크를 엎었어요`, haunt: (n) => `${n}에 유령을 씌웠어요`, water: (n) => `${n}에 물을 쏟았어요`,
  doodle: (n) => `${n}에 낙서했어요`, cut: (n) => `${n}을(를) 칼로 그었어요`, drop: (n) => `${n}을(를) 떨어뜨렸어요`,
  poop: () => `똥을 쌌어요`, fart: () => `방귀를 뀌었어요`, fire: () => `방 한가운데 모닥불을 피웠어요`,
  frog: () => `개구리를 풀어놨어요`, slime: () => `슬라임을 풀어놨어요`,
};

// ---------- state ----------
const SAMPLE_ITEMS = () => [
  { id: "i1", type: "rug", x: 150, y: 150 }, { id: "i2", type: "bed", x: 64, y: 150 }, { id: "i3", type: "shelf", x: 136, y: 102 },
  { id: "i4", type: "lamp", x: 42, y: 140 }, { id: "i5", type: "tv", x: 226, y: 132, flip: true }, { id: "i6", type: "plant", x: 278, y: 150 },
  { id: "i7", type: "table", x: 160, y: 168 }, { id: "i8", type: "bear", x: 196, y: 176 }, { id: "i9", type: "frame", x: 98, y: 80 },
  { id: "i10", type: "clock", x: 180, y: 58 }, { id: "i11", type: "poster", x: 214, y: 80 }, { id: "i12", type: "sofa", x: 196, y: 112, flip: true },
];
const sampleRoom = () => ({ items: SAMPLE_ITEMS(), wall: "stripe", floor: "wood", bgm: 0, mood: "들뜸", intro: "꾸미느라 3시간 걸림. 건드리면 죽음", title: "어서 와, 내 방은 처음이지?", ownerNick: "준", cleanedAt: 0, ownerId: null, layout: "iso" });

let net = null;
let me = { id: null, isOwner: false, canWrite: false };
let room = sampleRoom();
let roomLoaded = false;
let pranks = [];          // from the store
let botPranks = [];       // friend-bot pranks (this browser only)
let guestbook = [];
let secrets = {};
let minimiMap = {};
let visits = [];
let peers = [];           // other people in the room right now
const names = {};
const loadedAt = Date.now();
const played = new Set();
let myLook = null;
let role = "visitor";     // "owner" in my own minihome, "visitor" in anyone else's
let currentHome = null;   // whose minihome is open (their user id)
let homeOpenedAt = Date.now();
let ilchon = [];          // my 일촌 links: { id, a, b, from, to, status, names }
let profiles = {};        // uid -> { handle, nick } from the entry screen

// ---------- canvas ----------
const canvas = $("room");
canvas.width = W; canvas.height = H;
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const fxCanvas = document.createElement("canvas"); fxCanvas.width = W; fxCanvas.height = H;
const fxCtx = fxCanvas.getContext("2d");
const frame = createFrame(W, H);
const img = new ImageData(W, H);
const tmp = document.createElement("canvas");
const tmpCtx = tmp.getContext("2d");
let bgCache = { key: "", c: null };
function background() {
  const key = room.wall + "/" + room.floor;
  if (bgCache.key === key) return bgCache.c;
  const wall = WALLS[room.wall] || WALLS.stripe, floor = FLOORS[room.floor] || FLOORS.wood;
  const wallTex = sprite(HW, WALL_H, (r) => wall.draw(r, HW, WALL_H));
  const floorTex = sprite(HW, HW, (r) => floor.draw(r, HW, 0, HW));
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
  g.fillStyle = "#e9eef8"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#dde4f2"; for (let y = 0; y < H; y += 8) for (let x = (y / 8) % 2 * 4; x < W; x += 8) g.fillRect(x, y, 1, 1);
  // floor slab edge (the room floats like a little diorama)
  g.fillStyle = "#b98d63";
  for (let x = CX - HW; x < CX + HW; x++) g.fillRect(x, Math.round(frontY(x + 0.5)), 1, 6);
  // floor: the texture mapped onto the diamond
  g.setTransform(1, 0.5, -1, 0.5, CX, CY); g.drawImage(floorTex, 0, 0); g.setTransform(1, 0, 0, 1, 0, 0);
  // walls: the wallpaper sheared onto each plane
  g.setTransform(1, -0.5, 0, 1, CX - HW, CY + HW / 2 - WALL_H); g.drawImage(wallTex, 0, 0);
  g.setTransform(1, 0.5, 0, 1, CX, CY - WALL_H); g.drawImage(wallTex, 0, 0);
  g.setTransform(1, 0, 0, 1, 0, 0);
  // the left wall is a little darker than the right, like light from a window
  g.fillStyle = "rgba(60,40,90,0.08)";
  for (let x = CX - HW; x < CX; x++) g.fillRect(x, Math.round(backY(x + 0.5) - WALL_H), 1, WALL_H);
  const col = (x, y0, h, c) => { g.fillStyle = c; g.fillRect(x, Math.round(y0), 1, Math.round(h)); };
  // window on the left wall
  for (let x = 26; x < 72; x++) {
    const b = backY(x + 0.5) - 14, inner = x > 28 && x < 69;
    col(x, b - 34, 34, "#ffffff");
    if (inner) col(x, b - 31, 28, x === 48 || x === 49 ? "#ffffff" : "#9fd8ff");
    if (inner && x > 32 && x < 42) col(x, b - 27, 3, "#ffffff");
    if (x === 26 || x === 71) col(x, b - 38, 42, "#c97bd6");
    col(x, b - 37, 3, "#c97bd6");
  }
  for (let x = 29; x < 69; x++) col(x, backY(x + 0.5) - 14 - 17, 1, "#ffffff");
  // door on the right wall
  for (let x = DOOR.x - 12; x < DOOR.x + 12; x++) {
    const b = backY(x + 0.5);
    col(x, b - 44, 44, x < DOOR.x - 10 || x > DOOR.x + 9 ? "#6e4426" : "#a86d3e");
    if (x > DOOR.x - 8 && x < DOOR.x + 7) { col(x, b - 40, 16, "#9a643a"); col(x, b - 20, 15, "#9a643a"); }
    if (x === DOOR.x + 5 || x === DOOR.x + 6) col(x, b - 23, 2, "#ffd36b");
  }
  // trims: baseboards, the corner, the top edge
  for (let x = CX - HW; x < CX + HW; x++) { const b = backY(x + 0.5); col(x, b - 3, 3, "#c49a76"); col(x, b - WALL_H, 2, "#ffffff"); }
  col(CX, CY - WALL_H, WALL_H, "rgba(80,60,110,0.25)");
  bgCache = { key, c };
  return c;
}

// ---------- effects ----------
let fxList = [];
let seedN = 1;
function spawn(mod, x, y, o = {}) {
  const fx = createFx(mod, { x: Math.round(x), y: Math.round(y), seed: seedN++, ...o });
  fxList.push(fx);
  return fx;
}
const later = (s, fn) => setTimeout(fn, s * 1000);
let shake = 0;

// ---------- derived room: the layout plus every prank since the last clean-up ----------
let D = { items: [], poops: [], fires: [], critters: [], ghosts: [], puddles: [], trash: [], goo: [], ko: new Set() };
const RNG = (p) => mulberry(p.seed || hashStr(p.id));
const isWallItem = (it) => CATALOG[it.type].layer === "wall" && !it.fallen;
const anchorX = (def) => def.s.ax ?? def.s.width / 2;
// ---------- skills (Q W E R) ----------
function skillDelay(p) {
  const s = skillOf(p.sk).skill;
  return s.shape === "proj" ? Math.abs(p.x - p.ox) / s.speed : s.delay || 0;
}
function knockIt(it, amt, r) {
  it.dx += Math.round((r() - 0.5) * 26 * amt); it.rot = (r() < 0.5 ? -1 : 1) * (0.3 + r() * 1.1) * amt;
  if (!isWallItem(it)) it.dy += Math.round((r() - 0.5) * 6);
}
function applySkill(p, items, out, r, trash) {
  const s = skillOf(p.sk).skill;
  for (const it of skillTargets(p, s, items, itemBase, isWallItem)) {
    const f = it.flags;
    switch (s.el) {
      case "fire": f.sooty = 1; break;
      case "ice": f.frozen = 1; break;
      case "bolt": f.broken = 1; f.sooty = 1; break;
      case "slash": f.slashed = 1; knockIt(it, 0.3, r); break;
      case "nature": f.wilted = 1; it.rot = it.rot || 0.2; break;
      case "shadow": f.cursed = 1; break;
      case "boom": f.broken = 1; f.sooty = 1; knockIt(it, 0.8, r); trash(2, ["paper", "book", "can"], it.x, it.y); break;
      case "wind": knockIt(it, 1.4, r); trash(2, ["paper", "sock", "peel"], it.x, it.y); break;
      case "haunt": out.ghosts.push({ key: p.id + it.id, item: it.id }); f.cursed = 1; break;
      case "pull": if (!isWallItem(it)) { const b = itemBase(it); it.dx += Math.round((p.x - b.x) * 0.4); it.dy += Math.round((p.y - b.y) * 0.4); it.rot = (r() - 0.5) * 1.2; } f.cursed = 1; break;
      case "nuke":
        f.broken = 1; f.sooty = 1;
        if (isWallItem(it)) { it.fallen = true; it.dy = 0; it.y = clampP(it.x, backY(it.x) + 8 + Math.floor(r() * 18)).y; }
        knockIt(it, 1.3, r); break;
    }
    settle(it);
  }
  if (s.leave === "fire") out.fires.push({ key: p.id, x: p.x, y: p.y, at: p.at + skillDelay(p) * 1000 });
  if (s.el === "party") trash(8, ["paper", "peel", "cake"], p.ox, p.oy, 70);
  if (s.el === "nuke") trash(24, ["paper", "book", "can", "sock", "peel"], 160, 150, 220);
}
const movers = [];   // effects that travel: projectiles, a walking tornado
function playSkill(p) {
  const { skill: s } = skillOf(p.sk), flip = p.dir < 0, d = skillDelay(p);
  const o = { flip, ...(s.o || {}) };
  const stopAfter = (fx, secs) => later(secs, () => fx.stop());
  switch (s.shape) {
    case "proj": {
      const fx = spawn(s.fx, p.ox + p.dir * 6, p.oy - 10, o);
      movers.push({ fx, vx: p.dir * s.speed, left: d, end: () => { fx.stop(); spawn(s.hit, p.x, p.y - 4, s.hitO || {}); shake = Math.max(shake, 0.2); } });
      break;
    }
    case "beam": stopAfter(spawn(s.fx, p.ox + p.dir * 6, p.oy - 10, o), s.dur); break;
    case "line": for (let k = 0; k < (s.repeat || 1); k++) later(k * 0.3, () => spawn(s.fx, p.ox, p.oy, o)); break;
    case "self": case "chain": spawn(s.fx, p.ox, p.oy, o); break;
    case "at": {
      const fx = s.atCaster ? spawn(s.fx, p.ox, p.oy, o) : spawn(s.fx, p.x, p.y, o);
      if (s.dur) stopAfter(fx, s.dur);
      if (s.move) movers.push({ fx, vx: p.dir * s.move, left: s.dur });
      break;
    }
    case "near": {
      const t = skillTargets(p, s, D.items, itemBase, isWallItem)[0];
      const b = t ? itemBase(t) : { x: p.ox + p.dir * 30, y: p.oy };
      spawn(s.fx, b.x, b.y, {});
      break;
    }
    case "all": spawn(s.fx, 160, 196, {}); break;
  }
  if (s.shake) later(d, () => (shake = s.shake));
  later(d + 0.05, derive);
}
function moveMovers(dt) {
  for (const m of [...movers]) {
    m.left -= dt; m.fx.options.x += m.vx * dt;
    if (m.left <= 0) { movers.splice(movers.indexOf(m), 1); m.end?.(); }
  }
}

// a saved position that is off the floor or off its wall (old layouts, other versions) is moved back in
function normalizeItem(it) {
  const def = CATALOG[it.type]; if (!def) return it;
  if (def.layer === "wall") {
    const hw = def.s.width / 2, x = Math.max(CX - HW + hw + 4, Math.min(CX + HW - hw - 4, it.x)), b = backY(x);
    return { ...it, x: Math.round(x), y: Math.round(Math.max(b - WALL_H + def.s.height + hw / 2 + 2, Math.min(b - 4 - hw / 2, it.y))) };
  }
  const q = clampP(it.x, it.y, def.flat ? 3 : 4);
  return { ...it, x: Math.round(q.x), y: Math.round(q.y) };
}
// rooms saved before the room became isometric: lay the sample pieces out again, keep the rest inside
function migrateRoom(doc) {
  if (doc.layout === "iso") return null;
  const sample = Object.fromEntries(SAMPLE_ITEMS().map((i) => [i.id, i]));
  const old = (doc.items || []).filter((i) => CATALOG[i.type]);
  // sample pieces go back to their new spots first, then every other piece takes the emptiest spot left, one by one
  const placed = old.filter((i) => sample[i.id]?.type === i.type).map((i) => ({ ...i, ...sample[i.id] }));
  const keep = room;
  for (const i of old.filter((i) => sample[i.id]?.type !== i.type)) {
    room = { ...keep, items: placed };
    const p = freeSpot(i.type);
    placed.push({ ...i, x: p.x, y: p.y });
  }
  room = keep;
  const order = new Map(old.map((i, n) => [i.id, n]));
  return { ...doc, items: placed.sort((a, b) => order.get(a.id) - order.get(b.id)), layout: "iso" };
}

// keep a knocked item in the room: on its wall plane, or on the floor diamond
function settle(it) {
  const def = CATALOG[it.type], hw = def.s.width / 2;
  if (isWallItem(it)) {
    const nx = Math.max(CX - HW + hw + 4, Math.min(CX + HW - hw - 4, it.x + it.dx));
    it.dx = nx - it.x; it.dy = backY(nx) - backY(it.x);
  } else {
    const p = clampP(it.x + it.dx, it.y + it.dy, def.flat ? 3 : 4);
    it.dx = p.x - it.x; it.dy = p.y - it.y;
  }
}
// screen box of an item, with its flip and, on a wall, the shear
function bbox(it) {
  const def = CATALOG[it.type], s = def.s, b = itemBase(it), ax = anchorX(def);
  const l = it.flip ? s.width - ax : ax, x0 = b.x - l, x1 = x0 + s.width;
  const sh = isWallItem(it) ? s.width / 4 : 0;
  return { x0, x1, y0: b.y - s.height - sh, y1: b.y + sh };
}
const itemBase = (it) => ({ x: it.x + it.dx, y: it.y + it.dy });
const itemCenter = (it) => ({ x: it.x + it.dx, y: it.y + it.dy - CATALOG[it.type].s.height / 2 });
function derive() {
  const cleaned = room.cleanedAt || 0;
  const items = (room.items || []).filter((it) => CATALOG[it.type]).map((it) => ({ ...normalizeItem(it), dx: 0, dy: 0, rot: 0, flags: {}, fallen: false, dmg: 0, dead: false }));
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const out = { items, poops: [], fires: [], critters: [], ghosts: [], puddles: [], trash: [], goo: [], ko: new Set() };
  const all = [...pranks, ...botPranks].filter((p) => p.at > cleaned).sort((a, b) => a.at - b.at);
  for (const p of all) {
    const r = RNG(p);
    const it = p.item ? byId[p.item] : null;
    const trash = (n, kinds, x, y, spread = 50) => { for (let k = 0; k < n; k++) out.trash.push({ ...clampP(x + (r() - 0.5) * spread, y + (r() - 0.5) * 22), kind: kinds[Math.floor(r() * kinds.length)] }); };
    if (p.kind === "skill") { if (Date.now() >= p.at + skillDelay(p) * 1000) applySkill(p, items, out, r, trash); continue; }
    if (it) {
      const def = CATALOG[it.type];
      const knock = (amt = 1) => { it.dx += Math.round((r() - 0.5) * 26 * amt); it.rot = (r() < 0.5 ? -1 : 1) * (0.3 + r() * 1.1) * amt; if (def.layer !== "wall") it.dy += Math.round((r() - 0.5) * 6); };
      switch (p.kind) {
        case "hit":
          if (it.dead) break;
          it.dmg += p.dmg || 1;
          it.rot = (r() - 0.5) * 0.25 * Math.min(1, it.dmg / hpOf(it));   // leans a little more with every blow
          if (it.dmg >= hpOf(it)) {
            it.dead = true; it.flags.broken = 1; it.flags.sooty = 1; out.ko.add(p.id);
            if (isWallItem(it)) { it.fallen = true; it.dy = 0; it.y = clampP(it.x, backY(it.x) + 8 + Math.floor(r() * 18)).y; }
            knock(0.7); trash(4, ["paper", "book", "can", "sock"], it.x, it.y, 40);
          }
          break;
        case "kick": knock(); trash(2, ["paper", "sock", "can"], it.x, it.y); break;
        case "jump": it.flags.broken = 1; it.rot = (r() - 0.5) * 0.3; trash(3, ["paper", "sock"], it.x, it.y); break;
        case "burn": out.fires.push({ key: p.id, x: it.x + it.dx, y: clampP(it.x + it.dx, it.y + it.dy + 1).y, at: p.at, small: true }); break;
        case "slash": case "cut": it.flags.slashed = 1; break;
        case "zap": case "shock": it.flags.broken = 1; it.flags.sooty = 1; break;
        case "freeze": it.flags.frozen = 1; break;
        case "acid": it.flags.wilted = 1; it.rot = it.rot || 0.25; break;
        case "boom": it.flags.broken = 1; it.flags.sooty = 1; knock(0.6); trash(6, ["book", "paper"], it.x, it.y, 80); break;
        case "splat": knock(0.5); trash(4, ["cake"], it.x, it.y + 6, 40); break;
        case "haunt": out.ghosts.push({ key: p.id, item: it.id }); break;
        case "water": it.flags.wet = 1; out.puddles.push({ key: p.id, item: it.id }); break;
        case "doodle": it.flags.doodle = (it.flags.doodle || 0) + 1; it.doodleSeed = p.seed; break;
        case "drop": if (def.layer === "wall") { it.fallen = true; it.dy = 0; it.y = clampP(it.x, backY(it.x) + 8 + Math.floor(r() * 18)).y; it.rot = (r() - 0.5) * 1.2; } else knock(); break;
      }
      settle(it);
    } else {
      switch (p.kind) {
        case "poop": out.poops.push({ x: p.x, y: p.y + 3 }); break;
        case "fire": out.fires.push({ key: p.id, x: p.x, y: p.y, at: p.at }); break;
        case "frog": case "slime": out.critters.push({ key: p.id, kind: p.kind, x: p.x, y: p.y, seed: p.seed || 1 }); if (p.kind === "slime") out.goo.push({ x: p.x, y: p.y, seed: p.seed || 1 }); break;
      }
    }
  }
  D = out;
  syncPersistent();
  updateMeter();
}

// persistent loop effects (fires, ghosts, puddles, critters), keyed by prank id
const persist = new Map();
function syncPersistent() {
  const want = new Map();
  for (const f of D.fires) want.set("f" + f.key, () => spawn(campfire, f.x, f.y, { height: f.small ? 14 : 18 }));
  for (const g of D.ghosts) want.set("g" + g.key, () => spawn(ghost, 0, 0, { hover: 10 }));
  for (const p of D.puddles) want.set("p" + p.key, () => spawn(ripples, 0, 0));
  for (const c of D.critters) want.set("c" + c.key, () => spawn(c.kind === "frog" ? frog : slime, c.x, c.y, { seed: c.seed }));
  for (const [k, fx] of persist) if (!want.has(k)) { fx.stop(); persist.delete(k); }
  for (const [k, make] of want) if (!persist.has(k)) persist.set(k, make());
}
function placePersistent(now) {
  for (const g of D.ghosts) { const fx = persist.get("g" + g.key), it = D.items.find((i) => i.id === g.item); if (fx && it) { const c = itemCenter(it); fx.options.x = Math.round(c.x); fx.options.y = Math.round(c.y - CATALOG[it.type].s.height / 2 + 6); } }
  for (const p of D.puddles) { const fx = persist.get("p" + p.key), it = D.items.find((i) => i.id === p.item); if (fx && it) { const b = itemBase(it); fx.options.x = Math.round(b.x); fx.options.y = Math.round(b.y - 4); } }
  for (const c of D.critters) {
    const fx = persist.get("c" + c.key); if (!fx) continue;
    const r = mulberry(c.seed), a = r() * 6.28, sp = 0.15 + r() * 0.15, t = now * sp + a;
    const q = clampP(c.x + Math.sin(t) * 70 + Math.sin(t * 2.3) * 20, c.y + Math.cos(t * 1.4) * 22, 6);
    fx.options.x = Math.round(q.x); fx.options.y = Math.round(q.y);
    fx.options.flip = Math.cos(t) < 0;
  }
}

// one-shot effects for a prank, played for everyone in the room when it happens
function playPrank(p) {
  if (played.has(p.id)) return;
  played.add(p.id);
  if (p.kind === "skill") { playSkill(p); return; }
  const it = p.item ? D.items.find((i) => i.id === p.item) : null;
  const b = it ? itemBase(it) : { x: p.x, y: p.y };
  const h = it ? CATALOG[it.type].s.height : 20;
  const c = { x: b.x, y: b.y - h / 2 };
  const text = (t) => spawn(pow, c.x, c.y, { text: t });
  switch (p.kind) {
    case "kick": spawn(blunt, b.x, b.y, { height: Math.min(22, h * 0.6) }); text(["BANG!", "OOPS!", "POW!"][(p.seed || 0) % 3]); shake = 0.25; break;
    case "jump": text("BOING!"); later(0.25, () => { spawn(blunt, b.x, b.y, { height: 8 }); shake = 0.35; }); break;
    case "burn": spawn(fireRing, b.x, b.y, { reach: 40 }); break;
    case "slash": spawn(doubleSlash, c.x - 10, c.y + 10); break;
    case "cut": spawn(swordSlash, c.x - 10, c.y + 10, { radius: 22 }); break;
    case "zap": spawn(lightning, c.x, b.y - 2); later(0.85, () => { spawn(zap, c.x, c.y); shake = 0.3; }); break;
    case "shock": { const s = spawn(sparkArc, c.x, b.y); later(1.3, () => { s.stop(); spawn(zap, c.x, c.y); }); break; }
    case "freeze": spawn(snowflake, c.x, b.y + 4, { count: 6 }); break;
    case "acid": spawn(acid, b.x, b.y); break;
    case "boom": spawn(smallBoom, b.x, b.y, { size: 0.55 }); shake = 0.6; break;
    case "splat": spawn(splash, b.x, b.y, { palette: ["#7a2e48", "#c45a7a", "#f28ab2", "#f9b6cf", "#fff0f5", "#ffffff"], stone: false }); text("SPLAT!"); break;
    case "haunt": spawn(poof, c.x, c.y + 8, { palette: ["#10142a", "#3e4f86", "#a3b8e2", "#d8e4ff", "#ffffff"] }); break;
    case "water": spawn(splash, b.x, b.y - 2, { stone: false }); break;
    case "doodle": spawn(hitSpark, c.x, c.y); text("LOL"); break;
    case "drop": spawn(blunt, b.x, b.y, { height: 8 }); text("CLANG!"); break;
    case "hit": {
      if (!it) break;
      hitAnim.set(it.id, performance.now());
      const w = p.w || "fist", top = c.y - h / 2;
      if (w === "sword") spawn(swordSlash, p.x + p.dir * 4, p.y, { flip: p.dir < 0, radius: 16 });
      else if (w === "spear") spawn(thrustFx, p.x, p.y, { flip: p.dir < 0, reach: 30 });
      if (w === "hammer") { spawn(blunt, b.x, b.y, { height: 16 }); shake = Math.max(shake, 0.35); }
      else { spawn(blunt, c.x, c.y + 4, { height: 8 }); spawn(hitSpark, c.x, c.y); shake = Math.max(shake, 0.1); }
      spawn(damageNum, c.x + 4, top, { text: "-" + (p.dmg || 1) });
      if (D.ko.has(p.id)) { spawn(critHit, c.x, c.y + 8, { height: 16 }); later(0.15, () => spawn(pow, c.x, top, { text: "KO!" })); shake = 0.5; }
      break;
    }
    case "poop": spawn(poof, b.x, b.y, { palette: ["#3a2412", "#6a3e1e", "#8b5a2b", "#b07a4a"] }); text("PLOP!"); shake = 0.2; break;
    case "fart": { const f = spawn(poison, b.x, b.y, { spread: 0.45 }); later(1.8, () => f.stop()); text("PFFT!"); break; }
    case "fire": spawn(fireRing, b.x, b.y, { reach: 46 }); break;
    case "frog": spawn(poof, b.x, b.y); break;
    case "slime": spawn(splash, b.x, b.y, { palette: ["#0b2f2b", "#12594a", "#1f8f4f", "#47c752", "#a6f06a", "#f0ffd2"], stone: false }); text("SPLAT!"); break;
  }
}

// ---------- me (the player's minimi) ----------
const actor = { on: false, x: DOOR.x, y: DOOR.y, dir: -1, st: "idle", t: 0 };
let busy = false;        // mid-action: movement locked
let heat = null;         // escape timer after a prank (visitors only)
let done = [];           // what I did this visit, for the guestbook log
const keys = new Set();
let moveTarget = null;
let pendingItem = null;  // walking up to this item to open its menu
let say = { text: "", until: 0 };
function speak(text, secs = 1.4) { say = { text, until: Date.now() + secs * 1000 }; pushPresence(true); }

let myJob = JOBS[0].id;
let visitId = "";
let ruinPaid = false;
const cooldown = { q: 0, w: 0, e: 0, r: 0 };   // ready at (ms)
function rollJob() {
  const pool = JOBS.filter((j) => j.id !== myJob);
  myJob = pool[Math.floor(Math.random() * pool.length)].id;
  for (const k of KEYS) cooldown[k] = 0;
  const j = jobById(myJob);
  spawn(poof, actor.x, actor.y - 6, { palette: ["#3a2a70", "#7a6cff", "#c7b8f5", "#ffffff"] });
  toast(`전직! 이번 방문에는 ${j.ico} ${j.name}. Q W E R로 스킬을 써 보세요.`);
  renderSkills(); pushPresence(true);
}
function enterRoom() {
  actor.on = true; actor.x = DOOR.x; actor.y = DOOR.y; actor.dir = -1; actor.st = "idle"; actor.t = 0;
  heat = null; done = []; moveTarget = null; pendingItem = null; keys.clear(); closeMenu();
  spawn(poof, DOOR.x, DOOR.y + 4);
  speak(role === "owner" ? "다녀왔습니다~" : "실례합니다~");
  if (FEATURES.skills) later(0.6, rollJob);
  visitId = newId(); ruinPaid = false;
  if (role === "visitor") net?.logVisit().catch(() => {});
  renderControls();
}
function leaveRoom() { actor.on = false; heat = null; busy = false; closeMenu(); pushPresence(true); renderControls(); }
const nearDoor = () => Math.hypot(actor.x - DOOR.x, (actor.y - DOOR.y) * 1.5) < 14;

function moveActor(dt) {
  if (!actor.on || busy) return;
  let vx = 0, vy = 0;
  if (keys.has("left")) vx -= 1; if (keys.has("right")) vx += 1;
  if (keys.has("up")) vy -= 1; if (keys.has("down")) vy += 1;
  if (vx || vy) { moveTarget = null; pendingItem = null; closeMenu(); }
  else if (moveTarget) {
    const ddx = moveTarget.x - actor.x, ddy = moveTarget.y - actor.y, d = Math.hypot(ddx, ddy);
    if (d < 1.5) { moveTarget = null; if (pendingHit) { const it = D.items.find((i) => i.id === pendingHit); pendingHit = null; if (it) { actor.dir = itemBase(it).x < actor.x ? -1 : 1; attack(); } } if (pendingItem) { const it = D.items.find((i) => i.id === pendingItem); pendingItem = null; if (it) { actor.dir = itemBase(it).x < actor.x ? -1 : 1; openMenu(it); } } }
    else { vx = ddx / d; vy = ddy / d; }
  }
  const len = Math.hypot(vx, vy);
  if (!len) { if (actor.st === "walk" || actor.st === "run") actor.st = "idle"; return; }
  const speed = heat ? 110 : 92;
  actor.st = heat ? "run" : "walk";
  if (vx) actor.dir = vx < 0 ? -1 : 1;
  const q = clampP(actor.x + (vx / len) * speed * dt, actor.y + (vy / len) * speed * dt);
  actor.x = q.x; actor.y = q.y;
  if (heat && nearDoor()) finishVisit(false);
}
function approach(it) {
  const def = CATALOG[it.type], b = itemBase(it);
  const wall = def.layer === "wall" && !it.fallen;
  if (wall) return clampP(b.x, backY(b.x) + 6);
  if (def.flat) return clampP(b.x, b.y - 6);
  const side = actor.x < b.x ? -1 : 1;
  return clampP(b.x + side * 12, b.y + 4);
}
const wait = (s) => new Promise((res) => setTimeout(res, s * 1000));

async function doAction(kind, it) {
  if (!actor.on || busy || !net) return;
  if (!me.canWrite) { toast("장난치려면 홈피 주인이 공유 메뉴에서 '참여자(Contributor)' 이상으로 초대해야 해요."); return; }
  busy = true; closeMenu(); moveTarget = null; renderControls();
  actor.st = "windup"; actor.t = 0;
  speak(it ? ["으랴!", "흐흐흐", "간다~"][Math.floor(Math.random() * 3)] : kind === "poop" ? "끄응..." : kind === "fart" ? "뿌웅~" : "흐흐", 1);
  await wait(kind === "poop" ? 1.2 : 0.45);
  const p = { id: newId(), kind, item: it ? it.id : null, x: Math.round(clampP(actor.x + (kind === "fire" ? actor.dir * 14 : 0), actor.y).x), y: Math.round(actor.y), by: me.id, nick: myNick(), at: Date.now(), seed: Math.floor(Math.random() * 1e9) };
  pranks.push(p); derive(); playPrank(p);
  net.addPrank(p).catch(() => toast("장난을 저장하지 못했어요. 권한을 확인해 주세요."));
  done.push(it ? LOG[kind](CATALOG[it.type].name) : LOG[kind]());
  checkRuin();
  await wait(0.25);
  actor.st = "idle"; busy = false;
  if (role === "visitor" && !heat) { heat = { left: ESCAPE_SECS }; toast(`${ESCAPE_SECS}초 안에 문으로 도망!`); }
  renderControls();
}

async function castSkill(i) {
  if (!actor.on || busy || !net) return;
  const key = KEYS[i], job = jobById(myJob), s = job.skills[i];
  if (Date.now() < cooldown[key]) { toast(`${s.name} 쿨타임 ${((cooldown[key] - Date.now()) / 1000).toFixed(1)}초`); return; }
  if (!me.canWrite) { toast("스킬을 쓰려면 홈피 주인이 공유 메뉴에서 '참여자(Contributor)' 이상으로 초대해야 해요."); return; }
  cooldown[key] = Date.now() + s.cd * 1000;
  busy = true; closeMenu(); moveTarget = null; renderControls();
  actor.st = "windup"; actor.t = 0;
  speak(s.name + "!", 1);
  await wait(0.25);
  const ox = Math.round(actor.x), oy = Math.round(actor.y), dir = actor.dir;
  const aim = aimSkill(s, ox, oy, dir, clampP, D.items, itemBase, isWallItem);
  const p = { id: newId(), kind: "skill", sk: `${job.id}.${key}`, item: null, ox, oy, dir, x: Math.round(aim.x), y: Math.round(aim.y), by: me.id, nick: myNick(), at: Date.now(), seed: Math.floor(Math.random() * 1e9) };
  pranks.push(p); derive(); playPrank(p);
  net.addPrank(p).catch(() => toast("스킬을 저장하지 못했어요. 권한을 확인해 주세요."));
  done.push(`${job.name}의 ${s.name}을(를) 썼어요`);
  await wait(0.15);
  actor.st = "idle"; busy = false;
  if (role === "visitor" && !heat) { heat = { left: ESCAPE_SECS }; toast(`${ESCAPE_SECS}초 안에 문으로 도망!`); }
  renderControls();
}
function renderSkills() {
  if (!$("skillBar")) return;   // skills are off and their bar is gone from the page
  const j = jobById(myJob);
  $("jobName").textContent = `${j.ico} ${j.name}`;
  const box = $("skillBar"); box.replaceChildren();
  j.skills.forEach((s, i) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "skill"; b.dataset.skill = KEYS[i];
    const k = document.createElement("kbd"); k.textContent = KEYS[i].toUpperCase();
    const n = document.createElement("b"); n.textContent = s.name;
    const c = document.createElement("small"); c.textContent = `${s.cd}초`;
    const ov = document.createElement("i"); ov.className = "cd";
    b.append(k, n, c, ov);
    b.addEventListener("click", () => castSkill(i));
    box.append(b);
  });
  renderCooldowns();
}
function renderCooldowns() {
  const j = jobById(myJob), now = Date.now();
  document.querySelectorAll("#skillBar .skill").forEach((b, i) => {
    const left = Math.max(0, cooldown[KEYS[i]] - now), frac = left / (j.skills[i].cd * 1000);
    b.style.setProperty("--cd", frac.toFixed(3));
    b.disabled = !actor.on || busy;
    b.classList.toggle("cooling", left > 0);
  });
}

// ---------- basic attack ----------
let weapon = "fist";
let owned = ["fist"];
let atkReady = 0, atkUntil = 0;
let pendingHit = null;
const hitAnim = new Map();           // item id -> when it was last hit (wobble + flash)
const hitLogged = new Set();
function attackTarget(w) {
  const hx = actor.x + actor.dir * w.reach;
  let best = null, bd = 1e9;
  for (const it of D.items) {
    if (it.dead || CATALOG[it.type].flat) continue;
    const q = bbox(it);
    if (isWallItem(it)) { if (actor.y - backY(actor.x) > 18) continue; }
    else if (actor.y < q.y1 - 34 || actor.y > q.y1 + 8) continue;
    const lo = Math.min(actor.x, hx), hi = Math.max(actor.x, hx);
    if (q.x1 < lo || q.x0 > hi) continue;
    const d = actor.dir > 0 ? Math.max(0, q.x0 - actor.x) : Math.max(0, actor.x - q.x1);
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}
function attack() {
  if (!actor.on || busy || !net) return;
  const w = WEAPONS[weapon], t = performance.now();
  if (t < atkReady) return;
  atkReady = t + w.cd * 1000; atkUntil = t + 320;
  actor.st = "atk"; actor.t = 0; pushPresence(true);
  const it = attackTarget(w);
  if (!it) {   // a swing at the air
    if (weapon === "sword") spawn(swordSlash, actor.x + actor.dir * 4, actor.y, { flip: actor.dir < 0, radius: 16 });
    if (weapon === "spear") spawn(thrustFx, actor.x, actor.y, { flip: actor.dir < 0, reach: 30 });
    return;
  }
  if (!me.canWrite) { toast("때리려면 홈피 주인이 공유 메뉴에서 '참여자(Contributor)' 이상으로 초대해야 해요."); return; }
  const p = { id: newId(), kind: "hit", item: it.id, w: weapon, dmg: w.dmg, x: Math.round(actor.x), y: Math.round(actor.y), dir: actor.dir, by: me.id, nick: myNick(), at: Date.now(), seed: Math.floor(Math.random() * 1e9) };
  later(0.07, () => {
    pranks.push(p); derive(); playPrank(p);
    net.addPrank(p).catch(() => toast("저장하지 못했어요. 권한을 확인해 주세요."));
    const name = CATALOG[it.type].name;
    if (D.ko.has(p.id)) done.push(`${name}을(를) ${w.name}(으)로 박살냈어요`);
    else if (!hitLogged.has(it.id)) { hitLogged.add(it.id); done.push(`${name}을(를) 후려팼어요`); }
    checkRuin();
    if (role === "visitor" && !heat) { heat = { left: ESCAPE_SECS }; toast(`${ESCAPE_SECS}초 안에 문으로 도망!`); }
  });
}
function renderWeapons() {
  const box = $("weapons"); box.replaceChildren();
  for (const [id, w] of Object.entries(WEAPONS)) {
    const b = document.createElement("button"); b.type = "button"; b.className = "wpn";
    const have = owned.includes(id);
    b.setAttribute("aria-pressed", String(weapon === id));
    b.innerHTML = `<span class="ico" aria-hidden="true">${w.ico}</span><b></b><small></small>`;
    b.querySelector("b").textContent = w.name;
    b.querySelector("small").textContent = have ? (weapon === id ? "장착 중" : "") : `🪙 ${w.price}`;
    if (!have) b.classList.add("locked");
    b.addEventListener("click", () => {
      if (have) { weapon = id; renderWeapons(); renderControls(); pushPresence(true); return; }
      if (myCoins < w.price) { toast(`코인이 부족해요. ${w.name}은(는) ${w.price}코인이에요.`); return; }
      myCoins -= w.price; owned = [...owned, id]; weapon = id; renderCoins(); renderWeapons(); renderControls();
      net?.buyWeapon(id, w.price).catch(() => {});
      toast(`${w.ico} ${w.name}을(를) 샀어요!`);
    });
    box.append(b);
  }
}

// the owner is in the room: every visitor still wrecking (escape timer running) is caught, +10 each
const caughtVisits = new Set();
function catchWreckers() {
  let n = 0;
  for (const p of visiblePeers()) {
    if (!p.wanted || isHostPeer(p)) continue;
    const k = p.key + ":" + (p.visit || "");
    if (caughtVisits.has(k)) continue;
    caughtVisits.add(k); n++;
  }
  if (net?.mode === "local") for (const b of bots) if (b.wanted && !b.caught) {   // the practice bots, this browser only
    b.caught = true; n++; b.say = "헉 들켰다!"; b.sayUntil = Date.now() + 1500; b.target = { x: DOOR.x, y: DOOR.y, exit: true }; b.st = "run"; b.wait = 0.6;
  }
  if (n) {
    earn(COIN_CATCH * n, `깽판 현장 검거 ${n}명`);
    speak("거기 서!", 1.5);
    spawn(pow, actor.x, actor.y - 26, { text: `+${COIN_CATCH * n}` });
  }
}
async function earn(n, why) {
  myCoins += n; renderCoins();
  toast(`🪙 +${n}코인 · ${why}`);
  net?.addCoins(n, why).catch(() => {});
}
function checkRuin() {
  if (role !== "visitor" || ruinPaid || !actor.on) return;
  if (messScore() >= RUIN_AT) { ruinPaid = true; earn(COIN_RUIN, "남의 집 폐허 만들기"); }
}
let myCoins = 0;
function renderCoins() { $("coins").textContent = myCoins; $("bagCoins").textContent = myCoins; }

function finishVisit(caught, byOwner) {
  heat = null;
  if (caught) { actor.st = "squat"; busy = true; speak("헉 들켰다...", 2); later(1.5, () => { spawn(poof, actor.x, actor.y + 2); leaveRoom(); }); }
  else { spawn(poof, DOOR.x, DOOR.y + 4); toast("도망 성공!"); leaveRoom(); }
}

function randomFloor() { const x = 50 + Math.random() * 220; return clampP(x, backY(x) + 6 + Math.random() * (Math.min(H - 4, frontY(x)) - backY(x) - 12), 6); }

// ---------- friend bots (this browser only): what several people wrecking at once looks like ----------
const bots = [];
const BOT_NAMES = ["봇 민지", "봇 동훈", "봇 서연", "봇 태호"];
let botN = 0;
function addBots(n = 2) {
  for (let i = 0; i < n; i++) {
    const k = botN++;
    bots.push({ key: "bot" + k, job: JOBS[Math.floor(Math.random() * JOBS.length)].id, nick: BOT_NAMES[k % 4], look: randomLook(1000 + k * 77 + (Date.now() % 1000)), x: DOOR.x, y: DOOR.y, dir: -1, st: "walk", t: 0, wait: 0.5 + i * 1.2, say: "", sayUntil: 0, left: 3 + Math.floor(Math.random() * 3), target: null });
  }
  toast("친구 봇 2명이 들어왔어요. 이 브라우저에서만 보이는 체험용이에요.");
}
function botTick(dt) {
  for (const b of [...bots]) {
    b.t += dt;
    if (b.wait > 0) { b.wait -= dt; continue; }
    if (!b.target) {
      if (b.left <= 0) { b.target = { x: DOOR.x, y: DOOR.y, exit: true }; b.st = "run"; }
      else if (FEATURES.skills && Math.random() < 0.4) {
        // cast a skill (not the big R) where it stands
        const job = jobById(b.job), i = Math.floor(Math.random() * 3), s = job.skills[i];
        b.dir = b.x > 160 ? -1 : 1;
        const aim = aimSkill(s, Math.round(b.x), Math.round(b.y), b.dir, clampP, D.items, itemBase, isWallItem);
        const p = { id: "b" + newId(), kind: "skill", sk: `${job.id}.${KEYS[i]}`, item: null, ox: Math.round(b.x), oy: Math.round(b.y), dir: b.dir, x: Math.round(aim.x), y: Math.round(aim.y), by: null, nick: b.nick, at: Date.now(), seed: Math.floor(Math.random() * 1e9) };
        b.st = "windup"; b.t = 0; b.wait = 1.2; b.say = s.name + "!"; b.sayUntil = Date.now() + 1200;
        later(0.25, () => { b.st = "idle"; botPranks.push(p); derive(); playPrank(p); });
        b.left--; continue;
      }
      else if (FEATURES.itemPranks && Math.random() < 0.7 && D.items.length) {
        const it = D.items[Math.floor(Math.random() * D.items.length)];
        const acts = BY_TYPE[it.type] || ["kick"];
        const def = CATALOG[it.type], bb = itemBase(it), wall = def.layer === "wall" && !it.fallen;
        b.target = { ...(wall ? clampP(bb.x, backY(bb.x) + 6) : clampP(bb.x + 12, bb.y + 4)), item: it.id, kind: acts[Math.floor(Math.random() * acts.length)] };
        b.st = "walk";
      } else if (Math.random() < 0.55 && D.items.some((i) => !i.dead && !CATALOG[i.type].flat && !isWallItem(i))) {
        // walk up to a piece of furniture and punch it a few times
        const pool = D.items.filter((i) => !i.dead && !CATALOG[i.type].flat && !isWallItem(i));
        const it = pool[Math.floor(Math.random() * pool.length)], bb = itemBase(it);
        b.target = { ...clampP(bb.x + (b.x < bb.x ? -12 : 12), bb.y + 4), item: it.id, kind: "hit", hits: 2 + Math.floor(Math.random() * 3) };
        b.st = "walk";
      } else {
        b.target = { ...randomFloor(), kind: FREE[Math.floor(Math.random() * FREE.length)].kind };
        b.st = "walk";
      }
    }
    const t = b.target, ddx = t.x - b.x, ddy = t.y - b.y, d = Math.hypot(ddx, ddy), sp = (b.st === "run" ? 115 : 70) * dt;
    if (Math.abs(ddx) > 0.5) b.dir = ddx < 0 ? -1 : 1;
    if (d > sp) { b.x += (ddx / d) * sp; b.y += (ddy / d) * sp; continue; }
    b.x = t.x; b.y = t.y; b.target = null;
    if (t.exit) { spawn(poof, DOOR.x, DOOR.y + 4); bots.splice(bots.indexOf(b), 1); continue; }
    if (t.kind === "hit") {
      const it = D.items.find((i) => i.id === t.item);
      if (!it || it.dead) { b.left--; continue; }
      b.dir = itemBase(it).x < b.x ? -1 : 1; b.st = "atk"; b.t = 0; b.wait = 0.5;
      const p = { id: "b" + newId(), kind: "hit", item: it.id, w: "fist", dmg: 1, x: Math.round(b.x), y: Math.round(b.y), dir: b.dir, by: null, nick: b.nick, at: Date.now() + 70, seed: Math.floor(Math.random() * 1e9) };
      later(0.07, () => { botPranks.push(p); derive(); playPrank(p); b.wanted = true; });
      later(0.35, () => { if (b.st === "atk") b.st = "idle"; });
      if (--t.hits > 0) b.target = t; else b.left--;
      continue;
    }
    b.st = "windup"; b.t = 0; b.wait = 0.9;
    b.say = ["ㅋㅋㅋ", "으랴!", "흐흐", "이거나 먹어라"][Math.floor(Math.random() * 4)]; b.sayUntil = Date.now() + 1200;
    const p = { id: "b" + newId(), kind: t.kind, item: t.item || null, x: Math.round(b.x), y: Math.round(b.y), by: null, nick: b.nick, at: Date.now() + 600, seed: Math.floor(Math.random() * 1e9) };
    later(0.6, () => { b.st = "idle"; botPranks.push(p); derive(); playPrank(p); b.wanted = true; });
    b.left--;
  }
}

// ---------- rendering ----------
function charOf(it) {
  let c = 0;
  const now = Date.now(), b = itemBase(it);
  for (const f of D.fires) { const d = Math.hypot(b.x - f.x, (b.y - f.y) * 1.6); if (d < 90) c += Math.min(1, (now - f.at) / 12000) * (1 - d / 90); }
  return Math.min(1, c);
}
function drawItem(it) {
  const def = CATALOG[it.type], s = def.s, f = it.flags;
  let src = s;
  const charred = charOf(it);
  if (charred > 0.01 || Object.keys(f).length) {
    tmp.width = s.width; tmp.height = s.height;
    tmpCtx.globalCompositeOperation = "source-over"; tmpCtx.clearRect(0, 0, s.width, s.height); tmpCtx.drawImage(s, 0, 0);
    tmpCtx.globalCompositeOperation = "source-atop";
    const tint = (c) => { tmpCtx.fillStyle = c; tmpCtx.fillRect(0, 0, s.width, s.height); };
    if (f.wilted) tint("rgba(110,96,40,0.55)");
    if (f.wet) tint("rgba(60,120,200,0.25)");
    if (f.frozen) { tint("rgba(150,215,255,0.55)"); tmpCtx.fillStyle = "rgba(255,255,255,0.85)"; for (let x = 1; x < s.width; x += 4) tmpCtx.fillRect(x, 0, 1, 2 + (x % 3)); }
    if (f.sooty) tint("rgba(30,24,30,0.35)");
    if (f.cursed) tint("rgba(90,40,140,0.35)");
    if (charred > 0.01) tint(`rgba(28,18,16,${Math.min(0.88, charred * 0.88)})`);
    const r = mulberry(hashStr(it.id) + (it.doodleSeed || 0));
    if (f.slashed) { tmpCtx.fillStyle = "#fffaf3"; for (let k = 0; k < 3; k++) { const x0 = Math.floor(r() * s.width * 0.6), y0 = Math.floor(r() * s.height * 0.5); for (let j = 0; j < Math.min(s.width, s.height) * 0.6; j++) tmpCtx.fillRect(x0 + j, y0 + j, 1, 1); } }
    if (f.broken) { tmpCtx.fillStyle = "#2d2540"; let x = Math.floor(s.width * (0.3 + r() * 0.4)), y = 0; while (y < s.height) { tmpCtx.fillRect(x, y, 1, 2); y += 2; x += r() < 0.5 ? -1 : 1; } }
    if (f.doodle) { const cols = ["#e2504e", "#3a8bd8", "#2d2540", "#56b356"]; for (let k = 0; k < 2 + f.doodle; k++) { tmpCtx.fillStyle = cols[k % 4]; let x = r() * s.width, y = r() * s.height; for (let j = 0; j < 14; j++) { tmpCtx.fillRect(Math.round(x), Math.round(y), 1, 1); x += Math.cos(j * 0.9 + k) * 1.4; y += Math.sin(j * 1.3 + k) * 1.1; } } }
    if (it.type === "tv" && f.broken) { const sc = def.screen, ax = s.ax, ay = s.height - 1; for (let u = sc.u0; u < sc.u1; u++) { const x = Math.round(ax + u + 0.5 - sc.v - 0.5), y0 = Math.round(ay - (u + 0.5 + sc.v) / 2 - sc.z1); for (let yy = 0; yy < sc.z1 - sc.z0; yy++) { tmpCtx.fillStyle = Math.random() < 0.5 ? "#d9d9e6" : "#55556a"; tmpCtx.fillRect(x, y0 + yy, 1, 1); } } }
    src = tmp;
  }
  const b = itemBase(it);
  ctx.save();
  const since = performance.now() - (hitAnim.get(it.id) || -1e9), struck = since < 180;
  ctx.translate(Math.round(b.x + (struck ? Math.round(Math.sin(since / 18) * 2) : 0)), Math.round(b.y + (struck && since < 60 ? 1 : 0)));
  if (isWallItem(it)) ctx.transform(1, wallSide(b.x) * 0.5, 0, 1, 0, 0);   // lie flat on the wall plane
  if (it.rot) ctx.rotate(it.rot);
  if (it.flip) ctx.scale(-1, 1);
  ctx.drawImage(src, -Math.round(anchorX(def)), -s.height);
  if (struck && since < 90) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.75; ctx.drawImage(src, -Math.round(anchorX(def)), -s.height); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
  ctx.restore();
  const outline = (col, dash) => { const q = bbox(it); ctx.strokeStyle = col; ctx.setLineDash(dash ? [2, 2] : []); ctx.lineWidth = 1; ctx.strokeRect(Math.round(q.x0) - 1.5, Math.round(q.y0) - 1.5, Math.round(q.x1 - q.x0) + 3, Math.round(q.y1 - q.y0) + 3); ctx.setLineDash([]); };
  if (decorating && it.id === selectedId) outline("#ff6f91", true);
  if (!decorating && hoverItem === it.id && actor.on) outline("rgba(255,211,107,0.95)", false);
}
// poop at double size, with a puddle, stink waves and flies, so it reads from across the room
function drawPoop(p, now) {
  const x = Math.round(p.x), y = Math.round(p.y);
  ctx.fillStyle = "rgba(90,58,30,0.35)"; ctx.fillRect(x - 13, y - 2, 26, 4); ctx.fillRect(x - 10, y - 3, 20, 6);
  ctx.drawImage(POOP, x - 12, y - 20, 24, 20);
  for (let i = 0; i < 3; i++) {
    const ph = (now * 0.9 + i / 3 + p.x * 0.01) % 1;
    ctx.globalAlpha = 1 - ph; ctx.fillStyle = "#7cbf3a";
    for (let k = 0; k < 6; k++) ctx.fillRect(Math.round(x - 8 + i * 8 + Math.sin((ph * 3 + k * 0.5 + i) * 2.4) * 2), Math.round(y - 24 - ph * 16 - k * 2), 2, 2);
  }
  ctx.globalAlpha = 1; ctx.fillStyle = "#2d2540";
  for (let i = 0; i < 3; i++) { const a = now * (5 + i * 2) + i * 2.1 + p.x; ctx.fillRect(Math.round(x + Math.cos(a) * 13), Math.round(y - 22 + Math.sin(a * 1.3) * 6), 2, 2); }
}
// green goo where a slime was let loose
function drawGoo(g) {
  const x = Math.round(g.x), y = Math.round(g.y), r = mulberry(g.seed || 1);
  ctx.fillStyle = "#3fae4a"; ctx.fillRect(x - 14, y - 3, 28, 6); ctx.fillRect(x - 10, y - 5, 20, 10);
  ctx.fillStyle = "#7fdc5a"; ctx.fillRect(x - 9, y - 3, 14, 3);
  for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? "#3fae4a" : "#7fdc5a"; ctx.fillRect(Math.round(x + (r() - 0.5) * 44), Math.round(y + (r() - 0.5) * 14), 3, 2); }
}
function drawTrash(t) {
  const [a, b] = TRASH[t.kind] || TRASH.paper;
  ctx.fillStyle = a; ctx.fillRect(Math.round(t.x - 2), Math.round(t.y - 3), 4, 3);
  ctx.fillStyle = b; ctx.fillRect(Math.round(t.x - 2), Math.round(t.y - 1), 4, 1);
}
const peerPos = new Map();
function visiblePeers() { return peers.filter((p) => p.inRoom && p.home === currentHome && typeof p.x === "number"); }
function render(now) {
  ctx.drawImage(background(), 0, 0);
  for (const f of D.fires) { ctx.fillStyle = "rgba(40,24,20,0.3)"; ctx.fillRect(f.x - 20, f.y - 3, 40, 6); }
  const isWall = isWallItem;
  for (const it of D.items) if (isWall(it)) drawItem(it);
  for (const it of D.items) if (CATALOG[it.type].flat) drawItem(it);
  for (const g of D.goo) drawGoo(g);
  const list = [];
  for (const it of D.items) if (!isWall(it) && !CATALOG[it.type].flat) list.push([itemBase(it).y, () => drawItem(it)]);
  for (const t of D.trash) list.push([t.y - 0.5, () => drawTrash(t)]);
  for (const p of D.poops) list.push([p.y, () => drawPoop(p, now)]);
  for (const p of visiblePeers()) { const pp = peerPos.get(p.key); if (pp) list.push([pp.y + 0.05, () => drawMinimi(ctx, pp.x, pp.y, p.look, p.st, p.st === "atk" ? now - (pp.atkStart || now) : now, p.dir, 1, p.wp)]); }
  for (const b of bots) list.push([b.y + 0.05, () => drawMinimi(ctx, b.x, b.y, b.look, b.st, b.t, b.dir, 1, "fist")]);
  if (actor.on) list.push([actor.y + 0.1, () => drawMinimi(ctx, actor.x, actor.y, myLook, actor.st, actor.t, actor.dir, 1, weapon)]);
  list.sort((a, b) => a[0] - b[0]).forEach((d) => d[1]());
  // HP bars: on furniture that has been hit, and on the one under the pointer
  for (const it of D.items) {
    if (it.dead || CATALOG[it.type].flat || (!it.dmg && hoverItem !== it.id)) continue;
    const q = bbox(it), hp = hpOf(it), left = Math.max(0, hp - it.dmg), w = Math.min(24, 4 + hp * 3);
    const x = Math.round((q.x0 + q.x1) / 2 - w / 2), y = Math.round(q.y0 - 5);
    ctx.fillStyle = "#2d2540"; ctx.fillRect(x - 1, y - 1, w + 2, 4);
    ctx.fillStyle = "#5a2030"; ctx.fillRect(x, y, w, 2);
    ctx.fillStyle = left / hp > 0.5 ? "#56d364" : left / hp > 0.25 ? "#ffd36b" : "#ff5a4a"; ctx.fillRect(x, y, Math.round((w * left) / hp), 2);
  }
  clearFrame(frame);
  for (const fx of fxList) fx.draw(frame);
  composite(frame, img.data, null);
  fxCtx.putImageData(img, 0, 0);
  ctx.drawImage(fxCanvas, 0, 0);
  if (heat && actor.on && Math.floor(now * 4) % 2) { ctx.fillStyle = "#ffd36b"; for (let x = DOOR.x - 14; x < DOOR.x + 14; x++) { const b = backY(x + 0.5); if (x < DOOR.x - 12 || x > DOOR.x + 11) ctx.fillRect(x, Math.round(b - 47), 1, 47); else { ctx.fillRect(x, Math.round(b - 47), 1, 2); } } }
  if (moveTarget && actor.on) { ctx.fillStyle = "rgba(255,111,145,0.7)"; ctx.fillRect(Math.round(moveTarget.x) - 2, Math.round(moveTarget.y) - 1, 5, 2); }
  canvas.style.transform = shake > 0 ? `translate(${(Math.random() - 0.5) * 6}px, ${(Math.random() - 0.5) * 4}px)` : "";
}

// name tags and speech bubbles over the canvas (DOM keeps Korean crisp)
const labelBox = $("labels");
const labelEls = new Map();
function peerName(p) { return (p.by && names[p.by]) || p.nick || "손님"; }
function myNick() { return (me.id && (profiles[me.id]?.nick || names[me.id])) || $("nick").value.trim() || "익명의 손님"; }
function renderLabels() {
  const want = [];
  const nowMs = Date.now();
  if (actor.on) want.push({ key: "me", x: actor.x, y: actor.y, name: `${FEATURES.skills ? jobById(myJob).ico + " " : ""}${myNick()} (나)`, say: say.until > nowMs ? say.text : "", me: true });
  for (const p of visiblePeers()) { const pp = peerPos.get(p.key); if (pp) want.push({ key: p.key, x: pp.x, y: pp.y, name: (p.job ? jobById(p.job).ico + " " : "") + peerName(p), say: p.sayUntil > nowMs ? p.say : "", owner: isHostPeer(p) }); }
  for (const b of bots) want.push({ key: b.key, x: b.x, y: b.y, name: `${FEATURES.skills ? jobById(b.job).ico + " " : ""}${b.nick}`, say: b.sayUntil > nowMs ? b.say : "" });
  const seen = new Set();
  for (const w of want) {
    seen.add(w.key);
    let el = labelEls.get(w.key);
    if (!el) { el = document.createElement("div"); el.className = "tag-wrap"; el.innerHTML = '<div class="bub"></div><div class="nm"></div>'; labelBox.append(el); labelEls.set(w.key, el); }
    el.style.left = `${(w.x / W) * 100}%`; el.style.top = `${((w.y - 25) / H) * 100}%`;
    el.querySelector(".nm").textContent = w.name;
    el.classList.toggle("me", !!w.me); el.classList.toggle("owner", !!w.owner);
    const bub = el.querySelector(".bub"); bub.textContent = w.say; bub.hidden = !w.say;
  }
  for (const [k, el] of labelEls) if (!seen.has(k)) { el.remove(); labelEls.delete(k); }
}

// ---------- loop ----------
let last = performance.now();
let presTimer = 0;
function tick(nowMs) {
  const dt = Math.min(0.05, (nowMs - last) / 1000); last = nowMs;
  const now = nowMs / 1000;
  if (actor.on) {
    actor.t += dt;
    if (activeTab === "home") moveActor(dt);
    if (actor.st === "atk" && performance.now() > atkUntil) actor.st = "idle";
    if (heat && !busy) {
      heat.left -= dt; $("timerNum").textContent = Math.max(0, heat.left).toFixed(1);
      if (heat.left <= 0) finishVisit(true);
      else if (role === "visitor" && visiblePeers().some(isHostPeer)) finishVisit(true, true);   // the owner walked in
    }
  }
  if (actor.on && role === "owner" && me.isOwner) catchWreckers();
  for (const p of visiblePeers()) {
    let pp = peerPos.get(p.key);
    if (!pp) { pp = { x: p.x, y: p.y }; peerPos.set(p.key, pp); }
    pp.x += (p.x - pp.x) * Math.min(1, dt * 12); pp.y += (p.y - pp.y) * Math.min(1, dt * 12);
    if (p.st === "atk" && pp.st !== "atk") pp.atkStart = now;
    pp.st = p.st;
  }
  botTick(dt);
  placePersistent(now);
  moveMovers(dt);
  for (const fx of fxList) fx.update(dt);
  fxList = fxList.filter((fx) => !fx.done());
  renderCooldowns();
  if (shake > 0) shake -= dt;
  presTimer += dt;
  if (presTimer > 0.1) { presTimer = 0; pushPresence(); }
  render(now);
  renderLabels();
  $("timer").hidden = !(heat && actor.on);
  requestAnimationFrame(tick);
}
let lastPres = "";
// the owner, walking in their own room as the owner (an owner testing as a visitor does not catch anyone)
function isHostPeer(p) { return !!(p.host && p.by === currentHome); }
function pushPresence(force) {
  if (!net) return;
  const p = { inRoom: actor.on, x: Math.round(actor.x), y: Math.round(actor.y), dir: actor.dir, st: actor.st, look: myLook, nick: $("nick").value.trim().slice(0, 12), say: say.text, sayUntil: say.until, wanted: !!heat, host: role === "owner" && me.isOwner, job: actor.on && FEATURES.skills ? myJob : null, visit: visitId, wp: weapon, home: currentHome };
  const s = JSON.stringify(p);
  if (s !== lastPres || force) { lastPres = s; net.presence(p); }
}

// ---------- input ----------
let decorating = false;
let selectedId = null;
let drag = null;
let hoverItem = null;
function toCanvas(e) { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; }
function hit(p) {
  const order = [...D.items].sort((a, b) => {
    const l = (i) => (CATALOG[i.type].layer === "wall" && !i.fallen ? 0 : CATALOG[i.type].flat ? 1 : 2);
    return l(a) - l(b) || itemBase(a).y - itemBase(b).y;
  }).reverse();
  return order.find((it) => { const q = bbox(it); return p.x >= q.x0 - 2 && p.x <= q.x1 + 2 && p.y >= q.y0 - 2 && p.y <= q.y1 + 2; });
}
canvas.addEventListener("pointerdown", (e) => {
  const p = toCanvas(e);
  if (decorating) {
    if (!me.isOwner) return;
    const h = hit(p);
    const it = h && (room.items || []).find((i) => i.id === h.id);
    selectedId = it ? it.id : null; renderDecor();
    if (it) { drag = { it, ox: p.x - it.x, oy: p.y - it.y }; canvas.setPointerCapture(e.pointerId); }
    return;
  }
  if (!actor.on) return;   // taps during an action are kept: the walk starts when it ends
  closeMenu();
  const it = hit(p);
  if (it && FEATURES.itemPranks) { pendingItem = it.id; moveTarget = approach(it); return; }
  if (it && !it.dead && !CATALOG[it.type].flat) {   // tap furniture: walk up and hit it (if already there, just hit)
    const t = attackTarget(WEAPONS[weapon]);
    if (t && t.id === it.id) { attack(); return; }
    pendingHit = it.id; moveTarget = approach(it); return;
  }
  moveTarget = clampP(p.x, p.y);
});
canvas.addEventListener("pointermove", (e) => {
  const p = toCanvas(e);
  hoverItem = decorating ? null : hit(p)?.id || null;
  if (!drag) return;
  const def = CATALOG[drag.it.type], hw = def.s.width / 2;
  if (def.layer === "wall") {
    const x = Math.max(CX - HW + hw + 4, Math.min(CX + HW - hw - 4, p.x - drag.ox));
    const b = backY(x);
    drag.it.x = Math.round(x); drag.it.y = Math.round(Math.max(b - WALL_H + def.s.height + hw / 2 + 2, Math.min(b - 4 - hw / 2, p.y - drag.oy)));
  } else {
    const q = clampP(p.x - drag.ox, p.y - drag.oy, def.flat ? 3 : 4);
    drag.it.x = Math.round(q.x); drag.it.y = Math.round(q.y);
  }
  derive();
});
const endDrag = () => { if (drag) { drag = null; saveRoomSoon(); } };
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener("pointerleave", () => (hoverItem = null));

// arrows move; Q W E R are skills, so WASD is not used for walking
const KEYMAP = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
document.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea, select")) return;
  if (decorating && (e.key === "Delete" || e.key === "Backspace")) { removeSelected(); return; }
  if (activeTab !== "home" || !actor.on) return;
  const k = KEYMAP[e.key];
  if (k) { keys.add(k); e.preventDefault(); return; }
  const f = FREE.find((x) => x.key === e.key);
  if (f) { doAction(f.kind, null); return; }
  if (e.code === "Space" || e.code === "KeyA") { e.preventDefault(); attack(); return; }
  const si = ["KeyQ", "KeyW", "KeyE", "KeyR"].indexOf(e.code);
  if (si >= 0 && !e.repeat && FEATURES.skills) { e.preventDefault(); castSkill(si); return; }
  if ((e.code === "KeyF" || e.code === "Space") && FEATURES.itemPranks) { e.preventDefault(); const it = nearestItem(); if (it) openMenu(it); else toast("가구 가까이 가서 F(또는 스페이스)를 눌러 주세요."); }
  if (e.key === "Escape") closeMenu();
});
document.addEventListener("keyup", (e) => { const k = KEYMAP[e.key]; if (k) keys.delete(k); });
addEventListener("blur", () => keys.clear());
function nearestItem() {
  let best = null, bd = 34;
  for (const it of D.items) {
    const b = itemBase(it), wall = CATALOG[it.type].layer === "wall" && !it.fallen;
    const d = wall ? Math.abs(b.x - actor.x) + Math.max(0, actor.y - backY(actor.x) - 14) : Math.hypot(b.x - actor.x, (b.y - actor.y) * 1.3) - 12;
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}
document.querySelectorAll("[data-dir]").forEach((b) => {
  const k = b.dataset.dir;
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); keys.add(k); b.setPointerCapture?.(e.pointerId); });
  const off = () => keys.delete(k);
  b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("lostpointercapture", off);
});

// item action menu
const menu = $("menu");
function openMenu(it) {
  const def = CATALOG[it.type], b = itemBase(it);
  menu.replaceChildren();
  const h = document.createElement("div"); h.className = "menu-h"; h.textContent = def.name; menu.append(h);
  for (const a of BY_TYPE[it.type] || ["kick"]) {
    const btn = document.createElement("button"); btn.type = "button";
    btn.textContent = `${ACTIONS[a].ico} ${ACTIONS[a].label}`;
    btn.addEventListener("click", () => doAction(a, it));
    menu.append(btn);
  }
  menu.style.left = `${Math.min(70, Math.max(1, (b.x / W) * 100 - 12))}%`;
  menu.style.top = `${Math.min(55, Math.max(2, ((b.y - def.s.height) / H) * 100 - 28))}%`;
  menu.hidden = false;
  menu.querySelector("button")?.focus({ preventScroll: true });
}
function closeMenu() { menu.hidden = true; }

// ---------- decorating (owner, 미니룸 tab) ----------
let saveTimer = null;
function cleanRoom() { return JSON.parse(JSON.stringify({ ...room, ownerId: currentHome, ownerNick: me.isOwner ? myNick() : room.ownerNick })); }
// while the owner is moving things, the room on screen is the truth: echoes of earlier saves are ignored until the last save lands
let roomDirty = false, roomSaving = 0;
function saveRoomSoon() {
  clearTimeout(saveTimer); roomDirty = true;
  saveTimer = setTimeout(() => {
    roomDirty = false;
    if (!me.isOwner || !net) return;
    roomSaving++;
    net.saveRoom(cleanRoom()).catch(() => toast("방을 저장하지 못했어요.")).finally(() => { roomSaving--; });
  }, 500);
}
// put a new piece where there is room: the free floor spot (or wall spot) farthest from everything else
function freeSpot(type) {
  const def = CATALOG[type], wall = def.layer === "wall", others = (room.items || []).filter((i) => (CATALOG[i.type]?.layer === "wall") === wall);
  let best = null, bs = -1;
  for (let x = 30; x <= 290; x += 6) {
    const cands = wall ? [{ x, y: backY(x) - 22 }] : [];
    if (!wall) for (let y = backY(x) + 10; y < Math.min(H - 6, frontY(x) - 6); y += 6) cands.push({ x, y });
    for (const c0 of cands) {
      const c = wall ? c0 : clampP(c0.x, c0.y, def.flat ? 3 : 4);
      if (wall && Math.abs(c.x - DOOR.x) < 26) continue;
      let d = 999;
      for (const o of others) d = Math.min(d, Math.hypot(o.x - c.x, (o.y - c.y) * 1.6));
      if (wall) d = Math.min(d, Math.abs(c.x - 48) < 30 ? 0 : 999);   // keep off the window
      const score = d - Math.abs(c.x - 160) * 0.05;
      if (score > bs) { bs = score; best = c; }
    }
  }
  return normalizeItem({ type, x: Math.round(best.x), y: Math.round(best.y) });
}
function addItem(type) {
  const it = { id: newId(), ...freeSpot(type) };
  room.items = [...(room.items || []), it]; selectedId = it.id; derive(); renderDecor(); saveRoomSoon();
  toast(`${CATALOG[type].name}을(를) 빈자리에 놓았어요. 끌어서 원하는 곳으로 옮기세요.`);
}
function removeSelected() { if (!selectedId) return; room.items = room.items.filter((i) => i.id !== selectedId); selectedId = null; derive(); renderDecor(); saveRoomSoon(); }
function flipSelected() { const it = room.items.find((i) => i.id === selectedId); if (it) { it.flip = !it.flip; derive(); saveRoomSoon(); } }
function renderDecor() {
  $("removeBtn").disabled = !selectedId; $("flipBtn").disabled = !selectedId;
  const it = room.items?.find((i) => i.id === selectedId);
  $("selName").textContent = it ? `선택: ${CATALOG[it.type].name}` : "가구를 눌러 고르고, 끌어서 옮기세요.";
  document.querySelectorAll("[data-wall]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.wall === room.wall)));
  document.querySelectorAll("[data-floor]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.floor === room.floor)));
}
function cleanUp() {
  for (const p of D.poops) spawn(poof, p.x, p.y);
  for (const f of D.fires) spawn(poof, f.x, f.y);
  spawn(confetti, 160, 196);
  const old = pranks.map((p) => p.id);
  room.cleanedAt = Date.now(); botPranks = [];
  derive(); saveRoomSoon();
  if (me.isOwner) net?.prunePranks(old).catch(() => {});
  toast("싹 치웠어요. 원래대로 돌아왔습니다.");
}

// ---------- tabs ----------
let activeTab = "home";
const stage = $("stage");
function setTab(t) {
  activeTab = t;
  document.querySelectorAll(".tabview").forEach((v) => (v.hidden = v.dataset.tab !== t));
  document.querySelectorAll("[data-tabbtn]").forEach((b) => b.setAttribute("aria-current", b.dataset.tabbtn === t ? "page" : "false"));
  decorating = t === "room";
  if (t === "home") $("slotHome").append(stage);
  if (t === "room") $("slotRoom").append(stage);
  if (decorating) { closeMenu(); keys.clear(); moveTarget = null; }
  selectedId = null; renderDecor(); renderControls();
  if (t === "minimi") { draftLook = { ...myLook }; renderCustomizer(); }
}
document.querySelectorAll("[data-tabbtn]").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tabbtn)));

// ---------- controls ----------
function renderControls() {
  $("enterBtn").hidden = actor.on;
  $("enterBtn").textContent = role === "owner" ? "내 방에 들어가기" : "놀러 들어가기";
  $("leaveBtn").hidden = !actor.on;
  document.querySelectorAll("[data-free]").forEach((b) => (b.disabled = !actor.on || busy));
  $("pad").hidden = !(actor.on && activeTab === "home");
  $("dock").hidden = !(actor.on && role === "visitor" && activeTab === "home");
  const fist = dock.querySelector('[data-free="atk"]'); if (fist) fist.textContent = WEAPONS[weapon].ico;
  renderIlchon();
  // my minihome and someone else's show different menus (data-for="own" | "other")
  document.querySelectorAll("[data-for]").forEach((b) => (b.hidden = b.dataset.for === "own" ? !me.isOwner : me.isOwner));
  $("decorLock").hidden = me.isOwner;
  $("decorTools").hidden = !me.isOwner;
  $("cleanBtn").hidden = !me.isOwner;
}
$("enterBtn").addEventListener("click", enterRoom);
$("leaveBtn").addEventListener("click", () => { if (heat) { toast("문까지 직접 도망가야 해요!"); return; } spawn(poof, actor.x, actor.y); leaveRoom(); });
$("removeBtn").addEventListener("click", removeSelected);
$("flipBtn").addEventListener("click", flipSelected);
$("cleanBtn").addEventListener("click", cleanUp);
const dock = $("dock");
for (const f of [{ kind: "atk", ico: WEAPONS.fist.ico, label: "때리기 (스페이스)" }, ...FREE.map((f) => ({ ...f, label: `${f.label} (${f.key})` }))]) {
  const b = document.createElement("button"); b.type = "button"; b.dataset.free = f.kind;
  b.textContent = f.ico; b.title = f.label; b.setAttribute("aria-label", f.label);
  b.addEventListener("pointerdown", (e) => e.stopPropagation());
  b.addEventListener("click", (e) => { e.stopPropagation(); if (f.kind === "atk") attack(); else doAction(f.kind, null); });
  dock.append(b);
}
const shop = $("shop");
for (const [type, def] of Object.entries(CATALOG)) {
  const b = document.createElement("button"); b.type = "button"; b.className = "pal";
  const c = document.createElement("canvas"); c.width = def.s.width; c.height = def.s.height; c.getContext("2d").drawImage(def.s, 0, 0);
  const l = document.createElement("span"); l.textContent = def.name;
  b.append(c, l); b.addEventListener("click", () => addItem(type)); shop.append(b);
}
for (const [k, w] of Object.entries(WALLS)) { const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.dataset.wall = k; b.textContent = w.name; b.addEventListener("click", () => { room.wall = k; renderDecor(); saveRoomSoon(); }); $("walls").append(b); }
for (const [k, f] of Object.entries(FLOORS)) { const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.dataset.floor = k; b.textContent = f.name; b.addEventListener("click", () => { room.floor = k; renderDecor(); saveRoomSoon(); }); $("floors").append(b); }

// ---------- profile (left page) ----------
const ownerMini = $("ownerMini").getContext("2d");
ownerMini.imageSmoothingEnabled = false;
function ownerLook() { return (room.ownerId && minimiMap[room.ownerId]) || (me.isOwner ? myLook : DEFAULT_LOOK); }
function drawPortrait(t) {
  ownerMini.fillStyle = "#fdeef4"; ownerMini.fillRect(0, 0, 40, 40);
  drawMinimi(ownerMini, 20, 37 - (Math.floor(t * 2) % 2), ownerLook(), "idle", t, 1, 1);
}
function renderProfile() {
  $("mood").value = room.mood || "들뜸"; $("intro").value = room.intro || ""; $("hpTitle").textContent = room.title || "";
  $("titleInput").value = room.title || "";
  const on = me.isOwner; $("mood").disabled = !on; $("intro").readOnly = !on; $("titleRow").hidden = !on;
  $("ownerName").textContent = (room.ownerId && names[room.ownerId]) || room.ownerNick || "주인";
  $("ownerTop").textContent = $("ownerName").textContent;
}
$("mood").addEventListener("change", (e) => { room.mood = e.target.value; saveRoomSoon(); });
$("intro").addEventListener("change", (e) => { room.intro = e.target.value.slice(0, 80); saveRoomSoon(); });
$("titleInput").addEventListener("change", (e) => { room.title = e.target.value.slice(0, 40); renderProfile(); saveRoomSoon(); });

function renderWho() {
  const ul = $("who"); ul.replaceChildren();
  const rows = [];
  if (actor.on) rows.push(`${myNick()} (나)${role === "owner" && me.isOwner ? " · 주인" : ""}${heat ? " · 도망 중" : ""}`);
  for (const p of visiblePeers()) rows.push(`${peerName(p)}${isHostPeer(p) ? " · 주인" : ""}${p.wanted ? " · 도망 중" : ""}`);
  for (const b of bots) rows.push(`${b.nick} · 체험용`);
  for (const r of rows) { const li = document.createElement("li"); li.textContent = r; ul.append(li); }
  if (!rows.length) { const li = document.createElement("li"); li.className = "empty"; li.textContent = "지금은 아무도 없어요"; ul.append(li); }
  $("whoCount").textContent = rows.length;
}

// ---------- counter / meter ----------
function renderCounter() {
  const t = today();
  $("today").textContent = visits.filter((v) => v.date === t).length;
  $("total").textContent = visits.length;
  $("todayNum").textContent = $("today").textContent;
}
document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.go)));
// small pixel logo mark: a swirl of poop, the house prank
{
  const M = ["......11......", ".....1221.....", "....122221....", "...11111111...", "..1222222221..", "..1111111111..", ".122222222221.", "11111111111111", "12232222322221", "12222222222221", "11111111111111"];
  const C = { 1: "#5b3a1e", 2: "#a8642f", 3: "#ffffff" };
  for (const id of ["logoMini", "loginMark"]) { const g = $(id).getContext("2d"); M.forEach((row, y) => [...row].forEach((c, x) => { if (C[c]) { g.fillStyle = C[c]; g.fillRect(x + 3, y + 5, 1, 1); } })); }
}
function messScore() {
  let s = 0;
  for (const it of D.items) s += (it.dead ? 10 : it.dmg * 2) + (it.rot || it.dx ? 6 : 0) + Object.keys(it.flags).length * 6 + charOf(it) * 6 + (it.fallen ? 6 : 0);
  s += D.trash.length + D.goo.length * 4 + D.poops.length * 12 + D.fires.length * 14 + D.critters.length * 10 + D.ghosts.length * 8;
  return Math.min(100, Math.round(s));
}
function updateMeter() {
  const s = messScore();
  $("meterFill").style.width = `${s}%`; $("meterNum").textContent = s;
  $("meterLabel").textContent = s === 0 ? "반짝반짝" : s < 25 ? "살짝 지저분" : s < 50 ? "누가 다녀감" : s < 80 ? "난장판" : "폐허";
}
setInterval(updateMeter, 2000);

// ---------- guestbook: number, name, date, minimi box, text, secret posts, owner reply ----------
function fmt(t) { const d = new Date(t); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
function miniCanvas(look, size = 48) {
  const c = document.createElement("canvas"); c.width = 24; c.height = 26; c.className = "gb-mini";
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
  drawMinimi(g, 12, 25, look || DEFAULT_LOOK, "idle", 0, 1, 1);
  c.style.width = size + "px"; c.style.height = Math.round(size * 26 / 24) + "px";
  return c;
}
function entryName(g) { return (g.by && names[g.by]) || g.nick || "손님"; }
function renderGuestbook() {
  $("gbNew").hidden = !guestbook.some((g) => !g.auto && fmt(g.at).slice(0, 10) === fmt(Date.now()).slice(0, 10));
  const ul = $("gbList"); ul.replaceChildren();
  const list = guestbook.filter((g) => !g.auto);   // old automatic "came by" notes stay hidden
  const n = list.length;
  list.slice(0, 60).forEach((g, i) => {
    const li = document.createElement("li"); li.className = "gb" + (g.auto ? " auto" : "") + (g.secret ? " secret" : "");
    const head = document.createElement("div"); head.className = "gb-head";
    const no = document.createElement("span"); no.className = "no"; no.textContent = `No.${n - i}`;
    const nm = document.createElement(g.by && g.by !== currentHome ? "button" : "b"); nm.textContent = entryName(g);
    if (nm.tagName === "BUTTON") { nm.type = "button"; nm.className = "who-link"; nm.title = "이 사람 미니홈피로"; nm.addEventListener("click", () => goHome(g.by)); }
    const tm = document.createElement("time"); tm.textContent = `(${fmt(g.at)})`;
    head.append(no, nm, tm);
    if (g.auto) { const t = document.createElement("span"); t.className = "tag"; t.textContent = "방문"; head.append(t); }
    if (g.secret) { const t = document.createElement("span"); t.className = "tag lock"; t.textContent = "비밀글"; head.append(t); }
    const tools = document.createElement("span"); tools.className = "gb-tools";
    if (me.isOwner) {
      const rep = document.createElement("button"); rep.type = "button"; rep.textContent = "답글"; rep.addEventListener("click", () => replyBox(li, g)); tools.append(rep);
      const del = document.createElement("button"); del.type = "button"; del.textContent = "삭제"; del.addEventListener("click", () => confirmDelete(tools, g)); tools.append(del);
    }
    head.append(tools);
    const body = document.createElement("div"); body.className = "gb-body";
    const box = document.createElement("div"); box.className = "gb-minibox"; box.append(miniCanvas((g.by && minimiMap[g.by]) || g.look));
    const p = document.createElement("p");
    if (g.secret) { const text = secrets[g.id]; p.textContent = text != null ? text : "비밀글입니다. 홈피 주인과 쓴 사람만 볼 수 있어요."; if (text == null) p.className = "muted"; }
    else p.textContent = g.auto ? "다녀갔어요 👣" : g.msg;
    body.append(box, p);
    li.append(head, body);
    if (g.reply && g.reply.msg) {
      const r = document.createElement("div"); r.className = "gb-reply";
      const who = document.createElement("b"); who.textContent = `ㄴ ${$("ownerName").textContent}`;
      const t = document.createElement("span"); t.textContent = ` ${g.reply.msg}`;
      const rt = document.createElement("time"); rt.textContent = ` (${fmt(g.reply.at)})`;
      r.append(who, t, rt); li.append(r);
    }
    ul.append(li);
  });
  $("gbCount").textContent = n;
  $("gbMe").replaceChildren(miniCanvas(myLook, 56));
}
function replyBox(li, g) {
  if (li.querySelector(".gb-replyform")) return;
  const f = document.createElement("form"); f.className = "gb-replyform";
  const inp = document.createElement("input"); inp.maxLength = 100; inp.placeholder = "답글 남기기"; inp.value = g.reply?.msg || ""; inp.setAttribute("aria-label", "답글");
  const ok = document.createElement("button"); ok.className = "btn small"; ok.textContent = "확인";
  f.append(inp, ok); li.append(f); inp.focus();
  f.addEventListener("submit", (e) => { e.preventDefault(); const msg = inp.value.trim(); g.reply = msg ? { msg, at: Date.now() } : null; net.updateGuest(g.id, { reply: g.reply }).catch(() => {}); renderGuestbook(); });
}
function confirmDelete(tools, g) {
  tools.replaceChildren();
  const y = document.createElement("button"); y.type = "button"; y.textContent = "정말 삭제"; y.className = "danger";
  const n = document.createElement("button"); n.type = "button"; n.textContent = "취소";
  y.addEventListener("click", () => { guestbook = guestbook.filter((x) => x.id !== g.id); net.deleteGuest(g.id).catch(() => {}); renderGuestbook(); });
  n.addEventListener("click", renderGuestbook);
  tools.append(y, n);
}
$("gbForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = $("gbMsg").value.trim();
  if (!msg) { $("gbMsg").focus(); return; }
  if (!net) return;
  if (!me.canWrite) { toast("방명록을 쓰려면 홈피 주인이 공유 메뉴에서 '참여자' 이상으로 초대해야 해요."); return; }
  const secret = $("gbSecret").checked;
  const ent = { id: newId(), by: me.id, nick: myNick(), look: myLook, msg: secret ? "" : msg, secret, auto: false, at: Date.now(), reply: null };
  if (secret) secrets[ent.id] = msg;
  guestbook.unshift(ent); renderGuestbook();
  net.addGuest(ent, secret ? msg : null)
    .then(() => { if (currentHome && currentHome !== me.id) earn(COIN_GUEST, "방명록 남기기"); })
    .catch(() => toast("방명록을 저장하지 못했어요."));
  $("gbMsg").value = ""; $("gbSecret").checked = false;
});
// ---------- minimi customizer ----------
let draftLook = null;
function renderCustomizer() {
  if (!draftLook) draftLook = { ...myLook };
  const box = $("custom"); box.replaceChildren();
  for (const [k, opt] of Object.entries(LOOK_OPTIONS)) {
    const row = document.createElement("div"); row.className = "c-row";
    const lab = document.createElement("span"); lab.className = "label"; lab.textContent = opt.label; row.append(lab);
    const vals = document.createElement("div"); vals.className = "c-vals";
    opt.values.forEach((v, i) => {
      const b = document.createElement("button"); b.type = "button";
      const isColor = v.startsWith("#");
      b.className = isColor ? "sw" : "chip";
      if (isColor) { b.style.background = v; b.setAttribute("aria-label", `${opt.label} ${i + 1}`); } else b.textContent = v;
      b.setAttribute("aria-pressed", String((draftLook[k] | 0) === i));
      b.addEventListener("click", () => { draftLook[k] = i; renderCustomizer(); });
      vals.append(b);
    });
    row.append(vals); box.append(row);
  }
}
const preview = $("preview").getContext("2d");
preview.imageSmoothingEnabled = false;
function drawPreview(t) {
  preview.clearRect(0, 0, 32, 32);
  drawMinimi(preview, 16, 30, draftLook || myLook, Math.floor(t / 2) % 2 ? "walk" : "idle", t, 1, 1);
}
$("nick").addEventListener("change", () => {
  const v = $("nick").value.trim().slice(0, 12), p = profiles[me.id];
  if (!v || !p) return;
  net?.saveProfile({ handle: p.handle, nick: v }).then(() => toast("닉네임을 바꿨어요.")).catch(() => toast("닉네임을 저장하지 못했어요."));
});
$("saveLook").addEventListener("click", () => {
  myLook = { ...draftLook }; if (me.id) minimiMap[me.id] = myLook;
  net?.saveMinimi(myLook).catch(() => {});
  try { localStorage.setItem("phyco-look", JSON.stringify(myLook)); } catch {}
  toast("미니미를 저장했어요. 방명록과 미니룸에 바로 보여요."); renderGuestbook(); pushPresence(true);
});
$("randomLook").addEventListener("click", () => { draftLook = randomLook(Date.now()); renderCustomizer(); });

// ---------- BGM (jukebox) ----------
const bgm = new Bgm();
let browse = 0;
function renderBgm() {
  $("songTitle").textContent = SONGS[browse].title;
  $("songMeta").textContent = browse === (room.bgm | 0) ? "우리집 BGM" : `${SONGS[browse].bpm} BPM`;
  $("playBtn").textContent = bgm.playing ? "■" : "▶";
  $("playBtn").setAttribute("aria-label", bgm.playing ? "정지" : "재생");
  $("eq").classList.toggle("on", bgm.playing);
  const yt = safeYt(room.yt);
  $("ytLink").hidden = !yt; if (yt) $("ytLink").href = yt;
  $("ytForm").hidden = !me.isOwner;
  if (document.activeElement !== $("ytInput")) $("ytInput").value = room.yt || "";
  const ul = $("songs"); ul.replaceChildren();
  SONGS.forEach((s, i) => {
    const li = document.createElement("li");
    const play = document.createElement("button"); play.type = "button"; play.className = "chip"; play.textContent = bgm.playing && browse === i ? "■ 정지" : "▶ 듣기";
    play.addEventListener("click", () => { if (bgm.playing && browse === i) bgm.stop(); else { browse = i; bgm.play(i); } renderBgm(); });
    const t = document.createElement("span"); t.className = "song-t"; t.textContent = `${i + 1}. ${s.title}`;
    const m = document.createElement("small"); m.textContent = `${s.bpm} BPM`;
    li.append(play, t, m);
    if (me.isOwner) {
      const set = document.createElement("button"); set.type = "button"; set.className = "chip"; set.textContent = (room.bgm | 0) === i ? "우리집 BGM" : "배경음악으로";
      set.disabled = (room.bgm | 0) === i;
      set.addEventListener("click", () => { room.bgm = i; saveRoomSoon(); renderBgm(); toast(`배경음악을 "${s.title}"(으)로 바꿨어요.`); });
      li.append(set);
    } else if ((room.bgm | 0) === i) { const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = "배경음악"; li.append(tag); }
    ul.append(li);
  });
}
// a YouTube Music link can't play inside the page (the artifact viewer blocks YouTube embeds), so it opens in a new tab
function safeYt(u) {
  try { const x = new URL(String(u || "")); return x.protocol === "https:" && /^(music\.youtube\.com|(www\.|m\.)?youtube\.com|youtu\.be)$/.test(x.hostname) ? x.href : ""; } catch { return ""; }
}
$("ytForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("ytInput").value.trim();
  if (v && !safeYt(v)) { toast("유튜브 뮤직 링크만 넣을 수 있어요."); return; }
  room.yt = v; saveRoomSoon(); renderBgm(); toast(v ? "저장했어요." : "링크를 지웠어요.");
});
$("playBtn").addEventListener("click", () => { bgm.playing ? bgm.stop() : bgm.play(browse); renderBgm(); });
$("prevBtn").addEventListener("click", () => { browse = (browse + SONGS.length - 1) % SONGS.length; if (bgm.playing) bgm.play(browse); renderBgm(); });
$("nextBtn").addEventListener("click", () => { browse = (browse + 1) % SONGS.length; if (bgm.playing) bgm.play(browse); renderBgm(); });

// ---------- misc ----------
let toastTimer;
function toast(t) { const el = $("toast"); el.textContent = t; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.hidden = true), 3000); }
function renderNet() {
  const n = visiblePeers().length + (actor.on ? 1 : 0) + bots.length;
  $("netBadge").textContent = !net ? "연결 중…" : net.mode === "live" ? `실시간 · 방 안 ${n}명` : `혼자 보기 · 같은 브라우저 탭끼리 연결 · 방 안 ${n}명`;
  $("netBadge").classList.toggle("live", net?.mode === "live");
}
setInterval(() => { renderWho(); renderNet(); }, 500);

let namesBusy = false;
async function resolveNames() {
  if (!net || namesBusy) return;
  namesBusy = true;
  try {
    const ids = new Set();
    if (room.ownerId) ids.add(room.ownerId);
    if (currentHome) ids.add(currentHome);
    ilchon.forEach((x) => { ids.add(x.a); ids.add(x.b); });
    if (me.id) ids.add(me.id);
    guestbook.forEach((g) => g.by && ids.add(g.by));
    peers.forEach((p) => p.by && ids.add(p.by));
    const got = await net.names([...ids]);
    let changed = false;
    for (const [k, v] of Object.entries(got)) if (v && !profiles[k]?.nick && names[k] !== v) { names[k] = v; changed = true; }
    if (changed) { renderGuestbook(); renderProfile(); renderIlchon(); }
  } finally { namesBusy = false; }
}

// ---------- boot ----------
function loadLocalLook() { try { return JSON.parse(localStorage.getItem("phyco-look") || "null"); } catch { return null; } }
myLook = loadLocalLook() || randomLook(Date.now());
setTab("home");
derive(); renderProfile(); renderGuestbook(); renderBgm(); renderCounter(); renderControls(); renderNet(); renderWeapons();
(function portrait(t) { drawPortrait(t / 1000); if (activeTab === "minimi") drawPreview(t / 1000); requestAnimationFrame(portrait); })(0);
requestAnimationFrame((t) => { last = t; tick(t); });

// ---------- homes: everyone has one; 일촌 파도타기 moves between them ----------
// a minihome's address is #h-<handle> (the id picked on the entry screen), or #h-<user id> for someone without one
const homeHash = (id) => "h-" + (profiles[id]?.handle || String(id).replace(/^u_/, "u-"));
const hashHome = () => {
  const m = /^#h-([A-Za-z0-9-]+)$/.exec(location.hash || ""); if (!m) return null;
  const byHandle = Object.entries(profiles).find(([, p]) => p.handle === m[1]);
  return byHandle ? byHandle[0] : m[1].replace(/^u-/, "u_");
};
const homeHandlers = {
  room(doc) {
    if (doc && (drag || roomDirty || roomSaving)) return;   // my own unsaved moves win over an older copy
    if (doc) {
      room = { ...sampleRoom(), ...doc, layout: doc.layout };
      const fixed = me.isOwner && migrateRoom(room);
      if (fixed) { room = fixed; net.saveRoom(cleanRoom()).catch(() => {}); }
    } else if (me.isOwner && !roomLoaded) {   // my first visit to my own minihome: start from the sample room
      room = { ...sampleRoom(), ownerId: me.id, ownerNick: myNick(), intro: "", title: "어서 와, 내 방은 처음이지?" };
      net.saveRoom(cleanRoom()).catch(() => {});
    } else room = { ...sampleRoom(), ownerId: currentHome, ownerNick: "", intro: "", title: "아직 꾸미지 않은 방" };
    roomLoaded = true;
    if (drag) return;
    bgCache.key = ""; derive(); renderProfile(); renderBgm(); renderDecor(); resolveNames();
  },
  pranks(list) {
    const mine = pranks.filter((p) => !list.some((q) => q.id === p.id) && p.by === me.id && Date.now() - p.at < 5000);
    pranks = [...list, ...mine];
    derive();
    for (const p of list) if (!played.has(p.id)) { if (p.at > homeOpenedAt - 3000 && p.at > (room.cleanedAt || 0)) playPrank(p); else played.add(p.id); }
  },
  guestbook(list) { guestbook = list; renderGuestbook(); resolveNames(); },
  visits(list) { visits = list; renderCounter(); },
  error(what) { toast(`${what} 데이터를 불러오지 못했어요.`); },
};
function goHome(hid) {
  if (!net || !hid) return;
  if (actor.on) { if (heat) { toast("문까지 직접 도망가야 해요!"); return; } leaveRoom(); }
  currentHome = hid; homeOpenedAt = Date.now();
  me.isOwner = hid === me.id; role = me.isOwner ? "owner" : "visitor";
  room = { ...sampleRoom(), ownerId: hid, ownerNick: "", intro: "", title: "" };
  roomLoaded = false; pranks = []; botPranks = []; guestbook = []; visits = []; selectedId = null; heat = null;
  try { if (location.hash !== "#" + homeHash(hid)) history.replaceState(null, "", "#" + homeHash(hid)); } catch {}
  net.openHome(hid, homeHandlers);
  pushPresence(true);
  setTab("home");
  bgCache.key = ""; derive(); renderProfile(); renderGuestbook(); renderCounter(); renderBgm(); renderControls(); resolveNames();
}
addEventListener("hashchange", () => { const h = hashHome(); if (h && h !== currentHome) goHome(h); });

// 일촌: ask from their minihome, answer in mine; the 파도타기 list goes to any 일촌's minihome
const ilchonWith = (uid) => ilchon.find((x) => x.a === uid || x.b === uid);
const otherOf = (x) => (x.a === me.id ? x.b : x.a);
const realName = (uid) => names[uid] || "이름 없음";
function renderIlchon() {
  const box = $("ilBox"); if (!box || !net) return;
  box.replaceChildren();
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  if (!me.isOwner && currentHome) {
    const x = ilchonWith(currentHome);
    if (x && x.status === "ok") box.append(el("div", "il-ok", `♥ 일촌 · ${x.names?.[currentHome] || realName(currentHome)}`));
    else if (x && x.from === me.id) box.append(el("div", "il-wait", "일촌 신청 중…"));
    else if (x) box.append(el("div", "il-wait", "이 분이 일촌 신청을 보냈어요. 내 미니홈피에서 받아 주세요."));
    else {
      const b = el("button", "il-btn", "+ 일촌 신청"); b.type = "button";
      b.addEventListener("click", () => {
        box.replaceChildren();
        const f = el("form", "il-form");
        const inp = el("input"); inp.maxLength = 10; inp.placeholder = "일촌명 (예: 베프)"; inp.setAttribute("aria-label", "이 분을 부를 일촌명");
        const ok = el("button", "btn small primary", "신청"); const no = el("button", "btn small", "취소"); no.type = "button";
        no.addEventListener("click", renderIlchon);
        f.append(inp, ok, no); box.append(f); inp.focus();
        f.addEventListener("submit", (e) => { e.preventDefault(); const v = inp.value.trim(); if (!v) { inp.focus(); return; } net.askIlchon(currentHome, v).then(() => toast("일촌 신청을 보냈어요.")).catch(() => toast("신청하지 못했어요.")); });
      });
      box.append(b);
    }
  }
  if (me.isOwner) {
    for (const x of ilchon.filter((q) => q.status === "wait" && q.to === me.id)) {
      const row = el("form", "il-req");
      row.append(el("span", "", `${realName(x.from)}님의 일촌 신청 · 나를 "${x.names?.[me.id] || "일촌"}"(이)라고 불러요`));
      const inp = el("input"); inp.maxLength = 10; inp.placeholder = "내가 부를 일촌명"; inp.setAttribute("aria-label", "내가 부를 일촌명");
      const ok = el("button", "btn small primary", "수락"); const no = el("button", "btn small", "거절"); no.type = "button";
      no.addEventListener("click", () => net.dropIlchon(x).catch(() => {}));
      row.addEventListener("submit", (e) => { e.preventDefault(); const v = inp.value.trim(); if (!v) { inp.focus(); return; } net.acceptIlchon(x, v).then(() => toast("일촌이 되었어요!")).catch(() => toast("수락하지 못했어요.")); });
      row.append(inp, ok, no); box.append(row);
    }
  }
  // the 파도타기 list
  const sel = $("surf"); sel.replaceChildren();
  const opt = (v, t, off) => { const o = document.createElement("option"); o.value = v; o.textContent = t; o.disabled = !!off; sel.append(o); };
  opt("", "★ 일촌 파도타기");
  if (!me.isOwner) opt(me.id, "🏠 내 미니홈피로");
  const mine = ilchon.filter((x) => x.status === "ok");
  for (const x of mine) { const o = otherOf(x); if (o !== currentHome) opt(o, `${x.names?.[o] || "일촌"} (${realName(o)})`); }
  if (!mine.length) opt("-", "아직 일촌이 없어요", true);
  sel.value = "";
}
$("surf").addEventListener("change", (e) => { const v = e.target.value; e.target.value = ""; if (v && v !== "-") goHome(v); });

// entry screen: pick a minihome id and a nickname once; the claude.ai account already says who you are
const HANDLE_RE = /^[a-z0-9][a-z0-9-]{2,15}$/;
function showLogin(then) {
  $("login").hidden = false; document.body.classList.add("locked");
  $("loginNick").value = $("nick").value.trim();
  setTimeout(() => $("loginId").focus(), 50);
  $("loginForm").onsubmit = (e) => {
    e.preventDefault();
    const handle = $("loginId").value.trim().toLowerCase(), nick = $("loginNick").value.trim().slice(0, 12);
    const msg = $("loginMsg");
    if (!HANDLE_RE.test(handle)) { msg.textContent = "아이디는 영어 소문자·숫자·- 로 3~16자예요."; $("loginId").focus(); return; }
    if (!nick) { msg.textContent = "닉네임을 적어 주세요."; $("loginNick").focus(); return; }
    msg.textContent = "들어가는 중…";
    net.saveProfile({ handle, nick }).then(() => {
      profiles[me.id] = { handle, nick }; names[me.id] = nick; $("nick").value = nick;
      $("login").hidden = true; document.body.classList.remove("locked"); then();
    }).catch((err) => { msg.textContent = String(err?.message) === "taken" ? "이미 있는 아이디예요. 다른 아이디를 적어 주세요." : "들어가지 못했어요. 잠시 뒤 다시 해 주세요."; });
  };
}

connect().then(async (n) => {
  net = n; me = n.me;
  let gotProfiles; const firstProfiles = new Promise((r) => (gotProfiles = r));
  n.subscribe({
    profiles(m) {
      profiles = m;
      for (const [k, p] of Object.entries(m)) if (p?.nick) names[k] = p.nick;
      if (me.id && m[me.id]?.nick && document.activeElement !== $("nick")) $("nick").value = m[me.id].nick;
      gotProfiles(); renderProfile(); renderGuestbook(); renderIlchon();
    },
    secrets(m) { secrets = { ...secrets, ...m }; renderGuestbook(); },
    minimi(m) { minimiMap = { ...m }; if (me.id && m[me.id]) myLook = m[me.id]; renderGuestbook(); },
    peers(list) { peers = list; resolveNames(); },
    ilchon(list) { ilchon = list; renderIlchon(); resolveNames(); },
    coins(d) { myCoins = d.coins || 0; owned = ["fist", ...(d.weapons || [])]; if (!owned.includes(weapon)) weapon = "fist"; renderCoins(); renderWeapons(); },
    error(what) { toast(`${what} 데이터를 불러오지 못했어요.`); },
  });
  await Promise.race([firstProfiles, new Promise((r) => setTimeout(r, 4000))]);
  const start = async () => goHome(hashHome() || (await n.firstHome()) || me.id);
  if (me.id && !profiles[me.id]) showLogin(() => goHome(hashHome() || me.id)); else start();
});
