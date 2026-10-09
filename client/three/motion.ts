import type {EntityView} from '../../shared/protocol';

/** Cosmetic state only: never writes to a player or a collision transform. */
export type Motion={time?:number;yaw?:number;gait:number;travel:number;move:number;carry:number;heavy:number;climb:number;action:number;eat:number;held:number;land:number;air:number;airDuration:number;flip:number;grounded:boolean};
export const motionState=():Motion=>({gait:0,travel:0,move:0,carry:0,heavy:0,climb:0,action:0,eat:0,held:0,land:0,air:-1,airDuration:.32,flip:0,grounded:true});
const blend=(a:number,b:number,rate:number,dt:number)=>a+(b-a)*(1-Math.exp(-rate*dt));
const smooth=(x:number)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function updateMotion(m:Motion,e:EntityView,time:number,speed:number,reduced:boolean){
 const dt=Math.max(0,Math.min(.05,m.time===undefined?1/60:time-m.time));m.time=time;
 const target=Math.PI/2-e.angle;
 if(m.yaw===undefined)m.yaw=target;else m.yaw+=Math.atan2(Math.sin(target-m.yaw),Math.cos(target-m.yaw))*(1-Math.exp(-18*dt));
 const grounded=e.grounded!==false&&!e.traversal&&e.state==='free';
 const moving=grounded&&speed>.035;
 m.move=blend(m.move,moving?Math.min(1,speed/(e.team==='mouse'?.6:1.2)):0,15,dt);
 m.travel+=moving?speed*dt:0;
 // Integrating travel preserves phase through starts, stops and speed changes.
 m.gait+=moving?speed*dt/(e.team==='mouse'?.38:.88)*Math.PI*2:0;
 m.carry=blend(m.carry,e.carry||e.holding?1:0,18,dt);
 m.heavy=blend(m.heavy,e.carry&&['wheel','crate'].includes(e.carry)?1:0,18,dt);
 m.climb=blend(m.climb,e.traversal?1:0,18,dt);
 m.action=blend(m.action,e.action?1:0,18,dt);
 m.eat=blend(m.eat,e.action?.kind==='eat'?1:0,18,dt);
 m.held=blend(m.held,e.state==='held'?1:0,16,dt);
 m.land=blend(m.land,0,20,dt);
 if(m.grounded&&!grounded&&!e.traversal&&e.state==='free'&&(e.vz||0)>.4){m.air=0;m.airDuration=Math.max(.2,2*(e.vz||1.5)/9.8);}
 if(!m.grounded&&grounded){m.land=reduced?0:1;m.air=-1;}
 if(e.traversal||e.state!=='free')m.air=-1;
 if(m.air>=0){m.air+=dt;m.flip=reduced?0:smooth((m.air/m.airDuration-.08)/.82)*Math.PI*2;}
 else {const wrapped=Math.atan2(Math.sin(m.flip),Math.cos(m.flip));m.flip=reduced?0:blend(wrapped,0,24,dt);}
 m.grounded=grounded;
 return m;
}
