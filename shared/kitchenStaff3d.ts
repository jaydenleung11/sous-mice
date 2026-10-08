import type {Vec} from './protocol';

export type StaffPose=Vec&{id:string;variant:number;angle:number;speed:number;task:'stir'|'chop'|'carry'|'walk'};
type Stop=Vec&{wait:number;angle:number;task:StaffPose['task']};
const routes:Stop[][]=[
 [{x:6.05,y:23.05,wait:12,angle:Math.PI/2,task:'stir'},{x:7.58,y:18.8,wait:9,angle:-Math.PI/2,task:'chop'}],
 [{x:13.05,y:23.05,wait:13,angle:Math.PI/2,task:'stir'},{x:14,y:20.2,wait:5,angle:0,task:'carry'}],
 [{x:20.05,y:23.05,wait:15,angle:Math.PI/2,task:'stir'},{x:20,y:20.4,wait:5,angle:Math.PI,task:'carry'}],
 [{x:15.58,y:18.8,wait:11,angle:-Math.PI/2,task:'chop'},{x:18.2,y:19.2,wait:0,angle:0,task:'walk'},{x:18.2,y:16.2,wait:6,angle:-Math.PI/2,task:'carry'},{x:18.2,y:19.2,wait:0,angle:Math.PI/2,task:'walk'}],
 [{x:4.5,y:21.6,wait:6,angle:Math.PI,task:'carry'},{x:4.5,y:16.2,wait:7,angle:0,task:'carry'}],
 [{x:10,y:22.4,wait:7,angle:0,task:'carry'},{x:17.5,y:22.4,wait:7,angle:Math.PI,task:'carry'}],
];
/** Background brigade: all clients derive the same service choreography from server time.
 * Staff cook and carry dishes; playable chefs remain the capture/chase opponents. */
export function kitchenStaffAt(time:number):StaffPose[]{
 return routes.map((route,i)=>{
  const legs=route.map((a,j)=>{const b=route[(j+1)%route.length];return{a,b,travel:Math.hypot(b.x-a.x,b.y-a.y)/.8};});
  const period=legs.reduce((n,l)=>n+l.a.wait+l.travel,0);let t=((time+i*6)%period+period)%period;
  for(const {a,b,travel}of legs){
   if(t<a.wait)return{id:'staff-'+i,variant:i,x:a.x,y:a.y,z:0,angle:a.angle,speed:0,task:a.task};t-=a.wait;
   if(t<travel){const f=t/travel;return{id:'staff-'+i,variant:i,x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,z:0,angle:Math.atan2(b.y-a.y,b.x-a.x),speed:.8,task:i>=4?'carry':'walk'};}t-=travel;
  }
  const a=route[0];return{id:'staff-'+i,variant:i,x:a.x,y:a.y,z:0,angle:a.angle,speed:0,task:a.task};
 });
}
