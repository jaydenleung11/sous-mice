import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, movePlayer, contextAction, damageChef, visibleTo, setPlayerLatency } from '../shared/sim';
import { MAP, FOODS, isWalkable } from '../shared/content';
import { BUTTON, DT } from '../shared/constants';
import { botInput } from '../bots';
import type { InputFrame, LobbyPlayer, Player, World } from '../shared/protocol';

const lobby = (id: string, team: 'mouse'|'chef'): LobbyPlayer => ({ id, name:id, team, classId:team==='mouse'?'scout':'head', bot:false, ready:true, connected:true });
function world(extraMouse = true) { const w = createWorld([lobby('m','mouse'),lobby('c','chef'),...(extraMouse?[lobby('ally','mouse')]:[])], {duration:480,bots:false,difficulty:'normal'}, 7); w.nextOrder=999; return w; }
const input = (p: Player, buttons=0, overrides:Partial<InputFrame>={}):InputFrame=>({seq:1,tick:0,mx:0,my:0,buttons,ax:p.x+1,ay:p.y,...overrides});
function run(w:World, seconds:number, controls:Map<string,InputFrame>=new Map()) { for(let n=0;n<Math.ceil(seconds/DT);n++)stepWorld(w,controls); }
function setupGrab(w:World) { const [m,c]=w.players; Object.assign(c,{x:15,y:30,angle:0});Object.assign(m,{x:15.8,y:30,layer:'floor'}); return {m,c}; }
function grab(w:World) { const {m,c}=setupGrab(w);run(w,.4,new Map([[c.id,input(c,BUTTON.ATTACK)]]));return {m,c}; }

describe('authoritative rules',()=>{
  it('starts reproducibly and fills bots without exceeding eight players',()=>{
    const a=createWorld([lobby('m','mouse'),lobby('c','chef')],{duration:480,bots:true,difficulty:'normal'},42);
    const b=createWorld([lobby('m','mouse'),lobby('c','chef')],{duration:480,bots:true,difficulty:'normal'},42);
    expect(a).toEqual(b);expect(a.players.filter(p=>p.team==='mouse')).toHaveLength(3);expect(a.players.filter(p=>p.team==='chef')).toHaveLength(2);
    for(let i=0;i<90;i++){stepWorld(a,new Map());stepWorld(b,new Map());}expect(a).toEqual(b);
  });
  it('normalizes diagonal input and prevents crossing solids or entering chef tunnels',()=>{
    const w=world(),c=w.players[1];Object.assign(c,{x:15,y:30,classId:'head'});
    movePlayer(c,input(c,0,{mx:1,my:1}),DT,w);expect(Math.hypot(c.x-15,c.y-30)).toBeCloseTo(3.6*DT,5);
    Object.assign(c,{x:2,y:2});for(let i=0;i<300;i++)movePlayer(c,input(c,BUTTON.SPRINT,{mx:-1,my:-1}),DT,w);
    expect(isWalkable(c.x,c.y,'chef','floor',.5)).toBe(true);expect(c.x).toBeGreaterThanOrEqual(1.5);expect(c.stamina).toBeGreaterThanOrEqual(0);
    Object.assign(c,MAP.holes[0]);expect(contextAction(w,c)?.kind).toBe('plug');expect(isWalkable(c.x,c.y,'chef','tunnel')).toBe(false);
  });
  it('steals, eats, and delivers with scaled heist and interruptible holds',()=>{
    const w=world(),m=w.players[0],pickup=w.pickups.find(f=>f.food==='cheese'&&!MAP.holes.some(h=>Math.hypot(h.x-f.x,h.y-f.y)<1.6))!;
    Object.assign(m,{x:pickup.x,y:pickup.y,layer:'floor'});expect(contextAction(w,m)?.kind).toBe('pickup');
    run(w,.2,new Map([[m.id,input(m,BUTTON.USE)]]));run(w,.1);expect(m.carry).toBeUndefined();
    run(w,.4,new Map([[m.id,input(m,BUTTON.USE)]]));expect(m.carry).toBe('cheese');expect(pickup.available).toBe(false);
    run(w,.8,new Map([[m.id,input(m,BUTTON.EAT)]]));expect(m.carry).toBeUndefined();expect(m.buff).toBe('dash');
    m.carry='tomato';Object.assign(m,{...MAP.stash,layer:'tunnel'});run(w,.4,new Map([[m.id,input(m,BUTTON.USE)]]));expect(w.heist).toBeCloseTo(2.1);expect(m.stats.deliveries).toBe(1);
  });
  it('a held mouse cannot eat and 25 distinct squirm presses escape',()=>{
    const w=world(),{m,c}=grab(w);expect(m.state).toBe('held');expect(c.holding).toBe(m.id);
    m.carry='cheese';run(w,.8,new Map([[m.id,input(m,BUTTON.EAT)]]));expect(m.buff).toBeUndefined();
    for(let i=0;i<24;i++){stepWorld(w,new Map([[m.id,input(m,BUTTON.USE)]]));stepWorld(w,new Map());}expect(m.state).toBe('held');
    stepWorld(w,new Map([[m.id,input(m,BUTTON.USE)]]));expect(m.state).toBe('free');expect(c.holding).toBeUndefined();expect(m.invulnerableUntil).toBeGreaterThan(w.time);
  });
  it('zero composure drops a captive and recovers to forty with immunity',()=>{
    const w=world(),{m,c}=grab(w);damageChef(w,c,100);expect(m.state).toBe('free');expect(c.state).toBe('flustered');expect(c.composure).toBe(0);
    run(w,5.1);expect(c.composure).toBe(40);expect(c.state).toBe('free');damageChef(w,c,100);expect(c.composure).toBe(40);
  });
  it('cages, drops key on fluster, picks up key and unlocks; timeout returns unclaimed key',()=>{
    const w=world(),{m,c}=grab(w),a=w.players[2],cage=w.cages[0];Object.assign(c,{x:cage.x,y:cage.y});
    run(w,1,new Map([[c.id,input(c,BUTTON.USE)]]));expect(m.state).toBe('caged');expect(m.id).toBe('m');expect(cage.occupant).toBe('m');expect(cage.keyOwner).toBe(c.id);
    damageChef(w,c,100);expect(cage.keyDropped).toBeDefined();Object.assign(a,{...cage.keyDropped,layer:'floor'});
    run(w,.4,new Map([[a.id,input(a,BUTTON.USE)]]));expect(cage.keyCarrier).toBe(a.id);
    run(w,1,new Map([[a.id,input(a,BUTTON.USE)]]));expect(m.state).toBe('free');expect(m.id).toBe('m');expect(cage.occupant).toBeUndefined();expect(a.stats.rescues).toBe(1);
    cage.occupant=m.id;cage.keyOwner=c.id;cage.keyDropped={x:5,y:30};cage.keyUntil=w.time+12;run(w,12.1);expect(cage.keyDropped).toBeUndefined();expect(cage.keyOwner).toBe(c.id);
  });
  it('automatically releases a cage occupant after forty seconds',()=>{
    const w=world(),{m,c}=grab(w),cage=w.cages[0];Object.assign(c,{x:cage.x,y:cage.y});run(w,1,new Map([[c.id,input(c,BUTTON.USE)]]));run(w,40.1);expect(m.state).toBe('free');expect(cage.occupant).toBeUndefined();
  });
  it('does not toggle a tunnel repeatedly while Use remains held',()=>{
    const w=world(),m=w.players[0];Object.assign(m,{...MAP.holes[0],layer:'floor'});run(w,2,new Map([[m.id,input(m,BUTTON.USE)]]));expect(m.layer).toBe('tunnel');run(w,.1);run(w,.2,new Map([[m.id,input(m,BUTTON.USE)]]));expect(m.layer).toBe('floor');
  });
  it.each([['heist','mouse'],['rating','mouse'],['timer','chef'],['lockdown','chef']] as const)('%s win condition ends the match', (kind,winner)=>{
    const w=world(false);if(kind==='heist')w.heist=100;if(kind==='rating')w.rating=0;if(kind==='timer')w.time=w.duration;
    if(kind==='lockdown'){grab(w);run(w,3);}else stepWorld(w,new Map());expect(w.result?.winner).toBe(winner);
    const t=w.time;stepWorld(w,new Map());expect(w.time).toBe(t);
  });
  it('hides tunnels, hiding spots and camouflage but honors radar and same-team sight',()=>{
    const w=world(),{m,c}=setupGrab(w);expect(visibleTo(w,c,m)).toBe(true);m.layer='tunnel';expect(visibleTo(w,c,m)).toBe(false);
    m.layer='floor';m.hidden='HIDE1';expect(visibleTo(w,c,m)).toBe(false);m.hidden=undefined;m.buff='camouflage';m.buffUntil=10;expect(visibleTo(w,c,m)).toBe(false);
    m.revealUntil=3;expect(visibleTo(w,c,m)).toBe(true);expect(visibleTo(w,w.players[2],m)).toBe(true);
  });
  it('processes prep/cook/ready/send/delivery/eating, cold and expiry penalties',()=>{
    const w=world(),c=w.players[1],pass=MAP.objects.find(o=>o.kind==='pass')!;w.nextOrder=0;run(w,27.2);
    const order=w.orders[0];expect(order.stage).toBe('ready');Object.assign(c,{x:pass.x,y:pass.y});
    run(w,2,new Map([[c.id,input(c,BUTTON.USE)]]));expect(order.stage).toBe('delivery');expect(c.stats.dishes).toBe(1);expect(w.rating).toBe(74);
    run(w,9.1);expect(order.stage).toBe('eating');run(w,12.1);expect(order.stage).toBe('paid');
    w.orders=[{id:'cold',tableId:w.guests[1].id,stage:'ready',elapsed:19.9,age:40,readyAt:w.time-19.9,cold:false,vip:false}];run(w,.2);expect(w.rating).toBe(71);run(w,50);expect(w.rating).toBe(66);
  });
  it('tamper produces its distinct reaction and heist only after delivery',()=>{
    const w=world(),m=w.players[0],c=w.players[1],pass=MAP.objects.find(o=>o.kind==='pass')!;
    w.orders=[{id:'dish',tableId:w.guests[0].id,stage:'ready',elapsed:0,age:27,readyAt:0,cold:false,vip:false}];
    Object.assign(m,{x:pass.x,y:pass.y,layer:'floor',carry:'garlic'});run(w,2.5,new Map([[m.id,input(m,BUTTON.USE)]]));expect(w.orders[0].tamper).toBe('garlic');expect(w.heist).toBe(0);
    Object.assign(m,{...MAP.stash,layer:'tunnel'});Object.assign(c,{x:pass.x,y:pass.y});run(w,2,new Map([[c.id,input(c,BUTTON.USE)]]));run(w,9.1);expect(w.heist).toBeCloseTo(4.2);expect(w.rating).toBe(70);expect(w.guests[0].reaction).toBe(FOODS.garlic.tamper);
  });
  it('a guest startles, spreads panic then flees with the specified losses',()=>{
    const w=world(),m=w.players[0],g=w.guests[0];w.guests=[g];Object.assign(g,{x:15,y:30,angle:0});Object.assign(m,{x:17,y:30,layer:'floor'});
    run(w,2.1);expect(g.scares).toBe(1);expect(w.rating).toBe(69);run(w,2.1);expect(g.state).toBe('panicked');run(w,12.2);expect(g.state).toBe('fleeing');expect(w.rating).toBe(65);expect(w.heist).toBeCloseTo(1.4);
  });
  it('rewinds a grab by measured latency and preserves historical dodge immunity',()=>{
    for(const dodge of [false,true]){
      const w=world(),{m,c}=setupGrab(w);setPlayerLatency(w,c.id,.15);
      stepWorld(w,new Map([[c.id,input(c,BUTTON.ATTACK)]]));
      for(let i=0;i<10;i++) { if(i===3&&dodge)m.invulnerableUntil=w.time+.2;if(i===6)m.x=18;stepWorld(w,new Map()); }
      expect(m.state).toBe(dodge?'free':'held');
    }
  });
  it('bounded bot matches preserve coordinates, resources, captive ownership and terminate',()=>{
    for(let seed=1;seed<=3;seed++) {
      const w=createWorld([lobby('m','mouse'),lobby('c','chef')],{duration:90,bots:true,difficulty:'normal'},seed);
      while(!w.result&&w.time<95){stepWorld(w,new Map(w.players.map(p=>[p.id,botInput(w,p)])));if(w.tick%30===0)for(const p of w.players){expect([p.x,p.y,p.stamina,p.composure].every(Number.isFinite)).toBe(true);expect(p.stamina).toBeGreaterThanOrEqual(0);expect(p.stamina).toBeLessThanOrEqual(100);expect(isWalkable(p.x,p.y,p.team,p.layer,p.team==='mouse'?.28:.5)).toBe(true);if(p.state==='held')expect(w.players.filter(c=>c.holding===p.id)).toHaveLength(1);}}
      expect(w.result).toBeDefined();expect(w.heist).toBeGreaterThanOrEqual(0);expect(w.heist).toBeLessThanOrEqual(100);expect(w.rating).toBeGreaterThanOrEqual(0);expect(w.rating).toBeLessThanOrEqual(100);
    }
  },30000);
});
