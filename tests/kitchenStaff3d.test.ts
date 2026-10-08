import {it,expect} from 'vitest';
import {kitchenStaffAt} from '../shared/kitchenStaff3d';
import {walkable3D} from '../shared/content3d';
it('service staff stay on collision-clear kitchen routes and share deterministic time',()=>{
 const tasks=new Set<string>();let moved=false;const first=kitchenStaffAt(0);
 for(let t=0;t<120;t+=.2){const poses=kitchenStaffAt(t);expect(poses).toEqual(kitchenStaffAt(t));expect(poses).toHaveLength(6);for(const p of poses){expect(walkable3D(p.x,p.y,0,'chef'),p.id+' at '+t).toBe(true);tasks.add(p.task);if(Math.hypot(p.x-first[p.variant].x,p.y-first[p.variant].y)>.5)moved=true;}}
 expect(moved).toBe(true);expect(tasks).toEqual(new Set(['stir','chop','carry','walk']));
});
