import { CLASSES, DEFAULT_OPTIONS, DT } from '../shared/constants';
import type { ClientMessage, InputFrame, Lobby, LobbyPlayer, RoomOptions, ServerMessage, Team, World } from '../shared/protocol';
import { createWorld, stepWorld, setPlayerLatency } from '../shared/sim';
import { WireEncoder } from '../shared/wire';
import { botInput } from '../bots/index';
import { botInput3D } from '../bots/three';
import { chooseTransitExit } from '../shared/transit3d';
import { snapshotFor } from './interest';
export interface Peer {id:string;send(data:string):void;close?():void}
type Member={player:LobbyPlayer;token:string;peer?:Peer;disconnectedAt?:number};
type Room={code:string;hostId:string;members:Member[];options:RoomOptions;phase:Lobby['phase'];world?:World;inputs:Map<string,InputFrame>;briefUntil:number;lastActive:number;resultSent:boolean};
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const safeName=(name:unknown)=>String(name??'Guest').replace(/[<>\x00-\x1f]/g,'').replace(/fuck|shit|cunt|nigger|fag/gi,'Chef').trim().slice(0,12)||'Guest';
export class Rooms {
  constructor(readonly fixedCode?:string){}
  rooms=new Map<string,Room>();
  peers=new Map<string,{room:string;player:string;count:number;window:number;lastSeq:number;inputAt?:number;probe?:{nonce:string;at:number};samples:number[]}>();
  encoders=new Map<string,WireEncoder>();
  probeAt=0;
  now=()=>Date.now();
  send(peer:Peer,message:ServerMessage){let encoder=this.encoders.get(peer.id);if(!encoder){encoder=new WireEncoder();this.encoders.set(peer.id,encoder);}peer.send(encoder.encode(message));}
  error(peer:Peer,message:string){this.send(peer,{type:'error',message});}
  lobby(room:Room):Lobby{return {type:'lobby',code:room.code,hostId:room.hostId,players:room.members.map(m=>m.player),options:room.options,phase:room.phase};}
  broadcast(room:Room,message:ServerMessage){for(const m of room.members)if(m.peer)this.send(m.peer,message);}
  update(room:Room){this.broadcast(room,this.lobby(room));}
  receive(peer:Peer,raw:string){
    if(raw.length>2048)return;
    let m:ClientMessage;try{m=JSON.parse(raw);}catch{return;}
    if(!m||typeof m!=='object'||typeof m.type!=='string')return;
    const link=this.peers.get(peer.id);
    if(link){if(this.now()-link.window>=1000){link.window=this.now();link.count=0;}if(++link.count>40)return;}
    if(m.type==='time'){if(Number.isFinite(m.t0))this.send(peer,{type:'pong',t0:m.t0,serverTime:this.now()});return;}
    if(m.type==='probe'){if(typeof m.nonce==='string'&&link?.probe&&link.probe.nonce===m.nonce){const rtt=this.now()-link.probe.at;link.samples.push(rtt);link.samples=link.samples.slice(-5);link.probe=undefined;const world=this.rooms.get(link.room)?.world;if(world)setPlayerLatency(world,link.player,Math.min(...link.samples)/2000);}return;}
    if(m.type==='create'||m.type==='join'){
      if(link)return this.error(peer,'Leave your current table before joining another.');
      if(m.type==='create'){
        if(this.fixedCode&&this.rooms.has(this.fixedCode))return this.error(peer,'This room code is already in use. Please create another room.');
        if(this.rooms.size>=100)return this.error(peer,'The bistro is full. Try again shortly.');
        let code=this.fixedCode??'';if(!code)do{code=Array.from(crypto.getRandomValues(new Uint8Array(4)),n=>ALPHABET[n%ALPHABET.length]).join('');}while(this.rooms.has(code));
        const room:Room={code,hostId:'',members:[],options:{...DEFAULT_OPTIONS,...(m.mode==='3d'?{mode:'3d' as const}:{})},phase:'lobby',inputs:new Map(),briefUntil:0,lastActive:this.now(),resultSent:false};
        this.rooms.set(code,room);this.join(peer,room,m.name,undefined,m.team);return;
      }
      const room=this.rooms.get(String(m.code).toUpperCase());if(!room)return this.error(peer,'That room is not open. Check the four-letter code and try again.');
      this.join(peer,room,m.name,m.token);return;
    }
    if(!link)return this.error(peer,'Join a room to start cooking.');
    const room=this.rooms.get(link.room);const member=room?.members.find(v=>v.player.id===link.player);if(!room||!member)return;
    room.lastActive=this.now();
    switch(m.type){
      case 'leave':this.disconnect(peer.id,true);break;
      case 'setTeam':if(room.phase==='lobby'&&(m.team==='mouse'||m.team==='chef')){const cap=m.team==='mouse'?5:3;if(room.members.filter(p=>p.player.team===m.team&&p.player.id!==member.player.id).length>=cap)return this.error(peer,'That team is full. Try the other side.');member.player.team=m.team;member.player.classId=m.team==='mouse'?'scout':'head';member.player.ready=false;this.update(room);}break;
      case 'setClass':if(room.phase==='lobby'&&(CLASSES[member.player.team] as readonly string[]).includes(m.classId)){member.player.classId=m.classId;member.player.ready=false;this.update(room);}break;
      case 'ready':if(room.phase==='lobby'){member.player.ready=!!m.value;this.update(room);}break;
      case 'host':if(room.phase==='lobby'&&room.hostId===member.player.id&&m.options&&typeof m.options==='object'){if([360,480,600].includes(m.options.duration!))room.options.duration=m.options.duration!;if(typeof m.options.bots==='boolean')room.options.bots=m.options.bots;if(['easy','normal','hard'].includes(m.options.difficulty!))room.options.difficulty=m.options.difficulty!;this.update(room);}break;
      case 'start':if(room.phase==='lobby'&&room.hostId===member.player.id)this.start(peer,room);break;
      case 'skip':if(room.phase==='briefing'){member.player.ready=true;if(room.members.filter(v=>v.peer).every(v=>v.player.ready))room.briefUntil=this.now();}break;
      case 'input':if(room.phase==='match'&&!member.player.spectator&&this.validInput(m.frame,room.options.mode)&&m.frame.seq>link.lastSeq){link.lastSeq=m.frame.seq;link.inputAt=this.now();room.inputs.set(member.player.id,m.frame);}break;
      case 'transitExit':if(room.phase==='match'&&room.world?.mode==='3d'&&!member.player.spectator&&typeof m.exit==='string'&&m.exit.length<=12){const p=room.world.players.find(p=>p.id===member.player.id);if(p)chooseTransitExit(room.world,p,m.exit);}break;
      case 'rematch':if(room.phase==='results'&&room.hostId===member.player.id){room.world=undefined;room.phase='lobby';room.members=room.members.filter(v=>v.peer);room.members.forEach(v=>{v.player.ready=false;v.player.spectator=false;});room.inputs.clear();this.update(room);}break;
    }
  }
  validInput(f:InputFrame,mode?:'3d'){return f&&[f.seq,f.tick,f.mx,f.my,f.buttons,f.ax,f.ay].every(Number.isFinite)&&Number.isSafeInteger(f.seq)&&f.seq>=0&&Math.abs(f.mx)<=1&&Math.abs(f.my)<=1&&Number.isInteger(f.buttons)&&f.buttons>=0&&f.buttons<(mode==='3d'?32768:2048)&&Math.abs(f.ax)<=100&&Math.abs(f.ay)<=100&&[f.yaw,f.pitch,f.moveX,f.moveY,f.yawDelta,f.pitchDelta,f.aimX,f.aimY].every(v=>v===undefined||Number.isFinite(v))&&(f.yaw===undefined||Math.abs(f.yaw)<=Math.PI*2)&&(f.pitch===undefined||Math.abs(f.pitch)<=Math.PI/2);}
  join(peer:Peer,room:Room,name:string,token?:string,team?:Team){
    let member:Member|undefined=token?room.members.find(v=>v.token===token&&(v.peer||this.now()-(v.disconnectedAt??0)<=60000)):undefined;
    if(member){if(member.peer){this.peers.delete(member.peer.id);this.encoders.delete(member.peer.id);member.peer.close?.();}member.peer=peer;member.player.connected=true;member.disconnectedAt=undefined;const restoredId=member.player.id;const p=room.world?.players.find(p=>p.id===restoredId);if(p){p.connected=true;p.bot=false;}}
    else {
      if(room.members.filter(v=>!v.player.bot).length>=8)return this.error(peer,'This room has eight players already.');
      const counts={mouse:room.members.filter(v=>v.player.team==='mouse').length,chef:room.members.filter(v=>v.player.team==='chef').length};
      const preferred:Team=team==='chef'||team==='mouse'?team:(counts.mouse<=counts.chef?'mouse':'chef');
      team=counts[preferred]>=(preferred==='mouse'?5:3)?(preferred==='mouse'?'chef':'mouse'):preferred;
      const base=safeName(name);let unique=base;for(let n=2;room.members.some(v=>v.player.name===unique);n++)unique=base.slice(0,9)+' '+n;
      const id=crypto.randomUUID().slice(0,8);member={player:{id,name:unique,team,classId:team==='mouse'?'scout':'head',ready:false,bot:false,connected:true,spectator:room.phase!=='lobby'},token:crypto.randomUUID(),peer};room.members.push(member);if(!room.hostId)room.hostId=id;
    }
    if(!room.members.some(v=>v.player.id===room.hostId&&v.peer))room.hostId=member.player.id;
    this.peers.set(peer.id,{room:room.code,player:member.player.id,count:0,window:this.now(),lastSeq:-1,samples:[]});
    this.send(peer,{type:'joined',playerId:member.player.id,token:member.token,code:room.code});this.update(room);
    if(room.phase==='briefing')this.send(peer,{type:'briefing',seconds:Math.max(0,(room.briefUntil-this.now())/1000)});
    if(room.world){const p=room.world.players.find(p=>p.id===member.player.id)??room.world.players.find(p=>p.team===member.player.team);if(p)this.send(peer,snapshotFor(room.world,p));if(room.world.result)this.send(peer,{type:'result',result:room.world.result});}
  }
  start(peer:Peer,room:Room){
    const humans=room.members.filter(v=>v.peer);
    if(!humans.every(v=>v.player.ready))return this.error(peer,'Everyone needs to press Ready before service begins.');
    if(!room.options.bots&&(!humans.some(v=>v.player.team==='mouse')||!humans.some(v=>v.player.team==='chef')))return this.error(peer,'Choose at least one mouse and one chef, or turn on kitchen bots.');
    const players:LobbyPlayer[]=humans.map(v=>({...v.player,spectator:false}));
    room.inputs.clear();for(const member of humans){if(member.peer){const link=this.peers.get(member.peer.id);if(link)link.lastSeq=-1;this.encoders.get(member.peer.id)?.reset();}}
    if(room.options.bots)for(const [team,target] of [['mouse',3],['chef',2]] as const){let count=players.filter(p=>p.team===team).length;while(count<target){players.push({id:`bot-${team}-${count}`,name:team==='mouse'?['Pip','Biscuit','Clove'][count]:['Bram','Odile'][count],team,classId:CLASSES[team][count%CLASSES[team].length],ready:true,bot:true,connected:true});count++;}}
    room.world=createWorld(players,room.options,crypto.getRandomValues(new Uint32Array(1))[0]);room.phase='briefing';room.briefUntil=this.now()+20000;room.resultSent=false;humans.forEach(v=>v.player.ready=false);this.update(room);this.broadcast(room,{type:'briefing',seconds:20});
  }
  disconnect(peerId:string,leave=false){this.encoders.delete(peerId);const link=this.peers.get(peerId);if(!link)return;this.peers.delete(peerId);this.encoders.delete(peerId);const room=this.rooms.get(link.room);if(!room)return;const m=room.members.find(v=>v.player.id===link.player);if(!m)return;m.peer=undefined;m.disconnectedAt=this.now();m.player.connected=false;room.inputs.delete(m.player.id);const p=room.world?.players.find(p=>p.id===m.player.id);if(p){p.connected=false;p.invulnerableUntil=room.world!.time+5;if(leave)p.bot=true;}if(leave)room.members=room.members.filter(v=>v!==m);if(room.hostId===m.player.id)room.hostId=room.members.find(v=>v.peer)?.player.id??'';this.update(room);}
  tick(){
    const now=this.now();const probe=now-this.probeAt>4000;if(probe)this.probeAt=now;for(const [code,room]of this.rooms){
      if(room.phase==='lobby')room.members=room.members.filter(m=>m.peer||now-(m.disconnectedAt??now)<=60000);
      for(const m of room.members)if(m.peer){const link=this.peers.get(m.peer.id);if(link&&probe){link.probe={nonce:crypto.randomUUID().slice(0,8),at:now};this.send(m.peer,{type:'probe',nonce:link.probe.nonce});}if(link&&now-(link.inputAt??now)>250)room.inputs.delete(m.player.id);}
      if(now-room.lastActive>7200000||(!room.members.some(v=>v.peer)&&now-room.lastActive>600000)){this.rooms.delete(code);continue;}
      if(room.phase==='briefing'&&now>=room.briefUntil){room.phase='match';this.update(room);}
      if(room.phase!=='match'||!room.world)continue;
      const w=room.world;
      for(const m of room.members){const p=w.players.find(p=>p.id===m.player.id);if(p&&!m.peer&&now-(m.disconnectedAt??now)>5000)p.bot=true;}
      for(const p of w.players)if(p.bot)room.inputs.set(p.id,w.mode==='3d'?botInput3D(w,p):botInput(w,p));
      stepWorld(w,room.inputs,DT);
      if(w.tick%2===0)for(const m of room.members)if(m.peer){const p=w.players.find(p=>p.id===m.player.id)??w.players.find(p=>p.team===m.player.team);if(p)this.send(m.peer,snapshotFor(w,p));}
      if(w.result&&!room.resultSent){room.phase='results';room.resultSent=true;this.broadcast(room,{type:'result',result:w.result});this.update(room);}
    }
  }
  exportState(){return [...this.rooms.values()].map(r=>({...r,inputs:undefined,members:r.members.map(m=>({...m,peer:undefined}))}));}
  restoreState(saved:unknown){if(!Array.isArray(saved))return;for(const r of saved){if(!r||typeof r.code!=='string'||!Array.isArray(r.members))continue;r.inputs=new Map();r.hostId='';r.members.forEach((m:Member)=>{m.peer=undefined;m.disconnectedAt=m.disconnectedAt??this.now();m.player.connected=false;const p=r.world?.players.find((p:LobbyPlayer)=>p.id===m.player.id);if(p)p.connected=false;});this.rooms.set(r.code,r);}}
}
