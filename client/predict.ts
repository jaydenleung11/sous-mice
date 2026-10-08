import type {EntityView,InputFrame,Player,Snapshot} from '../shared/protocol';
import {movePlayer} from '../shared/sim';
import {DT} from '../shared/constants';
export function fullPlayer(e:EntityView):Player{return {ready:true,connected:true,stamina:100,composure:100,buffUntil:0,buffUses:0,cooldowns:{},invulnerableUntil:0,stateUntil:0,lastDamage:0,revealUntil:0,squirm:0,ackSeq:0,lastButtons:0,stats:{deliveries:0,captures:0,rescues:0,dishes:0,tampers:0,scares:0},vx:0,vy:0,...e};}
export class Predictor{
 player?:Player;pending:InputFrame[]=[];offset={x:0,y:0,z:0};correction=0;
 reset(){this.player=undefined;this.pending=[];this.offset={x:0,y:0,z:0};}
 receive(s:Snapshot){const e=s.entities.find(p=>p.id===s.selfId);if(!e){this.player=undefined;return;}const old=this.player?{x:this.player.x+this.offset.x,y:this.player.y+this.offset.y,z:(this.player.z||0)+this.offset.z,state:this.player.state}:undefined;this.pending=this.pending.filter(f=>f.seq>s.ackSeq);this.player=fullPlayer(e);this.player.mode=s.mode;for(const input of this.pending)movePlayer(this.player,input,DT);if(old){const x=old.x-this.player.x,y=old.y-this.player.y,z=old.z-(this.player.z||0);this.correction=Math.hypot(x,y,z);this.offset=this.correction>1||old.state!==this.player.state?{x:0,y:0,z:0}:{x,y,z};}}
 input(f:InputFrame){if(!this.player)return;this.pending.push(f);if(this.pending.length>120)this.pending.shift();movePlayer(this.player,f,DT);}
 visual(dt:number){this.offset.x*=Math.exp(-dt*30);this.offset.y*=Math.exp(-dt*30);this.offset.z*=Math.exp(-dt*30);return this.player?{...this.player,x:this.player.x+this.offset.x,y:this.player.y+this.offset.y,...(this.player.mode==='3d'?{z:(this.player.z||0)+this.offset.z}:{})}:undefined;}
}
export class Interpolator{
 queue:{at:number;s:Snapshot}[]=[];
 receive(s:Snapshot){this.queue.push({at:performance.now(),s});if(this.queue.length>8)this.queue.shift();}
 entities():EntityView[]{const last=this.queue.at(-1);if(!last)return [];const at=performance.now()-100;let before=this.queue[0],after=last;for(const q of this.queue){if(q.at<=at)before=q;if(q.at>=at){after=q;break;}}const t=Math.min(1,Math.max(0,(at-before.at)/Math.max(1,after.at-before.at)));const visible=new Set(last.s.entities.map(p=>p.id));return after.s.entities.filter(p=>visible.has(p.id)).map(p=>{const prev=before.s.entities.find(v=>v.id===p.id);if(!prev||prev.layer!==p.layer||prev.state!==p.state)return p;const turn=Math.atan2(Math.sin(p.angle-prev.angle),Math.cos(p.angle-prev.angle));return {...p,x:prev.x+(p.x-prev.x)*t,y:prev.y+(p.y-prev.y)*t,...(last.s.mode==='3d'?{z:(prev.z||0)+((p.z||0)-(prev.z||0))*t,angle:prev.angle+turn*t,pitch:(prev.pitch||0)+((p.pitch||0)-(prev.pitch||0))*t}:{})};});}
}
