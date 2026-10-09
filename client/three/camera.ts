import {Box3,MathUtils,Ray,Vector3} from 'three';
import {MAP3D} from '../../shared/content3d';

/** Orbit the mouse's whole body, with a raised default angle and wall clearance. */
export function mouseFollowPosition(origin:Vector3,yaw:number,pitch:number,colliders:Box3[],radius=.34){
 const elevation=MathUtils.clamp((radius>.5?.65:.34)-pitch*.8,-.18,1.25);
 const desired=origin.clone().add(new Vector3(
  -Math.cos(yaw)*Math.cos(elevation)*radius-Math.sin(yaw)*.055,
  Math.sin(elevation)*radius,
  -Math.sin(yaw)*Math.cos(elevation)*radius+Math.cos(yaw)*.055));
 // A small camera sphere avoids clipping both the camera and its near plane.
 const delta=desired.clone().sub(origin),length=delta.length(),ray=new Ray(origin,delta.normalize()),hit=new Vector3();
 let distance=length;
 for(const box of colliders){
  const expanded=box.clone().expandByScalar(.016);
  if(expanded.containsPoint(origin))continue;
  if(ray.intersectBox(expanded,hit))distance=Math.min(distance,Math.max(.018,hit.distanceTo(origin)-.012));
 }
 return origin.clone().addScaledVector(delta,distance);
}

/** Smooth the boom, then recheck the whole path so smoothing cannot cross a wall. */
export function smoothFollowPosition(current:Vector3,desired:Vector3,origin:Vector3,colliders:Box3[],dt:number,clearance=.016){
 const next=current.clone().lerp(desired,1-Math.exp(-Math.max(0,dt)*18));
 const delta=next.clone().sub(origin),length=delta.length();
 if(length<.0001)return desired.clone();
 const ray=new Ray(origin,delta.normalize()),hit=new Vector3();let distance=length;
 for(const box of colliders){const expanded=box.clone().expandByScalar(clearance);if(expanded.containsPoint(origin))continue;
  if(ray.intersectBox(expanded,hit))distance=Math.min(distance,Math.max(.018,hit.distanceTo(origin)-.012));}
 return origin.clone().addScaledVector(delta,distance);
}

/** In very tight cover, look for a nearby clear boom before zooming into the mouse. */
export function readableMouseFollow(origin:Vector3,yaw:number,pitch:number,colliders:Box3[],current:Vector3,radius=.34){
 const desired=mouseFollowPosition(origin,yaw,pitch,colliders,radius);
 if(desired.distanceTo(origin)>=radius*.4)return desired;
 let best=desired,score=-Infinity;
 for(const offset of [0,.9,-.9,1.8,-1.8,Math.PI])for(const rise of [0,-.5]){
  const candidate=mouseFollowPosition(origin,yaw+offset,pitch+rise,colliders,radius);
  const value=candidate.distanceTo(origin)-candidate.distanceTo(current)*.12-Math.abs(offset)*.012-Math.abs(rise)*.012;
  if(value>score){score=value;best=candidate;}
 }
 return best;
}

/** Rendered chair rails, table aprons and cloth are camera obstacles only.
 * The authoritative movement colliders intentionally remain unchanged. */
export function furnitureCameraBoxes(){
 const boxes:Box3[]=[];
 const box=(x:number,y:number,z:number,w:number,h:number,d:number)=>boxes.push(new Box3(new Vector3(x-w/2,y-h/2,z-d/2),new Vector3(x+w/2,y+h/2,z+d/2)));
 for(const t of MAP3D.objects.filter(o=>o.kind==='table')){
  for(const side of [-1,1]){
   box(t.x+side*.98,.465,t.y,.42,.055,.44);
   box(t.x+side*.8,.72,t.y,.06,.38,.44);
   for(const a of [-1,1])for(const b of [-1,1])box(t.x+side*.98+a*.17,.24,t.y+b*.18,.045,.48,.045);
   box(t.x+side*.55,.63,t.y,.035,.09,.71);
   box(t.x,.63,t.y+side*.35,1.1,.09,.035);
   box(t.x+side*.605,.63,t.y,.015,.25,.82);
   box(t.x,.63,t.y+side*.405,1.23,.25,.014);
  }
 }
 return boxes;
}
