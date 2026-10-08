import data from '../content/map3d.json';
import navData from '../content/nav3d.json';
import type {MapData} from './content';
import type {Team,Vec} from './protocol';
export type Collider3D={id:string;x:number;y:number;z:number;w:number;d:number;h:number;material:string;mouseOnly?:boolean;cover?:boolean};
export type Traversal3D={id:string;from:Vec;to:Vec;duration:number};
export type Hole3D=MapData['holes'][number]&{wide:boolean;paired:string;exitYaw:number};
export type Object3D=MapData['objects'][number]&{d:number;height:number};
export type Map3D=Omit<MapData,'holes'|'objects'>&{holes:Hole3D[];objects:Object3D[]};
export type Navigation3D={nodes:({id:string}&Vec)[];edges:[number,number,number][]};
export const SCALE3D={mouseRadius:.035,mouseHeight:.09,mouseEye:.07,mouseSneakEye:.05,chefRadius:.25,chefHeight:1.8,chefModelHeight:1.85,chefEye:1.65,guestEye:1.15,tableHeight:.75,counterHeight:.92,doorHeight:2,mouseStep:.04,chefStep:.25,jumpHeight:.12,gravity:9.8,mouseWalk:2.6,mouseSneak:1.1,mouseSprint:4,chefWalk:2.2,chefSprint:3.4} as const;
export const MAP3D=data.map as Map3D;
export const COLLIDERS3D=data.colliders as Collider3D[];
export const TRAVERSALS3D=data.traversals as Traversal3D[];
export const NAV3D=navData as Record<Team,Navigation3D>;
export function traversalPosition3D(route:Pick<Traversal3D,'from'|'to'>,progress:number):Vec{const a=route.from,b=route.to,t=Math.max(0,Math.min(1,progress)),up=(b.z??0)>=(a.z??0);const horizontal=up?Math.max(0,(t-.8)/.2):Math.min(1,t/.2),vertical=up?Math.min(1,t/.8):Math.max(0,(t-.2)/.8);return {x:a.x+(b.x-a.x)*horizontal,y:a.y+(b.y-a.y)*horizontal,z:(a.z??0)+((b.z??0)-(a.z??0))*vertical};}
const grid=new Map<string,Collider3D[]>(),cell=2;
for(const c of COLLIDERS3D)for(let x=Math.floor(c.x/cell);x<=Math.floor((c.x+c.w)/cell);x++)for(let y=Math.floor(c.y/cell);y<=Math.floor((c.y+c.d)/cell);y++){const k=x+','+y;const a=grid.get(k)??[];a.push(c);grid.set(k,a);}
function nearby(x:number,y:number,r:number){const found=new Set<Collider3D>();for(let i=Math.floor((x-r)/cell);i<=Math.floor((x+r)/cell);i++)for(let j=Math.floor((y-r)/cell);j<=Math.floor((y+r)/cell);j++)for(const c of grid.get(i+','+j)??[])found.add(c);return found;}
export function zoneAt3D(x:number,y:number){return MAP3D.zones.find(z=>x>=z.x&&x<z.x+z.w&&y>=z.y&&y<z.y+z.h);}
export function floorAllowed3D(x:number,y:number,team:Team,r=0){return (x>=.18+r&&x<=43.82-r&&y>=.18+r&&y<=25.82-r)||(team==='mouse'&&x>=17+r&&x<=27-r&&y>=27+r&&y<=30-r);}
/** True capsule vs box: vertical segment with spherical caps. z is foot elevation. */
export function walkable3D(x:number,y:number,z:number,team:Team):boolean{
 if(![x,y,z].every(Number.isFinite)||z<-.00001||z>3.2)return false;
 const r=team==='mouse'?SCALE3D.mouseRadius:SCALE3D.chefRadius,h=team==='mouse'?SCALE3D.mouseHeight:SCALE3D.chefHeight;
 if(!floorAllowed3D(x,y,team,r))return false;
 for(const c of nearby(x,y,r)){if(c.cover||(c.mouseOnly&&team==='mouse'))continue;
  const dx=x-Math.max(c.x,Math.min(x,c.x+c.w)),dy=y-Math.max(c.y,Math.min(y,c.y+c.d));
  const low=z+r,high=z+h-r,dz=high<c.z?c.z-high:low>c.z+c.h?low-c.z-c.h:0;
  if(dx*dx+dy*dy+dz*dz<r*r-1e-10)return false;
 }
 return true;
}
export function supportHeight3D(x:number,y:number,upper:number,team:Team):number{
 let best=floorAllowed3D(x,y,team)?0:-Infinity;
 for(const c of nearby(x,y,.3)){const top=c.z+c.h;if(c.cover||(c.mouseOnly&&team==='mouse')||top>upper+.00001||top<best)continue;if(x>=c.x&&x<=c.x+c.w&&y>=c.y&&y<=c.y+c.d)best=top;}
 return best;
}
export function rayClear3D(a:Vec,b:Vec):boolean{
 const az=a.z??0,bz=b.z??0;const candidates=new Set<Collider3D>();for(let x=Math.floor(Math.min(a.x,b.x)/cell);x<=Math.floor(Math.max(a.x,b.x)/cell);x++)for(let y=Math.floor(Math.min(a.y,b.y)/cell);y<=Math.floor(Math.max(a.y,b.y)/cell);y++)for(const c of grid.get(x+','+y)??[])candidates.add(c);
 for(const c of candidates){if(c.cover)continue;let lo=0,hi=1;for(const [o,d,min,max]of [[a.x,b.x-a.x,c.x,c.x+c.w],[a.y,b.y-a.y,c.y,c.y+c.d],[az,bz-az,c.z,c.z+c.h]]){if(Math.abs(d)<1e-12){if(o<min||o>max){lo=2;break;}}else{const aa=(min-o)/d,bb=(max-o)/d;lo=Math.max(lo,Math.min(aa,bb));hi=Math.min(hi,Math.max(aa,bb));}}if(lo<=hi&&hi>1e-5&&lo<1-1e-5)return false;}
 return true;
}
/** 1 = full cloth cover, 0.65 = low furniture cover, 0 = exposed. */
export function coverAt3D(p:Vec):number{
 const z=p.z??0;for(const c of nearby(p.x,p.y,.1))if(c.cover&&p.x>=c.x&&p.x<=c.x+c.w&&p.y>=c.y&&p.y<=c.y+c.d&&z+.07>=c.z&&z+.07<=c.z+c.h)return 1;
 for(const c of nearby(p.x,p.y,.1))if(!c.cover&&c.z>z+.09&&c.z<z+.7&&p.x>c.x&&p.x<c.x+c.w&&p.y>c.y&&p.y<c.y+c.d)return .65;return 0;
}
export function segmentWalkable3D(a:Vec,b:Vec,team:Team):boolean{const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,((b.z??0)-(a.z??0)))/.025));for(let i=0;i<=n;i++){const t=i/n;if(!walkable3D(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,(a.z??0)+((b.z??0)-(a.z??0))*t,team))return false;}return true;}
export function nearestHole3D(p:Vec){return MAP3D.holes.reduce((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)<Math.hypot(b.x-p.x,b.y-p.y)?a:b);}
