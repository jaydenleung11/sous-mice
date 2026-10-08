import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {BistroMaterials as Materials,block,ball,tube,rod,torus,mesh,batchStatic} from './materials';
import {food,crate} from './models';

const round=(g:T.Group,m:T.Material,x:number,y:number,z:number,w:number,h:number,d:number,r=.015)=>mesh(g,new RoundedBoxGeometry(w,h,d,1,Math.min(r,h/3,d/3,w/3)),m,x,y,z);
const lathe=(g:T.Group,m:T.Material,points:number[][])=>mesh(g,new T.LatheGeometry(points.map(([r,y])=>new T.Vector2(r,y)),24),m,0,0,0);
export function contactShade(g:T.Group,m:Materials,x:number,y:number,z:number,w:number,d:number){const shade=mesh(g,new T.PlaneGeometry(w,d),m.contact,x,y,z);shade.rotation.x=-Math.PI/2;shade.castShadow=false;return shade;}
/** Physical-size UVs prevent a whole wall becoming just four oversized tiles. */
export function tiledWall(g:T.Group,m:T.Material,x:number,y:number,z:number,w:number,h:number,d:number){
 const geometry=new T.BoxGeometry(w,h,d),uv=geometry.attributes.uv as T.BufferAttribute;
 for(let face=0;face<6;face++){const u=(face<2?d:w)/.32,v=(face===2||face===3?d:h)/.32;for(let i=0;i<4;i++){const at=face*4+i;uv.setXY(at,uv.getX(at)*u,uv.getY(at)*v);}}
 return mesh(g,geometry,m,x,y,z);
}
export function dish(g:T.Group,m:Materials,x:number,y:number,z:number,r=.145,meal=false){
 const p=new T.Group();p.position.set(x,y,z);g.add(p);
 lathe(p,m.porcelain,[[0,0],[r*.6,0],[r,.016],[r,.024],[r*.83,.018],[r*.6,.01],[0,.01]]);
 torus(p,m.brass,0,.022,0,r*.9,.0017).rotation.x=Math.PI/2;
 if(meal){for(let i=0;i<6;i++){const a=i*1.047;const slice=ball(p,i%2?m.leaf:m.flat('meal-tomato','#c94c32'),Math.cos(a)*.041,.027,Math.sin(a)*.041,.025,.009,.034);slice.rotation.y=-a;}ball(p,m.flat('sauce','#eac86a'),0,.02,0,.071,.003,.071);}
}
export function stockpot(m:Materials,r=.145,h=.28,cooking=true){
 const g=new T.Group();contactShade(g,m,0,.002,0,r*2.65,r*2.65);lathe(g,m.copper,[[0,0],[r*.88,0],[r,.025],[r,h-.01],[r*.96,h],[r*.9,h],[r*.9,.024],[0,.024]]);
 for(const y of [.025,h-.014])torus(g,m.brass,0,y,0,r*.97,.004).rotation.x=Math.PI/2;
 for(const side of [-1,1]){const handle=torus(g,m.brass,side*(r+.025),h*.73,0,.031,.007);handle.rotation.y=Math.PI/2;for(const dz of [-.018,.018])ball(g,m.brass,side*r,h*.7,dz,.009,.007,.006);}
 if(cooking){tube(g,m.flat('simmering-soup','#e3a34c',.35),0,h-.026,0,r*.88,.004);for(let i=0;i<17;i++){const a=i*2.4,d=r*(.15+(i%5)*.14);ball(g,i%3===0?m.leaf:i%3===1?m.cheese:m.flat('carrot','#ff9a35'),Math.cos(a)*d,h-.021,Math.sin(a)*d,.008,.003,.008);}}
 return g;
}
export function pan(m:Materials,r=.15){
 const g=new T.Group();lathe(g,m.copper,[[0,0],[r*.87,0],[r,.035],[r,.05],[r*.94,.05],[r*.84,.011],[0,.011]]);
 rod(g,m.steel,new T.Vector3(r*.8,.03,0),new T.Vector3(r+.19,.045,0),.009);round(g,m.wood,r+.21,.046,0,.14,.022,.026);torus(g,m.brass,r+.27,.046,0,.012,.002).rotation.x=Math.PI/2;
 return g;
}
function bottle(g:T.Group,m:Materials,x:number,y:number,z:number,color='#576c35'){
 const b=new T.Group();b.position.set(x,y,z);g.add(b);lathe(b,m.flat('bottle-'+color,color,.22),[[0,0],[.045,0],[.05,.018],[.05,.18],[.022,.22],[.022,.3],[.015,.3],[.015,.235],[0,.235]]);tube(b,m.brass,0,.3,0,.023,.016);round(b,m.get('olive-label','#f1dfb8','label-OLIVE'),0,.12,.049,.07,.075,.002);ball(b,m.wine,0,.126,.051,.017,.019,.001);
}
function utensils(g:T.Group,m:Materials,x:number,y:number,z:number){
 const pot=new T.Group();pot.position.set(x,y,z);g.add(pot);lathe(pot,m.steel,[[0,0],[.063,0],[.073,.12],[.065,.126],[.055,.015],[0,.015]]);
 for(let i=0;i<5;i++){const a=i*1.7,p=new T.Vector3(Math.cos(a)*.037,.095,Math.sin(a)*.037),tip=p.clone().add(new T.Vector3(Math.cos(a)*.035,.24+i*.01,Math.sin(a)*.025));rod(pot,i%2?m.wood:m.steel,p,tip,.004);if(i%2)ball(pot,m.wood,tip.x,tip.y+.02,tip.z,.022,.04,.008);else{ball(pot,m.steel,tip.x,tip.y+.02,tip.z,.028,.03,.003);for(let j=0;j<3;j++)block(pot,m.iron,tip.x-.015+j*.015,tip.y+.02,tip.z+.003,.003,.026,.002);}}
}
function board(g:T.Group,m:Materials,x:number,y:number,z:number){
 round(g,m.oak,x,y+.014,z,.5,.028,.31,.018);torus(g,m.brass,x-.23,y+.031,z,.009,.002).rotation.x=Math.PI/2;
 const knife=round(g,m.steel,x+.1,y+.04,z+.07,.24,.008,.042,.003);knife.rotation.y=.35;round(g,m.wood,x-.075,y+.042,z+.01,.11,.02,.035);
 for(let i=0;i<3;i++){const carrot=food(m,'vegetable');carrot.scale.setScalar(1.5);carrot.rotation.z=Math.PI/2;carrot.rotation.y=.4;carrot.position.set(x-.12+i*.09,y+.034,z-.04);g.add(carrot);}
 for(let i=0;i<7;i++)tube(g,m.flat('carrot','#ff9a35'),x-.12+i*.026,y+.036,z+.07,.018,.006);
}
function pantryBits(g:T.Group,m:Materials,w:number,d:number){
 // A grouping of ingredients, tools and linens instead of repeated empty worktops.
 const x=w*.40,z=d*.19;
 const pitcher=stockpot(m,.061,.13,false);pitcher.position.set(x,.948,z);g.add(pitcher);
 for(let i=0;i<3;i++){const b=new T.Group();b.position.set(w*.035+i*.105,.947,d*.30);g.add(b);lathe(b,m.porcelain,[[0,0],[.035,0],[.045,.013],[.04,.19],[.012,.22],[.008,.27],[0,.27]]);tube(b,m.wine,0,.218,0,.014,.015);}
 round(g,m.get('broth-label','#e7cf9b','label-BROTH'),-w*.38,1.04,d*.17,.12,.18,.09);round(g,m.brass,-w*.38,1.134,d*.17,.13,.012,.1);
 const eggs=new T.Group();eggs.position.set(-w*.09,.947,d*.26);g.add(eggs);round(eggs,m.linen,0,.008,0,.19,.014,.09);for(let i=0;i<6;i++)ball(eggs,m.porcelain,-.063+(i%3)*.063,.035,-.024+Math.floor(i/3)*.048,.022,.031,.022);
 const pin=new T.Group();pin.position.set(-w*.28,.984,-d*.24);pin.rotation.y=.3;g.add(pin);rod(pin,m.oak,new T.Vector3(-.17,0,0),new T.Vector3(.17,0,0),.029);for(const side of [-1,1])rod(pin,m.wood,new T.Vector3(side*.17,0,0),new T.Vector3(side*.23,0,0),.011);
 const towel=round(g,m.get('kitchen-towel','#e9d9b7','fabric'),w*.36,.856,d/2+.047,.22,.17,.006);for(const dx of [-.075,.075])block(g,m.wine,w*.36+dx,.856,d/2+.052,.008,.17,.002);
}
function gauge(g:T.Group,m:Materials,x:number,y:number,z:number){
 const ring=torus(g,m.brass,x,y,z,.038,.006);tube(g,m.porcelain,x,y,z-.002,.034,.008).rotation.x=Math.PI/2;
 for(let i=0;i<7;i++){const a=-Math.PI*.85+i*Math.PI*1.7/6;const tick=block(g,m.black,x+Math.sin(a)*.025,y+Math.cos(a)*.025,z+.004,.003,.007,.002);tick.rotation.z=-a;}
 const needle=rod(g,m.wine,new T.Vector3(x,y,z+.008),new T.Vector3(x+.019,y+.012,z+.008),.002);ball(g,m.brass,x,y,z+.01,.004,.004,.002);
}
export function detailedCounter(m:Materials,kind:string,w:number,d:number){
 const g=new T.Group(),stove=kind==='stove',front=d/2+.016,body=stove?m.flat('oven-enamel','#28323a',.33,.35):m.flat('prep-enamel','#687072',.43,.6);
 for(const x of [-w/2+.04,w/2-.04])for(const z of [-d/2+.04,d/2-.04]){tube(g,m.iron,x,.06,z,.034,.12);ball(g,m.brass,x,.12,z,.042,.027,.042);}
 round(g,body,0,.5,0,w,.76,d);round(g,m.steel,0,.895,0,w+.04,.05,d+.045,.018);round(g,m.steel,0,.928,0,w+.065,.026,d+.06,.012);
 for(const side of [-1,1]){
  const z=side*front;rod(g,m.brass,new T.Vector3(-w/2+.07,.8,z+side*.028),new T.Vector3(w/2-.07,.8,z+side*.028),.015);
  const bays=Math.max(1,Math.floor(w/.75));for(let i=0;i<bays;i++){const bw=w/bays,x=-w/2+bw*(i+.5);
   round(g,m.brass,x,.435,z,bw-.055,.53,.025);round(g,body,x,.435,z+side*.016,bw-.085,.49,.015);
   if(stove){round(g,m.black,x,.46,z+side*.026,bw-.16,.32,.014);round(g,m.flat('oven-glass','#382820',.2,.35),x,.46,z+side*.035,bw-.20,.27,.008);for(let j=0;j<3;j++)rod(g,m.iron,new T.Vector3(x-bw*.3,.38+j*.065,z+side*.041),new T.Vector3(x+bw*.3,.38+j*.065,z+side*.041),.005);}
   rod(g,m.brass,new T.Vector3(x-bw*.28,.62,z+side*.055),new T.Vector3(x+bw*.28,.62,z+side*.055),.013);
   for(const dx of [-bw*.32,bw*.32])for(const y of [.2,.67])ball(g,m.brass,x+dx,y,z+side*.031,.006,.006,.003);
  }
  for(let i=0;i<Math.max(3,Math.round(w/.35));i++){const x=-w*.4+i*w*.8/(Math.max(3,Math.round(w/.35))-1);tube(g,m.brass,x,.84,z+side*.02,.027,.027).rotation.x=Math.PI/2;const knob=block(g,m.black,x,.84,z+side*.037,.01,.038,.012);knob.rotation.z=.35;}
  if(stove)gauge(g,m,0,.73,z+side*.03);
 }
 if(stove){
  for(const x of [-w*.26,0,w*.26])for(const z of [-d*.25,d*.25]){tube(g,m.iron,x,.952,z,.13,.012);torus(g,m.glow('gas-flame','#f2ad47',.8),x,.965,z,.079,.006).rotation.x=Math.PI/2;for(let i=0;i<4;i++){const a=i*Math.PI/2;rod(g,m.iron,new T.Vector3(x+Math.cos(a)*.05,.973,z+Math.sin(a)*.05),new T.Vector3(x+Math.cos(a)*.15,.981,z+Math.sin(a)*.15),.01);}}
  const skillet=pan(m,.145);skillet.position.set(0,.985,d*.2);g.add(skillet);for(let i=0;i<7;i++)ball(skillet,i%2?m.leaf:m.flat('meal-tomato','#c94c32'),Math.cos(i)*.067,.024,Math.sin(i)*.067,.014,.01,.015);
 }else if(kind==='sink'){
  round(g,m.iron,0,.949,0,w*.72,.015,d*.72);round(g,m.steel,0,.955,0,w*.68,.01,d*.67);
  const faucet=new T.CatmullRomCurve3([new T.Vector3(0,.95,-d*.25),new T.Vector3(0,1.24,-d*.25),new T.Vector3(0,1.28,-d*.12),new T.Vector3(0,1.16,-d*.04)]);mesh(g,new T.TubeGeometry(faucet,12,.014,8,false),m.steel,0,0,0);for(const x of [-.13,.13]){tube(g,m.brass,x,.968,-d*.25,.02,.04);rod(g,m.brass,new T.Vector3(x-.035,1,-d*.25),new T.Vector3(x+.035,1,-d*.25),.006);}dish(g,m,.19,.968,d*.2);utensils(g,m,-.18,.946,-d*.34);
 }else{
  board(g,m,-w*.24,.95,0);utensils(g,m,-w*.42,.945,-d*.24);bottle(g,m,w*.35,.945,-d*.25);
  for(const [x,z,sw,sd]of [[-w*.24,0,.6,.39],[-w*.42,-d*.24,.21,.21],[w*.35,-d*.25,.17,.17],[w*.22,d*.15,.38,.38],[w*.04,-d*.18,.32,.32]])contactShade(g,m,x,.946,z,sw,sd);
  for(let i=0;i<5;i++)dish(g,m,w*.22,.949+i*.019,d*.15,.145,kind==='pass'&&i===4);
  const bowl=new T.Group();bowl.position.set(w*.04,.95,-d*.18);g.add(bowl);lathe(bowl,m.steel,[[0,0],[.055,0],[.12,.08],[.13,.085],[.118,.087],[.047,.008],[0,.008]]);for(let i=0;i<4;i++){const tomato=food(m,'tomato');tomato.scale.setScalar(1.8);tomato.position.set(Math.cos(i*2.4)*.05,.05,Math.sin(i*2.4)*.05);bowl.add(tomato);}
  if(kind==='pass'){ball(g,m.brass,0,1.006,d*.27,.06,.04,.06);tube(g,m.black,0,.963,d*.27,.068,.016);}
  if(kind!=='bar'&&kind!=='host')pantryBits(g,m,w,d);
 }
 return g;
}
/** Ceiling fixtures dress existing stations without narrowing the floor routes. */
export function stationCanopy(m:Materials,w:number,d:number,prep=false){
 const g=new T.Group();round(g,m.iron,0,2.16,0,w+.3,.18,d+.4,.045);round(g,m.brass,0,2.075,0,w+.32,.024,d+.42);
 block(g,m.steel,0,2.03,0,w+.1,.02,d+.28);for(let i=0;i<9;i++)block(g,m.iron,-w*.42+i*w*.105,2.015,0,.028,.018,d+.15);
 for(const x of [-w*.42,w*.42])rod(g,m.brass,new T.Vector3(x,2.23,0),new T.Vector3(x,2.8,0),.018);
 const railZ=-d*.38;rod(g,m.brass,new T.Vector3(-w*.46,2.3,railZ),new T.Vector3(w*.46,2.3,railZ),.018);
 for(let i=0;i<5;i++){const x=-w*.38+i*w*.19;torus(g,m.brass,x,2.25,railZ,.025,.004);const p=pan(m,.11+(i%2)*.025);p.rotation.x=Math.PI/2;p.rotation.z=Math.PI/2;p.position.set(x,2.21,railZ);g.add(p);}
 return g;
}
export function pantryShelf(m:Materials,w:number,d:number,h:number){
 const g=new T.Group();for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])rod(g,m.steel,new T.Vector3(x,0,z),new T.Vector3(x,h,z),.021);
 for(let j=0;j<4;j++){const y=.13+j*(h-.2)/3;round(g,m.steel,0,y,0,w+.04,.025,d+.04);for(let i=0;i<Math.floor(w/.32);i++){const x=-w*.43+i*.33;if(j===0){const box=crate(m,.26,.26,.24);box.position.set(x,y+.02,0);g.add(box);const f=food(m,i%2?'vegetable':'tomato');f.scale.setScalar(2);f.position.set(x,y+.21,0);g.add(f);}else if(j===1){bottle(g,m,x,y+.02,0,i%2?'#627148':'#6b4c31');}else{const jar=new T.Group();jar.position.set(x,y+.015,0);g.add(jar);lathe(jar,m.flat('jar-'+j,j===2?'#cbb881':'#d89453'),[[0,0],[.085,0],[.092,.02],[.092,.22],[.08,.24],[0,.24]]);tube(jar,m.brass,0,.24,0,.09,.02);round(jar,m.get('jar-label-'+j,'#efdfb9',j===2?'label-SALT':'label-PAPRIKA'),0,.125,.092,.095,.075,.002);ball(jar,m.wine,0,.125,.095,.019,.024,.001);}}}
 return g;
}
/** A busy French service wall: shallow decoration above the existing floor routes. */
export function serviceWall(m:Materials){
 const g=new T.Group();round(g,m.steel,0,1.42,0,3.1,.035,.27);for(const x of [-1.2,1.2]){rod(g,m.iron,new T.Vector3(x,1.15,.02),new T.Vector3(x,1.4,.1),.012);rod(g,m.iron,new T.Vector3(x,1.15,.02),new T.Vector3(x,1.4,-.08),.012);}
 for(let j=0;j<3;j++)for(let i=0;i<8;i++)dish(g,m,-1.08+j*.33,1.443+i*.017,0,.13);
 for(let i=0;i<4;i++){const jar=new T.Group();jar.position.set(.25+i*.24,1.44,0);g.add(jar);lathe(jar,m.flat('wall-spice-'+i,['#d4ad62','#a9573e','#7f8950','#c6b595'][i]),[[0,0],[.065,0],[.07,.02],[.07,.16],[.06,.19],[0,.19]]);tube(jar,m.brass,0,.19,0,.069,.018);round(jar,m.get('wall-spice-label-'+i,'#efdfb9',i%2?'label-PAPRIKA':'label-SALT'),0,.1,-.071,.075,.065,.002);}
 rod(g,m.brass,new T.Vector3(-1.5,2.02,.07),new T.Vector3(1.5,2.02,.07),.016);
 for(let i=0;i<6;i++){const x=-1.27+i*.50;torus(g,m.brass,x,1.98,.07,.027,.004);const p=pan(m,.13+(i%2)*.025);p.rotation.x=Math.PI/2;p.rotation.z=Math.PI/2;p.position.set(x,1.94,.065);g.add(p);}
 return g;
}
export function serviceDoors(m:Materials){
 const g=new T.Group();round(g,m.wood,0,1.1,0,1.85,2.2,.04);for(const side of [-1,1]){round(g,m.flat('burgundy-door','#793b3e',.65),side*.45,1.05,-.035,.87,2.08,.025);round(g,m.brass,side*.19,.97,-.053,.16,.37,.006);round(g,m.steel,side*.45,.20,-.053,.80,.29,.006);const rim=torus(g,m.brass,side*.45,1.56,-.06,.16,.013);const glass=tube(g,m.flat('door-window','#41474d',.25,.3),side*.45,1.56,-.067,.15,.008);glass.rotation.x=Math.PI/2;}
 return g;
}
