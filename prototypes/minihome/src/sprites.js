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

// ---------- isometric furniture ----------
// Floor items are boxes on a 2:1 isometric grid. u runs along the left wall (screen +1, -0.5), v along the
// right wall (screen -1, -0.5), z is height. Each sprite's anchor (ax, bottom row) is the footprint's front corner,
// so depth-sorting by that point's screen y is correct. Faces: top light, left mid, right dark, plus an outline.
function isoSprite(parts, extra, pad = 0) {
  let xmin = 0, xmax = 0, ymin = -pad;
  for (const [u, v, z, a, b, h] of parts) {
    xmin = Math.min(xmin, u - v - b); xmax = Math.max(xmax, u + a - v);
    ymin = Math.min(ymin, -(u + a + v + b) / 2 - z - h);
  }
  const ax = Math.ceil(-xmin) + 1, W = Math.ceil(xmax - xmin) + 3, H = Math.ceil(-ymin) + 3, ay = H - 1;
  const c = sprite(W, H, (r, g) => {
    const P = (u, v, z) => [ax + u - v, ay - (u + v) / 2 - z];
    for (const [u, v, z, a, b, hh, top, left, right] of parts) {
      const [fx, fy] = P(u, v, z);
      for (let x = Math.floor(fx - b); x < Math.ceil(fx + a); x++) {
        const cx = x + 0.5;
        if (hh > 0) {
          const yb = fy - Math.abs(cx - fx) / 2;
          r(x, Math.round(yb - hh), 1, Math.max(1, Math.round(hh)), cx < fx ? left : right);
        }
        const low = fy - hh - Math.abs(cx - fx) / 2;
        const up = cx <= fx + a - b ? fy - hh - b / 2 - (cx - (fx - b)) / 2 : fy - hh - a / 2 - (fx + a - cx) / 2;
        r(x, Math.round(up), 1, Math.max(1, Math.round(low - up)), top);
      }
    }
    if (extra) extra(r, P);
    outline(g, W, H);
  });
  c.ax = ax;
  return c;
}
// darken the opaque pixels that touch transparency: a pixel-art outline
function outline(g, W, H) {
  const d = g.getImageData(0, 0, W, H), p = d.data, out = new Uint8ClampedArray(p);
  const A = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : p[(y * W + x) * 4 + 3]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (!p[i + 3]) continue;
    if (!A(x - 1, y) || !A(x + 1, y) || !A(x, y - 1) || !A(x, y + 1)) { out[i] = p[i] * 0.45; out[i + 1] = p[i + 1] * 0.4; out[i + 2] = p[i + 2] * 0.5; }
  }
  d.data.set(out); g.putImageData(d, 0, 0);
}
const WOOD = ["#c48a56", "#a86d3e", "#80502c"], TEAL = ["#6cc7bf", "#3fa7a0", "#2c8781"];
const METAL = ["#c8c8d6", "#9a9aac", "#7a7a8e"], IRON = ["#4a4a5e", "#33334a", "#2b2b3a"];
// face columns on a box's right face (u from u0 to u1 at v, z from z0 to z1): for screens and book rows
function faceR(r, P, u0, u1, v, z0, z1, col) { for (let u = u0; u < u1; u++) { const [x, y] = P(u + 0.5, v, z1); r(Math.round(x - 0.5), Math.round(y), 1, z1 - z0, col); } }

export const CATALOG = {
  bed: { cat: "basic", price: 0, name: "침대", layer: "floor", s: isoSprite([
    [38, 0, 0, 3, 22, 21, ...WOOD],
    [0, 0, 0, 38, 22, 7, ...WOOD],
    [1, 1, 7, 37, 20, 3, "#fdf6ee", "#e8dccc", "#d6c8b6"],
    [0, 0, 9, 24, 22, 2, "#f28ab2", "#d9668f", "#c25480"],
    [28, 4, 10, 8, 14, 3, "#ffffff", "#e6e0ee", "#d0c8dc"],
  ], (r, P) => { for (let u = 2; u < 22; u += 5) faceR(r, P, u, u + 2, 0, 9, 11, "#ffc2d1"); }) },
  sofa: { cat: "basic", price: 0, name: "소파", layer: "floor", s: isoSprite([
    [0, 12, 0, 34, 4, 19, ...TEAL],
    [0, 0, 0, 34, 12, 8, "#5bc0b8", TEAL[1], TEAL[2]],
    [30, 0, 0, 4, 12, 13, ...TEAL],
    [20, 7, 8, 7, 4, 8, "#ffe7a3", "#ffd36b", "#e8b84a"],
    [0, 0, 0, 4, 12, 13, ...TEAL],
  ]) },
  tv: { cat: "basic", price: 0, name: "TV", layer: "floor", s: isoSprite([
    [0, 0, 0, 22, 12, 9, "#8e6db0", "#6b4a8a", "#55386f"],
    [2, 4, 9, 18, 6, 16, "#4a4a5e", "#33334a", "#2b2b3a"],
  ], (r, P) => { faceR(r, P, 4, 18, 4, 12, 23, "#5ec8f2"); faceR(r, P, 5, 8, 4, 19, 22, "#bfeeff"); }), screen: { u0: 4, u1: 18, v: 4, z0: 12, z1: 23 } },
  plant: { cat: "deco", price: 10, name: "화분", layer: "floor", s: isoSprite([[0, 0, 0, 9, 9, 9, "#e57b55", "#d0603e", "#a84a2e"]], (r, P) => {
    const [x, y] = P(4.5, 4.5, 9);
    const X = Math.round(x), Y = Math.round(y);
    r(X - 1, Y - 16, 2, 16, "#3d8b3d");
    r(X - 7, Y - 12, 6, 4, "#56b356"); r(X + 1, Y - 16, 6, 4, "#56b356"); r(X - 8, Y - 7, 6, 4, "#4aa14a"); r(X + 2, Y - 9, 6, 4, "#4aa14a"); r(X - 3, Y - 20, 5, 4, "#6cc96c");
  }, 16) },
  lamp: { cat: "deco", price: 10, name: "스탠드", layer: "floor", s: isoSprite([
    [0, 0, 0, 7, 7, 2, "#8a8498", "#6d6680", "#4a4458"],
    [-1, -1, 24, 9, 9, 8, "#fff2c0", "#ffd36b", "#e8b84a"],
  ], (r, P) => { const [x, y] = P(3.5, 3.5, 24); r(Math.round(x) - 1, Math.round(y), 2, 22, "#6d6680"); }) },
  rug: { cat: "deco", price: 15, name: "러그", layer: "floor", flat: true, s: isoSprite([
    [0, 0, 0, 46, 30, 1, "#c97bd6", "#a85cb8", "#a85cb8"],
    [5, 5, 1, 36, 20, 0, "#e6a7ee", "#e6a7ee", "#e6a7ee"],
    [17, 11, 1, 12, 8, 0, "#fff2a8", "#fff2a8", "#fff2a8"],
  ]) },
  shelf: { cat: "deco", price: 20, name: "책장", layer: "floor", s: isoSprite([[0, 0, 0, 26, 11, 42, "#a86d3e", "#8b5a33", "#6e4426"]], (r, P) => {
    const books = ["#ff6f91", "#5cc8b8", "#ffd36b", "#7a6cff", "#f2f0fa", "#56b356"];
    for (let row = 0; row < 3; row++) {
      const z0 = 3 + row * 13;
      faceR(r, P, 2, 24, 0, z0, z0 + 11, "#4a2e18");
      for (let i = 0; i < 7; i++) faceR(r, P, 3 + i * 3, 5 + i * 3, 0, z0, z0 + 9 - (i % 3), books[(i + row * 2) % 6]);
    }
  }) },
  table: { cat: "deco", price: 20, name: "케이크 테이블", layer: "floor", s: isoSprite([
    [21, 13, 0, 2, 2, 12, ...WOOD], [1, 13, 0, 2, 2, 12, ...WOOD], [21, 1, 0, 2, 2, 12, ...WOOD], [1, 1, 0, 2, 2, 12, ...WOOD],
    [0, 0, 12, 24, 16, 3, "#dcae7a", "#c08a52", "#9a6a3a"],
    [8, 5, 15, 8, 7, 5, "#fff8f0", "#f9e6ea", "#f2d6dc"],
    [8, 5, 20, 8, 7, 2, "#f9b6cf", "#f28ab2", "#d9668f"],
  ], (r, P) => { const [x, y] = P(12, 8.5, 22); r(Math.round(x), Math.round(y) - 5, 1, 4, "#7ec8f0"); r(Math.round(x), Math.round(y) - 6, 1, 1, "#ffd36b"); }, 4) },
  bear: { cat: "deco", price: 10, name: "곰인형", layer: "floor", s: sprite(16, 18, (r) => {
    r(2, 0, 3, 3, "#8a5a32"); r(11, 0, 3, 3, "#8a5a32"); r(3, 1, 10, 7, "#b07a4a"); r(4, 7, 8, 8, "#b07a4a");
    r(6, 4, 4, 2, "#e8c9a0"); r(5, 3, 1, 1, "#221a2e"); r(10, 3, 1, 1, "#221a2e"); r(6, 9, 4, 4, "#e8c9a0");
    r(3, 13, 4, 5, "#9c6a3e"); r(9, 13, 4, 5, "#9c6a3e"); r(5, 8, 6, 1, "#ff6f91");
  }) },
  frame: { cat: "wall", price: 10, name: "액자", layer: "wall", s: sprite(24, 20, (r) => {
    r(0, 0, 24, 20, "#c9a227"); r(2, 2, 20, 16, "#bfe3ff"); r(4, 11, 8, 7, "#6cc96c"); r(10, 8, 10, 10, "#4aa14a"); r(16, 4, 3, 3, "#ffd36b");
  }) },
  clock: { cat: "wall", price: 10, name: "시계", layer: "wall", s: sprite(16, 16, (r) => {
    r(4, 0, 8, 16, "#5c3a20"); r(0, 4, 16, 8, "#5c3a20"); r(1, 2, 14, 12, "#5c3a20"); r(2, 1, 12, 14, "#5c3a20");
    r(2, 3, 12, 10, "#fffaf3"); r(3, 2, 10, 12, "#fffaf3"); r(7, 4, 2, 5, "#2d2540"); r(8, 7, 4, 2, "#2d2540");
  }) },
  poster: { cat: "wall", price: 10, name: "하트 포스터", layer: "wall", s: sprite(20, 26, (r) => {
    r(0, 0, 20, 26, "#fffaf3"); r(0, 0, 20, 1, "#d9cde8"); r(4, 6, 4, 3, "#ff6f91"); r(12, 6, 4, 3, "#ff6f91"); r(3, 8, 14, 4, "#ff6f91");
    r(5, 12, 10, 3, "#ff6f91"); r(7, 15, 6, 2, "#ff6f91"); r(9, 17, 2, 1, "#ff6f91"); r(5, 7, 2, 1, "#ffc2d1"); r(4, 21, 12, 1, "#9a8fb0");
  }) },
  fishbowl: { cat: "deco", price: 25, name: "어항", layer: "floor", s: sprite(20, 22, (r) => {
    r(3, 18, 14, 4, "#8b5a33"); r(2, 4, 16, 14, "#bfeeff"); r(4, 2, 12, 2, "#bfeeff"); r(2, 8, 16, 10, "#7fd0f0");
    r(7, 11, 4, 3, "#ff9a2a"); r(11, 12, 2, 1, "#ff9a2a"); r(8, 11, 1, 1, "#2d2540"); r(4, 5, 2, 4, "#ffffff");
  }) },
  guitar: { cat: "hobby", price: 25, name: "기타", layer: "floor", s: sprite(14, 36, (r) => {
    r(6, 0, 2, 16, "#5c3a20"); r(5, 0, 4, 3, "#2d2540"); r(2, 16, 10, 8, "#d0603e"); r(1, 22, 12, 12, "#d0603e");
    r(5, 24, 4, 4, "#2d2540"); r(4, 31, 6, 2, "#5c3a20"); r(3, 18, 2, 4, "#e57b55");
  }) },
  // ---- 운동
  pullup: { cat: "gym", price: 30, name: "철봉", layer: "floor", s: isoSprite([
    [20, 0, 0, 2, 4, 1, ...METAL], [20, 1, 0, 2, 2, 34, ...METAL],
    [0, 1, 32, 22, 2, 2, "#e0e0ea", "#b8b8c8", "#9a9aac"],
    [0, 0, 0, 2, 4, 1, ...METAL], [0, 1, 0, 2, 2, 34, ...METAL],
  ]) },
  dumbbell: { cat: "gym", price: 30, name: "덤벨 거치대", layer: "floor", s: isoSprite([
    [0, 0, 0, 24, 8, 10, "#5a5a6e", "#44445a", "#33334a"],
    [17, 1, 10, 5, 6, 3, ...IRON], [10, 1, 10, 5, 6, 3, "#ff6f91", "#d9668f", "#c25480"], [3, 1, 10, 5, 6, 3, ...IRON],
  ]) },
  treadmill: { cat: "gym", price: 50, name: "러닝머신", layer: "floor", s: isoSprite([
    [26, 10, 3, 2, 2, 20, ...METAL], [26, 0, 3, 2, 2, 20, ...METAL],
    [24, 0, 22, 6, 12, 3, "#4a4a5e", "#33334a", "#2b2b3a"],
    [0, 0, 0, 28, 12, 3, "#3a3a48", "#7a7a90", "#5a5a6e"],
    [1, 1, 3, 24, 10, 0, "#2b2b3a", "#2b2b3a", "#2b2b3a"],
  ], (r, P) => { const [x, y] = P(27, 6, 25); r(Math.round(x) - 2, Math.round(y) - 1, 4, 1, "#7fe08a"); }) },
  bench: { cat: "gym", price: 60, name: "벤치프레스", layer: "floor", s: isoSprite([
    [18, 15, 16, 3, 2, 10, ...IRON],
    [18, 12, 0, 2, 2, 24, ...METAL], [18, 0, 0, 2, 2, 24, ...METAL],
    [19, -3, 22, 1, 20, 1, "#e0e0ea", "#b8b8c8", "#9a9aac"],
    [18, -4, 16, 3, 2, 10, ...IRON],
    [2, 4, 0, 2, 6, 6, ...METAL], [0, 4, 6, 20, 6, 3, "#e5484d", "#c43a3f", "#a32f33"],
  ]) },
  // ---- 욕실
  bathtub: { cat: "bath", price: 60, name: "반신욕 욕조", layer: "floor", s: isoSprite([
    [32, 7, 12, 2, 2, 8, ...METAL],
    [0, 0, 0, 34, 18, 12, "#ffffff", "#e8eef4", "#d0dae4"],
    [2, 2, 12, 30, 14, 0, "#9fdcf5", "#9fdcf5", "#9fdcf5"],
  ], (r, P) => {
    for (const [u, v] of [[8, 6], [14, 11], [20, 5], [25, 10]]) { const [x, y] = P(u, v, 12); r(Math.round(x), Math.round(y) - 1, 2, 2, "#ffffff"); }
    const [x, y] = P(12, 8, 12); r(Math.round(x), Math.round(y) - 3, 3, 2, "#ffd36b"); r(Math.round(x) + 2, Math.round(y) - 4, 2, 2, "#ffd36b"); r(Math.round(x) + 4, Math.round(y) - 4, 1, 1, "#ff9a2a");
  }) },
  toilet: { cat: "bath", price: 30, name: "변기", layer: "floor", s: isoSprite([
    [10, 0, 0, 4, 10, 18, "#ffffff", "#e8eef4", "#d0dae4"],
    [0, 1, 0, 10, 8, 7, "#ffffff", "#e8eef4", "#d0dae4"],
    [0, 1, 7, 10, 8, 1, "#bfe3ff", "#a8cfee", "#94bce0"],
  ]) },
  sink: { cat: "bath", price: 30, name: "세면대", layer: "floor", s: isoSprite([
    [0, 0, 0, 14, 10, 14, "#bfe3ff", "#a8cfee", "#94bce0"],
    [0, 0, 14, 14, 10, 2, "#ffffff", "#e8eef4", "#d0dae4"],
    [3, 2, 16, 8, 6, 0, "#9fdcf5", "#9fdcf5", "#9fdcf5"],
    [12, 4, 16, 2, 2, 5, ...METAL],
  ]) },
  // ---- 주방
  fridge: { cat: "kitchen", price: 40, name: "냉장고", layer: "floor", s: isoSprite([
    [0, 0, 0, 14, 12, 40, "#f2f4f8", "#d8dce6", "#bfc4d2"],
  ], (r, P) => { faceR(r, P, 0, 14, 0, 26, 27, "#9aa0b2"); faceR(r, P, 2, 3, 0, 28, 36, "#7a8094"); faceR(r, P, 2, 3, 0, 14, 23, "#7a8094"); faceR(r, P, 8, 12, 0, 30, 33, "#ff6f91"); }) },
  stove: { cat: "kitchen", price: 35, name: "가스레인지", layer: "floor", s: isoSprite([
    [0, 0, 0, 22, 12, 16, "#f2f4f8", "#d8dce6", "#bfc4d2"],
    [0, 0, 16, 22, 12, 1, "#3a3a48", "#2b2b3a", "#2b2b3a"],
    [13, 3, 17, 7, 6, 6, "#e5484d", "#c43a3f", "#a32f33"],
  ], (r, P) => { faceR(r, P, 3, 19, 0, 4, 12, "#4a4a5e"); faceR(r, P, 4, 18, 0, 5, 11, "#ffb46b"); const [x, y] = P(5, 6, 17); r(Math.round(x) - 2, Math.round(y) - 1, 5, 2, "#5ec8f2"); }) },
  // ---- 취미
  computer: { cat: "hobby", price: 50, name: "컴퓨터 책상", layer: "floor", s: isoSprite([
    [22, 10, 0, 2, 2, 12, ...WOOD], [0, 10, 0, 2, 2, 12, ...WOOD], [22, 0, 0, 2, 2, 12, ...WOOD], [0, 0, 0, 2, 2, 12, ...WOOD],
    [0, 0, 12, 24, 12, 2, "#dcae7a", "#c08a52", "#9a6a3a"],
    [10, 9, 14, 4, 2, 3, "#4a4a5e", "#33334a", "#2b2b3a"],
    [4, 8, 17, 16, 2, 11, "#4a4a5e", "#33334a", "#2b2b3a"],
    [6, 2, 14, 10, 4, 1, "#e0e0ea", "#b8b8c8", "#9a9aac"],
  ], (r, P) => { faceR(r, P, 5, 19, 8, 18, 27, "#5ec8f2"); faceR(r, P, 6, 9, 8, 23, 26, "#bfeeff"); }) },
  arcade: { cat: "hobby", price: 70, name: "오락기", layer: "floor", s: isoSprite([
    [0, 0, 0, 14, 12, 38, "#7a6cff", "#5a4ccf", "#463aa8"],
    [0, -4, 14, 14, 4, 3, "#2b2b3a", "#4a4a5e", "#33334a"],
  ], (r, P) => {
    faceR(r, P, 2, 12, 0, 20, 31, "#2b2b3a"); faceR(r, P, 3, 11, 0, 21, 30, "#5ec8f2"); faceR(r, P, 5, 7, 0, 24, 26, "#ffd36b");
    faceR(r, P, 1, 13, 0, 33, 37, "#ff6f91");
    const [x, y] = P(4, -2, 17); r(Math.round(x), Math.round(y) - 1, 2, 2, "#e5484d"); const [x2, y2] = P(9, -2, 17); r(Math.round(x2), Math.round(y2) - 1, 2, 2, "#ffd36b");
  }) },
};

// shop categories, in the order the tabs show
export const CATEGORIES = [
  ["basic", "기본"], ["deco", "인테리어"], ["wall", "벽 장식"], ["gym", "운동"], ["bath", "욕실"], ["kitchen", "주방"], ["hobby", "취미"],
];

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
export function drawMinimi(g, x, y, look = DEFAULT_LOOK, st = "idle", t = 0, dir = 1, scale = 1, weapon = "fist") {
  look = { ...DEFAULT_LOOK, ...(look || {}) };
  // attack: a short windup (lean back), then the strike (lean in) — t is the time since the swing began
  const atk = st === "atk" ? (t < 0.07 ? "wind" : t < 0.24 ? "hit" : "follow") : null;
  if (atk) x += (atk === "wind" ? -1 : atk === "hit" ? 2 : 1) * dir * scale;
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
  R(-5 + sh, by + 1, 1, 4, skin);
  if (!atk) R(4 + sh, by + 1, 1, 4, skin);
  else if (atk === "wind") R(-8, by + 2, 3, 2, skin);
  else { R(4, by + 2, 5, 2, skin); if (weapon === "fist") { R(8, by + 1, 3, 3, skin); R(8, by + 1, 3, 1, "#ffffff"); } }
  drawWeapon(R, weapon, atk, by);
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
// weapons in the front hand; R mirrors with the facing, so these are drawn facing right
function drawWeapon(R, w, atk, by) {
  const hit = atk === "hit" || atk === "follow";
  if (w === "sword") {
    if (hit) { R(7, by + 1, 1, 4, "#c9a227"); R(8, by + 2, 12, 2, "#cfd8e8"); R(8, by + 2, 12, 1, "#ffffff"); R(20, by + 2, 1, 1, "#ffffff"); }
    else if (atk === "wind") { R(-9, by - 8, 1, 10, "#cfd8e8"); R(-10, by + 2, 3, 1, "#c9a227"); }
    else { R(5, by - 7, 1, 10, "#cfd8e8"); R(4, by + 3, 3, 1, "#c9a227"); R(5, by + 4, 1, 2, "#8b5a33"); }
  }
  if (w === "spear") {
    if (hit) { R(2, by + 2, 24, 1, "#8b5a33"); R(26, by + 1, 4, 3, "#cfd8e8"); R(30, by + 2, 1, 1, "#ffffff"); }
    else if (atk === "wind") { R(-12, by + 2, 20, 1, "#8b5a33"); R(8, by + 1, 3, 3, "#cfd8e8"); }
    else { R(6, by - 13, 1, 22, "#8b5a33"); R(5, by - 16, 3, 3, "#cfd8e8"); }
  }
  if (w === "hammer") {
    if (hit) { R(5, by + 2, 9, 2, "#8b5a33"); R(13, by - 2, 5, 8, "#6d6680"); R(13, by - 2, 5, 1, "#a8a2b8"); }
    else if (atk === "wind") { R(-3, by - 9, 2, 10, "#8b5a33"); R(-6, by - 13, 8, 5, "#6d6680"); }
    else { R(6, by - 4, 1, 10, "#8b5a33"); R(4, by - 8, 5, 4, "#6d6680"); }
  }
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
