import {DurableObject} from 'cloudflare:workers';
import {Rooms} from '../server/rooms';
import {FixedClock} from '../server/clock';
type Env={KITCHENS:DurableObjectNamespace<Kitchen>};
export class Kitchen extends DurableObject<Env>{
 rooms?:Rooms; interval?:ReturnType<typeof setInterval>; saved:unknown; initialized:Promise<void>; ticks=0; saving=false;
 rates=new Map<string,{count:number;at:number}>();
 constructor(ctx:DurableObjectState,env:Env){super(ctx,env);this.initialized=ctx.blockConcurrencyWhile(async()=>{this.saved=await ctx.storage.get('state');});}
 async fetch(request:Request){
  await this.initialized;const code=new URL(request.url).pathname.split('/').at(-1)!.toUpperCase();
  if(!this.rooms){this.rooms=new Rooms(code);this.rooms.restoreState(this.saved);}
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return Response.json({ok:true,version:'0.1.0'});
  const pair=new WebSocketPair(),[client,server]=Object.values(pair);server.accept();const id=crypto.randomUUID();
  this.rates.set(id,{count:0,at:Date.now()});
  const peer={id,send:(data:string)=>{try{server.send(data);}catch{}},close:()=>server.close()};
  server.addEventListener('message',event=>{const data=event.data;if(typeof data!=='string'||data.length>2048){server.close(1009,'Message too large');return;}const rate=this.rates.get(id)!;if(Date.now()-rate.at>1000){rate.at=Date.now();rate.count=0;}if(++rate.count>45){server.close(1008,'Too many messages');return;}try{this.rooms!.receive(peer,data);this.start();}catch(error){console.error('Room input failed',String(error));peer.send(JSON.stringify({type:'error',message:'The kitchen hit a snag. Please reconnect.'}));}});
  const close=()=>{this.rates.delete(id);this.rooms!.disconnect(id);};server.addEventListener('close',close);server.addEventListener('error',close);
  return new Response(null,{status:101,webSocket:client});
 }
 start(){if(this.interval)return;const clock=new FixedClock(()=>{this.rooms!.tick();if(++this.ticks%60===0)this.checkpoint();if(!this.rooms!.peers.size){if(this.interval!==undefined)clearInterval(this.interval);this.interval=undefined;this.checkpoint();}});this.interval=setInterval(()=>clock.advance(),10);}
 checkpoint(){if(this.saving)return;this.saving=true;this.ctx.storage.put('state',this.rooms!.exportState()).catch(e=>console.error('Checkpoint failed',String(e))).finally(()=>this.saving=false);}
}
export default {async fetch(request:Request,env:Env){const url=new URL(request.url);if(url.pathname==='/health')return Response.json({ok:true,service:'Sous Mice rooms'});const match=url.pathname.match(/^\/parties\/main\/([ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4})$/i);if(!match)return new Response('Room not found',{status:404});const id=env.KITCHENS.idFromName(match[1].toUpperCase());return env.KITCHENS.get(id).fetch(request);}};
