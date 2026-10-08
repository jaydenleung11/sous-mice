import {describe,it,expect} from 'vitest';
import {Training3D} from '../client/tutorial3d';
import {BUTTON} from '../shared/constants';
import {walkable3D} from '../shared/content3d';
import type {InputFrame,Team} from '../shared/protocol';
const frame=(t:Training3D,buttons=0,extra:Partial<InputFrame>={}):InputFrame=>({seq:t.world.tick+1,tick:t.world.tick,mx:0,my:0,buttons,ax:t.self.x+1,ay:t.self.y,yaw:0,pitch:0,...extra});
describe('true 3D Training Kitchens',()=>{
 for(const team of ['mouse','chef'] as Team[])it(`${team} finishes every lesson using only ordinary input frames`,()=>{
  const t=new Training3D(team,()=>{}),seen=new Set<number>();let transitTicks=0;
  for(let count=0;count<5000&&!t.done;count++){
   seen.add(t.step);let buttons=0,extra:Partial<InputFrame>={};
   if(team==='mouse'){
    if(t.step===0){buttons=BUTTON.SNEAK;extra={mx:1,yaw:.6};}
    if(t.step===1)buttons=count%2===0?BUTTON.JUMP:0;
    if(t.step===2){buttons=BUTTON.USE;extra={mx:1};}
    if(t.step===3)buttons=BUTTON.SENSE;
    if(t.step===4||t.step===6||t.step>=7)buttons=BUTTON.USE;
    if(t.step===5)buttons=BUTTON.EAT;
   }else buttons=[BUTTON.USE,BUTTON.INSPECT,count%2===0?BUTTON.ATTACK:0,BUTTON.USE,BUTTON.TRAP,BUTTON.USE,BUTTON.PEEK,BUTTON.EAR][t.step];
   const oldStep=t.step;t.update(frame(t,buttons,extra));
   if(t.self.state==='transit'){transitTicks++;expect(t.step).toBe(oldStep);}
   if(!['held','caged','transit'].includes(t.self.state))expect(walkable3D(t.self.x,t.self.y,t.self.z??0,team),`${team} step${t.step}`).toBe(true);
  }
  expect(t.done,`stuck on ${team} lesson${t.step}: ${t.title}`).toBe(true);expect(seen.size).toBe(t.total);expect(t.snapshot().mode).toBe('3d');if(team==='mouse'){expect(transitTicks).toBeGreaterThan(75);expect(t.self.stats.deliveries).toBe(1);expect(t.self.stats.rescues).toBe(1);}else{expect(t.self.stats.captures).toBe(1);expect(t.self.stats.dishes).toBe(1);}
 });
 it('does not auto-complete movement or transit merely because time passes',()=>{const t=new Training3D('mouse',()=>{});for(let i=0;i<300;i++)t.update(frame(t));expect(t.step).toBe(0);expect(t.done).toBe(false);});
});
