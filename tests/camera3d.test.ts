import {describe,it,expect} from 'vitest';
import {Vector3,Box3} from 'three';
import {mouseFollowPosition,smoothFollowPosition,readableMouseFollow,furnitureCameraBoxes} from '../client/three/camera';

describe('whole-mouse follow camera',()=>{
 it('keeps a readable camera boom beside a decorative chair during climbing',()=>{
  const origin=new Vector3(4.29,.65,4),boxes=furnitureCameraBoxes(),current=new Vector3(4.0,.75,4);
  const at=readableMouseFollow(origin,0,0,boxes,current);
  expect(at.distanceTo(origin)).toBeGreaterThan(.2);expect(boxes.some(b=>b.containsPoint(at))).toBe(false);
 });
 it('smooths movement but pulls inside a newly encountered wall immediately',()=>{
  const origin=new Vector3(0,.07,0),current=new Vector3(-.34,.18,0),desired=new Vector3(-.3,.3,0);
  const smooth=smoothFollowPosition(current,desired,origin,[],1/60);
  expect(smooth.y).toBeGreaterThan(current.y);expect(smooth.y).toBeLessThan(desired.y);
  const wall=new Box3(new Vector3(-.25,0,-1),new Vector3(-.18,2,1));
  const safe=smoothFollowPosition(current,desired,origin,[wall],1/60);
  expect(safe.x).toBeGreaterThan(-.164);expect(wall.containsPoint(safe)).toBe(false);
 });
 it('frames the mouse from above and behind at any heading',()=>{
  const origin=new Vector3(9,.07,21);
  for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
   const at=mouseFollowPosition(origin,yaw,0,[]),offset=at.clone().sub(origin);
   expect(at.y).toBeGreaterThan(.16);
   expect(offset.dot(new Vector3(Math.cos(yaw),0,Math.sin(yaw)))).toBeLessThan(-.3);
   expect(at.distanceTo(origin)).toBeCloseTo(Math.hypot(.34,.055),5);
  }
 });
 it('shortens the camera boom before a wall including near-plane clearance',()=>{
  const origin=new Vector3(0,.07,0),wall=new Box3(new Vector3(-.25,0,-1),new Vector3(-.18,2,1));
  const at=mouseFollowPosition(origin,0,0,[wall]);
  expect(at.x).toBeGreaterThan(-.164);expect(at.distanceTo(origin)).toBeLessThan(.25);expect(wall.containsPoint(at)).toBe(false);
 });
 it('raises and widens the view for oversized food at every heading',()=>{
  for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
   const origin=new Vector3(9,.17,21),at=mouseFollowPosition(origin,yaw,0,[],.70);
   expect(at.y).toBeGreaterThan(.58);expect(at.distanceTo(origin)).toBeGreaterThan(.7);
  }
 });
 it('responds to vertical look while staying finite at steep angles',()=>{
  const origin=new Vector3(0,.07,0);
  const low=mouseFollowPosition(origin,0,1,[]),high=mouseFollowPosition(origin,0,-1,[]);
  expect(high.y).toBeGreaterThan(low.y);
  for(const pitch of [-Math.PI/2,Math.PI/2])expect(mouseFollowPosition(origin,0,pitch,[]).toArray().every(Number.isFinite)).toBe(true);
 });
});
