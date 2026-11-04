// Two backends with one interface:
//  - LiveNet: claude.ai artifact runtime. `db` keeps every minihome (room, pranks, guestbook, visits), each person's
//    minimi and coins, and the 일촌 links; `room` shares everyone's position right now; `user` says who is viewing.
//  - LocalNet: a file opened on its own. localStorage + BroadcastChannel; each browser tab is its own person,
//    so two tabs can visit each other and become 일촌.
//
// Everyone who opens the page has their own minihome, keyed by their user id ("home id").
// Data model (same in both):
//   rooms/<hid>              { items, wall, floor, bgm, yt, mood, intro, title, cleanedAt, ownerId, ownerNick }  the owner writes
//   pranks/<id>              { home, kind, item, x, y, by, nick, at, seed }      visitors add
//   guestbook/<id>           { home, by, nick, look, msg, secret, at, reply }    visitors add
//   secret/<uid>             { posts: { <guestbookId>: text } }                   the writer's secret posts
//   minimi/<uid>             { look }                                             each person writes their own
//   visits/<hid>__<uid>__<d> { home, by, date, at }                              one per visitor per home per day
//   coins/<uid>              { coins, weapons, furni, log }                           each person's own coins
//   ilchon/<a>__<b>          { a, b, from, to, status: "wait"|"ok", names: { <uid>: 일촌명 }, at }   a < b
//   profiles/<uid>           { handle, nick }   chosen on the entry screen; the handle is the minihome address
//   handles/<handle>         { uid }            who owns a handle
//   home/room                the single room of the first version; its ownerId is where newcomers land
//
// subscribe(h) starts the parts that don't depend on which home is open; openHome(hid, h) (re)starts the rest.

const LS_KEY = "phyco-world-v4";
export const pairId = (x, y) => (x < y ? `${x}__${y}` : `${y}__${x}`);

export async function connect() {
  if (window.claude && typeof window.claude.use === "function") {
    try {
      const [db, room, user] = await Promise.all([window.claude.use("db"), window.claude.use("room"), window.claude.use("user")]);
      if (db && user) return await liveNet(db, room, user);
    } catch {}
  }
  return localNet();
}

// snapshot data can be read-only (frozen): hand the game its own plain copy so it can move and change things
const plain = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
const strip = (o) => { const c = { ...o }; delete c.id; return JSON.parse(JSON.stringify(c)); };
const byAt = (a, b) => a.at - b.at;

// ------------------------------------------------------------------ live
async function liveNet(db, room, user) {
  const me = await user.me();
  const id = me.id;
  const canWrite = (await user.can("data.write")) !== false && !!id;
  let home = null, homeSubs = [];
  const net = {
    mode: "live",
    me: { id, isOwner: false, canWrite },
    async names(ids) {
      const ps = await user.profiles(ids.filter(Boolean));
      const out = {};
      for (const k of Object.keys(ps)) out[k] = ps[k].name || "";
      return out;
    },
    // where someone with no link lands: the owner of the first version's room, if there is one
    async firstHome() { try { const s = await db.doc("home/room").get(); return (s.exists && s.data().ownerId) || null; } catch { return null; } },
    subscribe(h) {
      const err = (what) => (e) => h.error?.(what, e);
      db.collection("profiles").onSnapshot((s) => { const m = {}; s.docs.forEach((d) => (m[d.id] = d.data())); h.profiles(plain(m)); }, err("profiles"));
      db.collection("minimi").onSnapshot((s) => { const m = {}; s.docs.forEach((d) => (m[d.id] = d.data().look)); h.minimi(plain(m)); }, err("minimi"));
      db.collection("secret").onSnapshot((s) => { const m = {}; s.docs.forEach((d) => Object.assign(m, d.data().posts || {})); h.secrets(plain(m)); }, () => {});
      db.collection("ilchon").onSnapshot((s) => h.ilchon(plain(s.docs.map((d) => ({ id: d.id, ...d.data() }))).filter((x) => x.a === id || x.b === id)), err("ilchon"));
      if (id) db.doc("coins/" + id).onSnapshot((s) => h.coins?.(s.exists ? plain(s.data()) : {}), () => {});
      if (room) room.onPeers((c) => h.peers(c.peers.filter((p) => !p.sameTab).map((p) => ({ key: p.peer, by: p.by, ...p.presence }))));
    },
    openHome(hid, h) {
      homeSubs.forEach((u) => { try { u(); } catch {} });
      home = hid;
      const err = (what) => (e) => h.error?.(what, e);
      const mine = (fn) => (v) => { if (home === hid) fn(v); };   // drop late answers for a home we already left
      homeSubs = [
        db.doc("rooms/" + hid).onSnapshot(mine((s) => h.room(s.exists ? plain(s.data()) : null)), err("room")),
        db.collection("pranks").where("home", "==", hid).limit(400).onSnapshot(mine((s) => h.pranks(plain(s.docs.map((d) => ({ id: d.id, ...d.data() }))).sort(byAt))), err("pranks")),
        db.collection("guestbook").where("home", "==", hid).limit(200).onSnapshot(mine((s) => h.guestbook(plain(s.docs.map((d) => ({ id: d.id, ...d.data() }))).sort((a, b) => b.at - a.at))), err("guestbook")),
        db.collection("visits").where("home", "==", hid).onSnapshot(mine((s) => h.visits(plain(s.docs.map((d) => d.data())))), err("visits")),
      ];
    },
    presence(p) { room?.presence(p).catch(() => {}); },
    async saveRoom(doc) { await db.doc("rooms/" + home).set(doc); },
    async addPrank(p) { await db.collection("pranks").doc(p.id).set(strip({ ...p, home })); },
    async addGuest(e, secretText) {
      await db.collection("guestbook").doc(e.id).set(strip({ ...e, home }));
      if (secretText && id) {
        const sref = db.doc("secret/" + id);
        const cur = await sref.get();
        await sref.set({ posts: { ...((cur.exists && cur.data().posts) || {}), [e.id]: secretText } });
      }
    },
    async updateGuest(gid, patch) { await db.collection("guestbook").doc(gid).update(patch); },
    async deleteGuest(gid) { await db.collection("guestbook").doc(gid).delete(); },
    async saveMinimi(look) { if (id) await db.doc("minimi/" + id).set({ look }); },
    // claim a handle (fails with "taken" when someone else has it) and save my nickname
    async saveProfile({ handle, nick }) {
      if (!id) throw new Error("signed out");
      const href = db.doc("handles/" + handle), cur = await href.get();
      if (cur.exists && cur.data().uid !== id) throw new Error("taken");
      const pref = db.doc("profiles/" + id), old = await pref.get();
      if (!cur.exists) await href.set({ uid: id });
      await pref.set({ handle, nick });
      const was = old.exists && old.data().handle;
      if (was && was !== handle) await db.doc("handles/" + was).delete().catch(() => {});
    },
    async addCoins(n, why) {
      if (!id) return;
      const ref = db.doc("coins/" + id), cur = await ref.get(), d = cur.exists ? cur.data() : {};
      await ref.set({ ...d, coins: (d.coins || 0) + n, log: [...(d.log || []), { n, why, at: Date.now() }].slice(-20) });
    },
    async buyFurni(t, price) {
      if (!id) return;
      const ref = db.doc("coins/" + id), cur = await ref.get(), d = cur.exists ? cur.data() : {};
      if ((d.coins || 0) < price) throw new Error("not enough coins");
      await ref.set({ ...d, coins: d.coins - price, furni: [...new Set([...(d.furni || []), t])], log: [...(d.log || []), { n: -price, why: t, at: Date.now() }].slice(-20) });
    },
    async buyWeapon(w, price) {
      if (!id) return;
      const ref = db.doc("coins/" + id), cur = await ref.get(), d = cur.exists ? cur.data() : {};
      if ((d.coins || 0) < price) throw new Error("not enough coins");
      await ref.set({ ...d, coins: d.coins - price, weapons: [...new Set([...(d.weapons || []), w])], log: [...(d.log || []), { n: -price, why: w, at: Date.now() }].slice(-20) });
    },
    async logVisit() {
      if (!id || !home) return;
      const date = today();
      await db.doc(`visits/${home}__${id}__${date}`).set({ home, by: id, date, at: Date.now() });
    },
    async prunePranks(ids) { for (const pid of ids.slice(0, 80)) await db.collection("pranks").doc(pid).delete().catch(() => {}); },
    // 일촌: I ask `to`, calling them `name`; they accept, calling me `name`
    async askIlchon(to, name) {
      const [a, b] = id < to ? [id, to] : [to, id];
      await db.doc("ilchon/" + pairId(id, to)).set({ a, b, from: id, to, status: "wait", names: { [to]: name }, at: Date.now() });
    },
    async acceptIlchon(x, name) { await db.doc("ilchon/" + x.id).set(strip({ ...x, status: "ok", names: { ...(x.names || {}), [x.from]: name }, at: Date.now() })); },
    async dropIlchon(x) { await db.doc("ilchon/" + x.id).delete(); },
  };
  return net;
}

// ------------------------------------------------------------------ local
function localNet() {
  const tab = Math.random().toString(36).slice(2, 10);
  let meId = null;
  try { meId = sessionStorage.getItem("phyco-me"); } catch {}
  if (!meId) { meId = "local-" + tab; try { sessionStorage.setItem("phyco-me", meId); } catch {} }
  const empty = () => ({ rooms: {}, pranks: [], guestbook: [], minimi: {}, visits: [], secrets: {}, coins: {}, ilchon: {}, nicks: {}, profiles: {}, handles: {} });
  const load = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; } };
  let data = { ...empty(), ...(load() || {}) };
  let g = null, hh = null, home = null;
  let bc = null;
  try { bc = new BroadcastChannel("phyco-world"); } catch {}
  const peers = new Map();
  const fresh = () => { data = { ...empty(), ...(load() || data) }; };   // another tab may have written since: start from storage
  const save = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {} bc?.postMessage({ t: "data" }); emitAll(); };
  const emitHome = () => {
    if (!hh || !home) return;
    hh.room(plain(data.rooms[home] || null));
    hh.pranks(plain(data.pranks.filter((p) => p.home === home)).sort(byAt));
    hh.guestbook(plain(data.guestbook.filter((e) => e.home === home)).sort((a, b) => b.at - a.at));
    hh.visits(plain(data.visits.filter((v) => v.home === home)));
  };
  const emitAll = () => {
    if (g) {
      g.profiles(plain(data.profiles)); g.minimi(plain(data.minimi)); g.secrets(plain(data.secrets));
      g.ilchon(plain(Object.entries(data.ilchon).map(([id, x]) => ({ id, ...x })).filter((x) => x.a === meId || x.b === meId)));
      const c = data.coins[meId] || {}; g.coins?.({ coins: c.coins || 0, weapons: c.weapons || [], furni: c.furni || [] });
    }
    emitHome();
  };
  let myPresence = {};
  if (bc) {
    bc.onmessage = (ev) => {
      const m = ev.data || {};
      if (m.t === "data") { fresh(); emitAll(); }
      if (m.t === "pres") { peers.set(m.tab, { key: m.tab, by: m.by, at: Date.now(), ...m.p }); pushPeers(); }
      if (m.t === "bye") { peers.delete(m.tab); pushPeers(); }
    };
    setInterval(() => {
      bc.postMessage({ t: "pres", tab, by: meId, p: myPresence });
      let changed = false;
      for (const [k, v] of peers) if (Date.now() - v.at > 3000) { peers.delete(k); changed = true; }
      if (changed) pushPeers();
    }, 1000);
    addEventListener("pagehide", () => bc.postMessage({ t: "bye", tab }));
  }
  let lastPres = 0;
  const pushPeers = () => g?.peers([...peers.values()]);
  const coinsOf = () => (data.coins[meId] ||= { coins: 0, weapons: [] });
  return {
    mode: "local",
    me: { id: meId, isOwner: false, canWrite: true },
    async names(ids) { fresh(); const o = {}; for (const k of ids) if (data.nicks[k]) o[k] = data.nicks[k]; return o; },
    setNick(n) { fresh(); if (n) { data.nicks[meId] = n; save(); } },
    async firstHome() { fresh(); return Object.keys(data.rooms)[0] || null; },
    subscribe(handlers) { g = handlers; emitAll(); pushPeers(); },
    openHome(hid, handlers) { home = hid; hh = handlers; fresh(); emitHome(); },
    presence(p) {
      Object.assign(myPresence, p);
      const now = performance.now();
      if (bc && now - lastPres > 60) { lastPres = now; bc.postMessage({ t: "pres", tab, by: meId, p: myPresence }); }
    },
    async saveRoom(doc) { fresh(); data.rooms[home] = doc; save(); },
    async addPrank(p) { fresh(); data.pranks.push({ ...p, home }); if (data.pranks.length > 800) data.pranks.splice(0, data.pranks.length - 800); save(); },
    async addGuest(e, secretText) { fresh(); data.guestbook.push({ ...e, home }); if (secretText) data.secrets[e.id] = secretText; save(); },
    async updateGuest(gid, patch) { fresh(); const x = data.guestbook.find((q) => q.id === gid); if (x) Object.assign(x, patch); save(); },
    async deleteGuest(gid) { fresh(); data.guestbook = data.guestbook.filter((x) => x.id !== gid); save(); },
    async saveMinimi(look) { fresh(); data.minimi[meId] = look; save(); },
    async saveProfile({ handle, nick }) {
      fresh();
      if (data.handles[handle] && data.handles[handle] !== meId) throw new Error("taken");
      const was = data.profiles[meId]?.handle; if (was && was !== handle) delete data.handles[was];
      data.handles[handle] = meId; data.profiles[meId] = { handle, nick }; data.nicks[meId] = nick; save();
    },
    async addCoins(n) { fresh(); coinsOf().coins += n; save(); },
    async buyFurni(t, price) { fresh(); const c = coinsOf(); c.coins -= price; c.furni = [...new Set([...(c.furni || []), t])]; save(); },
    async buyWeapon(w, price) { fresh(); const c = coinsOf(); c.coins -= price; c.weapons = [...new Set([...(c.weapons || []), w])]; save(); },
    async logVisit() { fresh(); const date = today(); if (!data.visits.some((v) => v.home === home && v.by === meId && v.date === date)) data.visits.push({ home, by: meId, date, at: Date.now() }); save(); },
    async prunePranks(ids) { fresh(); const s = new Set(ids); data.pranks = data.pranks.filter((p) => !s.has(p.id)); save(); },
    async askIlchon(to, name) { fresh(); const [a, b] = meId < to ? [meId, to] : [to, meId]; data.ilchon[pairId(meId, to)] = { a, b, from: meId, to, status: "wait", names: { [to]: name }, at: Date.now() }; save(); },
    async acceptIlchon(x, name) { fresh(); const cur = data.ilchon[x.id]; if (cur) { cur.status = "ok"; cur.names = { ...(cur.names || {}), [x.from]: name }; } save(); },
    async dropIlchon(x) { fresh(); delete data.ilchon[x.id]; save(); },
    reset() { try { localStorage.removeItem(LS_KEY); } catch {} data = empty(); save(); },
  };
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
