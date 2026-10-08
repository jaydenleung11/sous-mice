import {Box3,MathUtils,Ray,Vector3} from 'three';

/** Orbit the mouse's whole body, with a raised default angle and wall clearance. */
export function mouseFollowPosition(origin:Vector3,yaw:number,pitch:number,colliders:Box3[]){
 const elevation=MathUtils.clamp(.34-pitch*.8,-.18,1.25),radius=.34;
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
