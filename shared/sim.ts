import { BUTTON, DT, TUNABLE } from './constants';
import { FOODS, MAP, hasLOS, isWalkable } from './content';
import type { World, Player, LobbyPlayer, RoomOptions, InputFrame, Vec, FoodId, Cage, Order } from './protocol';

type PastPlayer = Pick<Player, 'id'|'x'|'y'|'angle'|'layer'|'state'|'invulnerableUntil'>;
type Internal = { grabs: { id: string; at: number; angle: number }[]; pairs: Record<string, string>; events: string[]; latency: Record<string, number>; history: {time: number; players: PastPlayer[]}[]; difficulty?: RoomOptions['difficulty'] };
type SimWorld = World & { _sim?: Internal };
const internal = (w: World) => (w as SimWorld)._sim ??= { grabs: [], pairs: {}, events: [], latency: {}, history: [] };
/** Only a server-measured one-way delay may reach this entry point. Never accept a client value. */
export function setPlayerLatency(w: World, id: string, seconds: number) { internal(w).latency[id] = Number.isFinite(seconds) ? Math.max(0, Math.min(.15, seconds)) : 0; }
export function botReactionTime(w: World) { return internal(w).difficulty === 'easy' ? .6 : internal(w).difficulty === 'hard' ? .2 : .35; }
function history(w: World) {
  const state = internal(w);
  state.history.push({ time: w.time, players: w.players.map(p => ({id:p.id,x:p.x,y:p.y,angle:p.angle,layer:p.layer,state:p.state,invulnerableUntil:p.invulnerableUntil})) });
  state.history = state.history.filter(h => w.time - h.time <= .25);
}
function rewind(w: World, attacker: Player, target: Player): { past: PastPlayer; time: number } {
  const state = internal(w), time = w.time - (state.latency[attacker.id] ?? 0);
  if (time >= w.time) return {past: target, time};
  let sample = state.history[0];
  for (const h of state.history) if (h.time <= time) sample = h;
  return { past: sample?.players.find(p => p.id === target.id) ?? target, time };
}
const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const near = (a: Vec, b: Vec, r = 1.55) => distance(a, b) <= r;
const heavy = (food?: FoodId) => food === 'wheel' || food === 'crate';
const activeBuff = (p: Player, b: string, t: number) => p.buff === b && p.buffUntil > t;
const pass = () => MAP.objects.find(o => o.kind === 'pass') ?? { x: 23, y: 20 };
const free = (p: Player) => p.state === 'free';
const cooldown = (p: Player, k: string, t: number) => (p.cooldowns[k] ?? 0) <= t;
const lastCall = (w: World) => w.time >= w.duration * .75;
const flicker = (w: World) => w.time >= 180 && w.time < 200;
const inspector = (w: World) => w.time >= 240 && w.time < 300;
function random(w: World) { w.seed = (Math.imul(w.seed, 1664525) + 1013904223) >>> 0; return w.seed / 4294967296; }
function emit(w: World, kind: string, text: string, p: Vec, team?: 'mouse' | 'chef', playerId?: string) {
  const actor = 'team' in p && 'id' in p ? String(p.id) : undefined;
  w.events.push({ id: w.nextId++, kind, text, x: p.x, y: p.y, time: w.time, team, playerId: playerId ?? actor });
}
function rating(w: World, amount: number) { w.rating = clamp(w.rating + amount * (amount < 0 && inspector(w) ? 1.5 : 1)); }
function gain(w: World, n: number) { w.heist = clamp(w.heist + n * clamp(5 / Math.max(1, w.players.filter(p => p.team === 'mouse').length), .8, 2) * TUNABLE.heistScale / 5 * (lastCall(w) ? 1.25 : 1)); }
function usablePoint(p: Vec, team: Player['team'], layer: Player['layer'] = 'floor'): Vec {
  if (isWalkable(p.x, p.y, team, layer, team === 'mouse' ? .28 : .5)) return { x: p.x, y: p.y };
  for (let r = .5; r < 8; r += .5) for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
    const q = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
    if (isWalkable(q.x, q.y, team, layer, team === 'mouse' ? .28 : .5)) return q;
  }
  return { ...MAP.spawns[team] };
}

export function createWorld(players: LobbyPlayer[], options: RoomOptions, seed = 1): World {
  const roster = players.filter(p => !p.spectator).map(p => ({ ...p }));
  if (options.bots) for (const [team, count] of [['mouse', 3], ['chef', 2]] as const) {
    while (roster.filter(p => p.team === team).length < count && roster.length < 8) {
      const i = roster.filter(p => p.team === team).length;
      roster.push({ id: `bot-${team}-${i}`, name: `${team === 'mouse' ? ['Pip', 'Biscuit', 'Clove'][i] : ['Bram', 'Odile'][i]} · Bot`, team, classId: team === 'mouse' ? (['scout', 'hauler', 'rescuer'] as const)[i] : (['head', 'sous'] as const)[i], ready: true, connected: true, bot: true });
    }
  }
  const w: World = { tick: 0, time: 0, duration: options.duration, seed: seed >>> 0, players: [], pickups: MAP.pickups.map(p => ({ ...p, available: true, respawnAt: 0 })), cages: MAP.cages.map(c => ({ ...c, keyUntil: 0 })), traps: [], guests: [], orders: [], events: [], heist: 0, rating: TUNABLE.initialRating, lockdown: 0, nextOrder: 2, nextId: 1, plugs: {}, objectCooldowns: {} };
  w.players = roster.map((p, i) => {
    const spawn = MAP.spawns[p.team];
    return { ...p, ...usablePoint({ x: spawn.x + (i % 3) * .8, y: spawn.y + Math.floor(i / 3) * .8 }, p.team, p.team === 'mouse' ? 'tunnel' : 'floor'), angle: -Math.PI / 2, layer: p.team === 'mouse' ? 'tunnel' as const : 'floor' as const, state: 'free' as const, stamina: 100, composure: 100, buffUntil: 0, buffUses: 0, cooldowns: {}, invulnerableUntil: 0, stateUntil: 0, lastDamage: -10, revealUntil: 0, squirm: 0, ackSeq: 0, lastButtons: 0, stats: { deliveries: 0, captures: 0, rescues: 0, dishes: 0, tampers: 0, scares: 0 }, vx: 0, vy: 0 };
  });
  const tables = MAP.objects.filter(o => o.kind === 'table');
  for (let i = 0; i < 16; i++) {
    const table = tables[Math.floor(i / 2)] ?? { x: 7 + Math.floor(i / 2) % 4 * 10, y: 6 + Math.floor(i / 8) * 8 };
    const pos = usablePoint({ x: table.x + (i % 2 ? 2 : -2), y: table.y }, 'chef');
    w.guests.push({ id: `guest-${i}`, ...pos, angle: i % 2 ? Math.PI : 0, state: 'seated', meter: 0, scares: 0, lastSeen: -20, stateUntil: 0, firstScared: false });
  }
  internal(w).difficulty = options.difficulty; return w;
}

/** Shared kinematic path: only local movement, stamina and facing are predicted. */
export function movePlayer(p: Player, input: InputFrame, dt: number, world?: World) {
  const t = world?.time ?? input.tick * DT;
  p.vx = 0; p.vy = 0;
  if (!free(p) || p.hidden || p.action || p.cooldowns.grabWindup > t) return;
  let mx = Number.isFinite(input.mx) ? clamp(input.mx, -1, 1) : 0, my = Number.isFinite(input.my) ? clamp(input.my, -1, 1) : 0;
  const len = Math.hypot(mx, my); if (len > 1) { mx /= len; my /= len; }
  if (Number.isFinite(input.ax) && Number.isFinite(input.ay) && Math.hypot(input.ax - p.x, input.ay - p.y) > .1) p.angle = Math.atan2(input.ay - p.y, input.ax - p.x);
  else if (len > .05) p.angle = Math.atan2(my, mx);
  const mouse = p.team === 'mouse', sneak = mouse && !!(input.buttons & BUTTON.SNEAK);
  if (p.stamina < 10) p.cooldowns.exhausted = 1;
  if (p.stamina >= 30) p.cooldowns.exhausted = 0;
  const freeSprint = activeBuff(p, 'dash', t) || p.cooldowns.sugar > t;
  const sprint = !sneak && len > .05 && !!(input.buttons & BUTTON.SPRINT) && (freeSprint || (!p.cooldowns.exhausted && p.stamina > 0));
  let speed = mouse ? sneak ? 2.2 : sprint ? TUNABLE.mouseSprint : TUNABLE.mouseSpeed : sprint ? TUNABLE.chefSprint : TUNABLE.chefSpeed;
  if (p.classId === 'scout') speed *= 1.1;
  if (p.classId === 'pastry') speed *= 1.12;
  if (activeBuff(p, 'dash', t)) speed *= 1.45;
  if (p.carry) speed *= heavy(p.carry) ? p.classId === 'hauler' ? .8 : .6 : .95;
  if (p.holding) speed *= .75;
  if (p.cooldowns.scalded > t) speed *= .65;
  if (p.cooldowns.stink > t) speed *= .75;
  if (p.cooldowns.dodgeUntil > t) { speed = 6; mx = Math.cos(p.cooldowns.dodgeAngle); my = Math.sin(p.cooldowns.dodgeAngle); }
  if (sprint && !freeSprint) { p.stamina = clamp(p.stamina - (mouse ? 22 : 30) * dt); p.cooldowns.regenAt = t + (mouse ? 1 : 0); }
  else if ((p.cooldowns.regenAt ?? 0) <= t) p.stamina = clamp(p.stamina + (mouse ? 14 : 12) * dt);
  const dx = mx * speed * dt, dy = my * speed * dt;
  const parts = Math.max(1, Math.ceil(Math.hypot(dx, dy) / .15));
  const radius = mouse ? .28 : .5;
  const ox = p.x, oy = p.y;
  for (let i = 0; i < parts; i++) {
    if (isWalkable(p.x + dx / parts, p.y, p.team, p.layer, radius)) p.x += dx / parts;
    if (isWalkable(p.x, p.y + dy / parts, p.team, p.layer, radius)) p.y += dy / parts;
  }
  p.vx = (p.x - ox) / dt; p.vy = (p.y - oy) / dt;
}

function inCone(a: Vec & { angle: number }, b: Vec, arc: number) {
  const diff = Math.atan2(Math.sin(Math.atan2(b.y - a.y, b.x - a.x) - a.angle), Math.cos(Math.atan2(b.y - a.y, b.x - a.x) - a.angle));
  return Math.abs(diff) <= arc * Math.PI / 360;
}
function camouflaged(p: Player, t: number) { return activeBuff(p, 'camouflage', t) && (Math.hypot(p.vx, p.vy) < .1 || !!(p.lastButtons & BUTTON.SNEAK)); }
export function visibleTo(w: World, viewer: Player, target: Player) {
  if (viewer.team === target.team) return true;
  if (target.revealUntil > w.time) return true;
  if (target.layer === 'tunnel' || target.hidden || camouflaged(target, w.time)) return false;
  if (viewer.layer === 'tunnel' || viewer.state === 'caged' || viewer.state === 'held') return false;
  const d = distance(viewer, target);
  const noise = Math.hypot(target.vx, target.vy) < .1 ? 0 : target.lastButtons & BUTTON.SNEAK ? 1.5 : target.lastButtons & BUTTON.SPRINT ? 8 : 4;
  return (d <= (flicker(w) ? 5 : 8) && inCone(viewer, target, viewer.team === 'chef' ? 110 : 360) && hasLOS(viewer, target)) || d <= noise * (flicker(w) ? .5 : 1);
}

function breakCamouflage(p: Player) { if (p.buff === 'camouflage') { p.buff = undefined; p.buffUntil = 0; } }
function release(w: World, m: Player, pos: Vec) {
  if (m.heldBy) { const chef = w.players.find(p => p.id === m.heldBy); if (chef) chef.holding = undefined; }
  if (m.cageId) { const cage = w.cages.find(c => c.id === m.cageId); if (cage) clearCage(cage); }
  Object.assign(m, usablePoint(pos, 'mouse'), { state: 'free', heldBy: undefined, cageId: undefined, layer: 'floor', stateUntil: 0, invulnerableUntil: w.time + 2, squirm: 0 });
  emit(w, 'rescue', `${m.name} is free!`, m);
}
function clearCage(c: Cage) { c.occupant = undefined; c.keyOwner = undefined; c.keyDropped = undefined; c.keyCarrier = undefined; c.keyUntil = 0; }
function dropFood(w: World, p: Player) {
  if (!p.carry) return;
  const pair = internal(w).pairs[p.id];
  if (pair) { const other = w.players.find(m => m.id === pair); if (other) other.carry = undefined; delete internal(w).pairs[pair]; delete internal(w).pairs[p.id]; }
  w.pickups.push({ id: `drop-${w.nextId++}`, x: p.x, y: p.y, food: p.carry, available: true, respawnAt: Infinity });
  p.carry = undefined;
}
export function damageChef(w: World, p: Player, amount: number) {
  if (p.team !== 'chef' || p.invulnerableUntil > w.time || p.state === 'flustered' || amount <= 0) return;
  p.composure = clamp(p.composure - amount); p.lastDamage = w.time; p.action = undefined;
  emit(w, 'hit', `−${amount} Composure`, p);
  if (p.composure > 0) return;
  p.state = 'flustered'; p.stateUntil = w.time + 5;
  if (p.holding) { const m = w.players.find(m => m.id === p.holding); if (m) release(w, m, p); }
  for (const cage of w.cages) if (cage.occupant && cage.keyOwner === p.id && !cage.keyCarrier && !cage.keyDropped) {
    cage.keyDropped = { x: p.x, y: p.y }; cage.keyUntil = w.time + 12;
    emit(w, 'key', 'A cage key dropped!', p);
  }
  emit(w, 'flustered', `${p.name} is flustered!`, p);
}
function capture(w: World, chef: Player, mouse: Player) {
  if (chef.holding || !free(chef) || mouse.heldBy || mouse.state === 'caged' || mouse.invulnerableUntil > w.time) return;
  dropFood(w, mouse); mouse.hidden = undefined; mouse.action = undefined; mouse.state = 'held'; mouse.heldBy = chef.id; mouse.layer = 'floor'; mouse.squirm = 0;
  chef.holding = mouse.id; chef.stats.captures++; rating(w, 1); emit(w, 'capture', `${chef.name} caught ${mouse.name}`, chef);
}

type Context = { label: string; kind: string; target: string; duration: number };
export function contextAction(w: World, p: Player): Context | undefined {
  const act = (label: string, kind: string, target: string, duration: number) => ({ label, kind, target, duration });
  if (p.state === 'held') return act(`Squirm ${p.squirm}/25`, 'squirm', p.id, 0);
  if (!free(p)) return;
  if (p.team === 'mouse') {
    if (p.hidden) return act('Leave hiding spot', 'unhide', p.hidden, 0);
    if (p.carry && p.layer === 'tunnel' && near(p, MAP.stash, 2.4)) return act('Deliver to Stash', 'deliver', 'stash', .4);
    if (p.layer !== 'tunnel') {
      const cage = w.cages.find(c => c.occupant && c.keyCarrier === p.id && near(p, c));
      if (cage) return act('Unlock cage', 'unlock', cage.id, p.classId === 'rescuer' ? .5 : 1);
      const key = w.cages.find(c => c.keyDropped && near(p, c.keyDropped, 1.4));
      if (key) return act('Pick up key', 'key', key.id, .4);
      const ally = w.players.find(a => a.team === 'mouse' && a.state === 'stunned' && a.id !== p.id && near(p, a));
      if (ally) return act('Free teammate', 'free', ally.id, p.classId === 'rescuer' ? .5 : 1);
    }
    const hole = MAP.holes.find(h => near(p, h, 1.5));
    if (hole) return act(w.plugs[hole.id] > w.time ? 'Chew plug' : p.layer === 'tunnel' ? 'Leave tunnel' : 'Enter tunnel', w.plugs[hole.id] > w.time ? 'chew' : 'hole', hole.id, w.plugs[hole.id] > w.time ? 4 : .15);
    if (p.layer === 'tunnel') return;
    const ready = w.orders.find(o => o.stage === 'ready' && !o.tamper);
    if (p.carry && FOODS[p.carry].tamper && ready && near(p, pass(), 3)) return act('Tamper with dish', 'tamper', ready.id, p.classId === 'saboteur' ? 1.25 : 2.5);
    const object = MAP.objects.find(o => ['soup', 'pan', 'flour'].includes(o.kind) && near(p, o, 2) && (w.objectCooldowns[o.id] ?? 0) <= w.time);
    if (object) return act(object.kind === 'soup' ? 'Tip soup pot' : object.kind === 'pan' ? 'Drop pan' : 'Drop flour sack', object.kind, object.id, object.kind === 'soup' ? 1.5 : .5);
    if (!p.carry) {
      const pickup = w.pickups.find(f => f.available && near(p, f, 1.35));
      if (pickup) {
        if (heavy(pickup.food) && p.classId !== 'hauler' && !w.players.some(m => m.id !== p.id && m.team === 'mouse' && free(m) && !m.carry && m.layer === p.layer && near(m, pickup, 2))) return act('Needs two mice', 'blocked', pickup.id, 0);
        return act(`Steal ${FOODS[pickup.food].name}`, 'pickup', pickup.id, heavy(pickup.food) ? 1.2 : .4);
      }
    }
    const hide = MAP.hides.find(h => near(p, h, 1.1) && w.players.filter(m => m.hidden === h.id).length < h.capacity);
    if (hide) return act('Hide here', 'hide', hide.id, .15);
    if (p.carry) return act('Drop food', 'drop', p.id, .15);
  } else {
    if (p.holding) { const cage = w.cages.find(c => !c.occupant && near(p, c, 2)); if (cage) return act('Lock cage', 'cage', cage.id, 1); return; }
    const ready = w.orders.find(o => o.stage === 'ready');
    if (ready && near(p, pass(), 3)) return act('Garnish & send', 'send', ready.id, p.classId === 'pastry' ? 1.2 : 2);
    const spot = MAP.hides.find(h => near(p, h, 1.5));
    if (spot) return act('Search hiding spot', 'search', spot.id, 1.2);
    const hole = MAP.holes.find(h => near(p, h, 1.5) && !(w.plugs[h.id] > w.time));
    if (hole && Object.values(w.plugs).filter(t => t > w.time).length < 3) return act('Plug hole', 'plug', hole.id, 3);
    const station = MAP.objects.find(o => ['prep', 'stove'].includes(o.kind) && near(p, o, 2));
    if (station && w.orders.some(o => o.stage === (station.kind === 'prep' ? 'prep' : 'cook'))) return act('Lend a hand', 'help', station.id, .5);
  }
}

function complete(w: World, p: Player, a: Context) {
  breakCamouflage(p);
  const cage = w.cages.find(c => c.id === a.target);
  const order = w.orders.find(o => o.id === a.target);
  switch (a.kind) {
    case 'pickup': {
      const f = w.pickups.find(f => f.id === a.target);
      if (!f?.available || p.carry) break;
      if (heavy(f.food) && p.classId !== 'hauler') {
        const partner = w.players.find(m => m.id !== p.id && m.team === 'mouse' && free(m) && !m.carry && m.layer === p.layer && near(m, f, 2));
        if (!partner) break;
        partner.carry = f.food; internal(w).pairs[p.id] = partner.id; internal(w).pairs[partner.id] = p.id;
      }
      p.carry = f.food; f.available = false; f.respawnAt = heavy(f.food) ? Infinity : w.time + TUNABLE.pickupRespawn; emit(w, 'pickup', `Stole ${FOODS[f.food].name}`, p, 'mouse'); break;
    }
    case 'deliver': if (p.carry) {
      gain(w, FOODS[p.carry].provision); p.stats.deliveries++; emit(w, 'deliver', `${FOODS[p.carry].name} delivered!`, p, 'mouse');
      if (heavy(p.carry)) { const source = w.pickups.find(f => f.food === p.carry && !f.available && f.respawnAt === Infinity && !f.id.startsWith('drop-')); if (source) source.respawnAt = w.time + 90; }
      const pair = internal(w).pairs[p.id]; if (pair) { const other = w.players.find(m => m.id === pair); if (other) other.carry = undefined; delete internal(w).pairs[pair]; delete internal(w).pairs[p.id]; }
      p.carry = undefined;
    } break;
    case 'eat': if (p.carry && !heavy(p.carry)) {
      const food = FOODS[p.carry]; p.buff = food.buff; p.buffUntil = w.time + (food.duration ?? 30); p.buffUses = food.uses ?? 0; p.carry = undefined; emit(w, 'eat', `${food.name} power!`, p, 'mouse');
    } break;
    case 'drop': dropFood(w, p); break;
    case 'hole': {
      if (w.plugs[a.target] > w.time) break;
      if (p.layer === 'tunnel') { Object.assign(p, usablePoint(p, 'mouse')); p.layer = 'floor'; } else { p.layer = 'tunnel'; p.hidden = undefined; }
      const partner = w.players.find(m => m.id === internal(w).pairs[p.id]); if (partner && near(p, partner, 3)) { partner.layer = p.layer; partner.x = p.x; partner.y = p.y; partner.cooldowns.use = w.time + .4; partner.cooldowns.useLatch = 1; }
      p.cooldowns.use = w.time + .4; p.cooldowns.useLatch = 1; emit(w, 'hole', p.layer === 'tunnel' ? 'Into the tunnels' : 'Back in the bistro', p, 'mouse'); break;
    }
    case 'chew': delete w.plugs[a.target]; emit(w, 'noise', 'Chewing at a hole', p, 'chef'); break;
    case 'hide': p.hidden = a.target; p.cooldowns.use = w.time + .4; p.cooldowns.useLatch = 1; break;
    case 'unhide': p.hidden = undefined; p.cooldowns.use = w.time + .4; p.cooldowns.useLatch = 1; break;
    case 'key': if (cage?.keyDropped) { cage.keyCarrier = p.id; cage.keyDropped = undefined; cage.keyUntil = w.time + 12; emit(w, 'key', `${p.name} has the key!`, p); } break;
    case 'unlock': case 'lockpick': if (cage?.occupant && (a.kind === 'lockpick' || cage.keyCarrier === p.id)) { const m = w.players.find(m => m.id === cage.occupant); if (m) { release(w, m, cage); p.stats.rescues++; } if (a.kind === 'lockpick') p.cooldowns.ability = w.time + 45; } break;
    case 'free': { const m = w.players.find(m => m.id === a.target); if (m?.state === 'stunned') { release(w, m, m); p.stats.rescues++; } break; }
    case 'cage': if (cage && !cage.occupant && p.holding) {
      const m = w.players.find(m => m.id === p.holding); if (!m) break;
      m.state = 'caged'; m.heldBy = undefined; m.cageId = cage.id; m.stateUntil = w.time + TUNABLE.cageSeconds; Object.assign(m, usablePoint(cage, 'mouse')); cage.occupant = m.id; cage.keyOwner = p.id; p.holding = undefined;
      emit(w, 'cage', `${m.name} is caged for 40 seconds`, cage); break;
    } break;
    case 'tamper': if (order?.stage === 'ready' && !order.tamper && p.carry && FOODS[p.carry].tamper) { order.tamper = p.carry; p.carry = undefined; p.stats.tampers++; emit(w, 'tamper', 'Dish tampered!', p, 'mouse'); } break;
    case 'send': if (order?.stage === 'ready') { rating(w, order.vip ? 10 : w.time - order.readyAt <= 10 ? 4 : 2); order.stage = 'delivery'; order.elapsed = 0; p.stats.dishes++; emit(w, 'send', 'Service! Dish on its way', p); } break;
    case 'inspect': if (order?.stage === 'ready') { if (order.tamper) { order.tamper = undefined; order.stage = 'cook'; order.elapsed = 0; order.age = 0; order.cold = false; emit(w, 'inspect', 'Tampered dish remade', p, 'chef'); } else emit(w, 'inspect', 'Dish is safe', p, 'chef'); } break;
    case 'plug': w.plugs[a.target] = w.time + 25; emit(w, 'plug', 'Hole plugged for 25 seconds', p); break;
    case 'search': {
      const hidden = w.players.filter(m => m.hidden === a.target); for (const m of hidden) { m.hidden = undefined; m.revealUntil = w.time + 3; if (!p.holding) capture(w, p, m); else { m.state = 'stunned'; m.stateUntil = w.time + 2; } }
      emit(w, 'search', hidden.length ? 'Found a mouse!' : 'Nobody here', p, 'chef'); break;
    }
    case 'help': { const obj = MAP.objects.find(o => o.id === a.target); const stage = obj?.kind === 'prep' ? 'prep' : 'cook'; const o = w.orders.find(o => o.stage === stage); if (o) o.elapsed += .5; break; }
    case 'soup': case 'pan': case 'flour': {
      const obj = MAP.objects.find(o => o.id === a.target); if (!obj || (w.objectCooldowns[obj.id] ?? 0) > w.time) break;
      let amount = a.kind === 'soup' ? 35 : a.kind === 'pan' ? 25 : 10;
      const double = a.kind === 'soup' && p.cooldowns.doubleTip > w.time;
      if (double) { amount += 10; p.cooldowns.doubleTip = 0; }
      w.objectCooldowns[obj.id] = w.time + (double ? 0 : a.kind === 'soup' ? 30 : a.kind === 'pan' ? 25 : 35);
      for (const c of w.players.filter(c => c.team === 'chef' && near(c, obj, 3))) {
        damageChef(w, c, amount);
        if (a.kind === 'soup') c.cooldowns.scalded = w.time + 3;
        if (a.kind === 'flour') c.cooldowns.blind = w.time + 3;
        if (a.kind === 'pan' && c.state !== 'flustered') { c.state = 'stunned'; c.stateUntil = w.time + 1.5; }
      }
      emit(w, a.kind, a.label, obj); break;
    }
    case 'trap': {
      const mouse = p.team === 'mouse';
      const limit = mouse ? 3 : p.classId === 'sous' ? 4 : 3;
      if (w.traps.filter(t => mouse ? t.team === 'mouse' : t.owner === p.id).length >= limit) break;
      if (mouse && p.carry !== 'vegetable') break;
      w.traps.push({ id: `trap-${w.nextId++}`, x: p.x, y: p.y, team: p.team, owner: p.id, armedAt: w.time + 1.5, expires: w.time + 90 });
      if (mouse) p.carry = undefined; else p.cooldowns.trap = w.time + 10 * (lastCall(w) ? .8 : 1);
      emit(w, 'trap', mouse ? 'Vegetable trap set' : 'Snap trap set', p, p.team); break;
    }
  }
}

function beginAction(p: Player, a: Context) {
  if (!p.action || p.action.kind !== a.kind || p.action.target !== a.target) p.action = { kind: a.kind, target: a.target, duration: a.duration, progress: 0 };
}
function useAction(w: World, p: Player, input: InputFrame, dt: number) {
  if (!free(p)) { p.action = undefined; return; }
  let a: Context | undefined;
  if (input.buttons & BUTTON.EAT && p.team === 'mouse' && p.carry && !heavy(p.carry) && p.carry !== 'vegetable' && !p.hidden) a = { label: 'Eat', kind: 'eat', target: p.carry, duration: .8 };
  else if (input.buttons & BUTTON.TRAP && p.layer === 'floor' && !p.holding && cooldown(p, 'trap', w.time) && (p.team === 'chef' || p.carry === 'vegetable')) a = { label: 'Place trap', kind: 'trap', target: p.id, duration: 1 };
  else if (input.buttons & BUTTON.INSPECT && p.team === 'chef' && near(p, pass(), 3)) {
    const o = w.orders.find(o => o.stage === 'ready'); if (o) a = { label: 'Inspect dish', kind: 'inspect', target: o.id, duration: 1 };
  } else if (input.buttons & BUTTON.ABILITY && p.classId === 'rescuer' && cooldown(p, 'ability', w.time)) {
    const c = w.cages.find(c => c.occupant && near(p, c, 2)); if (c) a = { label: 'Lockpick cage', kind: 'lockpick', target: c.id, duration: 3.5 };
  } else if (input.buttons & BUTTON.USE && cooldown(p, 'use', w.time) && !p.cooldowns.useLatch) a = contextAction(w, p);
  if (!a || a.kind === 'blocked' || Math.hypot(input.mx, input.my) > .25) { p.action = undefined; return; }
  beginAction(p, a); p.action!.progress += dt;
  if (a.kind === 'tamper' || a.kind === 'chew' || a.kind === 'lockpick') p.revealUntil = w.time + .3;
  if (p.action!.progress + 1e-8 >= a.duration) { p.action = undefined; complete(w, p, a); }
}

function attacks(w: World, p: Player, input: InputFrame, pressed: number) {
  if (!free(p) || p.hidden || p.action || p.layer === 'tunnel') return;
  const t = w.time, aim = { x: input.ax, y: input.ay };
  const cdScale = p.team === 'chef' && lastCall(w) ? .8 : 1;
  if (pressed & BUTTON.DODGE && p.team === 'mouse' && cooldown(p, 'dodge', t)) {
    p.cooldowns.dodge = t + 5; p.cooldowns.dodgeUntil = t + .25; p.cooldowns.dodgeAngle = Math.hypot(input.mx, input.my) > .1 ? Math.atan2(input.my, input.mx) : p.angle; p.invulnerableUntil = t + .2; emit(w, 'dodge', 'Dodge!', p, 'mouse');
  }
  if (pressed & BUTTON.ATTACK && cooldown(p, 'attack', t)) {
    breakCamouflage(p);
    if (p.team === 'chef' && !p.holding) { p.cooldowns.attack = t + 1.2; p.cooldowns.grabWindup = t + .3; internal(w).grabs.push({ id: p.id, at: t + .3, angle: p.angle }); }
    else if (p.team === 'mouse') {
      const tomato = activeBuff(p, 'splat', t) || activeBuff(p, 'splat-shots', t);
      const fire = activeBuff(p, 'fire', t) || activeBuff(p, 'fire-breath', t);
      if ((tomato || fire) && p.buffUses > 0) {
        const origin = rewind(w, p, p).past;
        const targets = w.players.filter(c => { const old = rewind(w, p, c); return c.team === 'chef' && c.layer === 'floor' && old.past.invulnerableUntil <= old.time && near(origin, old.past, fire ? 2.2 : 6) && hasLOS(origin, old.past) && inCone({ ...origin, angle: p.angle }, old.past, fire ? 75 : 25); });
        for (const c of fire ? targets : targets.sort((a, b) => distance(p, a) - distance(p, b)).slice(0, 1)) { damageChef(w, c, fire ? 18 : 10); if (tomato) c.cooldowns.blind = t + 2.5; }
        p.buffUses--; p.cooldowns.attack = t + (fire ? 1.5 : .5); emit(w, fire ? 'fire' : 'splat', fire ? 'Fire breath!' : 'Tomato splat!', p);
      } else if (p.carry && !heavy(p.carry)) { dropFood(w, p); p.cooldowns.attack = t + .6; emit(w, 'noise', 'A distraction clatters', aim, 'chef'); }
    }
  }
  if (pressed & BUTTON.COLANDER && p.team === 'chef' && !p.holding && cooldown(p, 'colander', t)) {
    p.cooldowns.colander = t + (p.classId === 'sous' ? 10.5 : 14) * cdScale;
    const d = distance(p, aim), target = { x: p.x + (aim.x - p.x) * Math.min(1, 6 / Math.max(.01, d)), y: p.y + (aim.y - p.y) * Math.min(1, 6 / Math.max(.01, d)) };
    // Landing is delayed by flight time and resolved by the authoritative simulation.
    p.cooldowns.colanderAt = t + distance(p, target) / 9; p.cooldowns.colanderX = target.x; p.cooldowns.colanderY = target.y; emit(w, 'colander', 'Colander toss!', target);
  }
  if (pressed & BUTTON.ABILITY && cooldown(p, 'ability', t)) {
    breakCamouflage(p);
    const chefs = w.players.filter(c => c.team === 'chef' && near(p, c, 2.4));
    switch (p.classId) {
      case 'scout': p.cooldowns.ability = t + 20; { const d = distance(p, aim); const q = { x: p.x + (aim.x - p.x) * Math.min(1, 8 / Math.max(.01, d)), y: p.y + (aim.y - p.y) * Math.min(1, 8 / Math.max(.01, d)) }; emit(w, 'noise', 'A squeak behind you!', q, 'chef'); for (const g of w.guests) if (near(q, g, 10)) g.angle = Math.atan2(q.y - g.y, q.x - g.x); } break;
      case 'hauler': p.cooldowns.ability = t + 25; for (const c of chefs) { const d = Math.max(.1, distance(p, c)); const q = { x: c.x + (c.x - p.x) / d * 2, y: c.y + (c.y - p.y) / d * 2 }; if (isWalkable(q.x, q.y, 'chef', 'floor', .5) && hasLOS(c, q)) Object.assign(c, q); } emit(w, 'barge', 'Shoulder barge!', p); break;
      case 'saboteur': p.cooldowns.ability = t + 40; p.cooldowns.doubleTip = t + 20; emit(w, 'ability', 'Double Tip ready', p, 'mouse'); break;
      case 'head': p.cooldowns.ability = t + 18 * cdScale; for (const m of w.players) if (m.team === 'mouse' && free(m) && m.layer === 'floor' && near(p, m, 1.8) && hasLOS(p, m) && m.invulnerableUntil <= t) { m.state = 'stunned'; m.stateUntil = t + 1.2; m.action = undefined; } emit(w, 'slam', 'Rolling pin slam!', p); break;
      case 'sous': p.cooldowns.ability = t + 30 * cdScale; for (const m of w.players) if (m.team === 'mouse' && near(p, m, 12)) m.revealUntil = t + 3; emit(w, 'radar', 'Rat Radar', p, 'chef'); break;
      case 'pastry': p.cooldowns.ability = t + 20 * cdScale; p.cooldowns.sugar = t + 3; emit(w, 'ability', 'Sugar Rush!', p, 'chef'); break;
    }
  }
}

function advanceCombat(w: World) {
  const state = internal(w);
  for (const grab of state.grabs.filter(g => g.at <= w.time)) {
    const chef = w.players.find(p => p.id === grab.id); if (!chef || !free(chef) || chef.holding) continue;
    const origin = rewind(w, chef, chef).past;
    const mouse = w.players.filter(p => {
      const old = rewind(w, chef, p);
      return p.team === 'mouse' && (free(p) || p.state === 'stunned') && p.layer === 'floor' && old.past.layer === 'floor' && !p.hidden && p.invulnerableUntil <= w.time && old.past.invulnerableUntil <= old.time && near(origin, old.past, TUNABLE.grabRange * (chef.classId === 'head' ? 1.15 : 1)) && hasLOS(origin, old.past) && (p.state === 'stunned' || inCone({ ...origin, angle: grab.angle }, old.past, 100));
    }).sort((a, b) => distance(chef, a) - distance(chef, b))[0];
    if (mouse) capture(w, chef, mouse); else emit(w, 'miss', 'Missed!', chef, 'chef');
  }
  state.grabs = state.grabs.filter(g => g.at > w.time);
  for (const c of w.players.filter(p => p.team === 'chef')) if (c.cooldowns.colanderAt && c.cooldowns.colanderAt <= w.time) {
    const q = { x: c.cooldowns.colanderX, y: c.cooldowns.colanderY };
    for (const m of w.players) {
      const old = rewind(w, c, m);
      if (m.team === 'mouse' && free(m) && m.layer !== 'tunnel' && old.past.layer !== 'tunnel' && !m.hidden && near(old.past, q, .85) && old.past.invulnerableUntil <= old.time && m.invulnerableUntil <= w.time && hasLOS(rewind(w, c, c).past, old.past)) { m.state = 'stunned'; m.stateUntil = w.time + 3; m.action = undefined; emit(w, 'trapped', 'Caught under a colander!', m); }
    }
    c.cooldowns.colanderAt = 0;
  }
  for (const trap of w.traps) if (trap.armedAt <= w.time && trap.expires > w.time) {
    const victim = w.players.find(p => p.team !== trap.team && free(p) && p.layer === 'floor' && p.invulnerableUntil <= w.time && near(p, trap, .65));
    if (!victim) continue;
    trap.expires = w.time;
    if (victim.team === 'chef') {
      if (victim.lastButtons & BUTTON.SPRINT) { emit(w, 'kick', 'Vegetable trap cleared', trap); continue; }
      damageChef(w, victim, 15); if (victim.holding) { const m = w.players.find(m => m.id === victim.holding); if (m) release(w, m, victim); }
    }
    if (victim.state !== 'flustered') { victim.state = 'stunned'; victim.stateUntil = w.time + (victim.team === 'mouse' ? 3.5 : 2); victim.action = undefined; }
    emit(w, 'trapped', 'Trap sprung!', victim);
  }
  w.traps = w.traps.filter(t => t.expires > w.time);
}

function advanceGuests(w: World, dt: number) {
  for (const g of w.guests) {
    if (g.state === 'fleeing') { const q = { x: g.x + dt * 3, y: g.y }; if (isWalkable(q.x, q.y, 'chef', 'floor', .5)) g.x = q.x; if (w.time >= g.stateUntil) { g.state = 'seated'; g.scares = 0; g.firstScared = false; g.meter = 0; } continue; }
    if (['startled', 'panicked', 'reaction'].includes(g.state) && w.time >= g.stateUntil) { g.state = 'seated'; g.reaction = undefined; }
    const seen = w.players.find(p => p.team === 'mouse' && (free(p) || p.state === 'stunned') && p.layer !== 'tunnel' && !p.hidden && !camouflaged(p, w.time) && near(g, p, flicker(w) ? 5 : 8) && inCone(g, p, 130) && hasLOS(g, p));
    if (seen) { g.lastSeen = w.time; g.meter = clamp(g.meter + (seen.lastButtons & BUTTON.SNEAK ? 20 : 50) * dt); }
    else if (w.time - g.lastSeen > 3) g.meter = clamp(g.meter - 10 * dt);
    if (g.meter < 100 || !seen || g.state === 'startled' || g.state === 'panicked') continue;
    g.meter = 0; g.scares++; seen.stats.scares++; g.angle = Math.atan2(seen.y - g.y, seen.x - g.x);
    if (!g.firstScared) { g.firstScared = true; rating(w, -1); }
    if (g.scares >= 3) {
      g.state = 'fleeing'; g.stateUntil = w.time + 30; gain(w, 2); rating(w, -4); w.orders = w.orders.filter(o => o.tableId !== g.id); emit(w, 'flee', 'A guest fled the bistro!', g);
    } else if (g.scares === 2) {
      g.state = 'panicked'; g.stateUntil = w.time + 12; for (const other of w.guests) if (other.id !== g.id && near(g, other, 4)) other.meter = clamp(other.meter + 40); emit(w, 'panic', 'Mouse! Over here!', seen, 'chef');
    } else { g.state = 'startled'; g.stateUntil = w.time + 1; emit(w, 'alert', 'A guest spotted a mouse!', seen, 'chef'); }
  }
}
function newOrder(w: World, vip = false) {
  const guests = w.guests.filter(g => g.state !== 'fleeing' && !w.orders.some(o => o.tableId === g.id && o.stage !== 'paid'));
  if (!guests.length) return;
  const g = guests[Math.floor(random(w) * guests.length)];
  w.orders.push({ id: `order-${w.nextId++}`, tableId: g.id, stage: 'prep', elapsed: 0, age: 0, readyAt: 0, cold: false, vip });
  emit(w, 'order', vip ? 'VIP table: 60 second service!' : 'New order in the kitchen', pass(), 'chef');
}
function advanceOrders(w: World, dt: number) {
  if (w.time >= w.nextOrder) { newOrder(w); w.nextOrder = w.time + (w.time < w.duration / 4 ? 25 : lastCall(w) ? 18 : 14); }
  for (const o of w.orders) {
    o.age += dt; o.elapsed += dt;
    if (o.age >= (o.vip ? 60 : 90) && ['prep', 'cook', 'ready'].includes(o.stage)) { rating(w, o.vip ? -12 : -5); o.stage = 'paid'; o.elapsed = 20; emit(w, 'timeout', 'An order timed out', pass()); continue; }
    if (o.stage === 'prep' && o.elapsed >= 12) { o.stage = 'cook'; o.elapsed = 0; }
    else if (o.stage === 'cook' && o.elapsed >= 15) { o.stage = 'ready'; o.elapsed = 0; o.readyAt = w.time; emit(w, 'ready', 'Dish ready at the Pass!', pass(), 'chef'); }
    else if (o.stage === 'ready' && !o.cold && o.elapsed >= 20) { o.cold = true; rating(w, -3); emit(w, 'cold', 'A dish went cold', pass()); }
    else if (o.stage === 'delivery' && o.elapsed >= 9) {
      o.stage = 'eating'; o.elapsed = 0;
      if (o.tamper) {
        const food = FOODS[o.tamper]; rating(w, o.vip ? -12 : -(food.penalty ?? 3)); gain(w, 6);
        const g = w.guests.find(g => g.id === o.tableId); if (g) { g.state = 'reaction'; g.reaction = food.tamper; g.stateUntil = w.time + (o.tamper === 'mushroom' ? 20 : o.tamper === 'honey' ? 10 : 6); emit(w, 'reaction', food.tamper ?? 'Spoiled dish!', g); }
      }
    } else if (o.stage === 'eating' && o.elapsed >= (o.tamper === 'mushroom' ? 24 : 12)) { o.stage = 'paid'; o.elapsed = 0; }
  }
  w.orders = w.orders.filter(o => o.stage !== 'paid' || o.elapsed < 5);
}
function advanceEvents(w: World) {
  const fired = internal(w).events;
  for (const [id, time, text] of [['lights', 180, 'Lights Flicker · 20 seconds'], ['inspector', 240, 'Health Inspector · rating losses ×1.5'], ['vip', 330, 'VIP Table has arrived']] as const) if (w.time >= time && !fired.includes(id)) {
    fired.push(id); if (id === 'vip') newOrder(w, true); emit(w, id, text, { x: 35, y: 10 });
  }
  if (inspector(w) && !fired.includes('inspector-scare')) {
    const m = w.players.find(p => p.team === 'mouse' && p.layer === 'floor' && !p.hidden && !camouflaged(p, w.time) && p.y < 20 && near(p, { x: 35, y: 10 }, 8));
    if (m) { fired.push('inspector-scare'); rating(w, -8); emit(w, 'alert', 'The inspector saw a mouse!', m, 'chef'); }
  }
}
export function stepWorld(w: World, inputs: Map<string, InputFrame>, dt = DT) {
  if (w.result) return;
  history(w);
  w.time += dt; w.tick++;
  for (const p of w.players) {
    const input = inputs.get(p.id) ?? { seq: p.ackSeq, tick: w.tick, mx: 0, my: 0, buttons: 0, ax: p.x + Math.cos(p.angle), ay: p.y + Math.sin(p.angle) };
    const pressed = input.buttons & ~p.lastButtons;
    if ((pressed & BUTTON.PING) && cooldown(p, 'ping', w.time)) {
      p.cooldowns.ping = w.time + 2;
      emit(w, 'ping', `${p.name}: ${p.state === 'held' || p.state === 'caged' ? 'Help here!' : 'Over here!'}`, p, p.team);
    }
    if (!(input.buttons & BUTTON.USE)) p.cooldowns.useLatch = 0;
    p.ackSeq = Math.max(p.ackSeq, input.seq);
    if (p.buffUntil <= w.time) { p.buff = undefined; p.buffUses = 0; }
    if ((p.state === 'stunned' || p.state === 'flustered') && p.stateUntil <= w.time) {
      if (p.state === 'flustered') { p.composure = 40; p.invulnerableUntil = w.time + 6; }
      p.state = 'free';
    }
    if (p.team === 'chef' && p.state !== 'flustered' && w.time - p.lastDamage >= 8) p.composure = clamp(p.composure + 3 * dt);
    if (p.state === 'caged' && p.stateUntil <= w.time) { const c = w.cages.find(c => c.id === p.cageId); release(w, p, c ?? p); }
    if (p.state === 'held' && pressed & BUTTON.USE) { p.squirm++; if (p.squirm >= 25) release(w, p, p); }
    if (p.state === 'stunned' && pressed & BUTTON.USE) p.stateUntil -= .08;
    useAction(w, p, input, dt); attacks(w, p, input, pressed); movePlayer(p, input, dt, w); p.lastButtons = input.buttons;
  }
  for (const p of w.players) {
    if (p.state === 'held') { const holder = w.players.find(c => c.id === p.heldBy); if (holder) { p.x = holder.x; p.y = holder.y; } else release(w, p, p); }
    if (activeBuff(p, 'stink', w.time) || activeBuff(p, 'stink-cloud', w.time)) for (const c of w.players) if (c.team === 'chef' && p.layer !== 'tunnel' && near(p, c, 2.5)) c.cooldowns.stink = w.time + .1;
    const partner = internal(w).pairs[p.id]; if (partner) { const other = w.players.find(m => m.id === partner); if (!other || !free(p) || !free(other) || p.layer !== other.layer || !p.connected || distance(p, other) > 3) dropFood(w, p); }
  }
  for (const c of w.cages) if (c.occupant && (c.keyDropped || c.keyCarrier)) {
    const carrier = w.players.find(p => p.id === c.keyCarrier);
    if (carrier && !free(carrier)) { c.keyDropped = { x: carrier.x, y: carrier.y }; c.keyCarrier = undefined; c.keyUntil = w.time + 12; }
    if (c.keyUntil <= w.time) { c.keyDropped = undefined; c.keyCarrier = undefined; }
  }
  advanceCombat(w); advanceGuests(w, dt); advanceOrders(w, dt); advanceEvents(w);
  for (const pickup of w.pickups) if (!pickup.available && pickup.respawnAt <= w.time) pickup.available = true;
  // Consumed floor drops have no respawn and can be safely discarded.
  w.pickups = w.pickups.filter(p => !p.id.startsWith('drop-') || p.available);
  w.events = w.events.filter(e => w.time - e.time < 5).slice(-80);
  for (const key of Object.keys(w.plugs)) if (w.plugs[key] <= w.time) delete w.plugs[key];
  const mice = w.players.filter(p => p.team === 'mouse');
  w.lockdown = mice.length && mice.every(p => p.state === 'held' || p.state === 'caged') ? w.lockdown + dt : 0;
  w.heist = clamp(w.heist); w.rating = clamp(w.rating);
  let winner: 'mouse' | 'chef' | undefined, reason = '';
  if (w.time >= w.duration) { winner = 'chef'; reason = 'Dinner service complete'; }
  else if (w.heist >= 100) { winner = 'mouse'; reason = 'The great pantry heist'; }
  else if (w.rating <= 0) { winner = 'mouse'; reason = 'Restaurant rating collapsed'; }
  else if (w.lockdown + 1e-8 >= TUNABLE.lockdownSeconds) { winner = 'chef'; reason = 'Lockdown: every mouse caught'; }
  if (winner) w.result = { winner, reason, stats: Object.fromEntries(w.players.map(p => [p.id, { ...p.stats }])) };
}
