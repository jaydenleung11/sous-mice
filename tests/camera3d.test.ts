import {describe,it,expect} from 'vitest';
import {Vector3,Box3} from 'three';
import {mouseFollowPosition} from '../client/three/camera';

describe('whole-mouse follow camera',()=>{
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
 it('responds to vertical look while staying finite at steep angles',()=>{
  const origin=new Vector3(0,.07,0);
  const low=mouseFollowPosition(origin,0,1,[]),high=mouseFollowPosition(origin,0,-1,[]);
  expect(high.y).toBeGreaterThan(low.y);
  for(const pitch of [-Math.PI/2,Math.PI/2])expect(mouseFollowPosition(origin,0,pitch,[]).toArray().every(Number.isFinite)).toBe(true);
 });
});
