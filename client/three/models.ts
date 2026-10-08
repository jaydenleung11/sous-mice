import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {BistroMaterials as Materials,block,ball,tube,taper,rod,torus,batchStatic,mesh,labelTexture} from './materials';
import type {ClassId,FoodId,EntityView} from '../../shared/protocol';
export function plate(g:T.Group,m:Materials,x:number,y:number,z:number){tube(g,m.porcelain,x,y,z,.105,.013);tube(g,m.linen,x,y+.009,z,.077,.006);torus(g,m.brass,x,y+.012,z,.091,.002).rotation.x=-Math.PI/2;}
export function candle(g:T.Group,m:Materials,x:number,y:number,z:number,scale=1){tube(g,m.brass,x,y+.018*scale,z,.045*scale,.025*scale);tube(g,m.porcelain,x,y+.09*scale,z,.017*scale,.13*scale);ball(g,m.glow('flame','#ffc875',2),x,y+.166*scale,z,.009*scale,.026*scale,.008*scale);}
function chair(g:T.Group,m:Materials,x:number,y:number,z:number,angle:number){const root=new T.Group();root.position.set(x,y,z);root.rotation.y=angle;g.add(root);for(const a of [-1,1])for(const b of [-1,1]){const leg=block(root,m.wood,a*.18,.24,b*.17,.035,.48,.035);leg.rotation.z=-a*.06;}block(root,m.wood,0,.435,0,.44,.045,.42);block(root,m.wine,0,.465,0,.38,.04,.37);for(const a of [-1,1]){block(root,m.wood,a*.18,.68,.18,.035,.46,.035);block(root,m.brass,a*.18,.71,.18,.04,.035,.04);}block(root,m.wood,0,.88,.18,.41,.06,.04);block(root,m.wood,0,.69,.18,.37,.025,.027);for(const a of [-1,1])block(root,m.wood,0,.19,a*.17,.39,.025,.025);}
export function diningTable(m:Materials){const g=new T.Group();for(const a of [-1,1])for(const b of [-1,1]){block(g,m.wood,a*.53,.345,b*.33,.065,.69,.065);block(g,m.brass,a*.53,.045,b*.33,.07,.05,.07);}block(g,m.wood,0,.7175,0,1.2,.065,.8);block(g,m.wood,0,.63,0,1.1,.09,.71);block(g,m.linen,0,.754,0,1.23,.012,.82);for(const a of [-1,1]){block(g,m.linen,0,.63,a*.405,1.23,.25,.014);block(g,m.wine,a*.605,.63,0,.015,.25,.82);}for(const a of [-1,1]){plate(g,m,a*.37,.767,0);const fork=block(g,m.steel,a*.37-.13,.777,0,.012,.008,.19);for(let k=0;k<3;k++)block(g,m.steel,a*.37-.14+k*.01,.777,-.09,.004,.006,.036);tube(g,m.porcelain,a*.39,.81,-.22,.037,.075);}candle(g,m,0,.77,0);chair(g,m,.98,0,0,-Math.PI/2);chair(g,m,-.98,0,0,Math.PI/2);return g;}
function cabinet(m:Materials,w=1.8,d=.65,h=.92){const g=new T.Group();block(g,m.get('cabinet-green','#526e65','wood'),0,h*.47,0,w,h*.92,d);mesh(g,new RoundedBoxGeometry(w+.05,.05,d+.04,2,.018),m.steel,0,h-.025,0);for(let i=0;i<Math.max(1,Math.round(w/.5));i++){const ww=w/Math.max(1,Math.round(w/.5)),x=-w/2+ww*(i+.5);block(g,m.get('cabinet-green','#526e65','wood'),x,h*.49,d/2+.012,ww-.035,h*.76,.018);block(g,m.brass,x,h*.7,d/2+.035,.12,.013,.025);block(g,m.wood,x,h*.08,d/2+.018,ww-.05,.05,.018);}return g;}
export function counter(m:Materials,kind:string,w=1.8,d=.65){const g=cabinet(m,w,d);if(kind==='stove'||kind==='soup'){for(const a of [-1,1]){tube(g,m.iron,a*w*.24,.95,0,.15,.014);torus(g,m.glow('burner','#d9783d',.7),a*w*.24,.965,0,.1,.008).rotation.x=-Math.PI/2;const pot=new T.Group();pot.position.set(a*w*.24,.97,0);tube(pot,m.copper,0,.1,0,.13,.19);tube(pot,m.iron,0,.2,0,.122,.007);tube(pot,m.get('soup','#f3b54b'),0,.202,0,.112,.005);for(let i=0;i<9;i++){const a=i*2.4,r=.02+(i%3)*.025;ball(pot,i%3===0?m.leaf:m.cheese,Math.cos(a)*r,.207,Math.sin(a)*r,.008,.002,.007);}for(const s of [-1,1])torus(pot,m.iron,s*.15,.12,0,.035,.008);g.add(pot);}for(let i=0;i<4;i++)tube(g,m.black,-w*.35+i*w*.23,.78,d/2+.025,.025,.026).rotation.x=Math.PI/2;}else{block(g,m.oak,-w*.2,.956,0,.32,.025,.24);const knife=block(g,m.steel,-w*.22,.978,.03,.18,.005,.035);knife.rotation.y=.3;block(g,m.wood,-w*.32,.981,.06,.065,.012,.025);plate(g,m,w*.2,.951,0);ball(g,m.get('prepared-soup','#f2aa46'),w*.2,.965,0,.06,.011,.06);if(kind==='pass'){const bell=ball(g,m.brass,0,.995,d*.2,.05,.033,.05);tube(g,m.black,0,.968,d*.2,.06,.012);}}return g;}
export function shelf(m:Materials,w=1.6,d=.5,h=1.8){const g=new T.Group();for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])block(g,m.wood,x,h/2,z,.04,h,.04);for(let j=0;j<4;j++){const y=.12+j*(h-.25)/3;block(g,m.oak,0,y,0,w+.04,.04,d+.03);for(let i=0;i<Math.floor(w/.22);i++){const x=-w*.4+i*.24;const mat=i%3===0?m.get('jar-teal','#759486'):i%3===1?m.get('jar-honey','#b99453'):m.get('jar-paprika','#ab6550');tube(g,mat,x,y+.11,0,.065,.18);tube(g,m.copper,x,y+.207,0,.067,.018);block(g,m.linen,x,y+.12,.06,.073,.07,.005);}}return g;}
export function crate(m:Materials,w=.6,d=.5,h=.5){const g=new T.Group();for(const side of [-1,1])for(let j=0;j<4;j++){block(g,m.oak,0,.05+j*h/4,side*d/2,w,.095,.025);block(g,m.wood,side*w/2,.05+j*h/4,0,.025,.095,d);}for(const x of [-1,1])for(const z of [-1,1])block(g,m.wood,x*w/2,h/2,z*d/2,.045,h,.045);block(g,m.wood,0,.02,0,w,.035,d);const label=block(g,m.linen,0,h*.5,d/2+.018,w*.4,h*.32,.005);return g;}
export function barrel(m:Materials){const g=new T.Group();tube(g,m.wood,0,.28,0,.23,.54);for(const y of [.06,.18,.42,.5])torus(g,m.iron,0,y,0,.235,.018).rotation.x=-Math.PI/2;tube(g,m.oak,0,.558,0,.22,.018);return g;}
export function plant(m:Materials){const g=new T.Group();const pot=tube(g,m.copper,0,.12,0,.13,.24);for(let i=0;i<9;i++){const a=i*2.4;rod(g,m.leaf,new T.Vector3(0,.2,0),new T.Vector3(Math.cos(a)*.18,.4+i*.024,Math.sin(a)*.18),.01);const leaf=ball(g,m.leaf,Math.cos(a)*.16,.39+i*.024,Math.sin(a)*.16,.07,.13,.025);leaf.rotation.set(.3,a,.5);}return g;}
export function cage(m:Materials){const g=new T.Group();block(g,m.wood,0,.014,0,.44,.028,.32);for(const y of [.025,.26]){block(g,m.brass,0,y,-.16,.44,.013,.013);block(g,m.brass,0,y,.16,.44,.013,.013);block(g,m.brass,-.22,y,0,.013,.013,.32);block(g,m.brass,.22,y,0,.013,.013,.32);}for(let i=0;i<=10;i++)for(const z of [-.16,.16])tube(g,m.steel,-.22+i*.044,.143,z,.004,.235);for(let i=0;i<=7;i++)for(const x of [-.22,.22])tube(g,m.steel,x,.143,-.16+i*.046,.004,.235);for(let i=0;i<9;i++)block(g,m.steel,-.2+i*.05,.267,0,.005,.008,.32);torus(g,m.brass,0,.32,0,.045,.007);block(g,m.brass,.03,.135,.172,.04,.05,.012);return g;}
/** Rounded, painted food silhouettes are shared by pickups, hands and pantry props. */
export function food(m:Materials,id:FoodId){
 const g=new T.Group(),cream=m.flat('food-highlight','#fff3c3',.25),green=m.leaf;
 const shine=(x:number,y:number,z:number,w=.008,h=.004)=>{const b=ball(g,cream,x,y,z,w,h,.002);b.rotation.z=-.35;};
 const leaf=(x:number,y:number,z:number,angle:number,length=.023)=>{const l=ball(g,green,x,y,z,.006,length,.0025);l.rotation.z=angle;};
 if(id==='cheese'){
  const shape=new T.Shape();shape.moveTo(-.045,-.033);shape.lineTo(.06,0);shape.lineTo(-.045,.033);shape.closePath();
  const wedge=mesh(g,new T.ExtrudeGeometry(shape,{depth:.069,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.006,bevelThickness:.005}),m.cheese,0,.08,0);wedge.rotation.x=Math.PI/2;
  const holes=m.flat('cheese-holes','#d39236',.8);
  for(const [x,z,r]of [[-.025,0,.009],[.005,.003,.007],[-.029,-.019,.005]])ball(g,holes,x,.086,z,r,.0015,r);
  for(const [x,y,r]of [[-.027,.045,.008],[.004,.031,.006],[-.03,.019,.005]]){const h=ball(g,holes,x,y,.0205-x*.314,r,r,.0016);h.rotation.y=.31;}
  block(g,m.flat('cheese-rind','#eeb344'),-.049,.042,0,.005,.074,.064);shine(-.011,.06,.024,.012,.003);
 }else if(id==='wheel'){
  const profile=[new T.Vector2(0,0),new T.Vector2(.17,0),new T.Vector2(.2,.025),new T.Vector2(.2,.37),new T.Vector2(.17,.4),new T.Vector2(0,.4)];
  mesh(g,new T.LatheGeometry(profile,24),m.cheese,0,0,0);
  for(const y of [.025,.375])torus(g,m.flat('cheese-rind','#eeb344'),0,y,0,.178,.012).rotation.x=Math.PI/2;
  for(let i=0;i<10;i++){const a=i*Math.PI/5;const h=ball(g,m.flat('cheese-holes','#d39236',.8),Math.sin(a)*.2,.09+(i%3)*.095,Math.cos(a)*.2,.022,.026,.002);h.rotation.y=a;}
  for(const [x,z]of [[-.07,-.08],[.06,.04],[-.1,.065]])ball(g,m.flat('cheese-holes','#d39236',.8),x,.401,z,.022,.002,.022);
 }else if(id==='crate'){
  g.add(crate(m,.4,.3,.25));for(let i=0;i<6;i++){const f=food(m,i%2?'tomato':'vegetable');f.position.set(-.12+(i%3)*.12,.22,-.06+Math.floor(i/3)*.12);g.add(f);}
 }else if(id==='mushroom'){
  ball(g,m.flat('mushroom-stem','#fff0ca'),0,.03,0,.018,.03,.017);
  ball(g,m.flat('mushroom-gills','#d9ba91'),0,.055,0,.044,.01,.044);
  mesh(g,new T.SphereGeometry(.048,20,12,0,Math.PI*2,0,Math.PI/2),m.flat('mushroom-cap','#db8961',.34),0,.055,0,1,.65,1);
  for(let i=0;i<5;i++){const a=i*2.4;ball(g,cream,Math.cos(a)*.025,.079+(i%2)*.004,Math.sin(a)*.025,.007,.0018,.006);}
 }else if(id==='honey'){
  const profile=[new T.Vector2(0,0),new T.Vector2(.028,0),new T.Vector2(.035,.01),new T.Vector2(.035,.065),new T.Vector2(.028,.079),new T.Vector2(.026,.083)];
  mesh(g,new T.LatheGeometry(profile,20),m.flat('honey','#f3ad30',.17),0,0,0);tube(g,m.flat('honey-lid','#d88331',.3),0,.085,0,.029,.012);
  ball(g,m.porcelain,0,.044,.034,.023,.019,.002);ball(g,m.flat('honey-badge','#dc8d28'),0,.044,.037,.01,.009,.001);shine(-.019,.058,.028,.004,.017);
 }else if(id==='garlic'){
  const clove=m.flat('garlic-clove','#fff1de',.46);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;ball(g,clove,Math.cos(a)*.015,.029,Math.sin(a)*.015,.018,.027,.018);}
  ball(g,m.flat('garlic-tip','#d3a7b3'),0,.052,0,.01,.019,.01);leaf(.004,.069,0,-.3,.015);
 }else if(id==='tomato'){
  const red=m.flat('tomato','#ed5640',.24);ball(g,red,0,.036,0,.036,.034,.036);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ball(g,red,Math.cos(a)*.013,.033,Math.sin(a)*.013,.025,.031,.025);const l=ball(g,green,Math.cos(a)*.012,.068,Math.sin(a)*.012,.006,.002,.018);l.rotation.y=-a;}
  rod(g,green,new T.Vector3(0,.064,0),new T.Vector3(.007,.081,.003),.003);shine(-.014,.049,.031,.009,.006);
 }else if(id==='chili'){
  const profile=[new T.Vector2(0,0),new T.Vector2(.003,.005),new T.Vector2(.009,.025),new T.Vector2(.013,.06),new T.Vector2(.012,.08),new T.Vector2(.006,.09),new T.Vector2(0,.093)];
  const geometry=new T.LatheGeometry(profile,20),positions=geometry.attributes.position;
  for(let k=0;k<positions.count;k++){const y=positions.getY(k);positions.setX(k,positions.getX(k)+.02*Math.pow(1-y/.093,2));}geometry.computeVertexNormals();
  const pepper=new T.Group();pepper.position.set(-.039,.016,0);pepper.rotation.z=-1.27;g.add(pepper);
  mesh(pepper,geometry,m.flat('chili','#ec483f',.25),0,0,0);rod(pepper,green,new T.Vector3(0,.09,0),new T.Vector3(-.006,.108,0),.0035);
  ball(pepper,cream,-.003,.062,.011,.003,.013,.001);
 }else if(id==='vegetable'){
  const orange=m.flat('carrot','#ff9a35',.37),groove=m.flat('carrot-stripe','#e1762b');
  for(let i=0;i<3;i++){const carrot=new T.Group();carrot.position.set((i-1)*.019,.017,(i-1)*.006);carrot.rotation.z=(i-1)*.22;g.add(carrot);
   const profile=[new T.Vector2(0,0),new T.Vector2(.004,.003),new T.Vector2(.011,.035),new T.Vector2(.015,.065),new T.Vector2(.012,.072),new T.Vector2(0,.075)];mesh(carrot,new T.LatheGeometry(profile,16),orange,0,0,0);
   for(let j=0;j<3;j++){const mark=ball(carrot,groove,0,.033+j*.011,.011,.005,.001,.001);mark.rotation.z=.15;}
   for(let j=0;j<3;j++){const l=ball(carrot,green,0,.086,0,.004,.019,.002);l.rotation.z=(j-1)*.65;}
  }
 }
 return batchStatic(g);
}

export type Character={root:T.Group;head:T.Group;arms:T.Group[];legs:T.Group[];body:T.Group;carry:T.Group;kind:string;phase:number;last:T.Vector3;parts:T.Object3D[]};
function mergePart(source:T.Group){const position=source.position.clone(),rotation=source.quaternion.clone(),scale=source.scale.clone(),parent=source.parent;source.removeFromParent();source.position.set(0,0,0);source.quaternion.identity();source.scale.set(1,1,1);const merged=batchStatic(source);source.clear();source.add(merged);source.position.copy(position);source.quaternion.copy(rotation);source.scale.copy(scale);parent?.add(source);return source;}
export function character(m:Materials,team:'mouse'|'chef'|'guest',classId:ClassId='head',variant=0):Character{
 const root=new T.Group(),head=new T.Group(),body=new T.Group(),carry=new T.Group(),arms:T.Group[]=[],legs:T.Group[]=[];root.add(body,head,carry);const parts:T.Object3D[]=[];
 if(team==='mouse'){
  const fur=m.get(`fur-${classId}`,classId==='hauler'?'#c58a57':classId==='rescuer'?'#d8b894':classId==='saboteur'?'#a398b7':'#c4a084','fur',.78);
  const belly=m.flat('mouse-cream','#f4ddbb'),ear=m.flat('mouse-inner-ear','#eea7a2',.65),eyeWhite=m.flat('mouse-eye-white','#fff7e8',.3),iris=m.flat('mouse-iris','#5d3d2b',.3);
  ball(body,fur,0,.038,0,.032,.035,.042);ball(body,belly,0,.038,.025,.023,.027,.021);
  head.position.set(0,.065,.022);ball(head,fur,0,0,0,.029,.026,.029);
  for(const side of [-1,1]){
   ball(head,fur,side*.027,.022,-.009,.021,.023,.008);ball(head,ear,side*.027,.022,-.001,.015,.017,.003);
   ball(head,belly,side*.01,-.009,.025,.013,.012,.017);
   const eye=ball(head,eyeWhite,side*.017,.008,.023,.010,.013,.006);eye.rotation.y=side*.3;
   ball(head,iris,side*.017,.009,.028,.0067,.0087,.0035);ball(head,m.black,side*.017,.009,.030,.0043,.006,.0018);
   ball(head,eyeWhite,side*.017-.0018,.012,.032,.0022,.0028,.001);
   const brow=ball(head,fur,side*.017,.023,.023,.011,.003,.004);brow.rotation.z=side*.22;
   ball(head,ear,side*.021,-.005,.023,.005,.003,.002);
   for(let j=0;j<3;j++)rod(head,belly,new T.Vector3(side*.011,-.009,.035),new T.Vector3(side*.049,-.005+j*.005,.032-j*.009),.00045);
  }
  ball(head,m.pink,0,-.004,.041,.008,.006,.006);ball(head,eyeWhite,-.002,-.002,.046,.002,.001,.0007);
  rod(head,m.flat('mouse-smile','#8e5a4c'),new T.Vector3(-.006,-.016,.037),new T.Vector3(.006,-.016,.037),.0007);
  const scarf=classId==='scout'?m.get('pip-red','#df6b59','fabric'):classId==='rescuer'?m.sage:classId==='saboteur'?m.wine:m.wood;
  torus(body,scarf,0,.058,.005,.027,.004).rotation.x=Math.PI/2;
  const scarfTail=block(body,scarf,-.019,.037,.034,.013,.033,.004);scarfTail.rotation.z=-.24;ball(body,scarf,-.023,.054,.029,.006,.006,.005);
  for(const side of [-1,1]){
   const arm=new T.Group();arm.position.set(side*.028,.048,.012);ball(arm,fur,0,-.011,0,.009,.018,.009);ball(arm,ear,0,-.023,.005,.008,.006,.009);
   for(let i=0;i<3;i++)ball(arm,ear,-.004+i*.004,-.024,.012,.002,.003,.003);root.add(arm);arms.push(mergePart(arm));
   const leg=new T.Group();leg.position.set(side*.020,.016,-.013);ball(leg,fur,0,0,0,.012,.014,.011);ball(leg,ear,0,-.011,.009,.009,.0045,.016);root.add(leg);legs.push(mergePart(leg));
  }
  const curve=new T.CatmullRomCurve3([new T.Vector3(0,.021,-.035),new T.Vector3(.024,.009,-.061),new T.Vector3(.023,.006,-.1),new T.Vector3(-.009,.016,-.12),new T.Vector3(-.028,.022,-.11)]);
  mesh(body,new T.TubeGeometry(curve,16,.0028,7,false),ear,0,0,0);
  if(classId==='saboteur'){for(const side of [-1,1])torus(head,m.brass,side*.017,.009,.031,.011,.0018);rod(head,m.brass,new T.Vector3(-.006,.009,.033),new T.Vector3(.006,.009,.033),.001);}
  if(classId==='hauler'){torus(body,m.wood,0,.027,0,.032,.004).rotation.x=Math.PI/2;block(body,m.brass,.024,.026,.025,.009,.008,.003);}
  carry.position.set(0,.045,.067);
 }
 else{const guest=team==='guest';const slender=classId==='sous';const scale=guest?.9:classId==='pastry'?.892:slender?1.054:1;root.scale.setScalar(scale);const skin=m.flat(`skin-${variant%6}`,['#c9916f','#a77458','#e1b58b','#946953','#c79579','#a9886c'][variant%6],.91);const shirt=guest?m.get(`guest-shirt-${variant%6}`,['#7a9390','#aa795f','#7e7187','#b1a06e','#6d849c','#a7787d'][variant%6],'fabric'):classId==='pastry'?m.linen:m.get('chef-jacket','#d8c9ae','fabric');const apron=guest?shirt:classId==='head'?m.get('navy-apron','#374d61','fabric'):classId==='sous'?m.sage:m.get('pastry-apron','#d9c2a6','fabric');const torso=ball(body,shirt,0,1.13,0,slender?.2:.28,.32,.19);ball(body,shirt,0,.9,0,slender?.18:.26,.2,.18);block(body,apron,0,1.03,.182,slender?.28:.4,.54,.025);block(body,m.brass,0,1.1,.201,.055,.035,.008);for(const s of [-1,1]){const strap=block(body,apron,s*.13,1.36,.13,.032,.2,.016);strap.rotation.z=-s*.18;block(body,m.wood,s*.11,.88,.202,.075,.09,.025);}const neck=tube(body,skin,0,1.5,0,.065,.13);head.position.set(0,1.66,0);ball(head,skin,0,0,0,.13,.16,.125);ball(head,skin,0,-.05,.11,.07,.08,.06);ball(head,skin,0,-.012,.15,.035,.023,.043);for(const s of [-1,1]){ball(head,skin,s*.128,-.005,0,.024,.042,.025);ball(head,m.porcelain,s*.055,.023,.113,.021,.024,.01);ball(head,m.black,s*.055,.023,.123,.010,.015,.006);ball(head,m.porcelain,s*.052,.029,.129,.004,.005,.002);const brow=block(head,m.wood,s*.055,.049,.11,.041,.012,.01);brow.rotation.z=s*.13;}const hair=m.get(`hair-${variant%3}`,['#513a39','#85705b','#694336'][variant%3],'fabric');ball(head,hair,0,.104,-.015,.137,.074,.125);if(!guest&&classId==='head'){const band=m.get('bram-bandana','#9a5852','fabric');torus(head,band,0,.09,0,.131,.014).rotation.x=Math.PI/2;for(const s of [-1,1]){const end=block(head,band,s*.02,.03,-.123,.025,.13,.008);end.rotation.z=s*.22;}const tattoo=m.get('ink-tattoo','#355254','fabric');torus(body,tattoo,-.305,.93,.05,.046,.008).rotation.x=Math.PI/2;}else if(!guest&&classId==='sous'){for(let i=0;i<7;i++)ball(head,hair,.1+Math.sin(i)*.015,-.03-i*.038,-.07,.025,.027,.024);torus(head,m.brass,.1,-.26,-.07,.019,.004).rotation.x=Math.PI/2;}else if(!guest){ball(head,m.linen,0,.12,-.018,.14,.038,.13);block(body,m.porcelain,.09,.99,.205,.06,.08,.003);}if(guest&&variant%3===0){for(const s of [-1,1])torus(head,m.brass,s*.053,.023,.124,.023,.003);rod(head,m.brass,new T.Vector3(-.03,.024,.128),new T.Vector3(.03,.024,.128),.002);}
 for(const s of [-1,1]){const arm=new T.Group();arm.position.set(s*(slender?.22:.29),1.34,0);ball(arm,shirt,s*.018,-.12,0,.075,.19,.075);ball(arm,skin,s*.025,-.32,.01,.056,.14,.055);ball(arm,skin,s*.025,-.46,.03,.053,.072,.035);for(let j=0;j<3;j++)ball(arm,skin,s*.025-.025+j*.023,-.505,.04,.011,.029,.012);root.add(arm);arms.push(mergePart(arm));const leg=new T.Group();leg.position.set(s*.12,.74,0);ball(leg,guest?m.wood:m.get('chef-trousers','#424652','fabric'),0,-.27,0,.09,.33,.08);ball(leg,m.black,0,-.665,.065,.095,.067,.15);root.add(leg);legs.push(mergePart(leg));}carry.position.set(.31,.9,.34);}
 mergePart(body);mergePart(head);parts.push(body,head,...arms,...legs,carry);root.userData.team=team;return {root,head,body,arms,legs,carry,kind:team,phase:0,last:new T.Vector3(),parts};
}
export function animateCharacter(c:Character,e:EntityView,time:number,speed:number,reduced:boolean){const mouse=c.kind==='mouse',moving=speed>.05,amplitude=moving?(mouse?.55:.42)*Math.min(1,speed/(mouse?2.6:2.2)):0;const phase=time*(mouse?20:6)*Math.min(1.6,Math.max(.8,speed/2));c.root.rotation.y=Math.PI/2-e.angle;c.body.position.y=reduced?0:moving?Math.abs(Math.sin(phase))*(mouse?.002:.016):Math.sin(time*1.6)*(mouse?.0006:.003);for(let i=0;i<c.legs.length;i++)c.legs[i].rotation.x=Math.sin(phase+i*Math.PI)*amplitude;for(let i=0;i<c.arms.length;i++){c.arms[i].rotation.x=-Math.sin(phase+i*Math.PI)*amplitude*.8;c.arms[i].rotation.z=0;}c.head.rotation.set(0,0,0);if(e.action){for(const a of c.arms)a.rotation.x=-1.05+Math.sin(time*12)*.1;}if(e.holding||e.carry){c.arms.forEach(a=>a.rotation.x=-.9);c.carry.rotation.z=Math.sin(time*9)*.07;}if(e.state==='flustered'||e.state==='stunned'){c.head.rotation.z=Math.sin(time*8)*.13;c.arms.forEach((a,i)=>a.rotation.z=Math.sin(time*7+i)*.3);}if(e.state==='held'){c.root.rotation.z=Math.sin(time*16)*.15;c.arms.forEach((a,i)=>a.rotation.x=Math.sin(time*17+i)*.7);}else c.root.rotation.z=0;}

export function burrowFurniture(m:Materials,kind:string){const g=new T.Group();if(kind==='nest'){block(g,m.get('matchbox','#ab7451','wood'),0,.024,0,.28,.045,.14);block(g,m.linen,0,.055,0,.26,.03,.125);block(g,m.wine,.02,.074,0,.2,.01,.13);ball(g,m.linen,-.095,.073,0,.035,.015,.05);for(let i=0;i<7;i++)block(g,m.wood,-.12+i*.04,.025,-.076,.023,.035,.004);}else if(kind==='cauldron'){const thimble=tube(g,m.steel,0,.048,0,.045,.08);for(let j=0;j<4;j++)for(let i=0;i<10;i++){const a=i*.628;ball(g,m.iron,Math.cos(a)*.045,.025+j*.014,Math.sin(a)*.045,.0025,.0025,.0025);}tube(g,m.get('burrow-tea','#8f6746'),0,.09,0,.039,.004);}else{tube(g,m.copper,0,.035,0,.16,.018);torus(g,m.brass,0,.05,0,.16,.007).rotation.x=-Math.PI/2;for(let i=0;i<20;i++){const a=i*Math.PI/10;block(g,m.copper,Math.cos(a)*.16,.045,Math.sin(a)*.16,.014,.025,.015).rotation.y=-a;}for(const x of [-.09,.09])for(const z of [-.09,.09])tube(g,m.wood,x,.02,z,.012,.04);for(const side of [-1,1]){tube(g,m.wood,side*.23,.02,0,.04,.015);tube(g,m.wine,side*.23,.05,0,.025,.06);tube(g,m.oak,side*.23,.086,0,.04,.015);}candle(g,m,0,.05,0,.35);}return g;}


