import { pathToFileURL } from 'node:url';
import { MAP,FOOD_LIST,ITEMS,NPC,ORDERS,PUBLIC_ROOMS,isWalkable,zoneAt } from '../shared/content';
import { TUNABLE } from '../shared/constants';
import type { Team,Vec } from '../shared/protocol';

export type Check={id:string;pass:boolean;detail:string};
const step=.5,W=MAP.width*2,H=MAP.height*2;
const index=(x:number,y:number)=>Math.round(y/step)*W+Math.round(x/step);
const point=(i:number)=>({x:(i%W)*step,y:Math.floor(i/W)*step});
function navigation(team:Team,radius:number){
  const valid=new Uint8Array(W*H);
  for(let i=0;i<valid.length;i++){const p=point(i);valid[i]=Number(isWalkable(p.x,p.y,team,'floor',radius)&&PUBLIC_ROOMS.includes(zoneAt(p.x,p.y)?.id??''));}
  const distances=(origins:Vec[])=>{
    const dist=new Float64Array(W*H).fill(Infinity),q:number[]=[];
    for(const p of origins){const k=index(p.x,p.y);if(valid[k]&&dist[k]!==0){dist[k]=0;q.push(k);}}
    for(let n=0;n<q.length;n++){const i=q[n];for(const j of [i-1,i+1,i-W,i+W]){if(j<0||j>=valid.length||Math.abs((j%W)-(i%W))>1||!valid[j]||dist[j]!==Infinity)continue;const a=point(i),b=point(j);if(!isWalkable((a.x+b.x)/2,(a.y+b.y)/2,team,'floor',radius))continue;dist[j]=dist[i]+step;q.push(j);}}
    return dist;
  };
  return {valid,distances};
}

/** Unit-capacity undirected max-flow to a super sink for each room's holes. */
export function roomPathCount(room:string,removedEdge?:number):number{
  const ids=[...MAP.tunnelNodes.map(n=>n.id),'ROOM'];const cap=new Map<string,Map<string,number>>();
  for(const id of ids)cap.set(id,new Map());
  const add=(a:string,b:string,n:number)=>{cap.get(a)?.set(b,n);if(!cap.get(b)?.has(a))cap.get(b)?.set(a,0);};
  MAP.tunnelEdges.forEach((e,i)=>{if(i!==removedEdge){add(e.from,e.to,1);add(e.to,e.from,1);}});
  MAP.holes.filter(h=>h.room===room).forEach(h=>add(h.id,'ROOM',1));
  let flow=0;
  for(;;){const prev=new Map<string,string>(),q=['B'];prev.set('B','');for(let i=0;i<q.length&&!prev.has('ROOM');i++)for(const [to,c] of cap.get(q[i])??[]){if(c>0&&!prev.has(to)){prev.set(to,q[i]);q.push(to);}}if(!prev.has('ROOM'))break;let p='ROOM';while(p!=='B'){const from=prev.get(p)!;cap.get(from)!.set(p,cap.get(from)!.get(p)!-1);cap.get(p)!.set(from,(cap.get(p)!.get(from)??0)+1);p=from;}flow++;}
  return flow;
}

export function validateMap():Check[]{
  const checks:Check[]=[],check=(id:string,pass:boolean,detail:string)=>checks.push({id,pass,detail});
  const chef=navigation('chef',.5),mouse=navigation('mouse',.35);
  const cd=chef.distances([MAP.spawns.chef]);
  const floorCount=chef.valid.reduce((n,v)=>n+v,0),unreachable=Array.from(chef.valid).filter((v,i)=>v&&!Number.isFinite(cd[i])).length;
  check('M1',floorCount>0&&unreachable===0,`${floorCount} chef-clear floor samples; ${unreachable} disconnected (0.5-tile grid).`);
  let forbidden=0;
  for(let y=0;y<MAP.height;y+=.5)for(let x=0;x<MAP.width;x+=.5){if(isWalkable(x,y,'chef','tunnel',.5))forbidden++;if(zoneAt(x,y)?.id==='burrow'&&isWalkable(x,y,'chef','floor',.5))forbidden++;}
  check('M2',forbidden===0,`${forbidden} chef-accessible tunnel or Burrow samples.`);
  const routes=PUBLIC_ROOMS.map(room=>({room,paths:roomPathCount(room)}));
  const nodes=new Set(MAP.tunnelNodes.map(n=>n.id));
  const validEdges=nodes.size===MAP.tunnelNodes.length&&MAP.tunnelEdges.every(e=>nodes.has(e.from)&&nodes.has(e.to)&&e.from!==e.to&&e.length>0);
  check('M3',validEdges&&routes.every(r=>r.paths>=2),routes.map(r=>`${r.room}: ${r.paths} edge-disjoint routes`).join('; '));
  check('M4',PUBLIC_ROOMS.every(room=>MAP.holes.filter(h=>h.room===room).length>=(room==='foyer'?1:2))&&MAP.holes.every(h=>nodes.has(h.junction)&&MAP.tunnelEdges.some(e=>(e.from===h.id&&e.to===h.junction)||(e.to===h.id&&e.from===h.junction))),`${MAP.holes.length} holes, each connected to its declared junction.`);
  const cages=chef.distances(MAP.cages);let worst=0,worstAt={x:0,y:0};
  for(let i=0;i<chef.valid.length;i++){const p=point(i);if(chef.valid[i]&&['kitchen','pantry'].includes(zoneAt(p.x,p.y)?.id??'')&&cages[i]>worst){worst=cages[i];worstAt=p;}}
  const seconds=worst/(TUNABLE.chefSpeed*.75);
  check('M5',MAP.cages.every(c=>isWalkable(c.x,c.y,'chef','floor',.5))&&seconds<=9,`Worst captive route ${worst.toFixed(1)} tiles / ${(TUNABLE.chefSpeed*.75).toFixed(2)} speed = ${seconds.toFixed(2)}s at (${worstAt.x},${worstAt.y}).`);
  const retreats=mouse.distances(MAP.holes);
  const badPickups=MAP.pickups.filter(p=>!isWalkable(p.x,p.y,'mouse','floor',.35)||!Number.isFinite(retreats[index(p.x,p.y)])||Math.min(...MAP.holes.map(h=>Math.hypot(h.x-p.x,h.y-p.y)))>14||!FOOD_LIST.some(f=>f.id===p.food));
  check('M6',badPickups.length===0,`${MAP.pickups.length} spawns checked; invalid: ${badPickups.map(p=>p.id).join(', ')||'none'}.`);
  check('M7',MAP.hides.every(h=>h.capacity>=1&&isWalkable(h.x,h.y,'mouse','floor',.35)&&Number.isFinite(retreats[index(h.x,h.y)])),`${MAP.hides.length} hiding spots checked for capacity and mouse access.`);
  const md=mouse.distances([MAP.holes[0]]);const pockets=Array.from(mouse.valid).filter((v,i)=>v&&!Number.isFinite(md[i])).length;
  const clearance=MAP.solids.filter(s=>s.mouseOnly).every(s=>s.w>=.7&&s.h>=.7&&isWalkable(s.x+s.w/2,s.y+s.h/2,'mouse','floor',.35));
  const burrowOK=isWalkable(MAP.stash.x,MAP.stash.y,'mouse','floor',.35)&&isWalkable(MAP.stash.x,MAP.stash.y,'mouse','tunnel',.35);
  check('M8',pockets===0&&clearance&&burrowOK&&MAP.holes.every(h=>Number.isFinite(md[index(h.x,h.y)])),`${pockets} mouse pockets at 0.7-tile body clearance; Burrow connects through tunnel layer.`);
  return checks;
}

export function validateContent():Check[]{
  const checks:Check[]=[],check=(id:string,pass:boolean,detail:string)=>checks.push({id,pass,detail});
  check('C1',new Set(FOOD_LIST.map(f=>f.id)).size===FOOD_LIST.length&&FOOD_LIST.every(f=>f.provision>0&&(f.buff||f.tamper||(f.heavy&&f.carriers===2))),`${FOOD_LIST.length} unique food IDs. Heavy delivery-only wheel/crate explicitly exempt from eating and tampering per 6.9.`);
  check('C2',FOOD_LIST.filter(f=>f.buff).every(f=>((f.duration??0)>0||(f.uses??0)>0)&&Boolean(f.counter?.trim())),`All food buffs have duration/uses and an explicit counter.`);
  const machines=[NPC.guest,NPC.waiter,NPC.cook];
  check('C3',machines.every(m=>{const ids=new Set(m.states.map(s=>s.id));return ids.size===m.states.length&&m.states.every(s=>s.transitions.length>0&&s.transitions.every(t=>ids.has(t.to)&&t.trigger.length>0&&t.seconds>0))&&m.interrupts.every(e=>(e.from==='*'||ids.has(e.from))&&ids.has(e.to));}),`Guest, waiter and cook states have timed/event exits to declared states.`);
  const stages=new Set([...ORDERS.stages.map(s=>s.id),...ORDERS.outcomes]);
  check('C4',ORDERS.stages.every(s=>s.timeout>0&&s.duration>=0&&stages.has(s.next)&&stages.has(s.failure.next)&&Number.isFinite(s.failure.rating)),`${ORDERS.stages.length} order stages have timeout and valid success/failure outcomes.`);
  const effects=ITEMS.tamperEffects;
  check('C5',new Set(effects.map(e=>e.animation)).size===effects.length&&FOOD_LIST.filter(f=>f.tamper).every(f=>effects.some(e=>e.id===f.tamper&&e.penalty===f.penalty&&e.penalty>0&&NPC.animations.includes(e.animation))),`${effects.length} distinct guest animations with matched rating penalties.`);
  return checks;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const checks=[...validateMap(),...validateContent()];for(const c of checks)console.log(`${c.pass?'PASS':'FAIL'} ${c.id} ${c.detail}`);if(checks.some(c=>!c.pass))process.exitCode=1;}
