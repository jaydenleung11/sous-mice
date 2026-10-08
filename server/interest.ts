import type { EntityView, Player, Snapshot, World } from '../shared/protocol';
import { visibleTo } from '../shared/sim';
export function snapshotFor(world:World, viewer:Player):Snapshot {
  const q=(n:number)=>world.mode==='3d'?Math.round(n*1000)/1000:Math.round(n*16)/16;
  const team=world.players.filter(p=>p.team===viewer.team);
  const known=(target:Player)=>target.team===viewer.team || !(world.mode==='3d'&&(target.state==='transit'||target.transit))&&team.some(p=>visibleTo(world,p,target));
  const entities:EntityView[]=world.players.filter(known).map(p=>{
    const v:EntityView={id:p.id,name:p.name,team:p.team,classId:p.classId,bot:p.bot,x:q(p.x),y:q(p.y),angle:Math.round(p.angle*100)/100,layer:p.layer,state:p.state,carry:p.carry};
    if(world.mode==='3d')Object.assign(v,{mode:'3d',z:q(p.z??0),pitch:p.pitch??0});
    if(p.team===viewer.team) Object.assign(v,{stamina:Math.round(p.stamina),composure:Math.round(p.composure),buff:p.buff,buffUntil:p.buffUntil,buffUses:p.buffUses,cooldowns:p.cooldowns,action:p.action,holding:p.holding,heldBy:p.heldBy,cageId:p.cageId,stateUntil:p.stateUntil,stats:p.stats,hidden:p.hidden,...(world.mode==='3d'?{vz:p.vz,grounded:p.grounded,transit:p.transit,traversal:p.traversal,exposure:p.exposure}:{})});
    return v;
  });
  const events=world.events.filter(e=>{
    if(e.team&&e.team!==viewer.team)return false;
    if(world.mode==='3d'&&e.radius!==undefined){if(viewer.state==='transit'||Math.hypot(viewer.x-e.x,viewer.y-e.y)>e.radius)return false;return true;}
    const actor=e.playerId&&world.players.find(p=>p.id===e.playerId);return !actor||known(actor);
  }).map(e=>world.mode==='3d'&&e.radius!==undefined?{...e,playerId:undefined}:e);
  return {type:'snap',...(world.mode==='3d'?{mode:'3d' as const}:{}),tick:world.tick,time:world.time,duration:world.duration,ackSeq:viewer.ackSeq,selfId:viewer.id,entities,pickups:world.pickups,cages:world.cages,traps:world.traps.filter(t=>t.team===viewer.team||team.some(p=>Math.hypot(p.x-t.x,p.y-t.y)<=2)),guests:world.guests,orders:world.orders.map(o=>{const copy={...o};if(viewer.team==='chef')delete copy.tamper;return copy;}),events,heist:world.heist,rating:world.rating,lockdown:world.lockdown,plugs:world.plugs,result:world.result};
}
