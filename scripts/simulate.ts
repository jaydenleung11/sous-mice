import { mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { createWorld, stepWorld } from '../shared/sim';
import { botInput } from '../bots';
import { isWalkable } from '../shared/content';
import type { LobbyPlayer, World } from '../shared/protocol';

const index = process.argv.indexOf('--matches');
const matches = index >= 0 ? Number(process.argv[index + 1]) : 300;
if (!Number.isInteger(matches) || matches < 1 || matches > 10000) throw new Error('--matches must be an integer from 1 to 10000');
const sizes = [[1,1],[2,1],[2,2],[3,2],[3,3],[4,2],[4,3],[5,3]];
const records: {seed:number;size:string;winner:string;reason:string;seconds:number;captures:number;rescues:number;releases:number;deliveries:number;dishes:number;heist:number;rating:number}[]=[];
const tickTimes:number[]=[];
function invariant(w:World){
  for(const [name,n] of [['rating',w.rating],['heist',w.heist]] as const)if(!Number.isFinite(n)||n<0||n>100)throw new Error(`${name} out of bounds at tick ${w.tick}`);
  const occupied=new Set<string>();
  for(const c of w.cages){if(c.occupant){if(occupied.has(c.occupant))throw new Error('Mouse occupies two cages');occupied.add(c.occupant);const m=w.players.find(p=>p.id===c.occupant);if(!m||m.state!=='caged'||m.cageId!==c.id)throw new Error('Cage ownership inconsistent');}}
  for(const p of w.players){
    if(![p.x,p.y,p.stamina,p.composure].every(Number.isFinite)||p.stamina<0||p.stamina>100||p.composure<0||p.composure>100)throw new Error(`Bad resource for ${p.id}`);
    if(!isWalkable(p.x,p.y,p.team,p.layer,p.team==='mouse'?.28:.5))throw new Error(`Solid overlap ${p.id}: ${p.x},${p.y},${p.layer}`);
    if(p.state==='held'&&w.players.filter(c=>c.holding===p.id&&c.id===p.heldBy).length!==1)throw new Error('Held mouse lacks exactly one holder');
    if(p.state==='caged'&&!occupied.has(p.id))throw new Error('Caged mouse lacks cage');
    if(p.team==='chef'&&p.layer!=='floor')throw new Error('Chef escaped floor');
  }
}
const started=performance.now();
for(let seed=1;seed<=matches;seed++){
  const [mice,chefs]=sizes[(seed-1)%sizes.length];
  const roster:LobbyPlayer[]=[];
  for(const [team,count] of [['mouse',mice],['chef',chefs]] as const)for(let n=0;n<count;n++)roster.push({id:`${team}-${n}`,name:`${team} ${n}`,team,classId:team==='mouse'?(['scout','hauler','saboteur','rescuer'] as const)[n%4]:(['head','sous','pastry'] as const)[n%3],ready:true,bot:true,connected:true});
  const w=createWorld(roster,{duration:480,bots:false,difficulty:'normal'},seed);
  let releases=0,lastEvent=0;
  while(!w.result&&w.time<=570){
    const inputs=new Map(w.players.map(p=>[p.id,botInput(w,p)]));
    if(w.tick%30===0){const begin=performance.now();stepWorld(w,inputs);tickTimes.push(performance.now()-begin);invariant(w);}else stepWorld(w,inputs);
    for(const e of w.events)if(e.id>lastEvent){if(e.kind==='rescue')releases++;lastEvent=Math.max(lastEvent,e.id);}
  }
  if(!w.result)throw new Error(`Match ${seed} failed to terminate`);invariant(w);
  records.push({seed,size:`${mice}v${chefs}`,winner:w.result.winner,reason:w.result.reason,seconds:w.time,captures:w.players.reduce((n,p)=>n+p.stats.captures,0),rescues:w.players.reduce((n,p)=>n+p.stats.rescues,0),releases,deliveries:w.players.reduce((n,p)=>n+p.stats.deliveries,0),dishes:w.players.reduce((n,p)=>n+p.stats.dishes,0),heist:w.heist,rating:w.rating});
  if(seed%25===0||seed===matches)console.log(`${seed}/${matches} matches passed invariants`);
}
const median=(values:number[])=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)]??0;
const percent=(count:number,total=matches)=>Number((count/total*100).toFixed(2));
const balanced=records.filter(r=>r.size==='3v3');
const aggregate={matches,invariantFailures:0,elapsedSeconds:Number(((performance.now()-started)/1000).toFixed(2)),chefWinPercent:percent(records.filter(r=>r.winner==='chef').length),chefWinPercent3v3:balanced.length?percent(balanced.filter(r=>r.winner==='chef').length,balanced.length):null,mouseHeistPercent:percent(records.filter(r=>r.reason.includes('heist')).length),mouseRatingPercent:percent(records.filter(r=>r.reason.includes('rating')).length),chefLockdownPercent:percent(records.filter(r=>r.reason.includes('Lockdown')).length),earlyEndPercent:percent(records.filter(r=>r.seconds<300).length),medianSeconds:median(records.map(r=>r.seconds)),captures:records.reduce((n,r)=>n+r.captures,0),teammateRescues:records.reduce((n,r)=>n+r.rescues,0),allReleases:records.reduce((n,r)=>n+r.releases,0),serverTickAverageMs:tickTimes.reduce((a,b)=>a+b,0)/tickTimes.length,serverTickP99Ms:tickTimes.sort((a,b)=>a-b)[Math.floor(tickTimes.length*.99)]};
const balancePass=aggregate.chefWinPercent3v3!==null&&aggregate.chefWinPercent3v3>=45&&aggregate.chefWinPercent3v3<=55&&aggregate.mouseHeistPercent>=25&&aggregate.mouseHeistPercent<=40&&aggregate.mouseRatingPercent>=5&&aggregate.mouseRatingPercent<=15&&aggregate.chefLockdownPercent>=5&&aggregate.chefLockdownPercent<=15&&aggregate.earlyEndPercent<10&&aggregate.medianSeconds>=390;
mkdirSync('work',{recursive:true});
writeFileSync('work/simulation-results.json',JSON.stringify({aggregate,balancePass,limitations:['These are deterministic bot matches, not human balance validation.','Rescue counts distinguish teammate unlocks from all release events (including squirm and auto-release).','Server tick metrics exclude bot pathfinding, transport and snapshot generation.'],records},null,2));
console.log(JSON.stringify({aggregate,balancePass},null,2));
if(!balancePass)console.log('BALANCE TARGETS NOT MET. Invariant pass is not a balance pass. See work/simulation-results.json.');
