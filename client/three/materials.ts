import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** All surface artwork is generated locally, with a stable seed. No downloaded assets. */
export class BistroMaterials {
 all=new Map<string,T.MeshStandardMaterial>();textures:T.Texture[]=[];
 private budget=new Map<T.Material,T.MeshLambertMaterial>();
 budgetFor(material:T.Material){if(!(material instanceof T.MeshStandardMaterial))return material;let replacement=this.budget.get(material);if(!replacement){replacement=new T.MeshLambertMaterial({color:material.color,map:material.map,emissive:material.emissive,emissiveIntensity:material.emissiveIntensity,side:material.side,transparent:material.transparent,opacity:material.opacity,depthWrite:material.depthWrite});this.budget.set(material,replacement);}return replacement;}
 applyBudget(root:T.Object3D,budget:boolean){root.traverse(node=>{if(!(node instanceof T.Mesh)||Array.isArray(node.material))return;const original=(node.userData.originalMaterial||node.material) as T.Material;node.userData.originalMaterial=original;node.material=budget?this.budgetFor(original):original;});}
 private grain(kind:string,base:string,size=256){const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const c=canvas.getContext('2d')!;c.fillStyle=base;c.fillRect(0,0,size,size);let seed=203;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  if(kind==='wood'){for(let i=0;i<280;i++){const y=random()*size;c.strokeStyle=`rgba(${random()>.5?'255,216,151':'39,15,19'},${random()*.15})`;c.lineWidth=random()*2+.3;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(size*.3,y+random()*9,size*.7,y-random()*9,size,y);c.stroke();}for(let y=0;y<size;y+=64){c.fillStyle='#26141d66';c.fillRect(0,y,size,2);c.fillStyle='#efc28722';c.fillRect(0,y+2,size,1);for(let x=(y%128?100:220);x<size;x+=size)c.fillRect(x,y,2,64);}}
  else if(kind==='tile'){const unit=size/4;for(let x=0;x<4;x++)for(let y=0;y<4;y++){c.fillStyle=(x+y)%2?'#ffffff0e':'#301b2620';c.fillRect(x*unit,y*unit,unit,unit);c.fillStyle='#47333566';c.fillRect(x*unit,y*unit,unit,2);c.fillRect(x*unit,y*unit,2,unit);c.fillStyle='#fff4d525';c.fillRect(x*unit+3,y*unit+3,unit-5,1);}}
  else if(kind==='fabric'){for(let x=0;x<size;x+=3){c.fillStyle='#ffffe711';c.fillRect(x,0,1,size);}for(let y=0;y<size;y+=3){c.fillStyle='#23162518';c.fillRect(0,y,size,1);}for(let x=0;x<size;x+=64){c.fillStyle='#fce9c322';c.fillRect(x,0,6,size);}}
  else if(kind==='brick'){for(let y=0;y<8;y++)for(let x=-1;x<4;x++){const xx=x*80+(y%2)*40,yy=y*32;c.fillStyle=`rgba(255,202,157,${random()*.1})`;c.fillRect(xx+2,yy+2,76,28);c.fillStyle='#332c3566';c.fillRect(xx,yy,80,2);c.fillRect(xx,yy,2,32);}}
  for(let i=0;i<size*size/4;i++){c.fillStyle=random()>.5?'#fff1ca0b':'#150f1a0b';c.fillRect(random()*size,random()*size,1,1);}const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;this.textures.push(map);return map;
 }
 get(name:string,color:string,kind='plaster',roughness=.8,metalness=0){const prior=this.all.get(name);if(prior)return prior;const material=new T.MeshStandardMaterial({map:this.grain(kind,color),roughness,metalness});this.all.set(name,material);return material;}
 flat(name:string,color:string,roughness=.75,metalness=0){const prior=this.all.get(name);if(prior)return prior;const m=new T.MeshStandardMaterial({color,roughness,metalness});this.all.set(name,m);return m;}
 glow(name:string,color:string,strength=1.4){const m=this.flat(name,color);m.emissive.set(color);m.emissiveIntensity=strength;return m;}
 get wood(){return this.get('walnut','#734634','wood',.72);}
 get oak(){return this.get('honey-oak','#b78250','wood',.74);}
 get brass(){return this.get('aged-brass','#b58a49','metal',.38,.7);}
 get copper(){return this.get('copper','#b4653e','metal',.38,.65);}
 get steel(){return this.get('brushed-steel','#a8b4ab','metal',.3,.6);}
 get iron(){return this.get('dark-iron','#3e4850','metal',.62,.65);}
 get porcelain(){return this.get('porcelain','#f2e4ca','plaster',.28);}
 get linen(){return this.get('linen','#d7bc92','fabric',.92);}
 get wine(){return this.get('wine-fabric','#804b51','fabric',.94);}
 get sage(){return this.get('sage-fabric','#607e73','fabric',.9);}
 get pink(){return this.flat('nose-pink','#cb9392');}
 get black(){return this.flat('soft-ink','#262432',.34);}
 get skin(){return this.flat('warm-skin','#c89169',.92);}
 get cheese(){return this.get('cheese','#edb549','plaster',.68);}
 get leaf(){return this.get('herb-leaf','#59795b','fabric',.86);}
 dispose(){this.all.forEach(m=>m.dispose());this.budget.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());}
}

const box=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,12,8),cylinder=new T.CylinderGeometry(1,1,1,12),cone=new T.ConeGeometry(1,1,12);
export function mesh(parent:T.Object3D,geometry:T.BufferGeometry,material:T.Material,x:number,y:number,z:number,sx=1,sy=1,sz=1){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export const block=(p:T.Object3D,m:T.Material,x:number,y:number,z:number,w:number,h:number,d:number)=>mesh(p,box,m,x,y,z,w,h,d);
export const ball=(p:T.Object3D,m:T.Material,x:number,y:number,z:number,w:number,h=w,d=w)=>mesh(p,sphere,m,x,y,z,w,h,d);
export const tube=(p:T.Object3D,m:T.Material,x:number,y:number,z:number,r:number,h:number)=>mesh(p,cylinder,m,x,y,z,r,h,r);
export const taper=(p:T.Object3D,m:T.Material,x:number,y:number,z:number,r:number,h:number)=>mesh(p,cone,m,x,y,z,r,h,r);
export function rod(p:T.Object3D,m:T.Material,a:T.Vector3,b:T.Vector3,r:number){const at=a.clone().add(b).multiplyScalar(.5),v=b.clone().sub(a);const mesh=tube(p,m,at.x,at.y,at.z,r,v.length());mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return mesh;}
export function torus(p:T.Object3D,m:T.Material,x:number,y:number,z:number,r:number,thickness:number){return mesh(p,new T.TorusGeometry(r,thickness,6,16),m,x,y,z);}
/** Static props collapse to one draw per material, per room. Artists can assemble freely. */
export function batchStatic(source:T.Group,castShadow=true){source.updateMatrixWorld(true);const bins=new Map<T.Material,T.BufferGeometry[]>();source.traverse(node=>{if(!(node instanceof T.Mesh)||!node.visible||Array.isArray(node.material))return;const geom=node.geometry.index?node.geometry.toNonIndexed():node.geometry.clone();geom.applyMatrix4(node.matrixWorld);if(!geom.attributes.uv){const count=geom.attributes.position.count;geom.setAttribute('uv',new T.BufferAttribute(new Float32Array(count*2),2));}const list=bins.get(node.material)||[];list.push(geom);bins.set(node.material,list);});const merged=new T.Group();for(const [material,geoms]of bins){const geom=mergeGeometries(geoms,false);geoms.forEach(g=>g.dispose());if(!geom)continue;geom.computeBoundingSphere();const m=new T.Mesh(geom,material);m.castShadow=castShadow;m.receiveShadow=true;merged.add(m);}return merged;}
export function labelTexture(text:string,color='#f2d5a2',width=512,height=128){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const c=canvas.getContext('2d')!;c.fillStyle='#342835';c.fillRect(0,0,width,height);c.strokeStyle='#bf9567';c.lineWidth=5;c.strokeRect(8,8,width-16,height-16);c.font=`600 ${Math.min(48,width/text.length*1.5)}px Fredoka`;c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.fillText(text,width/2,height/2);const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;return t;}
export function shadowTexture(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d')!,g=x.createRadialGradient(32,32,2,32,32,31);g.addColorStop(0,'rgba(22,14,23,.58)');g.addColorStop(1,'rgba(22,14,23,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new T.CanvasTexture(c);}

