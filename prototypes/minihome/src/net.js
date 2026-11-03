// Two backends with one interface:
//  - LiveNet: claude.ai artifact runtime. `db` keeps the home (room layout, pranks, guestbook, minimi, visits)
//    shared and live; `room` shares everyone's position right now; `user` says who is viewing.
//  - LocalNet: a file opened on its own. localStorage + BroadcastChannel, so two tabs of the same
//    browser already see each other.
//
// Data model (same in both):
//   home/room              { items, wall, floor, bgm, mood, intro, title, cleanedAt, ownerId }   owner writes
//   pranks/<id>            { kind, item, x, y, by, nick, at, seed }                           visitors add
//   guestbook/<id>         { by, nick, look, msg, secret, auto, at, reply }                  visitors add
//   secret/<uid>           { posts: { <guestbookId>: text } }   only the writer and the owner read it
//   minimi/<uid>           { look }                              each person writes their own
//   visits/<uid>__<date>   { by, date, at }                      one per person per day
//   coins/<uid>            { coins, log }                        each person's own coins

const LS_KEY = "phyco-world-v3";

export async function connect() {
  if (window.claude && typeof window.claude.use === "function") {
    try {
      const [db, room, user] = await Promise.all([window.claude.use("db"), window.claude.use("room"), window.claude.use("user")]);
      if (db && user) return await liveNet(db, room, user);
    } catch {}
  }
  return localNet();
}

// ------------------------------------------------------------------ live
async function liveNet(db, room, user) {
  const me = await user.me();
  const id = me.id;
  const isOwner = await user.isOwner();
  const canWrite = (await user.can("data.write")) !== false && !!id;
  const subs = [];
  const net = {
    mode: "live",
    me: { id, isOwner, canWrite },
    async names(ids) {
      const ps = await user.profiles(ids.filter(Boolean));
      const out = {};
      for (const k of Object.keys(ps)) out[k] = ps[k].name || "";
      return out;
    },
    subscribe(h) {
      const err = (what) => (e) => h.error?.(what, e);
      subs.push(db.doc("home/room").onSnapshot((s) => h.room(s.exists ? s.data() : null), err("room")));
      subs.push(db.collection("pranks").orderBy("at", "asc").limit(400).onSnapshot((s) => h.pranks(s.docs.map((d) => ({ id: d.id, ...d.data() }))), err("pranks")));
      subs.push(db.collection("guestbook").orderBy("at", "desc").limit(200).onSnapshot((s) => h.guestbook(s.docs.map((d) => ({ id: d.id, ...d.data() }))), err("guestbook")));
      subs.push(db.collection("minimi").onSnapshot((s) => { const m = {}; s.docs.forEach((d) => (m[d.id] = d.data().look)); h.minimi(m); }, err("minimi")));
      subs.push(db.collection("visits").onSnapshot((s) => h.visits(s.docs.map((d) => d.data())), err("visits")));
      subs.push(db.collection("secret").onSnapshot((s) => { const m = {}; s.docs.forEach((d) => Object.assign(m, d.data().posts || {})); h.secrets(m); }, () => {}));
      if (id) subs.push(db.doc("coins/" + id).onSnapshot((s) => h.coins?.(s.exists ? s.data() : {}), () => {}));
      if (room) {
        subs.push(room.onPeers((c) => h.peers(c.peers.filter((p) => !p.sameTab).map((p) => ({ key: p.peer, by: p.by, ...p.presence })))));
      }
    },
    presence(p) { room?.presence(p).catch(() => {}); },
    async saveRoom(doc) { await db.doc("home/room").set(doc); },
    async addPrank(p) { const ref = db.collection("pranks").doc(p.id); await ref.set(strip(p)); },
    async addGuest(e, secretText) {
      const ref = db.collection("guestbook").doc(e.id);
      await ref.set(strip(e));
      if (secretText && id) {
        const sref = db.doc("secret/" + id);
        const cur = await sref.get();
        const posts = { ...((cur.exists && cur.data().posts) || {}), [e.id]: secretText };
        await sref.set({ posts });
      }
    },
    async updateGuest(gid, patch) { await db.collection("guestbook").doc(gid).update(patch); },
    async deleteGuest(gid) { await db.collection("guestbook").doc(gid).delete(); },
    async saveMinimi(look) { if (id) await db.doc("minimi/" + id).set({ look }); },
    async addCoins(n, why) {
      if (!id) return;
      const ref = db.doc("coins/" + id), cur = await ref.get(), d = cur.exists ? cur.data() : {};
      await ref.set({ ...d, coins: (d.coins || 0) + n, log: [...(d.log || []), { n, why, at: Date.now() }].slice(-20) });
    },
    async buyWeapon(w, price) {
      if (!id) return;
      const ref = db.doc("coins/" + id), cur = await ref.get(), d = cur.exists ? cur.data() : {};
      if ((d.coins || 0) < price) throw new Error("not enough coins");
      await ref.set({ ...d, coins: d.coins - price, weapons: [...new Set([...(d.weapons || []), w])], log: [...(d.log || []), { n: -price, why: w, at: Date.now() }].slice(-20) });
    },
    async logVisit() {
      if (!id) return;
      const date = today();
      await db.doc(`visits/${id}__${date}`).set({ by: id, date, at: Date.now() });
    },
    async prunePranks(ids) { for (const pid of ids.slice(0, 80)) await db.collection("pranks").doc(pid).delete().catch(() => {}); },
  };
  return net;
}
const strip = (o) => { const c = { ...o }; delete c.id; return JSON.parse(JSON.stringify(c)); };

// ------------------------------------------------------------------ local
function localNet() {
  const tab = Math.random().toString(36).slice(2, 10);
  const load = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; } };
  let data = load() || { room: null, pranks: [], guestbook: [], minimi: {}, visits: [], secrets: {}, me: "local-" + tab };
  if (!data.me) data.me = "local-" + tab;
  const meId = data.me; // shared by tabs of this browser: one "person"
  let h = null;
  let bc = null;
  try { bc = new BroadcastChannel("phyco-world"); } catch {}
  const peers = new Map();
  const fresh = () => { data = load() || data; };   // another tab may have written since: start from storage
  const save = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {} bc?.postMessage({ t: "data" }); emitAll(); };
  const emitAll = () => {
    if (!h) return;
    h.room(data.room); h.pranks([...data.pranks].sort((a, b) => a.at - b.at)); h.guestbook([...data.guestbook].sort((a, b) => b.at - a.at));
    h.minimi(data.minimi); h.visits(data.visits); h.secrets(data.secrets); h.coins?.({ coins: data.coins || 0, weapons: data.weapons || [] });
  };
  let myPresence = {};
  if (bc) {
    bc.onmessage = (ev) => {
      const m = ev.data || {};
      if (m.t === "data") { data = load() || data; emitAll(); }
      if (m.t === "pres") { peers.set(m.tab, { key: m.tab, by: meId, at: Date.now(), ...m.p }); pushPeers(); }
      if (m.t === "bye") { peers.delete(m.tab); pushPeers(); }
    };
    setInterval(() => {
      bc.postMessage({ t: "pres", tab, p: myPresence });
      let changed = false;
      for (const [k, v] of peers) if (Date.now() - v.at > 3000) { peers.delete(k); changed = true; }
      if (changed) pushPeers();
    }, 1000);
    addEventListener("pagehide", () => bc.postMessage({ t: "bye", tab }));
  }
  let lastPres = 0;
  const pushPeers = () => h?.peers([...peers.values()]);
  return {
    mode: "local",
    me: { id: meId, isOwner: true, canWrite: true },
    async names() { return {}; },
    subscribe(handlers) { h = handlers; emitAll(); pushPeers(); },
    presence(p) {
      Object.assign(myPresence, p);
      const now = performance.now();
      if (bc && now - lastPres > 60) { lastPres = now; bc.postMessage({ t: "pres", tab, p: myPresence }); }
    },
    async saveRoom(doc) { fresh(); data.room = doc; save(); },
    async addPrank(p) { fresh(); data.pranks.push(p); if (data.pranks.length > 400) data.pranks.splice(0, data.pranks.length - 400); save(); },
    async addGuest(e, secretText) { fresh(); data.guestbook.push(e); if (secretText) data.secrets[e.id] = secretText; save(); },
    async updateGuest(gid, patch) { fresh(); const g = data.guestbook.find((x) => x.id === gid); if (g) Object.assign(g, patch); save(); },
    async deleteGuest(gid) { fresh(); data.guestbook = data.guestbook.filter((x) => x.id !== gid); save(); },
    async saveMinimi(look) { fresh(); data.minimi[meId] = look; save(); },
    async addCoins(n) { fresh(); data.coins = (data.coins || 0) + n; save(); },
    async buyWeapon(w, price) { fresh(); data.coins = (data.coins || 0) - price; data.weapons = [...new Set([...(data.weapons || []), w])]; save(); },
    async logVisit() { fresh(); data.visits.push({ by: meId, date: today(), at: Date.now() }); save(); },
    async prunePranks(ids) { fresh(); const s = new Set(ids); data.pranks = data.pranks.filter((p) => !s.has(p.id)); save(); },
    reset() { try { localStorage.removeItem(LS_KEY); } catch {} data = { room: null, pranks: [], guestbook: [], minimi: {}, visits: [], secrets: {}, me: meId }; save(); },
  };
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
