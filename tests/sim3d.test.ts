import {describe,it,expect} from 'vitest';
import {createWorld,stepWorld,contextAction,visibleTo,guestSees} from '../shared/sim';
import {startTransit,chooseTransitExit,advanceTransits,transitChoices,tunnelDistance} from '../shared/transit3d';
import {MAP3D,COLLIDERS3D,walkable3D,rayClear3D,coverAt3D} from '../shared/content3d';
import {snapshotFor} from '../server/interest';
import {BUTTON,DT} from '../shared/constants';
import type {World,Player,InputFrame,LobbyPlayer,Vec} from '../shared/protocol';
const roster:LobbyPlayer[]=[{id:'m',name:'Mouse',team:'mouse',classId:'scout',bot:false,ready:true,connected:true},{id:'c',name:'Chef',team:'chef',classId:'head',bot:false,ready:true,connected:true},{id:'a',name:'Ally',team:'mouse',classId:'rescuer',bot:false,ready:true,connected:true}];
function world(){const w=createWorld(roster,{duration:480,bots:false,difficulty:'normal',mode:'3d'},17);w.nextOrder=999;w.guests=[];return w;}
function input(p:Player,buttons=0):InputFrame{return{seq:1,tick:0,mx:0,my:0,buttons,ax:p.x+1,ay:p.y,yaw:0,pitch:0};}
function run(w:World,seconds:number,frames=new Map<string,InputFrame>()){for(let i=0;i<Math.ceil(seconds/DT);i++)stepWorld(w,frames);}
function place(p:Player,q:Vec){p.x=q.x;p.y=q.y;p.z=q.z??0;p.layer=(q.z??0)>.04?'ledge':'floor';p.grounded=true;}
function line(){for(let y=.7;y<25;y+=.5)for(let x=1;x<38;x+=.5)if(walkable3D(x,y,0,'chef')&&walkable3D(x+5,y,0,'mouse')&&rayClear3D({x,y,z:1.15},{x:x+5,y,z:.07}))return{x,y};throw new Error('No sight fixture');}

describe('v3 authoritative transit and senses',()=>{
  it('spawns on metre floor with unchanged identity and private mode fields',()=>{const w=world();expect(w.mode).toBe('3d');for(const p of w.players){expect(p.mode).toBe('3d');expect(walkable3D(p.x,p.y,p.z??0,p.team)).toBe(true);}expect(w.players[0].layer).toBe('floor');expect(w.players[0].x).toBeCloseTo(MAP3D.spawns.mouse.x);});
  it('uses .2 metre entry reach and .6 second interruptible hold',()=>{const w=world(),p=w.players[0],h=MAP3D.holes.find(h=>h.id==='HB')!;place(p,h);expect(contextAction(w,p)?.duration).toBe(.6);run(w,.3,new Map([[p.id,input(p,BUTTON.USE)]]));run(w,.1);expect(p.transit).toBeUndefined();run(w,.6,new Map([[p.id,input(p,BUTTON.USE)]]));expect(p.state).toBe('transit');expect(p.transit!.depart-p.transit!.entered).toBeCloseTo(2.5);});
  it('every listed fork exit has a graph route and arrives within one tick of server time',()=>{
    for(const entry of MAP3D.holes){for(const exit of transitChoices(world(),world().players[0],entry.id)){
      const w=world(),p=w.players[0];place(p,entry);expect(startTransit(w,p,entry.id)).toBe(true);expect(chooseTransitExit(w,p,exit)).toBe(true);const t={...p.transit!};
      expect(Number.isFinite(tunnelDistance(entry.id,exit))).toBe(true);expect(t.duration).toBeCloseTo(Math.max(2.5,Math.min(4.5,1.8+.11*tunnelDistance(entry.id,exit))));
      while(p.transit&&w.time<10)stepWorld(w,new Map());expect(w.time).toBeGreaterThanOrEqual(t.arrive-1e-8);expect(w.time-t.arrive).toBeLessThan(DT+1e-8);const hole=MAP3D.holes.find(h=>h.id===exit)!;expect(p.x).toBeCloseTo(hole.x);expect(p.y).toBeCloseTo(hole.y);expect(p.state).toBe('free');expect(walkable3D(p.x,p.y,p.z??0,'mouse')).toBe(true);
    }}
  });
  it('defaults without a choice, rejects forged destinations, and enforces cooldown and cap',()=>{
    const w=world(),p=w.players[0],h=MAP3D.holes.find(h=>h.id==='HB')!;place(p,h);expect(startTransit(w,p,h.id)).toBe(true);expect(chooseTransitExit(w,p,'not-a-hole')).toBe(false);expect(chooseTransitExit(w,w.players[1],'H5')).toBe(false);
    const t=p.transit!.arrive;run(w,t+DT);expect(p.state).toBe('free');expect(startTransit(w,p,'H5')).toBe(false);
    run(w,4.1);place(p,h);expect(startTransit(w,p,h.id)).toBe(true);chooseTransitExit(w,p,'H5');run(w,5);run(w,4.1);place(p,h);expect(startTransit(w,p,h.id)).toBe(true);chooseTransitExit(w,p,'H5');run(w,9);place(p,h);expect(startTransit(w,p,h.id)).toBe(false);expect(p.cooldowns.transitCap).toBeGreaterThan(w.time);
    run(w,61-w.time);expect(startTransit(w,p,h.id)).toBe(true);
  });
  it('reroutes a plugged exit with a one-second delay and never arrives inside a solid',()=>{const w=world(),p=w.players[0];place(p,MAP3D.holes.find(h=>h.id==='H5')!);startTransit(w,p,'H5');chooseTransitExit(w,p,'HB');const before=p.transit!.arrive;w.plugs.HB=100;advanceTransits(w);expect(p.transit!.exit).not.toBe('HB');expect(p.transit!.arrive).toBeCloseTo(before+1);expect(p.transit!.rerouted).toBe(true);run(w,p.transit!.arrive+DT);expect(p.transit).toBeUndefined();expect(walkable3D(p.x,p.y,p.z??0,'mouse')).toBe(true);});
  it('synchronizes allies entering the same route within one second',()=>{const w=world(),[m,,a]=w.players,h=MAP3D.holes.find(h=>h.id==='H5')!;place(m,h);place(a,h);startTransit(w,m,'H5');run(w,.5);startTransit(w,a,'H5');expect(m.transit!.arrive).toBe(a.transit!.arrive);const end=a.transit!.arrive;while(w.time+DT<end)stepWorld(w,new Map());expect(m.state).toBe('transit');stepWorld(w,new Map());expect(m.state).toBe('free');expect(a.state).toBe('free');});
  it('restricts heavy loads to wide holes and keeps two carriers together',()=>{const w=world(),[m,,a]=w.players;m.carry='wheel';a.carry='wheel';place(m,MAP3D.holes[0]);place(a,m);expect(startTransit(w,m,MAP3D.holes[0].id,a)).toBe(false);const h=MAP3D.holes.find(h=>h.id==='H5')!;place(m,h);place(a,h);expect(startTransit(w,m,'H5')).toBe(false);a.lastButtons=BUTTON.USE;expect(startTransit(w,m,'H5',a)).toBe(true);expect(a.state).toBe('transit');expect(m.transit!.duration).toBeGreaterThanOrEqual(4);expect(m.transit!.choices.every(id=>MAP3D.holes.find(h=>h.id===id)!.wide)).toBe(true);});
  it('transit is untargetable and never reaches chefs even with radar, but allies see timings',()=>{
    const w=world(),[m,c,a]=w.players,h=MAP3D.holes.find(h=>h.id==='H5')!;place(m,h);place(c,{x:h.x+.5,y:h.y});startTransit(w,m,h.id);m.revealUntil=99;run(w,.5,new Map([[c.id,input(c,BUTTON.ATTACK|BUTTON.ABILITY)]]));expect(m.state).toBe('transit');expect(visibleTo(w,c,m)).toBe(false);const chef=snapshotFor(w,c),ally=snapshotFor(w,a);expect(chef.entities.some(p=>p.id===m.id)).toBe(false);expect(JSON.stringify(chef)).not.toContain('"depart"');expect(ally.entities.find(p=>p.id===m.id)?.transit?.arrive).toBe(m.transit!.arrive);
  });
  it('rustles are anonymous and radius limited; distant chefs get no entry or exit cues',()=>{const w=world(),[m,c]=w.players,h=MAP3D.holes.find(h=>h.id==='H5')!;place(m,h);startTransit(w,m,h.id);place(c,{x:h.x+2,y:h.y});expect(snapshotFor(w,c).events.find(e=>e.kind==='rustle')?.playerId).toBeUndefined();expect(snapshotFor(w,c).events.some(e=>e.kind==='rustle')).toBe(true);place(c,{x:h.x+7,y:h.y});expect(snapshotFor(w,c).events.some(e=>e.kind==='rustle')).toBe(false);});
  it('an exit ambusher gets .4 seconds, then the remainder of the .6 second shield',()=>{const w=world(),[m,c]=w.players,exit=MAP3D.holes.find(h=>h.id==='H5')!;place(m,MAP3D.holes.find(h=>h.id==='HB')!);place(c,{x:exit.x+.5,y:exit.y});startTransit(w,m,'HB');chooseTransitExit(w,m,'H5');while(m.transit)stepWorld(w,new Map());const arrived=w.time;expect(m.invulnerableUntil).toBeCloseTo(arrived);run(w,.3);expect(m.invulnerableUntil).toBeLessThan(w.time);run(w,.15);expect(m.invulnerableUntil).toBeGreaterThan(w.time);expect(m.invulnerableUntil).toBeCloseTo(arrived+.6);});
  it('cloth cover blocks chef and guest sight; sprinting makes distant floor mice visible to guests',()=>{
    const w=world(),[m,c]=w.players,cloth=COLLIDERS3D.find(b=>b.cover)!;place(m,{x:cloth.x+cloth.w/2,y:cloth.y+cloth.d/2,z:0});place(c,{x:m.x+2,y:m.y});c.angle=Math.PI;expect(coverAt3D(m)).toBe(1);expect(visibleTo(w,c,m)).toBe(false);
    const q=line();const guest={id:'test',...q,z:0,angle:0,state:'seated',meter:0,scares:0,lastSeen:0,stateUntil:0,firstScared:false};place(m,{x:q.x+4.9,y:q.y});m.lastButtons=0;expect(guestSees(w,guest,m)).toBe(false);m.lastButtons=BUTTON.SPRINT;expect(guestSees(w,guest,m)).toBe(true);
  });
  it('Scent Sense is limited to three seconds with twelve-second cooldown and sneak has no ripples',()=>{const w=world(),m=w.players[0];run(w,.1,new Map([[m.id,input(m,BUTTON.SENSE)]]));expect(m.cooldowns.senseUntil).toBeGreaterThan(w.time);const ready=m.cooldowns.sense;run(w,3,new Map([[m.id,input(m,BUTTON.SENSE)]]));expect(m.cooldowns.senseUntil).toBeLessThan(w.time);run(w,.1);run(w,.1,new Map([[m.id,input(m,BUTTON.SENSE)]]));expect(m.cooldowns.sense).toBe(ready);run(w,.3,new Map([[m.id,{...input(m,BUTTON.SNEAK),mx:.2}]]));expect(w.events.some(e=>e.kind==='ripple')).toBe(false);});
  it('grabs a reachable counter edge but not a mouse set back or above the chef reach',()=>{
    const box=COLLIDERS3D.find(b=>!b.cover&&Math.abs(b.z+b.h-.92)<.001&&b.w>1&&b.d>.8&&walkable3D(b.x-.35,b.y+b.d/2,0,'chef'));
    expect(box).toBeDefined();
    for(const [back,height,caught] of [[.08,.92,true],[.45,.92,false],[.08,1.7,false]] as const){const w=world(),[m,c]=w.players;place(c,{x:box!.x-.35,y:box!.y+box!.d/2});place(m,{x:box!.x+back,y:c.y,z:height});if(height>1.5){m.state='stunned';m.stateUntil=20;}run(w,.4,new Map([[c.id,input(c,BUTTON.ATTACK)]]));expect(m.state==='held').toBe(caught);}
  });
  it('colander uses its ballistic landing in height and a wall blocks the trajectory',()=>{
    const w=world(),[m,c]=w.players,q=line();place(c,q);place(m,{x:q.x+2,y:q.y});const shot={...input(c,BUTTON.COLANDER),ax:m.x,ay:m.y};run(w,.5,new Map([[c.id,shot]]));expect(m.state).toBe('stunned');
    const wall=COLLIDERS3D.find(b=>b.h>=1.9&&b.w<.5&&b.d>2&&b.x>1&&b.x<40);expect(wall).toBeDefined();
    const other=world(),[m2,c2]=other.players;place(c2,{x:wall!.x-.5,y:wall!.y+wall!.d/2});place(m2,{x:wall!.x+wall!.w+.5,y:c2.y});run(other,.5,new Map([[c2.id,{...input(c2,BUTTON.COLANDER),ax:m2.x,ay:m2.y}]]));expect(m2.state).toBe('free');
  });
  it('only reaches elevated soup, food and all three Pass counters from the correct height',()=>{
    for(const pass of MAP3D.objects.filter(o=>o.kind==='pass')){
      const w=world(),m=w.players[0];w.orders=[{id:'dish',tableId:'guest',stage:'ready',elapsed:0,age:27,readyAt:0,cold:false,vip:false}];m.carry='garlic';place(m,{x:pass.x,y:pass.y,z:0});expect(contextAction(w,m)?.kind).not.toBe('tamper');place(m,pass);expect(contextAction(w,m)?.kind).toBe('tamper');run(w,2.5,new Map([[m.id,input(m,BUTTON.USE)]]));expect(w.orders[0].tamper).toBe('garlic');
    }
    const w=world(),m=w.players[0],soup=MAP3D.objects.find(o=>o.kind==='soup')!;place(m,{x:soup.x,y:soup.y,z:0});expect(contextAction(w,m)?.kind).not.toBe('soup');place(m,{x:soup.x,y:soup.y,z:.92});expect(contextAction(w,m)?.kind).toBe('soup');run(w,1.5,new Map([[m.id,input(m,BUTTON.USE)]]));expect(w.objectCooldowns[soup.id]).toBeGreaterThan(w.time);
    const high=w.pickups.find(p=>(p.z??0)>.4)!;expect(high).toBeDefined();place(m,{x:high.x,y:high.y,z:0});expect(contextAction(w,m)?.kind).not.toBe('pickup');place(m,high);expect(contextAction(w,m)?.kind).toBe('pickup');run(w,.4,new Map([[m.id,input(m,BUTTON.USE)]]));expect(m.carry).toBe(high.food);
  });
  it('preserves capture/cage/release identity and all four win paths in metre rooms',()=>{const w=world(),[m,c]=w.players,q=line();place(c,q);place(m,{x:q.x+.7,y:q.y});run(w,.4,new Map([[c.id,input(c,BUTTON.ATTACK)]]));expect(m.state).toBe('held');place(c,w.cages[0]);run(w,1,new Map([[c.id,input(c,BUTTON.USE)]]));expect(m.state).toBe('caged');expect(m.id).toBe('m');run(w,40.1);expect(m.state).toBe('free');expect(m.id).toBe('m');
    for(const kind of ['heist','rating','time','lockdown']){const b=world();if(kind==='heist')b.heist=100;if(kind==='rating')b.rating=0;if(kind==='time')b.time=b.duration;if(kind==='lockdown'){for(const p of b.players.filter(p=>p.team==='mouse')){p.state='caged';p.stateUntil=100;}b.lockdown=3;}stepWorld(b,new Map());expect(b.result?.winner).toBe(kind==='heist'||kind==='rating'?'mouse':'chef');}
  });
});
