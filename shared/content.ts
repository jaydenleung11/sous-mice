import mapData from '../content/map.json';
import itemData from '../content/items.json';
import npcData from '../content/npc.json';
import orderData from '../content/orders.json';
import type { FoodId, Team, Vec } from './protocol';

export type MapData={id:string;name:string;width:number;height:number;zones:{id:string;name:string;x:number;y:number;w:number;h:number;color:string}[];solids:{x:number;y:number;w:number;h:number;mouseOnly?:boolean}[];holes:({id:string;room:string;junction:string}&Vec)[];hides:({id:string;capacity:number}&Vec)[];objects:({id:string;kind:string;w?:number;h?:number}&Vec)[];cages:({id:string}&Vec)[];spawns:{mouse:Vec;chef:Vec};stash:Vec;pickups:({id:string;food:FoodId}&Vec)[];tunnelNodes:({id:string}&Vec)[];tunnelEdges:{from:string;to:string;length:number}[]};
export type FoodDefinition={id:FoodId;name:string;provision:number;buff?:string;duration?:number;uses?:number;tamper?:string;penalty?:number;counter?:string;heavy?:boolean;carriers?:number};
export const MAP=mapData as MapData;
export const FOOD_LIST=itemData.foods as FoodDefinition[];
export const FOODS=Object.fromEntries(FOOD_LIST.map(f=>[f.id,f])) as Record<FoodId,FoodDefinition>;
export const ITEMS=itemData;
export const NPC=npcData;
export const ORDERS=orderData;
export const PUBLIC_ROOMS=['dining','foyer','kitchen','pantry'];

export function zoneAt(x:number,y:number){return MAP.zones.find(z=>x>=z.x&&x<z.x+z.w&&y>=z.y&&y<z.y+z.h);}
export function nearestHole(x:number,y:number){return MAP.holes.reduce((a,b)=>Math.hypot(a.x-x,a.y-y)<Math.hypot(b.x-x,b.y-y)?a:b);}

/** Tunnel movement is a continuous wall-void abstraction; chefs never enter it. */
export function isWalkable(x:number,y:number,team:Team,layer:'floor'|'tunnel'|'ledge'='floor',radius=0.3):boolean{
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(radius)||radius<0)return false;
  if(layer==='tunnel')return team==='mouse'&&x>=1+radius&&x<=71-radius&&y>=1+radius&&y<=47-radius;
  if(layer==='ledge'&&team!=='mouse')return false;
  const floor=x>=1+radius&&x<=71-radius&&y>=1+radius&&y<=39-radius;
  const burrow=team==='mouse'&&x>=26+radius&&x<=46-radius&&y>=41+radius&&y<=47-radius;
  if(!floor&&!burrow)return false;
  return !MAP.solids.some(s=>{
    if(s.mouseOnly&&team==='mouse')return false;
    const dx=x-Math.max(s.x,Math.min(x,s.x+s.w)),dy=y-Math.max(s.y,Math.min(y,s.y+s.h));
    return dx*dx+dy*dy<radius*radius-1e-10||(radius===0&&x>s.x&&x<s.x+s.w&&y>s.y&&y<s.y+s.h);
  });
}

/** Ray against opaque fixtures. Tables offer low cover without becoming walls. */
export function hasLOS(a:Vec,b:Vec):boolean{
  const dx=b.x-a.x,dy=b.y-a.y;
  for(const s of MAP.solids){
    if(s.mouseOnly)continue;
    let lo=0,hi=1;
    for(const [origin,direction,min,max] of [[a.x,dx,s.x,s.x+s.w],[a.y,dy,s.y,s.y+s.h]]){
      if(Math.abs(direction)<1e-12){if(origin<min||origin>max){lo=2;break;}}
      else{const t1=(min-origin)/direction,t2=(max-origin)/direction;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));}
    }
    if(lo<=hi&&hi>0&&lo<1)return false;
  }
  return true;
}
