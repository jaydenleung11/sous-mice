import * as T from 'three';
import {MAP3D} from '../../shared/content3d';
import {kitchenStaffAt} from '../../shared/kitchenStaff3d';
import {character,animateCharacter,type Character} from './models';
import {BistroMaterials,ball,tube,rod,batchStatic} from './materials';
import {dish} from './kitchen';
import type {EntityView} from '../../shared/protocol';

/** Decorative service staff and cooking animation share authoritative match time. */
export class KitchenLife{
 root=new T.Group();private staff:{model:Character;tray:T.Group;tool:T.Group;shadow:T.Mesh}[]=[];private steam:T.Points;private bubbles:T.InstancedMesh;private steamMap:T.Texture;private steamMat:T.PointsMaterial;private bubbleMat:T.Material;private visibleStaff=0;private lastTime=0;private cooking=0;
 constructor(private m:BistroMaterials,shadow:T.Material){
  for(let i=0;i<6;i++){
   const model=character(m,'chef',i%3===0?'head':i%3===1?'sous':'pastry',i);model.root.scale.setScalar(i%3===1?1.04:1);model.root.userData.staff=true;
   const hat=new T.Group();tube(hat,m.porcelain,0,.17,0,.13,.15);for(let j=0;j<6;j++){const a=j*Math.PI/3;ball(hat,m.porcelain,Math.cos(a)*.06,.25,Math.sin(a)*.06,.08,.075,.08);}model.head.add(batchStatic(hat));
   const tray=new T.Group();dish(tray,m,0,0,0,.18,true);tray.position.set(0,.94,.38);model.root.add(tray);
   const tool=new T.Group();rod(tool,m.wood,new T.Vector3(0,0,0),new T.Vector3(0,-.33,.2),.008);ball(tool,m.wood,0,-.33,.2,.025,.012,.04);tool.position.set(.25,1.47,.45);model.root.add(tool);
   const shade=new T.Mesh(new T.PlaneGeometry(.72,.7),shadow);shade.rotation.x=-Math.PI/2;shade.position.y=.004;this.root.add(model.root,shade);this.staff.push({model,tray,tool,shadow:shade});
  }
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d')!,gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,249,226,.65)');gradient.addColorStop(.45,'rgba(255,249,226,.25)');gradient.addColorStop(1,'rgba(255,249,226,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);this.steamMap=new T.CanvasTexture(canvas);
  this.steamMat=new T.PointsMaterial({map:this.steamMap,color:'#fff3d7',transparent:true,opacity:.42,size:.15,depthWrite:false});const steamGeo=new T.BufferGeometry();steamGeo.setAttribute('position',new T.BufferAttribute(new Float32Array(6*9*3),3));this.steam=new T.Points(steamGeo,this.steamMat);this.steam.frustumCulled=false;this.root.add(this.steam);
  this.bubbleMat=m.flat('soup-bubbles','#f7cf72',.3);this.bubbles=new T.InstancedMesh(new T.SphereGeometry(.006,8,6),this.bubbleMat,36);this.bubbles.frustumCulled=false;this.root.add(this.bubbles);
 }
 update(time:number,self:EntityView,reduced:boolean){
  this.lastTime=time;this.root.visible=self.y<26&&!self.transit;this.visibleStaff=0;this.cooking=0;if(!this.root.visible)return;
  const poses=kitchenStaffAt(time);
  this.staff.forEach(({model,tray,tool,shadow},i)=>{
   const p=poses[i],show=Math.hypot(p.x-self.x,p.y-self.y)<23;model.root.visible=shadow.visible=show;if(!show)return;this.visibleStaff++;
   model.root.position.set(p.x,0,p.y);shadow.position.set(p.x,.004,p.y);
   const e:EntityView={...p,name:'Kitchen cook',team:'chef',classId:'pastry',bot:true,layer:'floor',state:'free'};animateCharacter(model,e,time,p.speed,reduced);
   tray.visible=p.task==='carry';tool.visible=p.task==='stir'||p.task==='chop';tool.rotation.x=0;tool.position.set(.25,1.47,.45);
   if(p.task==='carry')model.arms.forEach(a=>a.rotation.x=-.8);
   if(p.task==='stir'){this.cooking++;model.arms[1].rotation.x=-1.25;model.arms[1].rotation.z=reduced?0:Math.sin(time*2.7+i)*.12;tool.position.x=.25+(reduced?0:Math.sin(time*2.7+i)*.055);tool.position.z=.45+(reduced?0:Math.cos(time*2.7+i)*.045);}
   if(p.task==='chop'){this.cooking++;tool.position.y=1.28;model.arms[1].rotation.x=-.75+(reduced?0:Math.sin(time*5+i)*.18);tool.rotation.x=reduced?0:Math.sin(time*5+i)*.18;}
  });
  const pots=MAP3D.objects.filter(o=>o.kind==='soup'),positions=this.steam.geometry.attributes.position as T.BufferAttribute,matrix=new T.Matrix4();
  for(let i=0;i<6;i++){const p=pots[i];for(let j=0;j<9;j++){const t=reduced?.3:((time*.22+j/9+i*.13)%1);positions.setXYZ(i*9+j,p.x+Math.sin(j*2.4+t*2)*.036,p.z!+.27+t*.46,p.y+Math.cos(j*2.4+t*2)*.036);}for(let j=0;j<6;j++){const a=j*2.4,r=.025+(j%3)*.025,phase=reduced?0:Math.max(0,Math.sin(time*3+j*1.7+i));matrix.makeScale(.6+phase*.5,.4+phase,.6+phase*.5);matrix.setPosition(p.x+Math.cos(a)*r,p.z!+.257,p.y+Math.sin(a)*r);this.bubbles.setMatrixAt(i*6+j,matrix);}}
  positions.needsUpdate=true;this.bubbles.instanceMatrix.needsUpdate=true;
 }
 metrics(hidden=false){return{staffVisible:hidden?0:this.visibleStaff,cookingStaff:hidden?0:this.cooking,staff:kitchenStaffAt(this.lastTime),simmeringPots:6};}
 dispose(){this.root.traverse(n=>{if(n instanceof T.Mesh||n instanceof T.Points)n.geometry.dispose();});this.steamMap.dispose();this.steamMat.dispose();}
}
