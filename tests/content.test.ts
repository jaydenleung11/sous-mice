import {describe,it,expect} from 'vitest';
import {MAP,FOODS,isWalkable,hasLOS} from '../shared/content';
import {validateMap,validateContent,roomPathCount} from '../scripts/validate';
describe('authored bistro content',()=>{
  it('passes every map and content acceptance validator',()=>{const results=[...validateMap(),...validateContent()];expect(results).toHaveLength(13);expect(results.filter(r=>!r.pass)).toEqual([]);});
  it('retains a tunnel path to every room after any single edge cut',()=>{for(let i=0;i<MAP.tunnelEdges.length;i++)for(const room of ['dining','foyer','kitchen','pantry'])expect(roomPathCount(room,i),`${room}, edge ${i}`).toBeGreaterThanOrEqual(1);});
  it('rejects chefs from cellar, tunnels and table footprints',()=>{expect(isWalkable(35,44,'chef')).toBe(false);expect(isWalkable(20,10,'chef','tunnel')).toBe(false);expect(isWalkable(9,6,'chef')).toBe(false);expect(isWalkable(9,6,'mouse')).toBe(true);expect(isWalkable(35,44,'mouse','tunnel')).toBe(true);});
  it('blocks vision through structural walls and permits clear aisles',()=>{expect(hasLOS({x:46,y:3},{x:49,y:3})).toBe(false);expect(hasLOS({x:46,y:11},{x:49,y:11})).toBe(true);});
  it('preserves intentional heavy food delivery values',()=>{expect(FOODS.wheel.provision).toBe(14);expect(FOODS.crate.provision).toBe(10);expect(FOODS.cheese.duration).toBe(10);});
  it('actually rejects a broken tunnel graph',()=>{const original=MAP.tunnelEdges.slice();try{MAP.tunnelEdges.splice(0,MAP.tunnelEdges.length,...original.filter(e=>e.from!=='B'&&e.to!=='B'));expect(validateMap().find(c=>c.id==='M3')?.pass).toBe(false);}finally{MAP.tunnelEdges.splice(0,MAP.tunnelEdges.length,...original);}});
});
