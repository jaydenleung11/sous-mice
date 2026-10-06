import { MAP, FOODS, isWalkable, hasLOS } from '../shared/content';
import { BUTTON } from '../shared/constants';
import { contextAction, distance, visibleTo, botReactionTime } from '../shared/sim';
import type { InputFrame, Player, Vec, World } from '../shared/protocol';

type Memory = { target?: Vec; path: Vec[]; at: number; seq: number; random?: number; food?: string; planUntil?: number; role?: number; recentFood?: string; intent?: 'deliver'|'eat'|'tamper'; seenAt?: number; enemyId?: string };
const memories = new WeakMap<Player, Memory>();
function memory(p: Player) { let m = memories.get(p); if (!m) { m = { path: [], at: -10, seq: 0 }; memories.set(p, m); } return m; }
function random(m: Memory, w: World, p: Player) { m.random ??= (w.seed ^ p.id.split('').reduce((a,c)=>Math.imul(a,31)+c.charCodeAt(0),17))>>>0; m.random=(Math.imul(m.random,1664525)+1013904223)>>>0; return m.random/4294967296; }
const nearest = <T extends Vec>(p: Vec, list: T[]) => list.slice().sort((a, b) => distance(p, a) - distance(p, b))[0];
function direct(a: Vec, b: Vec, p: Player) {
  const d = distance(a, b), steps = Math.ceil(d / .35);
  for (let i = 1; i <= steps; i++) if (!isWalkable(a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps, p.team, p.layer, p.team === 'mouse' ? .28 : .5)) return false;
  return true;
}
/** A* over the content-derived walkable navigation grid; movement still passes through shared collision. */
function route(p: Player, destination: Vec): Vec[] {
  if (p.layer === 'tunnel' || direct(p, destination, p)) return [destination];
  const nodes = new Map<number, { x: number; y: number; g: number; f: number; prev?: number }>();
  const width = MAP.width, id = (x: number, y: number) => y * width + x;
  const sx = Math.floor(p.x), sy = Math.floor(p.y), start = id(sx, sy);
  nodes.set(start, { x: sx, y: sy, g: 0, f: distance(p, destination) });
  const open = [start], closed = new Set<number>();
  let best = start, bestDist = Infinity;
  for (let count = 0; open.length && count < 3000; count++) {
    let min = 0; for (let i = 1; i < open.length; i++) if (nodes.get(open[i])!.f < nodes.get(open[min])!.f) min = i;
    const key = open.splice(min, 1)[0], n = nodes.get(key)!; closed.add(key);
    const q = { x: n.x + .5, y: n.y + .5 }, dist = distance(q, destination);
    if (dist < bestDist) { bestDist = dist; best = key; }
    if (dist < 1.3 && direct(q, destination, p)) { best = key; break; }
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const x = n.x + dx, y = n.y + dy, next = id(x, y);
      if (x < 1 || y < 1 || x >= MAP.width - 1 || y >= MAP.height - 1 || closed.has(next)) continue;
      if (!direct(q, { x: x + .5, y: y + .5 }, p)) continue;
      const g = n.g + Math.hypot(dx, dy), old = nodes.get(next);
      if (old && old.g <= g) continue;
      nodes.set(next, { x, y, g, f: g + distance({ x: x + .5, y: y + .5 }, destination), prev: key });
      if (!open.includes(next)) open.push(next);
    }
  }
  const out: Vec[] = [];
  let key: number | undefined = best;
  while (key !== undefined && key !== start) { const n: { x: number; y: number; prev?: number } = nodes.get(key)!; out.unshift({ x: n.x + .5, y: n.y + .5 }); key = n.prev; }
  if (bestDist < 1.5) out.push(destination);
  return out;
}
function headToward(w: World, p: Player, target: Vec, input: InputFrame, sprint = false) {
  const m = memory(p);
  if (!m.target || distance(m.target, target) > 1 || w.time - m.at > 2 || !m.path.length) { m.path = route(p, target); m.target = { ...target }; m.at = w.time; }
  while (m.path.length > 1 && distance(p, m.path[0]) < .4) m.path.shift();
  const next = m.path[0] ?? target, d = Math.max(.1, distance(p, next));
  if (d > .22) { input.mx = (next.x - p.x) / d; input.my = (next.y - p.y) / d; }
  input.ax = target.x; input.ay = target.y;
  if (sprint) input.buttons |= BUTTON.SPRINT;
}
function stopUse(input: InputFrame, button: number = BUTTON.USE) { input.mx = 0; input.my = 0; input.buttons = button; }

export function botInput(w: World, p: Player): InputFrame {
  const m = memory(p), frame: InputFrame = { seq: ++m.seq, tick: w.tick, mx: 0, my: 0, buttons: 0, ax: p.x + Math.cos(p.angle), ay: p.y + Math.sin(p.angle) };
  m.role ??= random(m,w,p);
  const reaction=botReactionTime(w), cadence=Math.max(2,Math.round(reaction*30));
  if (p.state === 'held' || p.state === 'stunned') { frame.buttons = w.tick % cadence === 0 ? BUTTON.USE : 0; return frame; }
  if (p.state !== 'free') return frame;
  // Context transitions are single presses; explicitly release before the next hold.
  if(p.cooldowns.useLatch) return frame;
  if (p.hidden) { if (w.tick % 60 === 0) frame.buttons = BUTTON.USE; return frame; }
  // Bots consume only enemies that their own team could currently detect.
  const enemies = w.players.filter(e => e.team !== p.team && w.players.some(ally => ally.team === p.team && visibleTo(w, ally, e)));
  const enemy = nearest(p, enemies.filter(e => e.state === 'free' || e.state === 'stunned'));
  if(enemy?.id!==m.enemyId){m.enemyId=enemy?.id;m.seenAt=w.time;}
  const noticed=!!enemy&&w.time-(m.seenAt??w.time)>=reaction;
  const context = contextAction(w, p);
  if (p.team === 'mouse') {
    if (p.carry) {
      m.recentFood=m.food;m.food=undefined;
      if(p.layer==='floor'&&FOODS[p.carry].buff&&p.carry!=='vegetable'&&(m.intent==='eat'||noticed&&distance(p,enemy!)<5&&p.buff!==FOODS[p.carry].buff)) {stopUse(frame,BUTTON.EAT);return frame;}
      if(p.layer==='floor'&&m.intent==='tamper'&&FOODS[p.carry].tamper&&w.orders.some(o=>o.stage==='ready'&&!o.tamper)) {
        const pass=MAP.objects.find(o=>o.kind==='pass')!;
        if(context?.kind==='tamper')stopUse(frame);else headToward(w,p,pass,frame,true);return frame;
      }
      if (context?.kind === 'deliver') { stopUse(frame); return frame; }
      if (p.layer === 'tunnel') { headToward(w, p, MAP.stash, frame, true); return frame; }
      const hole = nearest(p, MAP.holes.filter(h => !(w.plugs[h.id] > w.time)));
      if (hole) { if (context?.kind === 'hole') stopUse(frame); else headToward(w, p, hole, frame, true); }
      if (enemy && distance(p, enemy) < 2 && w.tick % 8 === 0) frame.buttons |= BUTTON.DODGE;
      return frame;
    }
    const caged = nearest(p, w.cages.filter(c => c.occupant && (c.keyCarrier === p.id || p.classId === 'rescuer' && (p.cooldowns.ability ?? 0) <= w.time)));
    if (caged) { if(p.layer==='tunnel'){const exit=nearest(caged,MAP.holes.filter(h=>!(w.plugs[h.id]>w.time)));if(exit){if(distance(p,exit)<1.2)stopUse(frame);else headToward(w,p,exit,frame,true);}}else if (distance(p, caged) < 1.5) stopUse(frame, caged.keyCarrier === p.id ? BUTTON.USE : BUTTON.ABILITY); else headToward(w, p, caged, frame, true); return frame; }
    const key = nearest(p, w.cages.filter(c => c.keyDropped).map(c => ({ ...c.keyDropped!, id: c.id })));
    if (key && p.layer !== 'tunnel') { if (context?.kind === 'key') stopUse(frame); else headToward(w, p, key, frame, true); return frame; }
    if(noticed&&enemy&&p.buffUses>0&&p.layer==='floor'&&distance(p,enemy)<(p.buff==='fire'?2.2:6)&&hasLOS(p,enemy)) {frame.ax=enemy.x;frame.ay=enemy.y;if(w.tick%cadence===0)frame.buttons|=BUTTON.ATTACK;if(distance(p,enemy)<1.5)headToward(w,p,{x:p.x-(enemy.x-p.x),y:p.y-(enemy.y-p.y)},frame,true);return frame;}
    if (noticed && enemy && p.layer !== 'tunnel' && distance(p, enemy) < 3.5) {
      if (context && ['soup', 'pan', 'flour'].includes(context.kind) && distance(p, enemy) > 1.3) stopUse(frame);
      else { const hole = nearest(p, MAP.holes.filter(h => !(w.plugs[h.id] > w.time))); if (hole) { if (context?.kind === 'hole') stopUse(frame); else headToward(w, p, hole, frame, true); } }
      if (w.tick % 8 === 0) frame.buttons |= BUTTON.DODGE;
      if (p.buffUses && w.tick % 6 === 0) { frame.ax = enemy.x; frame.ay = enemy.y; frame.buttons |= BUTTON.ATTACK; }
      return frame;
    }
    let food=w.pickups.find(f=>f.id===m.food&&f.available);
    if(!food || (m.planUntil??0)<w.time){
      const candidates=w.pickups.filter(f=>f.available&&(p.classId==='hauler'||f.food!=='wheel'&&f.food!=='crate')&&f.food!=='vegetable');
      candidates.sort((a,b)=>distance(p,a)-distance(p,b));
      const choices=candidates.slice(0,Math.min(6,candidates.length));
      food=choices[Math.floor(random(m,w,p)*choices.length)];m.food=food?.id;m.planUntil=w.time+25;
      const intent=random(m,w,p);m.intent=intent<.15?'eat':intent<(p.classId==='saboteur'?.55:.3)?'tamper':'deliver';
    }
    if (!food) return frame;
    if (p.layer === 'tunnel') {
      const exit = nearest(food, MAP.holes.filter(h => !(w.plugs[h.id] > w.time)));
      if (exit) { if (distance(p, exit) < 1.2) stopUse(frame); else headToward(w, p, exit, frame, true); }
    } else if (context?.kind === 'pickup' && context.target===food.id) stopUse(frame);
    else if(distance(p,food)<1.2 && context && ['soup','pan','flour','pickup','blocked'].includes(context.kind)){
      // Do not wait forever at a shelf whose context currently targets a prop.
      if(context.kind==='blocked'){m.food=undefined;m.planUntil=0;}else stopUse(frame);
    } else headToward(w, p, food, frame);
  } else {
    if (p.holding) {
      const cage = nearest(p, w.cages.filter(c => !c.occupant));
      if (cage) { if (context?.kind === 'cage') stopUse(frame); else headToward(w, p, cage, frame, true); }
      return frame;
    }
    if (noticed && enemy && enemy.layer === 'floor' && distance(p, enemy) < 9) {
      headToward(w, p, enemy, frame, true);
      if (distance(p, enemy) < 1.05) { frame.mx = 0; frame.my = 0; if (w.tick % 2 === 0) frame.buttons |= BUTTON.ATTACK; }
      if (distance(p, enemy) < 1.65 && w.tick % 10 === 0) frame.buttons |= BUTTON.ABILITY;
      if (distance(p, enemy) > 1.5 && distance(p, enemy) < 5 && w.tick % 18 === 0) { frame.buttons |= BUTTON.COLANDER; const flight=distance(p,enemy)/9;frame.ax=enemy.x+enemy.vx*flight*.65;frame.ay=enemy.y+enemy.vy*flight*.65; }
      return frame;
    }
    const pass = MAP.objects.find(o => o.kind === 'pass');
    if (w.orders.some(o => o.stage === 'ready') && pass) {
      if (context?.kind === 'send') stopUse(frame); else headToward(w, p, pass, frame, true); return frame;
    }
    const alert = [...w.events].reverse().find(e => (e.kind === 'alert' || e.kind === 'noise' || e.kind === 'panic') && w.time - e.time < 3);
    if (alert) headToward(w, p, alert, frame, true);
    else {
      const patrols = [{ x: 15, y: 29 }, { x: 33, y: 25 }, { x: 54, y: 28 }, { x: 36, y: 15 }, { x: 13, y: 10 }];
      const n = p.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)+Math.floor(m.role*20);
      headToward(w, p, patrols[(Math.floor(w.time / (7+m.role*4)) + n) % patrols.length], frame);
    }
  }
  return frame;
}
