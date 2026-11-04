// Jobs and their Q W E R skills. Each visit you get a random job ("전직").
// A skill is saved like any prank: { kind: "skill", sk: "pyro.q", ox, oy, dir, x, y, ... } so everyone in the
// room sees it, and the room is rebuilt from it the same way for everyone.
//
// shape:   proj   a projectile flies from the hand to (x, y), then hits there
//          beam   a jet from the hand, hitting a line in front (len)
//          line   something along the floor in front (len)
//          at     an effect at a point in front (dist), hitting a circle (r); atCaster: drawn from the caster
//          self   an effect round the caster, hitting a circle (r)
//          chain  a bolt that jumps through the 3 nearest things in front
//          near   the nearest piece of furniture in front
//          all    the whole room
// el:      what a hit does to furniture: fire, ice, bolt, slash, nature, shadow, boom, wind, haunt, party
import * as fireball from "../vendor/pixelfx/src/fx/fire/fireball.js";
import * as flamethrower from "../vendor/pixelfx/src/fx/fire/flamethrower.js";
import * as flamePillar from "../vendor/pixelfx/src/fx/fire/flame-pillar.js";
import * as meteor from "../vendor/pixelfx/src/fx/fire/meteor.js";
import * as iceLance from "../vendor/pixelfx/src/fx/ice/ice-lance.js";
import * as frostBreath from "../vendor/pixelfx/src/fx/ice/frost-breath.js";
import * as frostNova from "../vendor/pixelfx/src/fx/ice/frost-nova.js";
import * as blizzard from "../vendor/pixelfx/src/fx/ice/blizzard-vortex.js";
import * as snowflake from "../vendor/pixelfx/src/fx/ice/snowflake-burst.js";
import * as chainLightning from "../vendor/pixelfx/src/fx/lightning/chain-lightning.js";
import * as ballLightning from "../vendor/pixelfx/src/fx/lightning/ball-lightning.js";
import * as thunderclap from "../vendor/pixelfx/src/fx/lightning/thunderclap.js";
import * as stormCloud from "../vendor/pixelfx/src/fx/lightning/storm-cloud.js";
import * as thrust from "../vendor/pixelfx/src/fx/melee/thrust.js";
import * as spinSlash from "../vendor/pixelfx/src/fx/melee/spin-slash.js";
import * as heavyCleave from "../vendor/pixelfx/src/fx/melee/heavy-cleave.js";
import * as daggerFlurry from "../vendor/pixelfx/src/fx/melee/dagger-flurry.js";
import * as vineWhip from "../vendor/pixelfx/src/fx/nature/vine-whip.js";
import * as toxicPuddle from "../vendor/pixelfx/src/fx/nature/toxic-puddle.js";
import * as thorns from "../vendor/pixelfx/src/fx/nature/thorns.js";
import * as tornado from "../vendor/pixelfx/src/fx/nature/tornado.js";
import * as voidOrb from "../vendor/pixelfx/src/fx/shadow/void-orb.js";
import * as tendrils from "../vendor/pixelfx/src/fx/shadow/shadow-tendrils.js";
import * as curse from "../vendor/pixelfx/src/fx/shadow/curse.js";
import * as blackHole from "../vendor/pixelfx/src/fx/shadow/black-hole.js";
import * as grenade from "../vendor/pixelfx/src/fx/explosions/grenade.js";
import * as barrel from "../vendor/pixelfx/src/fx/explosions/barrel-explosion.js";
import * as firework from "../vendor/pixelfx/src/fx/explosions/firework-rocket.js";
import * as nuke from "../vendor/pixelfx/src/fx/explosions/nuke.js";
import * as smallBoom from "../vendor/pixelfx/src/fx/explosions/small-explosion.js";

export const JOBS = [
  { id: "pyro", name: "불꽃 마법사", ico: "🔥", skills: [
    { name: "파이어볼", cd: 2, shape: "proj", fx: fireball, speed: 170, len: 120, hit: smallBoom, hitO: { size: 0.45 }, el: "fire", r: 18 },
    { name: "화염 방사", cd: 5, shape: "beam", fx: flamethrower, o: { reach: 90 }, dur: 1.3, len: 96, el: "fire" },
    { name: "불기둥", cd: 8, shape: "at", fx: flamePillar, o: { height: 90 }, dist: 44, r: 22, el: "fire", leave: "fire", delay: 0.7 },
    { name: "메테오", cd: 15, shape: "at", fx: meteor, dist: 64, r: 46, el: "boom", leave: "fire", delay: 1.5, shake: 0.9 },
  ] },
  { id: "frost", name: "얼음 마녀", ico: "❄️", skills: [
    { name: "얼음 창", cd: 2, shape: "proj", fx: iceLance, speed: 200, len: 120, hit: snowflake, hitO: { count: 5 }, el: "ice", r: 16 },
    { name: "서리 숨결", cd: 5, shape: "beam", fx: frostBreath, dur: 1.3, len: 100, el: "ice" },
    { name: "프로스트 노바", cd: 8, shape: "self", fx: frostNova, o: { reach: 70 }, r: 62, el: "ice", delay: 0.6 },
    { name: "눈보라", cd: 15, shape: "at", fx: blizzard, o: { height: 60 }, dist: 56, dur: 4, r: 44, el: "ice", delay: 0.8 },
  ] },
  { id: "volt", name: "번개 기사", ico: "⚡", skills: [
    { name: "체인 라이트닝", cd: 3, shape: "chain", fx: chainLightning, len: 140, el: "bolt", delay: 0.3 },
    { name: "볼 라이트닝", cd: 6, shape: "at", fx: ballLightning, dist: 48, dur: 3, r: 26, el: "bolt", delay: 0.6 },
    { name: "천둥", cd: 8, shape: "self", fx: thunderclap, o: { reach: 70 }, r: 58, el: "bolt", delay: 0.3, shake: 0.5 },
    { name: "폭풍 구름", cd: 15, shape: "at", fx: stormCloud, dist: 60, dur: 5, r: 42, el: "bolt", delay: 1, shake: 0.3 },
  ] },
  { id: "blade", name: "검객", ico: "🗡️", skills: [
    { name: "찌르기", cd: 1.5, shape: "line", fx: thrust, o: { reach: 56 }, len: 60, el: "slash" },
    { name: "회전 베기", cd: 4, shape: "self", fx: spinSlash, o: { radius: 36 }, r: 40, el: "slash" },
    { name: "내려찍기", cd: 7, shape: "at", fx: heavyCleave, atCaster: true, dist: 40, r: 30, el: "boom", delay: 0.8, shake: 0.6 },
    { name: "난도질", cd: 12, shape: "line", fx: daggerFlurry, len: 70, el: "slash", repeat: 3 },
  ] },
  { id: "druid", name: "숲의 정령", ico: "🌿", skills: [
    { name: "덩굴 채찍", cd: 2, shape: "line", fx: vineWhip, len: 110, el: "nature", delay: 0.6 },
    { name: "독 웅덩이", cd: 6, shape: "at", fx: toxicPuddle, o: { width: 30 }, dist: 40, dur: 5, r: 28, el: "nature" },
    { name: "가시", cd: 8, shape: "line", fx: thorns, len: 130, el: "slash", delay: 0.5 },
    { name: "토네이도", cd: 15, shape: "at", fx: tornado, o: { height: 80 }, dist: 30, dur: 4, move: 25, r: 40, el: "wind", delay: 1 },
  ] },
  { id: "warlock", name: "흑마법사", ico: "💀", skills: [
    { name: "공허 구체", cd: 3, shape: "at", fx: voidOrb, dist: 44, dur: 2, r: 22, el: "shadow", delay: 0.5 },
    { name: "그림자 촉수", cd: 6, shape: "at", fx: tendrils, dist: 46, r: 30, el: "shadow", delay: 0.6 },
    { name: "저주", cd: 8, shape: "near", fx: curse, len: 120, el: "haunt", delay: 1 },
    { name: "블랙홀", cd: 18, shape: "at", fx: blackHole, dist: 60, dur: 4, r: 140, el: "pull", delay: 1.5, shake: 0.4 },
  ] },
  { id: "bomber", name: "폭탄마", ico: "💣", skills: [
    { name: "수류탄", cd: 3, shape: "at", fx: grenade, dist: 60, r: 26, el: "boom", delay: 2.5, shake: 0.4 },
    { name: "드럼통 폭발", cd: 7, shape: "at", fx: barrel, dist: 40, r: 36, el: "boom", leave: "fire", delay: 1.4, shake: 0.6 },
    { name: "폭죽", cd: 6, shape: "self", fx: firework, r: 0, el: "party" },
    { name: "핵폭탄", cd: 25, shape: "all", fx: nuke, el: "nuke", delay: 1, shake: 1.5 },
  ] },
];
export const KEYS = ["q", "w", "e", "r"];
export const jobById = (id) => JOBS.find((j) => j.id === id) || JOBS[0];
export function skillOf(sk) {
  const [jid, key] = String(sk || "").split(".");
  const job = jobById(jid), i = Math.max(0, KEYS.indexOf(key));
  return { job, skill: job.skills[i], key: KEYS[i] };
}

/**
 * Where a skill lands, decided once by the caster (so everyone agrees): returns { x, y }.
 * clampP keeps it on the floor; items/itemBase are the current room for proj, chain and near.
 */
export function aimSkill(skill, ox, oy, dir, clampP, items, itemBase, isWall) {
  if (skill.shape === "proj") {
    // fly until the first piece of furniture in the way, or full range
    let end = skill.len;
    for (const it of items) {
      if (isWall(it)) continue;
      const b = itemBase(it), d = (b.x - ox) * dir;
      if (d > 6 && d < end && Math.abs(b.y - oy) < 14) end = d;
    }
    return clampP(ox + dir * end, oy);
  }
  if (skill.shape === "at") return clampP(ox + dir * (skill.dist ?? 40), oy);
  if (skill.shape === "all") return { x: 160, y: 150 };
  return { x: ox, y: oy };
}

/** The furniture a skill hits. */
export function skillTargets(p, skill, items, itemBase, isWall) {
  const dist = (it, x, y) => { const b = itemBase(it); const by = isWall(it) ? b.y + 30 : b.y; return Math.hypot(b.x - x, (by - y) * 1.6); };
  const ahead = (it, len) => { const b = itemBase(it), d = (b.x - p.ox) * p.dir, by = isWall(it) ? b.y + 30 : b.y; return d > -6 && d < len && Math.abs(by - p.oy) < 20; };
  switch (skill.shape) {
    case "proj": case "at": case "self": {
      const x = skill.shape === "self" ? p.ox : p.x, y = skill.shape === "self" ? p.oy : p.y, r = skill.r ?? 20;
      return items.filter((it) => dist(it, x, y) < r + 8);
    }
    case "beam": case "line": return items.filter((it) => ahead(it, skill.len));
    case "chain": return items.filter((it) => ahead(it, skill.len)).sort((a, b) => dist(a, p.ox, p.oy) - dist(b, p.ox, p.oy)).slice(0, 3);
    case "near": return items.filter((it) => !isWall(it) && ahead(it, skill.len)).sort((a, b) => dist(a, p.ox, p.oy) - dist(b, p.ox, p.oy)).slice(0, 1);
    case "all": return items.slice();
  }
  return [];
}
