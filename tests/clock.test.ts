import {it,expect} from 'vitest';
import {FixedClock} from '../server/clock';
it('keeps30Hz despite irregular host timers',()=>{let now=0,ticks=0;const c=new FixedClock(()=>ticks++,()=>now);for(let i=0;i<1000;i++){now+=i%3===0?46:17;c.advance();}expect(ticks).toBe(Math.floor(now*30/1000));});
