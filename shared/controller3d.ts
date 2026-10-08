import {BUTTON} from './constants';
import {SCALE3D,TRAVERSALS3D,COLLIDERS3D,walkable3D,supportHeight3D,coverAt3D,traversalPosition3D,type Traversal3D} from './content3d';
import type {Player,InputFrame,World} from './protocol';
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function movePlayer3D(p:Player,input:InputFrame,dt:number,world?:World):void{
 if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);
 const time=(p.cooldowns.controllerTime??world?.time??input.tick/30)+dt;p.cooldowns.controllerTime=time;
 if(Number.isFinite(input.yaw))p.angle=input.yaw!;else if(Number.isFinite(input.yawDelta))p.angle+=input.yawDelta!;
 if(Number.isFinite(input.pitch))p.pitch=clamp(input.pitch!,-(p.team==='mouse'?80:60)*Math.PI/180,(p.team==='mouse'?85:40)*Math.PI/180);else if(Number.isFinite(input.pitchDelta))p.pitch=clamp((p.pitch??0)+input.pitchDelta!,-(p.team==='mouse'?80:60)*Math.PI/180,(p.team==='mouse'?85:40)*Math.PI/180);
 p.z??=0;p.vz??=0;p.grounded??=true;
 if(p.state!=='free'||p.hidden||p.transit||p.action||(p.cooldowns.grabWindup??0)>time){p.vx=0;p.vy=0;return;}
 let mx=Number.isFinite(input.mx)?clamp(input.mx,-1,1):0,my=Number.isFinite(input.my)?clamp(input.my,-1,1):0,magnitude=Math.hypot(mx,my),moving=magnitude>.01;
 if(p.traversal){const t=p.traversal,f=clamp((time-t.started)/(t.arrive-t.started),0,1);Object.assign(p,traversalPosition3D(t,f));p.stamina=Math.max(0,p.stamina-8*dt);p.vx=0;p.vy=0;p.vz=0;p.grounded=false;if(f===1){p.traversal=undefined;p.grounded=true;p.layer=p.z!>.04?'ledge':'floor';}return;}
 if(p.team==='mouse'&&(input.buttons&BUTTON.USE)&&moving&&p.stamina>=8){let route:Traversal3D|undefined=TRAVERSALS3D.find(t=>Math.hypot(p.x-t.from.x,p.y-t.from.y,p.z!-(t.from.z??0))<=.18&&p.stamina>=8*t.duration&&walkable3D(t.to.x,t.to.y,t.to.z??0,'mouse'));
  if(!route&&p.buff==='grip'&&p.buffUntil>time){for(const c of COLLIDERS3D){if(c.cover||c.z+c.h<=p.z+.05||c.z+c.h>2.8)continue;const x=clamp(p.x,c.x,c.x+c.w),y=clamp(p.y,c.y,c.y+c.d);if(Math.hypot(x-p.x,y-p.y)>.15)continue;const to={x:clamp(p.x,c.x+.04,c.x+c.w-.04),y:clamp(p.y,c.y+.04,c.y+c.d-.04),z:c.z+c.h},candidate={id:'grip-'+c.id,from:{x:p.x,y:p.y,z:p.z},to,duration:Math.max(.4,(to.z-p.z)/1.2)};if(candidate.duration*8<=p.stamina&&Array.from({length:21},(_,i)=>traversalPosition3D(candidate,i/20)).every(q=>walkable3D(q.x,q.y,q.z??0,'mouse'))){route=candidate;break;}}}
  if(route){p.traversal={...route,started:time,arrive:time+route.duration};return;}}
 const sneak=p.team==='mouse'&&Boolean(input.buttons&BUTTON.SNEAK),freeSprint=(p.buff==='dash'&&p.buffUntil>time)||(p.cooldowns.sugar??0)>time;
 if(p.stamina<10)p.cooldowns.sprintLocked=1;else if(p.stamina>=30)p.cooldowns.sprintLocked=0;
 const sprint=!sneak&&moving&&Boolean(input.buttons&BUTTON.SPRINT)&&(freeSprint||!p.cooldowns.sprintLocked&&p.stamina>0);
 let speed:number=p.team==='mouse'?(sneak?SCALE3D.mouseSneak:sprint?SCALE3D.mouseSprint:SCALE3D.mouseWalk):(sprint?SCALE3D.chefSprint:SCALE3D.chefWalk);
 if(p.classId==='scout')speed*=1.1;if(p.classId==='pastry')speed*=1.12;if(p.buff==='dash'&&p.buffUntil>time)speed*=1.45;
 if(p.carry)speed*=p.carry==='wheel'||p.carry==='crate'?(p.classId==='hauler'?.8:.6):.95;if(p.holding)speed*=.75;if((p.cooldowns.scalded??p.cooldowns.slowUntil??0)>time)speed*=.65;if((p.cooldowns.stink??0)>time)speed*=.75;
 if((p.cooldowns.dodgeUntil??0)>time){speed=6;mx=Math.cos(p.cooldowns.dodgeAngle??p.angle);my=Math.sin(p.cooldowns.dodgeAngle??p.angle);magnitude=1;moving=true;}
 if(sprint&&!freeSprint){p.stamina=Math.max(0,p.stamina-(p.team==='mouse'?22:30)*dt);p.cooldowns.lastSprint=time;}else if(time-(p.cooldowns.lastSprint??-100)>1)p.stamina=Math.min(100,p.stamina+(p.team==='mouse'?14:12)*dt);
 const jumpPressed=Boolean(input.buttons&BUTTON.JUMP)&&!p.cooldowns.jumpHeld;p.cooldowns.jumpHeld=Number(Boolean(input.buttons&BUTTON.JUMP));
 if(p.team==='mouse'&&jumpPressed&&p.grounded){p.vz=Math.sqrt(2*SCALE3D.gravity*SCALE3D.jumpHeight);p.grounded=false;p.cooldowns.dropStart=p.z;}
 const startX=p.x,startY=p.y;const dx=moving?mx/Math.max(1,magnitude)*speed*dt:0,dy=moving?my/Math.max(1,magnitude)*speed*dt:0;
 const substeps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.02));
 for(let i=0;i<substeps;i++)for(const [ax,ay]of [[dx/substeps,0],[0,dy/substeps]]){if(walkable3D(p.x+ax,p.y+ay,p.z,p.team)){p.x+=ax;p.y+=ay;}else if(p.grounded){const top=supportHeight3D(p.x+ax,p.y+ay,p.z+(p.team==='mouse'?SCALE3D.mouseStep:SCALE3D.chefStep),p.team);if(top>p.z&&walkable3D(p.x+ax,p.y+ay,top,p.team)){p.x+=ax;p.y+=ay;p.z=top;}}}
 const support=supportHeight3D(p.x,p.y,p.z+.001,p.team);
 if(!p.grounded||p.z>support+.001){if(p.grounded){p.cooldowns.dropStart=p.z;p.grounded=false;}const next=p.z+p.vz*dt-.5*SCALE3D.gravity*dt*dt;p.vz-=SCALE3D.gravity*dt;const landing=supportHeight3D(p.x,p.y,p.z+.001,p.team);if(next<=landing&&p.vz<=0){p.z=landing;p.vz=0;p.grounded=true;if((p.cooldowns.dropStart??p.z)-p.z>.6)p.cooldowns.dropStunUntil=time+.6;}else if(walkable3D(p.x,p.y,Math.max(0,next),p.team))p.z=Math.max(0,next);else p.vz=0;}
 if((p.cooldowns.dropStunUntil??0)>time){p.x=startX;p.y=startY;}
 p.vx=(p.x-startX)/dt;p.vy=(p.y-startY)/dt;p.layer=p.z>.04?'ledge':'floor';p.exposure=1-coverAt3D(p);
}

