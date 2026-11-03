// Pixel sprites drawn in code: furniture, wallpapers/floors, the minimi (avatar) and small props.
// All original art for this prototype.

export function sprite(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  const r = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  draw(r, g);
  return c;
}

// ---------- furniture ----------
export const CATALOG = {
  bed: { name: "침대", layer: "floor", price: 0, s: sprite(56, 32, (r) => {
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
  }), screen: [6, 5, 22, 14] },
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
  fishbowl: { name: "어항", layer: "floor", s: sprite(20, 22, (r) => {
    r(3, 18, 14, 4, "#8b5a33"); r(2, 4, 16, 14, "#bfeeff"); r(4, 2, 12, 2, "#bfeeff"); r(2, 8, 16, 10, "#7fd0f0");
    r(7, 11, 4, 3, "#ff9a2a"); r(11, 12, 2, 1, "#ff9a2a"); r(8, 11, 1, 1, "#2d2540"); r(4, 5, 2, 4, "#ffffff");
  }) },
  guitar: { name: "기타", layer: "floor", s: sprite(14, 36, (r) => {
    r(6, 0, 2, 16, "#5c3a20"); r(5, 0, 4, 3, "#2d2540"); r(2, 16, 10, 8, "#d0603e"); r(1, 22, 12, 12, "#d0603e");
    r(5, 24, 4, 4, "#2d2540"); r(4, 31, 6, 2, "#5c3a20"); r(3, 18, 2, 4, "#e57b55");
  }) },
};

// ---------- wallpapers & floors ----------
export const WALLS = {
  stripe: { name: "핑크 줄무늬", draw(r, W, H) { r(0, 0, W, H, "#fdeef4"); for (let x = 0; x < W; x += 12) r(x, 0, 6, H, "#fbe3ed"); for (let y = 8; y < H - 6; y += 16) for (let x = 3 + ((y / 16) % 2) * 6; x < W; x += 12) r(x, y, 1, 1, "#f3c6d8"); } },
  mint: { name: "민트 체크", draw(r, W, H) { r(0, 0, W, H, "#e6f7f3"); for (let x = 0; x < W; x += 16) r(x, 0, 2, H, "#cdeee6"); for (let y = 0; y < H; y += 16) r(0, y, W, 2, "#cdeee6"); } },
  night: { name: "밤하늘", draw(r, W, H) { r(0, 0, W, H, "#2b2850"); for (let i = 0; i < 70; i++) { const x = (i * 97) % W, y = (i * 53) % (H - 8); r(x, y, 1, 1, i % 5 ? "#8e86c8" : "#fff3a6"); } } },
  brick: { name: "벽돌", draw(r, W, H) { r(0, 0, W, H, "#d98a6a"); for (let y = 0, row = 0; y < H; y += 8, row++) { r(0, y, W, 1, "#b86a4e"); for (let x = (row % 2) * 10; x < W; x += 20) r(x, y, 1, 8, "#b86a4e"); } } },
};
export const FLOORS = {
  wood: { name: "원목", draw(r, W, y0, H) { r(0, y0, W, H - y0, "#e2b98a"); for (let y = y0, row = 0; y < H; y += 10, row++) { r(0, y, W, 1, "#d4a674"); for (let x = (row % 2) * 24; x < W; x += 48) r(x, y, 1, 10, "#d4a674"); } } },
  tile: { name: "체크 타일", draw(r, W, y0, H) { for (let y = y0, row = 0; y < H; y += 10, row++) for (let x = 0, c = 0; x < W; x += 10, c++) r(x, y, 10, 10, (row + c) % 2 ? "#f3efe6" : "#d9d2e6"); } },
  carpet: { name: "하늘 카펫", draw(r, W, y0, H) { r(0, y0, W, H - y0, "#9fd0e8"); for (let i = 0; i < 160; i++) r((i * 37) % W, y0 + ((i * 23) % (H - y0)), 1, 1, "#86bcd8"); } },
  grass: { name: "잔디", draw(r, W, y0, H) { r(0, y0, W, H - y0, "#8cc860"); for (let i = 0; i < 220; i++) r((i * 41) % W, y0 + ((i * 29) % (H - y0)), 1, 2, i % 3 ? "#78b450" : "#a8dc7a"); } },
};

// ---------- minimi (avatar) ----------
export const LOOK_OPTIONS = {
  skin: { label: "피부", values: ["#ffe0c4", "#f5c9a3", "#e0a77c", "#a8714c"] },
  hair: { label: "머리 모양", values: ["단발", "숏컷", "긴머리", "양갈래", "뽀글"] },
  hairColor: { label: "머리 색", values: ["#2d2540", "#6b3e26", "#c98a3a", "#f2d16b", "#e86a9a", "#6cc7bf"] },
  face: { label: "표정", values: ["기본", "웃음", "윙크", "메롱"] },
  top: { label: "상의", values: ["티셔츠", "후드", "멜빵", "턱시도", "원피스"] },
  topColor: { label: "상의 색", values: ["#ff6f91", "#5cc8b8", "#ffd36b", "#7a6cff", "#ffffff", "#3a3550"] },
  bottom: { label: "하의", values: ["청바지", "반바지", "치마"] },
  bottomColor: { label: "하의 색", values: ["#3a5a9a", "#3a3550", "#c97bd6", "#e2b98a", "#56b356"] },
  shoes: { label: "신발", values: ["#2d2540", "#ffffff", "#e2504e", "#ffd36b"] },
  acc: { label: "소품", values: ["없음", "모자", "리본", "안경", "왕관"] },
};
export const DEFAULT_LOOK = { skin: 1, hair: 0, hairColor: 0, face: 0, top: 0, topColor: 0, bottom: 0, bottomColor: 0, shoes: 0, acc: 0 };
export function randomLook(seed) {
  const r = mulberry(seed);
  const o = {};
  for (const [k, v] of Object.entries(LOOK_OPTIONS)) o[k] = Math.floor(r() * v.values.length);
  return o;
}
export function mulberry(a) {
  a = (a | 0) || 1;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const V = (k, i) => LOOK_OPTIONS[k].values[Math.max(0, Math.min(LOOK_OPTIONS[k].values.length - 1, i | 0))];

/**
 * Draw a minimi with its feet at (x, y). st: idle | walk | run | squat | windup. dir: 1 right, -1 left.
 * About 12 x 22 px at scale 1.
 */
export function drawMinimi(g, x, y, look = DEFAULT_LOOK, st = "idle", t = 0, dir = 1, scale = 1) {
  look = { ...DEFAULT_LOOK, ...(look || {}) };
  const s = scale;
  const R = (xx, yy, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x + (dir < 0 ? -xx - w : xx) * s), Math.round(y + yy * s), w * s, h * s); };
  const skin = V("skin", look.skin), hairC = V("hairColor", look.hairColor), topC = V("topColor", look.topColor), botC = V("bottomColor", look.bottomColor), shoe = V("shoes", look.shoes);
  const squat = st === "squat" || st === "windup";
  const moving = st === "walk" || st === "run";
  const step = moving ? Math.floor(t * (st === "run" ? 14 : 8)) % 2 : 0;
  const sh = squat ? Math.floor(t * 20) % 2 : 0;
  const top = squat ? -16 : -22;
  const dress = look.top === 4;
  // shadow
  g.fillStyle = "rgba(45,37,64,0.2)"; g.fillRect(Math.round(x - 6 * s), Math.round(y - 1 * s), 12 * s, 2 * s);
  // legs / bottom
  if (squat) {
    R(-5 + sh, -5, 4, 3, botC); R(1 + sh, -5, 4, 3, botC); R(-5 + sh, -2, 4, 2, shoe); R(1 + sh, -2, 4, 2, shoe);
  } else {
    const l1 = step ? -1 : 0, l2 = step ? 0 : -1;
    const legC = look.bottom === 0 ? botC : skin;
    R(-3, -7 + l1, 2, 5, legC); R(1, -7 + l2, 2, 5, legC);
    R(-4, -2 + l1, 3, 2, shoe); R(1, -2 + l2, 3, 2, shoe);
    if (look.bottom === 1 && !dress) { R(-4, -8, 8, 3, botC); }
    if (look.bottom === 2 && !dress) { R(-5, -9, 10, 4, botC); R(-4, -6, 8, 1, botC); }
    if (look.bottom === 0 && !dress) { R(-4, -9, 8, 2, botC); }
  }
  // body
  const by = top + 9;
  R(-4 + sh, by, 8, squat ? 5 : 6, topC);
  if (dress && !squat) { R(-5, by + 4, 10, 4, topC); R(-6, by + 7, 12, 2, topC); }
  if (look.top === 1) { R(-4 + sh, by, 8, 1, shade(topC)); R(-1 + sh, by + 2, 2, 2, shade(topC)); }
  if (look.top === 2) { R(-3 + sh, by, 1, 6, botC); R(2 + sh, by, 1, 6, botC); R(-3 + sh, by + 3, 6, 3, botC); }
  if (look.top === 3) { R(-1 + sh, by, 2, 5, "#ffffff"); R(-1 + sh, by, 2, 1, "#e2504e"); }
  R(-5 + sh, by + 1, 1, 4, skin); R(4 + sh, by + 1, 1, 4, skin);
  // head
  R(-5 + sh, top, 10, 9, skin);
  // face
  const f = look.face | 0;
  if (f === 2) { R(0 + sh, top + 5, 2, 1, "#2d2540"); } else { R(1 + sh, top + 4, 1, 2, "#2d2540"); }
  R(3 + sh, top + 4, 1, f === 1 ? 1 : 2, "#2d2540");
  if (f === 1) R(1 + sh, top + 4, 1, 1, "#2d2540");
  if (f === 3) { R(1 + sh, top + 7, 2, 1, "#2d2540"); R(2 + sh, top + 8, 1, 1, "#ff6f91"); }
  else if (st === "run" || squat) R(1 + sh, top + 7, 3, 1, "#c4504e");
  R(-4 + sh, top + 6, 2, 1, "#ffb3c1");
  // hair
  const h = look.hair | 0;
  R(-5 + sh, top - 1, 10, 3, hairC); R(-6 + sh, top, 2, 5, hairC);
  if (h === 0) { R(-6 + sh, top, 3, 8, hairC); R(3 + sh, top, 2, 2, hairC); }
  if (h === 1) { R(-6 + sh, top - 2, 9, 2, hairC); }
  if (h === 2) { R(-6 + sh, top, 3, 13, hairC); R(4 + sh, top, 2, 3, hairC); }
  if (h === 3) { R(-8 + sh, top + 3, 3, 6, hairC); R(5 + sh, top + 3, 3, 6, hairC); }
  if (h === 4) { R(-7 + sh, top - 3, 13, 4, hairC); R(-7 + sh, top, 3, 6, hairC); R(4 + sh, top, 3, 4, hairC); }
  // accessory
  const a = look.acc | 0;
  if (a === 1) { R(-6 + sh, top - 3, 12, 3, "#e2504e"); R(3 + sh, top - 1, 5, 1, "#e2504e"); }
  if (a === 2) { R(-7 + sh, top - 3, 3, 3, "#ff6f91"); R(-4 + sh, top - 2, 2, 1, "#ff6f91"); }
  if (a === 3) { R(0 + sh, top + 4, 5, 1, "#2d2540"); R(0 + sh, top + 3, 2, 3, "rgba(255,255,255,0.35)"); }
  if (a === 4) { R(-4 + sh, top - 4, 8, 2, "#ffd36b"); R(-4 + sh, top - 6, 1, 2, "#ffd36b"); R(-1 + sh, top - 6, 2, 2, "#ffd36b"); R(3 + sh, top - 6, 1, 2, "#ffd36b"); }
}
function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.round(v * 0.75));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// ---------- props ----------
export const POOP = sprite(12, 10, (r) => {
  r(4, 0, 3, 2, "#7a4a26"); r(3, 2, 6, 3, "#8b5a2b"); r(1, 5, 10, 3, "#7a4a26"); r(0, 8, 12, 2, "#6a3e1e");
  r(4, 2, 2, 1, "#b07a4a"); r(2, 5, 3, 1, "#a06a3a"); r(1, 8, 3, 1, "#8b5a2b"); r(4, 6, 1, 1, "#fff"); r(7, 6, 1, 1, "#fff");
});
export const TRASH = { paper: ["#ffffff", "#d9cde8"], peel: ["#ffd36b", "#c9a227"], can: ["#e2504e", "#b33a38"], sock: ["#7a6cff", "#5a4ccc"], cake: ["#fff8f0", "#f28ab2"], book: ["#5cc8b8", "#2a716c"] };
