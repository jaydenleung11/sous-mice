import {MAP3D,NAV3D,TRAVERSALS3D,coverAt3D,segmentWalkable3D,zoneAt3D} from '../shared/content3d';
import {FOODS} from '../shared/content';
import {BUTTON} from '../shared/constants';
import {contextAction,visibleTo,botReactionTime} from '../shared/sim';
import {chooseTransitExit} from '../shared/transit3d';
import type {InputFrame,Player,World,Vec,Team} from '../shared/protocol';
const distance=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z??0)-(b.z??0));
const nearest=<T extends Vec>(p:Vec,items:T[])=>items.slice().sort((a,b)=>distance(p,a)-distance(p,b))[0];
type Memory={seq:number;path:Vec[];target?:Vec;planned:number;food?:string;enemy?:string;noticed:number;intent:'eat'|'deliver'|'tamper'};
const memories=new WeakMap<Player,Memory>();
const adjacency=new Map<Team,Map<number,[number,number][]>>();
function adjacent(team:Team){let map=adjacency.get(team);if(map)return map;map=new Map();const nav=NAV3D[team];for(const [a,b,cost]of nav.edges){const from=nav.nodes[a],to=nav.nodes[b];if(distance(from,to)>.8&&!TRAVERSALS3D.some(t=>distance(t.from,from)<.01&&distance(t.to,to)<.01))continue;const list=map.get(a)??[];list.push([b,cost]);map.set(a,list);}adjacency.set(team,map);return map;}
export function route3D(player:Player,target:Vec):Vec[]{
 if(Math.abs((player.z??0)-(target.z??0))<.01&&segmentWalkable3D(player,target,player.team))return [{...target}];
 const nav=NAV3D[player.team];if(!nav.nodes.length)return [];
 const closest=(p:Vec)=>nav.nodes.reduce((a,b,i)=>distance(p,b)<distance(p,nav.nodes[a])?i:a,0),start=closest(player),end=closest(target);
 const costs=new Map<number,number>([[start,0]]),parents=new Map<number,number>(),open=new Set([start]);let reached=false;
 while(open.size){let node=-1,value=Infinity;for(const i of open){const f=costs.get(i)!+distance(nav.nodes[i],nav.nodes[end]);if(f<value){value=f;node=i;}}if(node===end){reached=true;break;}open.delete(node);for(const [next,cost]of adjacent(player.team).get(node)??[]){const total=costs.get(node)!+cost;if(total<(costs.get(next)??Infinity)){costs.set(next,total);parents.set(next,node);open.add(next);}}}
 if(!reached)return [];const path:Vec[]=[];for(let at=end;at!==start;at=parents.get(at)!)path.unshift(nav.nodes[at]);
 if(segmentWalkable3D(nav.nodes[end],target,player.team))path.push({...target});return path;
}
function toward(w:World,p:Player,m:Memory,target:Vec,f:InputFrame,sprint=false){
 if(!m.target||distance(m.target,target)>.3||w.time-m.planned>2||!m.path.length){m.path=route3D(p,target);m.target={...target};m.planned=w.time;}
 while(m.path.length>1&&distance(p,m.path[0])<.11)m.path.shift();
 let next=m.path[0];if(!next)return;
 const climb=TRAVERSALS3D.find(t=>distance(p,t.from)<.18&&distance(t.to,next)<.12);
 if(climb){f.buttons|=BUTTON.USE;f.mx=1;return;}
 const d=Math.hypot(next.x-p.x,next.y-p.y);if(d>.07){f.mx=(next.x-p.x)/Math.max(.2,d);f.my=(next.y-p.y)/Math.max(.2,d);f.yaw=Math.atan2(f.my,f.mx);}f.ax=target.x;f.ay=target.y;if(sprint)f.buttons|=BUTTON.SPRINT;
}
/** Same priorities as v2: rescue, provisions, safety; capture, cage, service, patrol.
 * Decisions about enemies use only shared team visibility. Paths use generated v3 nav.
 */
export function botInput3D(w:World,p:Player):InputFrame{
 let m=memories.get(p);if(!m){m={seq:0,path:[],planned:-100,noticed:0,intent:'deliver'};memories.set(p,m);}
 const f:InputFrame={seq:++m.seq,tick:w.tick,mx:0,my:0,buttons:0,ax:p.x+Math.cos(p.angle),ay:p.y+Math.sin(p.angle),yaw:p.angle,pitch:p.pitch??0};
 const use=(button:number=BUTTON.USE)=>{f.mx=0;f.my=0;f.buttons=button;return f;};
 if(p.state==='transit'&&p.transit){const goal=p.carry?MAP3D.stash:w.pickups.find(food=>food.id===m!.food&&food.available)??MAP3D.pickups[0];const exits=MAP3D.holes.filter(h=>p.transit!.choices.includes(h.id)&&!(w.plugs[h.id]>w.time));const chosen=nearest(goal,exits);if(chosen)chooseTransitExit(w,p,chosen.id);return f;}
 if(p.state==='held'||p.state==='stunned'){f.buttons=w.tick%3===0?BUTTON.USE:0;return f;}if(p.state!=='free'||p.traversal)return f;
 if(p.cooldowns.useLatch)return f;if(p.hidden){if(w.tick%90===0)f.buttons=BUTTON.USE;return f;}
 const enemies=w.players.filter(e=>e.team!==p.team&&['free','stunned'].includes(e.state)&&w.players.some(a=>a.team===p.team&&visibleTo(w,a,e))),enemy=nearest(p,enemies);
 if(m.enemy!==enemy?.id){m.enemy=enemy?.id;m.noticed=w.time;}const noticed=!!enemy&&w.time-m.noticed>=botReactionTime(w),context=contextAction(w,p);
 if(p.team==='mouse'){
  const heavy=p.carry==='wheel'||p.carry==='crate',holes=MAP3D.holes.filter(h=>!(w.plugs[h.id]>w.time)&&(!heavy||h.wide));
  if(p.carry){
   if(context?.kind==='deliver')return use();
   if(zoneAt3D(p.x,p.y)?.id==='burrow'){toward(w,p,m,MAP3D.stash,f,true);return f;}
   if(FOODS[p.carry].buff&&(m.intent==='eat'||noticed&&distance(p,enemy!)<2.5)&&p.carry!=='vegetable')return use(BUTTON.EAT);
   if(m.intent==='tamper'&&FOODS[p.carry].tamper&&w.orders.some(o=>o.stage==='ready'&&!o.tamper)){if(context?.kind==='tamper')return use();toward(w,p,m,MAP3D.objects.find(o=>o.kind==='pass')!,f);return f;}
   const hole=nearest(p,holes);if(hole){if(distance(p,hole)<.19)return use();toward(w,p,m,hole,f,true);}return f;
  }
  const cage=nearest(p,w.cages.filter(c=>c.occupant&&(c.keyCarrier===p.id||p.classId==='rescuer'&&(p.cooldowns.ability??0)<=w.time)));
  if(cage&&zoneAt3D(p.x,p.y)?.id!=='burrow'){if(distance(p,cage)<1.2)return use(cage.keyCarrier===p.id?BUTTON.USE:BUTTON.ABILITY);toward(w,p,m,cage,f,true);return f;}
  const key=nearest(p,w.cages.flatMap(c=>c.keyDropped?[c.keyDropped]:[]));if(key&&zoneAt3D(p.x,p.y)?.id!=='burrow'){if(context?.kind==='key')return use();toward(w,p,m,key,f,true);return f;}
  if(noticed&&enemy&&distance(p,enemy)<3){if(coverAt3D(p)>.9&&context?.kind==='hide')return use();const hole=nearest(p,holes);if(hole){if(distance(p,hole)<.19)return use();toward(w,p,m,hole,f,true);}if(p.buffUses>0&&w.tick%10===0){f.buttons|=BUTTON.ATTACK;f.ax=enemy.x;f.ay=enemy.y;}if(w.tick%30===0)f.buttons|=BUTTON.DODGE;return f;}
  let food=w.pickups.find(q=>q.id===m!.food&&q.available);if(!food){const foods=w.pickups.filter(q=>q.available&&q.food!=='vegetable'&&(p.classId==='hauler'||!['wheel','crate'].includes(q.food))).sort((a,b)=>distance(p,a)-distance(p,b));const hash=p.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)+Math.floor(w.time/20);food=foods[hash%Math.max(1,Math.min(5,foods.length))];m.food=food?.id;m.intent=hash%7===0?'eat':hash%7===1?'tamper':'deliver';}
  if(!food)return f;if(zoneAt3D(p.x,p.y)?.id==='burrow'){const hole=MAP3D.holes.find(h=>h.id==='HB')!;if(distance(p,hole)<.19)return use();toward(w,p,m,hole,f);return f;}
  if(context?.kind==='pickup'&&context.target===food.id)return use();toward(w,p,m,food,f);return f;
 }
 if(p.holding){const cage=nearest(p,w.cages.filter(c=>!c.occupant));if(cage){if(context?.kind==='cage')return use();toward(w,p,m,cage,f,true);}return f;}
 if(noticed&&enemy&&distance(p,enemy)<7){toward(w,p,m,{x:enemy.x,y:enemy.y,z:0},f,true);f.yaw=Math.atan2(enemy.y-p.y,enemy.x-p.x);f.ax=enemy.x;f.ay=enemy.y;if(distance(p,enemy)<1.1&&w.tick%2===0)f.buttons|=BUTTON.ATTACK;if(distance(p,enemy)>1.2&&w.tick%40===0)f.buttons|=BUTTON.COLANDER;return f;}
 if(w.orders.some(o=>o.stage==='ready')){if(context?.kind==='send')return use();const pass=MAP3D.objects.find(o=>o.kind==='pass')!;toward(w,p,m,{x:pass.x,y:pass.y+.8,z:0},f,true);return f;}
 const alert=[...w.events].reverse().find(e=>['alert','noise','rustle'].includes(e.kind)&&w.time-e.time<3&&(!e.radius||distance(p,e)<=e.radius));if(alert)toward(w,p,m,alert,f,true);else{const patrol=[{x:8,y:21},{x:20,y:20},{x:33,y:20},{x:26,y:7},{x:11,y:7}],index=(Math.floor(w.time/8)+p.id.length)%patrol.length;toward(w,p,m,patrol[index],f);}
 if(w.tick%180<20)f.buttons|=BUTTON.INSPECT;if(w.tick%300===0)f.buttons|=BUTTON.EAR;const hole=nearest(p,MAP3D.holes);if(hole&&distance(p,hole)<1&&w.tick%240<25)f.buttons|=BUTTON.PEEK;return f;
}

