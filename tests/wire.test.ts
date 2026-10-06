import {describe,it,expect} from 'vitest';
import {WireEncoder,WireDecoder} from '../shared/wire';
import {createWorld} from '../shared/sim';
import {snapshotFor} from '../server/interest';
describe('snapshot deltas',()=>{
 it('reconstructs changes, deleted fields and enemy removals exactly',()=>{const w=createWorld([{id:'m',name:'Mouse',team:'mouse',classId:'scout',ready:true,bot:false,connected:true},{id:'c',name:'Chef',team:'chef',classId:'head',ready:true,bot:false,connected:true}],{duration:480,bots:false,difficulty:'normal'});const e=new WireEncoder(),d=new WireDecoder();const m=w.players[0];const s=snapshotFor(w,m);expect(d.decode(e.encode(s))).toEqual(s);m.carry='cheese';w.tick++;w.time+=1/30;const t=snapshotFor(w,m);expect(d.decode(e.encode(t))).toEqual(t);m.carry=undefined;w.players[1].x=70;const u=snapshotFor(w,m);expect(d.decode(e.encode(u))).toEqual(u);});
 it('starts a fresh baseline after reset',()=>{const d=new WireDecoder();expect(d.decode('{"type":"delta","top":{},"rows":{}}')).toBeUndefined();});
});
