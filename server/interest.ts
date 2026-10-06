import type { EntityView, Player, Snapshot, World } from '../shared/protocol';
import { visibleTo } from '../shared/sim';
const q=(n:number)=>Math.round(n*16)/16;
export function snapshotFor(world:World, viewer:Player):Snapshot {
  const team=world.players.filter(p=>p.team===viewer.team);
  const known=(target:Player)=>target.team===viewer.team || team.some(p=>visibleTo(world,p,target));
  const entities:EntityView[]=world.players.filter(known).map(p=>{
    const v:EntityView={id:p.id,name:p.name,team:p.team,classId:p.classId,bot:p.bot,x:q(p.x),y:q(p.y),angle:Math.round(p.angle*100)/100,layer:p.layer,state:p.state,carry:p.carry};
    if(p.team===viewer.team) Object.assign(v,{stamina:Math.round(p.stamina),composure:Math.round(p.composure),buff:p.buff,buffUntil:p.buffUntil,buffUses:p.buffUses,cooldowns:p.cooldowns,action:p.action,holding:p.holding,heldBy:p.heldBy,cageId:p.cageId,stateUntil:p.stateUntil,stats:p.stats,hidden:p.hidden});
    return v;
  });
  return {type:'snap',tick:world.tick,time:world.time,duration:world.duration,ackSeq:viewer.ackSeq,selfId:viewer.id,entities,pickups:world.pickups,cages:world.cages,traps:world.traps.filter(t=>t.team===viewer.team||team.some(p=>Math.hypot(p.x-t.x,p.y-t.y)<=2)),guests:world.guests,orders:world.orders.map(o=>{const copy={...o};if(viewer.team==='chef')delete copy.tamper;return copy;}),events:world.events.filter(e=>{if(e.team&&e.team!==viewer.team)return false;const actor=e.playerId&&world.players.find(p=>p.id===e.playerId);return !actor||known(actor);}),heist:world.heist,rating:world.rating,lockdown:world.lockdown,plugs:world.plugs,result:world.result};
}
