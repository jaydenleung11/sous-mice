import {describe,it,expect} from 'vitest';
import {motionState,updateMotion} from '../client/three/motion';
import type {EntityView} from '../shared/protocol';
const mouse:EntityView={id:'pip',name:'Pip',team:'mouse',classId:'scout',bot:false,x:0,y:0,z:0,angle:0,layer:'floor',state:'free',grounded:true,vz:0};
describe('cosmetic character motion',()=>{
 it('blends a wrapped turn through the shortest arc without mutating gameplay',()=>{
  const m=motionState(),e={...mouse,angle:Math.PI-.02};updateMotion(m,e,0,0,false);const before=m.yaw!;
  const next={...e,angle:-Math.PI+.02},copy=structuredClone(next);updateMotion(m,next,1/60,0,false);
  expect(Math.abs(m.yaw!-before)).toBeLessThan(.04);expect(next).toEqual(copy);
 });
 it('keeps gait phase continuous through a stop and scales it with travel',()=>{
  const m=motionState();updateMotion(m,mouse,0,1,false);updateMotion(m,mouse,.05,1,false);const phase=m.gait;
  updateMotion(m,mouse,.10,0,false);expect(m.gait).toBe(phase);
  updateMotion(m,mouse,.15,2,false);expect(m.gait-phase).toBeCloseTo(.1/.38*Math.PI*2,6);
 });
 it('finishes one bounded jump flip and returns to a stable landing pose',()=>{
  const m=motionState();updateMotion(m,mouse,0,0,false);let max=0;
  for(let i=1;i<=19;i++){updateMotion(m,{...mouse,grounded:false,vz:1.53-9.8*(i-1)/60},i/60,0,false);max=Math.max(max,m.flip);expect(m.flip).toBeGreaterThanOrEqual(0);expect(m.flip).toBeLessThanOrEqual(Math.PI*2);}
  expect(max).toBeCloseTo(Math.PI*2,3);updateMotion(m,mouse,20/60,0,false);expect(m.land).toBe(1);
  for(let i=21;i<60;i++)updateMotion(m,mouse,i/60,0,false);
  expect(Math.abs(m.flip)).toBeLessThan(.001);expect(m.land).toBeLessThan(.001);
 });
 it('does not flip when falling, climbing, carried or using reduced motion',()=>{
  for(const e of [{...mouse,grounded:false,vz:-1},{...mouse,state:'held' as const,grounded:false,vz:1.5},{...mouse,grounded:false,vz:1.5}]){
   const m=motionState();updateMotion(m,mouse,0,0,true);updateMotion(m,e,.02,0,true);expect(m.flip).toBe(0);
  }
  const m=motionState();updateMotion(m,mouse,0,0,false);updateMotion(m,{...mouse,grounded:false,vz:-1},.02,0,false);expect(m.flip).toBe(0);
 });
 it('eases interrupted climbing and dragging while leaving gameplay untouched',()=>{
  const m=motionState();updateMotion(m,mouse,0,0,false);
  const e={...mouse,carry:'wheel' as const,traversal:{id:'climb',started:0,arrive:1,duration:1,from:{x:0,y:0,z:0},to:{x:0,y:0,z:1}}};
  const copy=structuredClone(e);updateMotion(m,e,.016,0,false);const climb=m.climb,heavy=m.heavy;
  expect(climb).toBeGreaterThan(0);expect(climb).toBeLessThan(1);expect(heavy).toBeGreaterThan(0);
  updateMotion(m,mouse,.032,0,false);expect(m.climb).toBeGreaterThan(0);expect(m.climb).toBeLessThan(climb);expect(m.heavy).toBeLessThan(heavy);expect(e).toEqual(copy);
 });
 it('blends interrupted carry and action transitions instead of snapping',()=>{
  const m=motionState();updateMotion(m,mouse,0,0,false);updateMotion(m,{...mouse,carry:'cheese',action:{kind:'eat',target:'food',duration:1,progress:.1}},.016,0,false);
  expect(m.carry).toBeGreaterThan(0);expect(m.carry).toBeLessThan(1);const held=m.carry;
  updateMotion(m,mouse,.032,0,false);expect(m.carry).toBeGreaterThan(0);expect(m.carry).toBeLessThan(held);
 });
});
