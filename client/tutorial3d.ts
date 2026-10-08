import {createWorld,stepWorld,visibleTo} from '../shared/sim';
import {MAP3D,TRAVERSALS3D,walkable3D} from '../shared/content3d';
import {BUTTON,DT} from '../shared/constants';
import type {World,Team,Vec,InputFrame,Snapshot,Player} from '../shared/protocol';

/** A local, action-driven training world. Lessons advance from real simulation
 * outcomes, including completed server transit; there is no skip/completion input. */
export class Training3D {
 world:World;step=0;target?:Vec;title='';description='';control='';done=false;
 private moved=0;private sneaked=0;private looked=0;private lastYaw=0;private jumped=false;private entered=false;private sensed=0;private eventStart=0;
 constructor(public team:Team,public changed:()=>void){this.world=createWorld([{id:'trainee',name:'You',team,classId:team==='mouse'?'scout':'head',ready:true,bot:false,connected:true},{id:'partner',name:team==='mouse'?'Clove':'Pip',team:'mouse',classId:'rescuer',ready:true,bot:false,connected:true},{id:'coach',name:'Bram',team:'chef',classId:'head',ready:true,bot:false,connected:true}],{duration:3600,bots:false,difficulty:'easy',mode:'3d'},42);this.world.guests=[];this.world.nextOrder=99999;this.world.pickups=[];this.setup();}
 get self(){return this.world.players[0];}
 get total(){return this.team==='mouse'?11:8;}
 private place(p:Player,at:Vec){if(!walkable3D(at.x,at.y,at.z??0,p.team))throw Error(`Unsafe training anchor: ${at.x},${at.y},${at.z??0}`);Object.assign(p,{...at,z:at.z??0,vz:0,vx:0,vy:0,grounded:true,layer:(at.z??0)>.04?'ledge':'floor',action:undefined,lastButtons:0,hidden:undefined,transit:undefined,traversal:undefined,invulnerableUntil:0,state:'free',stateUntil:0,angle:0,pitch:0});}
 private lesson(title:string,description:string,control:string,target?:Vec){this.title=title;this.description=description;this.control=control;this.target=target;}
 private setup(){
  const p=this.self,w=this.world,coach=w.players.find(p=>p.id==='coach')!,ally=w.players.find(p=>p.id==='partner')!,cage=w.cages[0];
  this.eventStart=w.nextId;this.moved=0;this.sneaked=0;this.looked=0;this.jumped=false;this.entered=false;this.sensed=0;w.result=undefined;w.rating=70;w.lockdown=0;p.action=undefined;p.lastButtons=0;p.cooldowns={controllerTime:w.time};p.stamina=100;p.hidden=undefined;p.buff=undefined;p.buffUntil=0;
  this.place(coach,{x:38,y:10,z:0});if(this.team==='chef'&&this.step!==3)this.place(ally,{x:22,y:28.5,z:0});
  if(this.team==='mouse'){
   if(this.step===0){this.place(p,MAP3D.spawns.mouse);this.place(ally,{x:24,y:28,z:0});this.lesson('Welcome to your small world.','See your whole mouse! The View button or P switches to first-person. Look with your mouse or drag on the right. Walk with WASD or the left stick; Ctrl or a gentle stick tilt sneaks. Follow the warm marker.','LOOK · MOVE · SNEAK',{x:23,y:28.5,z:0});}
   if(this.step===1){this.place(p,{x:10,y:21,z:0});this.lesson('A little hop.','Press Jump (Space or the Jump button). Your paws can clear tiny obstacles. Wait until you land to continue.','JUMP');}
   if(this.step===2){const route=TRAVERSALS3D.find(t=>t.id==='table-1-climb')!;this.place(p,route.from);this.lesson('The table is your ceiling.','Face the scuffed table leg at the marker. Hold Use and push forward to climb. Keep holding while your paws pull you onto the table.','USE + FORWARD',route.to);}
   if(this.step===3){this.place(p,{x:10,y:21,z:0});w.pickups=[{id:'lesson-cheese',food:'cheese',x:10.2,y:21,z:0,available:true,respawnAt:9999}];this.lesson('Follow your nose.','Hold Sense (C or the Sense button). Food, holes and teammates leave warm scent wisps; they never reveal chefs.','HOLD SENSE',w.pickups[0]);}
   if(this.step===4){this.place(p,{x:10,y:21,z:0});this.lesson('Borrow a little cheese.','The cheese is within paw reach. Stop moving and hold Use (E) until you pick it up.','HOLD USE',w.pickups[0]);}
   if(this.step===5){this.lesson('A snack with a superpower.','Hold Eat (F). Cheese gives you Dash. In a match, every food can instead be carried home for the Heist meter.','HOLD EAT');}
   if(this.step===6){const hole=MAP3D.holes.find(h=>h.id==='H5')!;p.carry='tomato';this.place(p,{x:hole.x+.1,y:hole.y,z:0});this.lesson('Into the walls.','Hold Use at the warm hole. Choose The Burrow on the Fork, or wait for that default exit. Stay for the whole journey: chefs cannot see you in transit.','HOLD USE · WAIT FOR ARRIVAL',hole);}
   if(this.step===7){this.place(p,{x:22,y:28.65,z:0});this.lesson('Home, with a tomato.','You reached the Burrow. Hold Use beside the Stash to deliver your tomato. The Heist meter rises; reach 100 to win.','HOLD USE',MAP3D.stash);}
   if(this.step===8){const soup=MAP3D.objects.find(o=>o.kind==='soup')!;this.place(p,{x:soup.x,y:soup.y,z:.92});this.place(coach,{x:soup.x,y:22.9,z:0});this.lesson('Turn up the heat.','You are on the stove ledge. Hold Use to tip this soup pot. Soup hurts nearby chefs’ Composure; at zero, they drop captured mice and keys.','HOLD USE',soup);}
   if(this.step===9){this.place(p,{x:cage.x+.7,y:cage.y,z:0});this.place(ally,cage);ally.state='caged';ally.cageId=cage.id;ally.stateUntil=w.time+3600;cage.occupant=ally.id;cage.keyOwner=coach.id;cage.keyDropped={x:p.x+.15,y:p.y,z:0};cage.keyUntil=w.time+3600;this.lesson('Never leave a mouse behind.','Clove is caged. Hold Use to collect the glowing key beside you. In matches, flustering the keyholder drops this key.','HOLD USE',cage.keyDropped);}
   if(this.step===10)this.lesson('The best heist is a team heist.','Hold Use beside Clove’s cage to unlock it. Keep somebody free: three seconds with every mouse caught gives the chefs Lockdown.','HOLD USE',cage);
  }else{
   const pass=MAP3D.objects.find(o=>o.kind==='pass')!;
   if(this.step===0||this.step===1){this.place(p,{x:pass.x,y:pass.y+.8,z:0});w.orders=[{id:'lesson-order',tableId:'lesson-guest',stage:'ready',elapsed:0,age:0,readyAt:w.time,cold:false,vip:false,...(this.step===1?{tamper:'garlic' as const}:{})}];this.lesson(this.step===0?'Service, please.':'Something smells suspicious.',this.step===0?'At the Pass, stop moving and hold Use to garnish and send the dish. Prompt service restores the Rating.':'This dish is tampered. Hold Inspect (I) to remake it safely. Search the Pass before you send suspicious food.',this.step===0?'HOLD USE':'HOLD INSPECT',pass);}
   if(this.step===2){w.orders=[];this.place(p,{x:12,y:21,z:0});this.place(ally,{x:12.85,y:21,z:0});ally.state='free';this.lesson('Caught with crumbs.','Face the mouse at the marker and tap Grab. Your hand has a short reach; get close and keep the mouse in front of you.','GRAB',ally);}
   if(this.step===3){this.place(p,{x:cage.x+.8,y:cage.y,z:0});ally.state='held';ally.heldBy=p.id;p.holding=ally.id;this.lesson('A short stay in the pantry.','You are carrying Pip. Hold Use beside the cage to lock it. Mice auto-release after 40 seconds, or a teammate can bring the key.','HOLD USE',cage);}
   if(this.step===4){p.holding=undefined;ally.state='free';ally.heldBy=undefined;ally.cageId=undefined;cage.occupant=undefined;cage.keyOwner=undefined;this.place(ally,{x:22,y:28.5,z:0});this.place(p,{x:12,y:21,z:0});this.lesson('Leave a little surprise.','Hold Trap (T) for one second. The snap trap arms shortly afterward and briefly stops a mouse that steps on it.','HOLD TRAP',p);}
   if(this.step===5){const hide=MAP3D.hides.find(h=>h.id==='hide-curtain-1')!;this.place(p,{x:hide.x+.6,y:hide.y,z:0});this.lesson('Check the quiet corners.','Hold Use beside this curtain to search it. Tablecloths and curtains can completely conceal a mouse from view.','HOLD USE',hide);}
   if(this.step===6||this.step===7){const hole=MAP3D.holes.find(h=>h.id==='H5')!;this.place(p,{x:hole.x-.1,y:hole.y,z:0});this.lesson(this.step===6?'A glimpse into the dark.':'Listen through the walls.',this.step===6?'Hold Peek at this hole. You get a short tunnel glimpse, without revealing the identity or private state of a traveling mouse.':'Hold Tunnel Ear at this hole. Listen for nearby transit activity, then return to service. Keep Rating above zero until time runs out.',this.step===6?'HOLD PEEK':'HOLD TUNNEL EAR',hole);}
  }
  this.lastYaw=p.angle;this.changed();
 }
 update(input:InputFrame){
  if(this.done)return;const p=this.self,prev={x:p.x,y:p.y};stepWorld(this.world,new Map([[p.id,input]]),DT);this.world.result=undefined;this.world.rating=Math.max(40,this.world.rating);this.world.lockdown=0;
  const traveled=Math.hypot(p.x-prev.x,p.y-prev.y);this.moved+=traveled;if(input.buttons&BUTTON.SNEAK)this.sneaked+=traveled;this.looked+=Math.abs(Math.atan2(Math.sin(p.angle-this.lastYaw),Math.cos(p.angle-this.lastYaw)));this.lastYaw=p.angle;this.jumped||=(p.z??0)>.06;this.entered||=p.state==='transit';if((p.cooldowns.senseUntil??0)>this.world.time)this.sensed+=DT;
  if(this.team==='mouse'&&this.step>=9)this.world.cages[0].keyUntil=this.world.time+30;
  const event=(kind:string)=>this.world.events.some(e=>e.id>=this.eventStart&&e.kind===kind);
  const complete=this.team==='mouse'?[this.moved>1&&this.sneaked>.2&&this.looked>.35,this.jumped&&p.grounded,(p.z??0)>=.74&&!p.traversal,this.sensed>.3,event('pickup'),event('eat'),this.entered&&p.state==='free'&&p.layer==='floor'&&p.y>=27,event('deliver'),event('soup'),this.world.cages[0].keyCarrier===p.id,p.stats.rescues>0][this.step]:[event('send'),event('inspect'),!!p.holding,event('cage'),event('trap'),event('search'),event('peek'),event('ear')][this.step];
  if(complete){this.step++;if(this.step>=this.total){this.done=true;if(typeof localStorage!=='undefined')localStorage.setItem(`sous-trained-3d-${this.team}`,'yes');this.changed();}else this.setup();}
 }
 snapshot():Snapshot{const w=this.world,p=this.self;return {type:'snap',mode:'3d',tick:w.tick,time:w.time,duration:w.duration,ackSeq:p.ackSeq,selfId:p.id,entities:w.players.filter(e=>visibleTo(w,p,e)),pickups:w.pickups,cages:w.cages,traps:w.traps,guests:w.guests,orders:w.orders,events:w.events,heist:w.heist,rating:w.rating,lockdown:w.lockdown,plugs:w.plugs};}
}

