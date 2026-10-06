import {FixedClock} from '../shared/clock';
import WebSocket,{WebSocketServer} from 'ws';
import {writeFileSync} from 'node:fs';
import {WireDecoder} from '../shared/wire';
import {Predictor} from '../client/predict';
import type {ClientMessage,ServerMessage,Snapshot} from '../shared/protocol';

const target=process.argv[2]??'ws://127.0.0.1:3001/ws';
const duration=Number(process.argv[3]??15);
const roundTrips=process.argv[4]?process.argv[4].split(',').map(Number):[40,120,200];
const losses=process.argv[5]?process.argv[5].split(',').map(Number):[0,.02,.05];
if(!Number.isFinite(duration)||duration<5)throw Error('Use at least five seconds per scenario.');
if(roundTrips.some(n=>!Number.isFinite(n)||n<0)||losses.some(n=>!Number.isFinite(n)||n<0||n>1))throw Error('Invalid scenario values.');
const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function until(predicate:()=>boolean,label:string){const start=Date.now();while(!predicate()){if(Date.now()-start>15000)throw Error(`Timed out: ${label}`);await pause(10);}}
let seed=20261005;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

async function scenario(rtt:number,loss:number){
  const base=target.replace(/^http:/,'ws:').replace(/^https:/,'wss:').replace(/\/$/,'');
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',code=Array.from(crypto.getRandomValues(new Uint8Array(4)),n=>alphabet[n%alphabet.length]).join('');
  const endpoint=/\/parties\/main$/.test(base)?base+'/'+code:base;
  const proxy=new WebSocketServer({port:0,host:'127.0.0.1'});await new Promise<void>(r=>proxy.once('listening',()=>r()));
  const address=proxy.address();if(typeof address==='string'||!address)throw Error('Proxy address unavailable');const port=address.port;
  const streams:WebSocket[]=[],timers=new Set<ReturnType<typeof setTimeout>>();let retransmits=0,frames=0;
  proxy.on('connection',down=>{
    const up=new WebSocket(endpoint);streams.push(down,up);const early:string[]=[];
    // Ordered delivery approximates TCP head-of-line blocking. "Loss" incurs one RTT
    // of retransmission delay; application frames are never discarded/reordered.
    const pipe=(dest:WebSocket)=>{let available=0;return(raw:string)=>{frames++;const retransmit=random()<loss;if(retransmit)retransmits++;const delay=Math.max(0,rtt/2+(random()-.5)*30)+(retransmit?rtt:0);available=Math.max(available+0.1,Date.now()+delay);const timer=setTimeout(()=>{timers.delete(timer);if(dest.readyState===WebSocket.OPEN)dest.send(raw);},Math.max(0,available-Date.now()));timers.add(timer);};};
    const inbound=pipe(up),outbound=pipe(down);
    down.on('message',raw=>{if(up.readyState===WebSocket.OPEN)inbound(String(raw));else early.push(String(raw));});
    up.on('open',()=>early.forEach(inbound));up.on('message',raw=>outbound(String(raw)));
    up.on('error',()=>down.close());down.on('error',()=>up.close());down.on('close',()=>up.close());up.on('close',()=>down.close());
  });
  class Client{
    ws=new WebSocket(`ws://127.0.0.1:${port}`);decoder=new WireDecoder();predictor=new Predictor();messages:ServerMessage[]=[];snaps=new Map<number,Snapshot>();snap?:Snapshot;joined?:Extract<ServerMessage,{type:'joined'}>;corrections:number[]=[];errors:string[]=[];seq=0;measuring=false;
    constructor(){this.ws.on('error',e=>this.errors.push(e.message));this.ws.on('message',raw=>{try{const m=this.decoder.decode(String(raw));if(!m)return;if(m.type==='probe')this.send({type:'probe',nonce:m.nonce});this.messages.push(m);if(m.type==='joined')this.joined=m;if(m.type==='error')this.errors.push(m.message);if(m.type==='snap'){this.snap=m;this.snaps.set(m.tick,m);this.predictor.receive(m);if(this.measuring)this.corrections.push(this.predictor.correction);}}catch(e){this.errors.push(String(e));}});}
    send(m:ClientMessage){if(this.ws.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify(m));}
  }
  const a=new Client(),b=new Client();let inputTimer:ReturnType<typeof setInterval>|undefined;
  try{
    await until(()=>a.ws.readyState===WebSocket.OPEN&&b.ws.readyState===WebSocket.OPEN,'proxy connection');
    a.send({type:'create',name:'Latency Mouse',team:'mouse'});await until(()=>!!a.joined,'create');b.send({type:'join',code:a.joined!.code,name:'Latency Chef'});await until(()=>!!b.joined,'join');a.send({type:'host',options:{bots:false}});b.send({type:'setTeam',team:'chef'});a.send({type:'ready',value:true});b.send({type:'ready',value:true});await until(()=>a.messages.some(m=>m.type==='lobby'&&m.players.length===2&&m.players.every(p=>p.ready)),'ready');a.send({type:'start'});await until(()=>a.messages.some(m=>m.type==='briefing')&&b.messages.some(m=>m.type==='briefing'),'briefing');a.send({type:'skip'});b.send({type:'skip'});await until(()=>!!a.snap&&!!b.snap,'first snapshot');
    const start=Date.now();a.measuring=true;b.measuring=true;
    const outgoing=new Map<Client,Extract<ClientMessage,{type:'input'}>>();
    const inputClock=new FixedClock(()=>{const seconds=(Date.now()-start)/1000;for(const [i,c]of [a,b].entries()){const p=c.predictor.player;if(!p||!c.snap)continue;c.predictor.visual(1/30);const directions=[[1,0],[0,1],[-1,0],[0,-1]], [mx,my]=directions[(Math.floor(seconds/2)+i)%4];const f={seq:++c.seq,tick:c.snap.tick,mx,my,buttons:0,ax:p.x+mx*2,ay:p.y+my*2};c.predictor.input(f);outgoing.set(c,{type:'input',frame:f});}});
    inputTimer=setInterval(()=>{inputClock.advance();for(const [c,message]of outgoing)c.send(message);outgoing.clear();},10);
    await pause(duration*1000);clearInterval(inputTimer);inputTimer=undefined;
    const common=[...a.snaps.keys()].filter(t=>b.snaps.has(t));const desync=common.filter(t=>{const x=a.snaps.get(t)!,y=b.snaps.get(t)!;return x.time!==y.time||x.heist!==y.heist||x.rating!==y.rating;}).length;
    const corrections=[...a.corrections,...b.corrections].sort((x,y)=>x-y),p95=corrections[Math.min(corrections.length-1,Math.floor(corrections.length*.95))]??Infinity;
    const report={rttMs:rtt,packetLossModel:loss,jitterMs:30,durationSeconds:duration,frames,retransmissionStalls:retransmits,snapshots:[a.snaps.size,b.snaps.size],commonTicks:common.length,desyncTicks:desync,correctionSamples:corrections.length,p95CorrectionTiles:p95,maxCorrectionTiles:corrections.at(-1)??Infinity,correctionsWithinHalfTile:corrections.filter(n=>n<=.5).length/Math.max(1,corrections.length),errors:[...a.errors,...b.errors],open:[a.ws.readyState===WebSocket.OPEN,b.ws.readyState===WebSocket.OPEN],pass:desync===0&&common.length>duration*8&&p95<=.5&&!a.errors.length&&!b.errors.length&&a.ws.readyState===WebSocket.OPEN&&b.ws.readyState===WebSocket.OPEN};
    console.log(JSON.stringify(report));return report;
  }finally{if(inputTimer)clearInterval(inputTimer);a.ws.terminate();b.ws.terminate();for(const timer of timers)clearTimeout(timer);for(const stream of streams)stream.terminate();await new Promise<void>(r=>proxy.close(()=>r()));}
}
const results=[];for(const rtt of roundTrips)for(const loss of losses)results.push(await scenario(rtt,loss));
const report={target,model:'Ordered WebSocket frame delay with ±15ms jitter; probabilistic loss produces one-RTT retransmission stall. Approximates TCP; not real kernel packet loss.',results};writeFileSync('work/latency-latest.json',JSON.stringify(report,null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
