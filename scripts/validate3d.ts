import {writeFileSync,mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {MAP3D,COLLIDERS3D,TRAVERSALS3D,SCALE3D,NAV3D,walkable3D,segmentWalkable3D,traversalPosition3D,zoneAt3D,type Navigation3D} from '../shared/content3d';
import type {Team,Vec} from '../shared/protocol';
const dist=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z??0)-(b.z??0));
export function generateNavigation3D(team:Team):Navigation3D{
 const nodes:Navigation3D['nodes']=[],edges:Navigation3D['edges']=[],keys=new Map<string,number>();
 const add=(p:Vec,id='')=>{const key=[p.x,p.y,p.z??0].map(n=>n.toFixed(3)).join(',');if(keys.has(key))return keys.get(key)!;if(!walkable3D(p.x,p.y,p.z??0,team))return -1;const i=nodes.length;keys.set(key,i);nodes.push({id:id||'n'+i,...p,z:p.z??0});return i;};
 for(let x=.5;x<44;x+=.5)for(let y=.5;y<30;y+=.5)add({x,y,z:0});
 if(team==='mouse'){for(const c of COLLIDERS3D){const top=c.z+c.h;if(c.cover||top<.4||top>2.2)continue;for(let x=c.x+.06;x<c.x+c.w-.04;x+=.25)for(let y=c.y+.06;y<c.y+c.d-.04;y+=.25)add({x,y,z:top});}for(const t of TRAVERSALS3D){add(t.from,t.id+'-from');add(t.to,t.id+'-to');}}
 for(const h of MAP3D.holes)if(team==='mouse')add(h,h.id);for(const c of MAP3D.cages)add(c,c.id);
 const cells=new Map<string,number[]>();for(let i=0;i<nodes.length;i++){const p=nodes[i],k=Math.floor(p.x)+','+Math.floor(p.y)+','+p.z!.toFixed(3),a=cells.get(k)??[];a.push(i);cells.set(k,a);}
 for(let i=0;i<nodes.length;i++){const p=nodes[i];for(let x=Math.floor(p.x)-1;x<=Math.floor(p.x)+1;x++)for(let y=Math.floor(p.y)-1;y<=Math.floor(p.y)+1;y++)for(const j of cells.get(x+','+y+','+p.z!.toFixed(3))??[]){if(j<=i)continue;const d=dist(p,nodes[j]);if(d<=.76&&segmentWalkable3D(p,nodes[j],team)){edges.push([i,j,d],[j,i,d]);}}}
 const at=(p:Vec)=>keys.get([p.x,p.y,p.z??0].map(n=>n.toFixed(3)).join(','));
 if(team==='mouse'){for(const t of TRAVERSALS3D){const a=at(t.from),b=at(t.to);if(a!==undefined&&b!==undefined)edges.push([a,b,t.duration*SCALE3D.mouseWalk]);}for(const a of MAP3D.holes)for(const b of MAP3D.holes)if(a.id!==b.id){const i=at(a),j=at(b);if(i!==undefined&&j!==undefined)edges.push([i,j,10]);}}
 return {nodes,edges};
}
export function graphDistances(nav:Navigation3D,starts:number[]){const adj=new Map<number,[number,number][]>();for(const [a,b,d]of nav.edges){const list=adj.get(a)??[];list.push([b,d]);adj.set(a,list);}const distances=new Float64Array(nav.nodes.length).fill(Infinity),open=new Set(starts);for(const s of starts)distances[s]=0;while(open.size){let a=-1,best=Infinity;for(const i of open)if(distances[i]<best){best=distances[i];a=i;}if(a<0)break;open.delete(a);for(const [b,d]of adj.get(a)??[])if(best+d<distances[b]){distances[b]=best+d;open.add(b);}}return distances;}
export function validate3D(nav:Record<Team,Navigation3D>=NAV3D){
 const checks:{id:string;pass:boolean;detail:string}[]=[],check=(id:string,pass:boolean,detail:string)=>checks.push({id,pass,detail});
 const nearest=(p:Vec,g:Navigation3D)=>g.nodes.reduce((best,n,i)=>dist(p,n)<dist(p,g.nodes[best])?i:best,0);
 const cd=graphDistances(nav.chef,[nearest(MAP3D.spawns.chef,nav.chef)]);
 check('M1-3D',nav.chef.nodes.length>0&&Array.from(cd).every(Number.isFinite),`${nav.chef.nodes.length} chef navigation nodes; all connected.`);
 check('M2-3D',!walkable3D(MAP3D.stash.x,MAP3D.stash.y,0,'chef')&&nav.chef.nodes.every(n=>zoneAt3D(n.x,n.y)?.id!=='burrow'),'Chef capsule and nav exclude Burrow.');
 const resilient=['dining','foyer','kitchen','pantry'].every(room=>MAP3D.tunnelEdges.every((_,cut)=>{const seen=new Set(['B']);let changed=true;while(changed){changed=false;MAP3D.tunnelEdges.forEach((e,i)=>{if(i===cut)return;if(seen.has(e.from)&&!seen.has(e.to)){seen.add(e.to);changed=true;}if(seen.has(e.to)&&!seen.has(e.from)){seen.add(e.from);changed=true;}});}return MAP3D.holes.some(h=>h.room===room&&seen.has(h.id));}));
 check('M3-3D',resilient,'Every public room remains reachable after each individual tunnel-edge deletion.');
 check('M4-3D',['dining','foyer','kitchen','pantry'].every(room=>MAP3D.holes.filter(h=>h.room===room).length>=2)&&MAP3D.holes.every(h=>walkable3D(h.x,h.y,h.z??0,'mouse')&&MAP3D.holes.some(p=>p.id===h.paired)&&MAP3D.tunnelEdges.some(e=>e.from===h.id||e.to===h.id)),`${MAP3D.holes.length} safe, paired exits including HB.`);
 const cages=graphDistances(nav.chef,MAP3D.cages.map(p=>nearest(p,nav.chef)));let worst=0;nav.chef.nodes.forEach((p,i)=>{if(['kitchen','pantry'].includes(zoneAt3D(p.x,p.y)?.id??''))worst=Math.max(worst,cages[i]);});check('M5-3D',worst/(SCALE3D.chefWalk*.75)<=9,`Worst cage route ${(worst/(SCALE3D.chefWalk*.75)).toFixed(2)}s at captive walking speed.`);
 const md=graphDistances(nav.mouse,[nearest(MAP3D.spawns.mouse,nav.mouse)]);
 check('M6-3D',MAP3D.pickups.every(p=>walkable3D(p.x,p.y,p.z??0,'mouse')&&Math.min(...MAP3D.holes.map(h=>dist(p,h)))<=14&&Number.isFinite(md[nearest(p,nav.mouse)])),'All food placements are capsule-clear, within14m of a hole and graph-reachable.');
 check('M7-3D',MAP3D.hides.every(h=>h.capacity>=1&&walkable3D(h.x,h.y,h.z??0,'mouse')&&Number.isFinite(md[nearest(h,nav.mouse)])),`${MAP3D.hides.length} reachable hiding anchors.`);
 const bad=TRAVERSALS3D.filter(t=>Array.from({length:101},(_,i)=>traversalPosition3D(t,i/100)).some(p=>!walkable3D(p.x,p.y,p.z??0,'mouse')));
 const isolated=Array.from(md).filter(n=>!Number.isFinite(n)).length;
 check('M8-3D',bad.length===0&&isolated===0,`${isolated} disconnected mouse nav nodes; obstructed scripted routes: ${bad.map(t=>t.id).join(', ')||'none'}.`);
 const ratio=SCALE3D.chefModelHeight/SCALE3D.mouseEye,tables=COLLIDERS3D.filter(c=>c.id.startsWith('table-')&&c.id.endsWith('-top')),doors=COLLIDERS3D.filter(c=>c.id.startsWith('door-lintel-'));check('AT-17',ratio>=22&&ratio<=28&&tables.length===8&&tables.every(c=>c.z+c.h>=.7&&c.z+c.h<=.8)&&doors.length>0&&doors.every(c=>c.z>=1.9),`Chef/mouse-eye ratio ${ratio.toFixed(2)}; ${tables.length} actual tabletops at.75m; ${doors.length} door lintels clear2m.`);
 return checks;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const nav=process.argv.includes('--generate')?{mouse:generateNavigation3D('mouse'),chef:generateNavigation3D('chef')}:NAV3D;if(process.argv.includes('--generate'))writeFileSync('content/nav3d.json',JSON.stringify(nav));const checks=validate3D(nav);for(const c of checks)console.log(`${c.pass?'PASS':'FAIL'} ${c.id} ${c.detail}`);mkdirSync('work',{recursive:true});writeFileSync('work/scale3d-report.md',checks.map(c=>`- ${c.pass?'PASS':'FAIL'} ${c.id}: ${c.detail}`).join('\n'));if(checks.some(c=>!c.pass))process.exitCode=1;}
