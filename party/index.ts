import type * as Party from 'partykit/server';
import {Rooms} from '../server/rooms';
import {FixedClock} from '../server/clock';
export default class SousMice implements Party.Server {
  rooms:Rooms;
  interval?:ReturnType<typeof setInterval>;
  saveTick=0;
  saving=false;
  rates=new Map<string,{at:number;count:number}>();
  constructor(readonly room:Party.Room){this.rooms=new Rooms(room.id.toUpperCase());}
  async onStart(){this.rooms.restoreState(await this.room.storage.get('state'));}
  startLoop(){if(this.interval)return;const clock=new FixedClock(()=>{
    this.rooms.tick();
    if(++this.saveTick%60===0&&!this.saving){this.saving=true;this.room.storage.put('state',this.rooms.exportState()).catch(e=>console.error('Room checkpoint failed',String(e))).finally(()=>this.saving=false);}
    if(!this.rooms.peers.size){clearInterval(this.interval);this.interval=undefined;void this.room.storage.put('state',this.rooms.exportState()).catch(e=>console.error('Final checkpoint failed',String(e)));}
  });this.interval=setInterval(()=>clock.advance(),10);}
  onConnect(connection:Party.Connection){connection.setState({connected:true});this.rates.set(connection.id,{at:Date.now(),count:0});this.startLoop();}
  onMessage(message:string|ArrayBuffer,sender:Party.Connection){
    if(typeof message!=='string'||message.length>2048){sender.close(1009,'Message too large');return;}
    let rate=this.rates.get(sender.id);if(!rate){rate={at:Date.now(),count:0};this.rates.set(sender.id,rate);}if(Date.now()-rate.at>=1000){rate.at=Date.now();rate.count=0;}if(++rate.count>45){sender.close(1008,'Too many messages');return;}
    try{this.rooms.receive({id:sender.id,send:data=>sender.send(data),close:()=>sender.close()},message);this.startLoop();}catch(error){console.error('Room input failed',String(error));sender.send(JSON.stringify({type:'error',message:'The kitchen hit a snag. Please reconnect.'}));}
  }
  onClose(connection:Party.Connection){this.rates.delete(connection.id);this.rooms.disconnect(connection.id);}
  onError(connection:Party.Connection){this.rates.delete(connection.id);this.rooms.disconnect(connection.id);}
  onRequest(){return new Response(JSON.stringify({ok:true,version:'0.1.0'}),{headers:{'Content-Type':'application/json'}});}
}
