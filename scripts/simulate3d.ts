import {mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createWorld,stepWorld} from '../shared/sim';
import {botInput3D} from '../bots/three';
import {walkable3D} from '../shared/content3d';
import {snapshotFor} from '../server/interest';
import type {World,LobbyPlayer,Snapshot} from '../shared/protocol';

const arg=process.argv.indexOf('--seeds'),count=arg>=0?Number(process.argv[arg+1]):3;
if(!Number.isInteger(count)||count<1||count>100)throw new Error('--seeds must be an integer from1to100');
const results:Record<string,unknown>[]=[],failures:Record<string,unknown>[]=[];
const started=performance.now(),timing={bots:[] as number[],simulation:[] as number[],snapshots:[] as number[],total:[] as number[]};
const distributions=[[1,1],[2,2],[5,3]] as const;
function resources(w:World){
  if(![w.time,w.rating,w.heist,w.lockdown].every(Number.isFinite)||w.rating<0||w.rating>100||w.heist<0||w.heist>100)throw Error('world resource bounds');
  const ids=new Set(w.players.map(p=>p.id));if(ids.size!==w.players.length)throw Error('duplicate player identity');
  const occupied=new Set<string>();
  for(const c of w.cages)if(c.occupant){if(occupied.has(c.occupant))throw Error('double cage occupant');occupied.add(c.occupant);const p=w.players.find(p=>p.id===c.occupant);if(!p||p.state!=='caged'||p.cageId!==c.id)throw Error('cage ownership mismatch');}
  for(const p of w.players){
    if(![p.x,p.y,p.z??0,p.vx,p.vy,p.vz??0,p.stamina,p.composure].every(Number.isFinite)||p.stamina<0||p.stamina>100||p.composure<0||p.composure>100)throw Error(`player resource bounds: ${p.id}`);
    if(p.state==='free'&&!walkable3D(p.x,p.y,p.z??0,p.team))throw Error(`free player collision: ${p.id} at ${p.x},${p.y},${p.z}`);
    if(p.state==='held'&&w.players.filter(c=>c.holding===p.id&&c.id===p.heldBy).length!==1)throw Error(`captive ownership mismatch: ${p.id}`);
    if(p.state==='caged'&&!occupied.has(p.id))throw Error(`caged without cage: ${p.id}`);
    if(p.state==='transit'&&(!p.transit||p.transit.arrive<w.time-.04))throw Error(`late or missing transit: ${p.id}`);
    if(p.transit&&![p.transit.arrive,p.transit.depart,p.transit.duration].every(Number.isFinite))throw Error('invalid transit timer');
    if(p.team==='chef'&&(p.layer==='tunnel'||p.state==='transit'))throw Error('chef entered tunnel');
  }
}
function privacy(w:World,s:Snapshot){
  const viewer=w.players.find(p=>p.id===s.selfId)!;
  for(const e of s.entities)if(e.team!==viewer.team){const p=w.players.find(p=>p.id===e.id)!;if(p.state==='transit'||p.transit)throw Error('enemy transit leaked');for(const key of ['cooldowns','stamina','composure','buff','transit','action','hidden'])if(key in e)throw Error(`enemy private field leaked: ${key}`);}
  for(const e of s.events)if(e.radius!==undefined&&Math.hypot(viewer.x-e.x,viewer.y-e.y)>e.radius+.001)throw Error('distant sound cue leaked');
}
for(const [mice,chefs]of distributions)for(let seed=1;seed<=count;seed++){
  const roster:LobbyPlayer[]=[];
  for(const [team,n]of [['mouse',mice],['chef',chefs]] as const)for(let i=0;i<n;i++)roster.push({id:`${team}-${i}`,name:`${team}${i}`,team,classId:team==='mouse'?(['scout','hauler','saboteur','rescuer']as const)[(i+seed-1)%4]:(['head','sous','pastry']as const)[(i+seed-1)%3],ready:true,bot:true,connected:true});
  const w=createWorld(roster,{duration:480,bots:false,difficulty:'normal',mode:'3d'},seed),localStart=performance.now();let transits=0,reroutes=0,maxArrivalError=0,privacyChecks=0,lastEvent=0;const previousTransit=new Map<string,number>();
  try{
    while(!w.result&&w.time<=570){
      const start=performance.now(),inputs=new Map(w.players.map(p=>[p.id,botInput3D(w,p)])),afterBots=performance.now();
      stepWorld(w,inputs);const afterSim=performance.now();
      if(w.tick%2===0)for(const p of w.players){const snap=snapshotFor(w,p);privacy(w,snap);privacyChecks++;}
      const end=performance.now();timing.bots.push(afterBots-start);timing.simulation.push(afterSim-afterBots);timing.snapshots.push(end-afterSim);timing.total.push(end-start);
      resources(w);
      for(const p of w.players){if(p.transit){if(!previousTransit.has(p.id))transits++;previousTransit.set(p.id,p.transit.arrive);}else if(previousTransit.has(p.id)){maxArrivalError=Math.max(maxArrivalError,Math.abs(w.time-previousTransit.get(p.id)!));previousTransit.delete(p.id);}}
      for(const e of w.events)if(e.id>lastEvent){if(e.kind==='reroute')reroutes++;lastEvent=Math.max(lastEvent,e.id);}
    }
    if(!w.result)throw Error('match did not end by length+90seconds');
    results.push({players:mice+chefs,split:`${mice}v${chefs}`,seed,classes:roster.map(p=>p.classId),seconds:w.time,winner:w.result.winner,reason:w.result.reason,heist:w.heist,rating:w.rating,captures:w.players.reduce((n,p)=>n+p.stats.captures,0),deliveries:w.players.reduce((n,p)=>n+p.stats.deliveries,0),dishes:w.players.reduce((n,p)=>n+p.stats.dishes,0),rescues:w.players.reduce((n,p)=>n+p.stats.rescues,0),transits,reroutes,maxArrivalErrorSeconds:maxArrivalError,privacyChecks,wallSeconds:(performance.now()-localStart)/1000});
    console.log(`${mice+chefs} players seed${seed}: ${w.result.winner} at ${w.time.toFixed(1)}s; ${transits} transits; all invariants/privacy passed`);
  }catch(error){failures.push({players:mice+chefs,seed,tick:w.tick,time:w.time,error:String(error),playersAtFailure:w.players.map(p=>({id:p.id,state:p.state,x:p.x,y:p.y,z:p.z,transit:p.transit,traversal:p.traversal,holding:p.holding,heldBy:p.heldBy,cageId:p.cageId}))});console.log(`FAILED ${mice+chefs}players seed${seed}: ${String(error)}`);}
}
function stats(values:number[]){const sorted=[...values].sort((a,b)=>a-b);return{meanMs:values.reduce((a,b)=>a+b,0)/Math.max(1,values.length),p99Ms:sorted[Math.floor(sorted.length*.99)]??0,maxMs:sorted.at(-1)??0,samples:values.length};}
const report={completed:results.length,requested:distributions.length*count,failures,timing:Object.fromEntries(Object.entries(timing).map(([k,v])=>[k,stats(v)])),elapsedWallSeconds:(performance.now()-started)/1000,results,limitations:['Deterministic normal-difficulty bots with three class rotations per player count; not human balance evidence.','Total timings include bot pathfinding, simulation and 15Hz per-player interest snapshots, but exclude network serialization, sockets and browser rendering.','Collision/resource/ownership checks run every tick; privacy checks run on every generated per-player snapshot.']};
mkdirSync('work',{recursive:true});writeFileSync('work/simulation3d-results.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({completed:report.completed,requested:report.requested,failures:failures.length,timing:report.timing},null,2));
if(failures.length)process.exitCode=1;
