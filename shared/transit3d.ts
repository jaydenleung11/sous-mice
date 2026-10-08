import { MAP3D, walkable3D } from './content3d';
import type { Player, World, Vec } from './protocol';

const dist=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z??0)-(b.z??0));
const heavy=(p:Player)=>p.carry==='wheel'||p.carry==='crate';
export function tunnelDistance(from:string,to:string):number {
  const lengths=new Map<string,number>([[from,0]]),open=new Set<string>([from]);
  while(open.size){let at=[...open].sort((a,b)=>lengths.get(a)!-lengths.get(b)!)[0];open.delete(at);if(at===to)return lengths.get(at)!;
    for(const edge of MAP3D.tunnelEdges){const next=edge.from===at?edge.to:edge.to===at?edge.from:undefined;if(!next)continue;const value=lengths.get(at)!+edge.length;if(value<(lengths.get(next)??Infinity)){lengths.set(next,value);open.add(next);}}
  }return Infinity;
}
export function transitChoices(w:World,p:Player,entry:string):string[]{
  const hole=MAP3D.holes.find(h=>h.id===entry);if(!hole)return[];
  return MAP3D.holes.filter(h=>h.id!==entry&&(!heavy(p)||h.wide)&&Number.isFinite(tunnelDistance(entry,h.id))).sort((a,b)=>(a.id===hole.paired?-1:b.id===hole.paired?1:tunnelDistance(entry,a.id)-tunnelDistance(entry,b.id))).slice(0,4).map(h=>h.id);
}
export function transitAvailable(w:World,p:Player,entry:string):boolean {
  const hole=MAP3D.holes.find(h=>h.id===entry);
  return w.mode==='3d'&&p.team==='mouse'&&p.state==='free'&&!p.traversal&&!!hole&&dist(p,hole)<=.22&&!(w.plugs[entry]>w.time)&&(!heavy(p)||hole.wide)&&(p.cooldowns.transit??0)<=w.time&&(p.transitHistory??[]).filter(t=>w.time-t<60).length<3;
}
function rustle(w:World,at:Vec){w.events.push({id:w.nextId++,kind:'rustle',text:'A rustle in the wall',x:at.x,y:at.y,z:at.z??0,time:w.time,radius:6});}
function synchronize(w:World,p:Player){
  if(!p.transit)return;const related=w.players.filter(a=>a.id!==p.id&&a.transit&&a.transit.entry===p.transit!.entry&&a.transit.exit===p.transit!.exit&&Math.abs(a.transit.entered-p.transit!.entered)<=1);
  for(const ally of related){const end=Math.max(ally.transit!.arrive,p.transit.arrive);ally.transit!.arrive=end;p.transit.arrive=end;}
}
export function startTransit(w:World,p:Player,entry:string,partner?:Player):boolean {
  if(!transitAvailable(w,p,entry))return false;
  if(heavy(p)&&p.classId!=='hauler'&&(!partner||partner.carry!==p.carry||!transitAvailable(w,partner,entry)||!(partner.lastButtons&1)))return false;
  const choices=transitChoices(w,p,entry),exit=choices.find(id=>!(w.plugs[id]>w.time));if(!exit)return false;
  const hole=MAP3D.holes.find(h=>h.id===entry)!,duration=Math.max(2.5,Math.min(4.5,1.8+.11*tunnelDistance(entry,exit)))+(heavy(p)?1.5:0);
  for(const mouse of partner&&heavy(p)?[p,partner]:[p]){
    mouse.transit={entry,exit,entered:w.time,depart:w.time+2.5,arrive:w.time+2.5+duration,duration,choices:[...choices],biome:hole.room==='dining'||hole.room==='foyer'?'wood':hole.room==='burrow'?'roots':'pipe',heavy:heavy(p)};
    mouse.state='transit';mouse.layer='tunnel';mouse.action=undefined;mouse.hidden=undefined;mouse.vx=0;mouse.vy=0;mouse.vz=0;mouse.invulnerableUntil=mouse.transit.arrive+1;
    mouse.transitHistory=[...(mouse.transitHistory??[]).filter(t=>w.time-t<60),w.time];mouse.cooldowns.useLatch=1;
    if(mouse.transitHistory.length>=3)mouse.cooldowns.transitCap=mouse.transitHistory[0]+60;
  }
  synchronize(w,p);rustle(w,hole);return true;
}
export function chooseTransitExit(w:World,p:Player,exit:string):boolean {
  const t=p.transit;if(w.mode!=='3d'||p.state!=='transit'||!t||w.time>=t.depart||!t.choices.includes(exit)||w.plugs[exit]>w.time)return false;
  const hole=MAP3D.holes.find(h=>h.id===exit);if(!hole||(t.heavy&&!hole.wide))return false;
  const duration=Math.max(2.5,Math.min(4.5,1.8+.11*tunnelDistance(t.entry,exit)))+(t.heavy?1.5:0);
  for(const mouse of w.players.filter(m=>m.id===p.id||(t.heavy&&m.transit?.heavy&&m.transit.entry===t.entry&&m.transit.entered===t.entered))){mouse.transit!.exit=exit;mouse.transit!.depart=w.time;mouse.transit!.duration=duration;mouse.transit!.arrive=w.time+duration;}
  synchronize(w,p);return true;
}
export function advanceTransits(w:World):void {
  if(w.mode!=='3d')return;
  for(const p of w.players){
    if((p.cooldowns.exitShieldAt??Infinity)<=w.time){p.invulnerableUntil=Math.max(p.invulnerableUntil,p.cooldowns.exitShieldUntil??0);delete p.cooldowns.exitShieldAt;}
    const t=p.transit;if(p.state!=='transit'||!t)continue;
    if(w.plugs[t.exit]>w.time){
      const blocked=MAP3D.holes.find(h=>h.id===t.exit),paired=MAP3D.holes.find(h=>h.id===blocked?.paired);
      const fallback=(paired&&!(w.plugs[paired.id]>w.time)&&(!t.heavy||paired.wide)?paired:MAP3D.holes.filter(h=>!(w.plugs[h.id]>w.time)&&(!t.heavy||h.wide)).sort((a,b)=>tunnelDistance(t.entry,a.id)-tunnelDistance(t.entry,b.id))[0]);
      if(fallback){t.exit=fallback.id;t.arrive+=1;t.duration+=1;t.rerouted=true;w.events.push({id:w.nextId++,kind:'reroute',text:'Blocked exit: rerouting',x:p.x,y:p.y,z:p.z,time:w.time,team:'mouse',playerId:p.id});synchronize(w,p);}
    }
    if(w.time+1e-8<t.arrive)continue;
    const hole=MAP3D.holes.find(h=>h.id===t.exit);if(!hole)continue;
    let place:Vec={x:hole.x,y:hole.y,z:hole.z??0};
    if(!walkable3D(place.x,place.y,place.z??0,'mouse')){
      for(let r=.04;r<=.4;r+=.04){const q={x:hole.x+Math.cos(hole.exitYaw)*r,y:hole.y+Math.sin(hole.exitYaw)*r,z:hole.z??0};if(walkable3D(q.x,q.y,q.z,'mouse')){place=q;break;}}
    }
    Object.assign(p,place);p.angle=hole.exitYaw;p.state='free';p.layer=(place.z??0)>.04?'ledge':'floor';p.transit=undefined;p.grounded=true;p.cooldowns.transit=w.time+4;p.cooldowns.useLatch=1;
    const ambush=w.players.some(c=>c.team==='chef'&&dist(c,p)<=2);
    p.invulnerableUntil=ambush?w.time:w.time+.6;
    if(ambush){p.cooldowns.exitShieldAt=w.time+.4;p.cooldowns.exitShieldUntil=w.time+.6;}
    p.cooldowns.exitLookahead=w.time+.3;rustle(w,place);
  }
}
