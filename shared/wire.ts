import type {ServerMessage,Snapshot} from './protocol';
type Row={id:string;[key:string]:unknown};
type Patch={set:Record<string,unknown>;del:string[]};
const collections=['entities','pickups','cages','traps','guests','orders','events'] as const;
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function patch(a:Record<string,unknown>,b:Record<string,unknown>):Patch{const set:Record<string,unknown>={},del:string[]=[];for(const k of Object.keys(b))if(b[k]!==undefined&&!equal(a[k],b[k]))set[k]=b[k];for(const k of Object.keys(a))if(b[k]===undefined)del.push(k);return {set,del};}
function apply(a:Record<string,unknown>,p:Patch){Object.assign(a,p.set);for(const k of p.del)delete a[k];return a;}
/** A connection-local baseline only; never share baselines across teams or sessions. */
export class WireEncoder {
 private previous?:Snapshot;
 encode(message:ServerMessage):string{
  if(message.type!=='snap')return JSON.stringify(message);
  const s=JSON.parse(JSON.stringify(message)) as Snapshot;
  if(!this.previous){this.previous=s;return JSON.stringify(s);}
  const old=this.previous as unknown as Record<string,unknown>,now=s as unknown as Record<string,unknown>;
  const top=patch(old,now);for(const key of collections)delete top.set[key];
  const rows:Record<string,{up:Patch[];remove:string[]}>= {};
  for(const key of collections){const a=old[key] as Row[],b=now[key] as Row[];if(equal(a,b))continue;const index=new Map(a.map(v=>[String(v.id),v]));const ids=new Set(b.map(v=>String(v.id)));rows[key]={up:b.map(v=>{const p=patch(index.get(String(v.id))??{},v);p.set.id=v.id;return p;}).filter(p=>Object.keys(p.set).length>1||p.del.length||!index.has(String(p.set.id))),remove:a.filter(v=>!ids.has(String(v.id))).map(v=>String(v.id))};}
  this.previous=s;return JSON.stringify({type:'delta',top,rows});
 }
 reset(){this.previous=undefined;}
}
export class WireDecoder {
 private previous?:Snapshot;
 decode(raw:string):ServerMessage|undefined{
  const m=JSON.parse(raw);
  if(m.type==='snap'){this.previous=m;return m;}
  if(m.type!=='delta')return m;
  if(!this.previous)return;
  const s=structuredClone(this.previous) as unknown as Record<string,unknown>;apply(s,m.top);
  for(const key of collections){const p=m.rows[key];if(!p)continue;const map=new Map((s[key] as Row[]).map(v=>[String(v.id),v]));for(const id of p.remove)map.delete(String(id));for(const row of p.up){const id=String(row.set.id);map.set(id,apply(map.get(id)??{id:row.set.id},row) as Row);}s[key]=[...map.values()];}
  this.previous=s as unknown as Snapshot;return this.previous;
 }
 reset(){this.previous=undefined;}
}
