import WebSocket from 'ws';
import {writeFileSync} from 'node:fs';
import type {Snapshot,ServerMessage,ClientMessage} from '../shared/protocol';
import {WireDecoder} from '../shared/wire';

// Actual separate websocket connections. Optional third argument overrides 90s for diagnostics.
const endpoint=process.argv[2]??'ws://127.0.0.1:3001/ws';
const seconds=Number(process.argv[3]??90);
if(!Number.isFinite(seconds)||seconds<1)throw Error('Duration must be positive.');
const base=endpoint.replace(/^http:/,'ws:').replace(/^https:/,'wss:').replace(/\/$/,'');
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code=Array.from(crypto.getRandomValues(new Uint8Array(4)),n=>alphabet[n%alphabet.length]).join('');
const url=/\/parties\/main$/.test(base)?base+'/'+code:base;
class Client {
  ws:WebSocket;decoder=new WireDecoder();messages:ServerMessage[]=[];snapshots=new Map<number,Snapshot>();joined?:Extract<ServerMessage,{type:'joined'}>;snap?:Snapshot;seq=0;bytes=0;errors:string[]=[];firstSnapAt=0;
  constructor(readonly name:string){this.ws=new WebSocket(url);this.ws.on('message',raw=>{this.bytes+=Buffer.byteLength(String(raw));let m:ServerMessage|undefined;try{m=this.decoder.decode(String(raw));}catch{this.errors.push('Invalid JSON response');return;}if(!m)return;if(m.type==='probe')this.send({type:'probe',nonce:m.nonce});this.messages.push(m);if(m.type==='joined')this.joined=m;if(m.type==='error')this.errors.push(m.message);if(m.type==='snap'){this.snap=m;this.snapshots.set(m.tick,m);if(!this.firstSnapAt)this.firstSnapAt=Date.now();}});this.ws.on('error',e=>this.errors.push(e.message));}
  async open(){await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(`${this.name}: websocket open timed out`)),45000);this.ws.once('open',()=>{clearTimeout(timer);resolve();});this.ws.once('error',e=>{clearTimeout(timer);reject(e);});});}
  send(m:ClientMessage){if(this.ws.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify(m));}
  async wait(predicate:()=>boolean,timeout=10000){const start=Date.now();while(!predicate()){if(this.errors.length)throw Error(`${this.name}: ${this.errors.join('; ')}`);if(Date.now()-start>timeout)throw Error(`${this.name}: condition timed out`);await new Promise(r=>setTimeout(r,25));}}
}
const a=new Client('mouse'),b=new Client('chef');let interval:ReturnType<typeof setInterval>|undefined;
try{
  await Promise.all([a.open(),b.open()]);const joinedAt=Date.now();a.send({type:'create',name:'Smoke Mouse',team:'mouse'});await a.wait(()=>Boolean(a.joined));b.send({type:'join',code:a.joined!.code,name:'Smoke Chef'});await b.wait(()=>Boolean(b.joined));a.send({type:'host',options:{bots:false}});b.send({type:'setTeam',team:'chef'});a.send({type:'ready',value:true});b.send({type:'ready',value:true});await a.wait(()=>a.messages.some(m=>m.type==='lobby'&&m.players.length===2&&m.players.every(p=>p.ready)));a.send({type:'start'});await Promise.all([a.wait(()=>a.messages.some(m=>m.type==='briefing')),b.wait(()=>b.messages.some(m=>m.type==='briefing'))]);a.send({type:'skip'});b.send({type:'skip'});await Promise.all([a.wait(()=>Boolean(a.snap)),b.wait(()=>Boolean(b.snap))]);
  const start=Date.now();interval=setInterval(()=>{for(const [i,c] of [a,b].entries()){const s=c.snap;if(!s)continue;const p=s.entities.find(e=>e.id===s.selfId);if(!p)continue;const phase=Math.floor((Date.now()-start)/2000)%4;const dirs=[[1,0],[0,1],[-1,0],[0,-1]];const [mx,my]=dirs[(phase+i)%4];c.send({type:'input',frame:{seq:++c.seq,tick:s.tick,mx,my,buttons:0,ax:p.x+mx*2,ay:p.y+my*2}});}},1000/30);
  console.log(`Connected two players in room ${a.joined!.code}; testing ${seconds}s at ${url}`);
  await new Promise(r=>setTimeout(r,seconds*1000));clearInterval(interval);interval=undefined;
  const common=[...a.snapshots.keys()].filter(k=>b.snapshots.has(k));const mismatches=common.filter(k=>{const x=a.snapshots.get(k)!,y=b.snapshots.get(k)!;return x.time!==y.time||x.heist!==y.heist||x.rating!==y.rating;});
  const privateLeaks=[a,b].flatMap(c=>[...c.snapshots.values()].flatMap(s=>{const own=s.entities.find(p=>p.id===s.selfId);return s.entities.filter(p=>p.team!==own?.team&&['cooldowns','stamina','composure','buffUses','action'].some(key=>key in p));}));
  const tunnelLeaks=[...b.snapshots.values()].flatMap(s=>s.entities.filter(p=>p.team==='mouse'&&p.layer==='tunnel'));
  const report={endpoint:url,durationSeconds:seconds,joinedMilliseconds:Math.max(a.firstSnapAt,b.firstSnapAt)-joinedAt,snapshots:[a.snapshots.size,b.snapshots.size],commonTicks:common.length,timerAndMeterMismatches:mismatches.length,privateFieldLeaks:privateLeaks.length,unrevealedTunnelLeaks:tunnelLeaks.length,bytes:[a.bytes,b.bytes],lastTime:[a.snap?.time,b.snap?.time],errors:[...a.errors,...b.errors],connectionOpen:[a.ws.readyState===WebSocket.OPEN,b.ws.readyState===WebSocket.OPEN]};
  console.log(JSON.stringify(report,null,2));writeFileSync('work/smoke-latest.json',JSON.stringify(report,null,2));
  if(common.length<seconds*10||mismatches.length||privateLeaks.length||tunnelLeaks.length||report.errors.length||report.connectionOpen.some(open=>!open))throw Error('Two-client smoke acceptance failed; see work/smoke-latest.json.');
}finally{if(interval)clearInterval(interval);a.ws.close();b.ws.close();}
