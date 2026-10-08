import {test,expect} from '@playwright/test';
import {WireDecoder} from '../../shared/wire';
import type {Snapshot} from '../../shared/protocol';
import {mkdirSync,writeFileSync} from 'node:fs';
for(const team of ['mouse','chef'])test(`3D ${team} training through browser controls`,async({page,baseURL})=>{
 test.setTimeout(150000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(baseURL+'?r=3d');await page.locator('#training').click();await page.locator('#learn-'+team).click();await expect(page.locator('canvas[data-engine]')).toBeVisible();await expect(page.locator('#training-card')).toBeVisible();
 const step=()=>page.evaluate(()=> (window as any).__sous3d?.state().trainingStep);
 const key=async(code:string,next:number)=>{await page.keyboard.down(code);try{await expect.poll(step,{timeout:15000}).toBe(next);}finally{await page.keyboard.up(code);}};
 if(team==='mouse'){
  await page.locator('canvas[data-engine]').click({position:{x:720,y:450}});await page.mouse.move(950,420);await page.keyboard.down('ControlLeft');await key('KeyW',1);await page.keyboard.up('ControlLeft');
  await key('Space',2);await page.keyboard.down('KeyE');await key('KeyW',3);await page.keyboard.up('KeyE');await key('KeyC',4);await key('KeyE',5);await key('KeyF',6);await key('KeyE',7);await key('KeyE',8);await key('KeyE',9);await key('KeyE',10);await key('KeyE',11);
 }else{await key('KeyE',1);await key('KeyI',2);await page.keyboard.press('KeyQ');await expect.poll(step).toBe(3);await key('KeyE',4);await key('KeyT',5);await key('KeyE',6);await key('KeyB',7);await key('KeyN',8);}
 await expect(page.locator('#training-card')).toContainText('TRAINING COMPLETE');expect(errors).toEqual([]);mkdirSync('work/browser3d',{recursive:true});await page.screenshot({path:`work/browser3d/${team}-complete.png`});writeFileSync(`work/browser3d/${team}.json`,JSON.stringify({errors,metrics:await page.evaluate(()=>(window as any).__sous3d.metrics())},null,2));
});


test('3D private desktop and phone join, transit, play90seconds and restore after refresh',async({browser,baseURL})=>{
 test.setTimeout(420000);mkdirSync('work/browser3d',{recursive:true});
 const ca=await browser.newContext({viewport:{width:1440,height:900}}),cb=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
 for(const c of [ca,cb])await c.addInitScript(()=>{localStorage.setItem('sous-settings-3d',JSON.stringify({quality:'low',shake:0}));localStorage.setItem('sous-trained-3d-mouse','yes');localStorage.setItem('sous-trained-3d-chef','yes');});
 const a=await ca.newPage(),b=await cb.newPage();const errors:string[]=[];const snaps=[new Map<number,Snapshot>(),new Map<number,Snapshot>()];const ids:string[][]=[[],[]];
 [a,b].forEach((p,i)=>{p.on('pageerror',e=>errors.push(e.message));p.on('websocket',ws=>{const d=new WireDecoder();ws.on('framereceived',f=>{try{const m=d.decode(String(f.payload));if(m?.type==='snap')snaps[i].set(m.tick,m);if(m?.type==='joined')ids[i].push(m.playerId);}catch{}});});});
 await a.goto(baseURL+'?r=3d');await expect(a.locator('#create')).toBeVisible();await a.locator('#create').click();await a.locator('#nickname').fill('Juniper');await a.getByRole('button',{name:'Create room',exact:false}).click();await expect(a.locator('#lobby-code')).toBeVisible({timeout:60000});const code=(await a.locator('#lobby-code').textContent())!;
 await b.goto(`${baseURL}?room=${code}&r=3d`);await b.locator('#nickname').fill('Saffron');await b.getByRole('button',{name:'Join the kitchen',exact:false}).click();await expect(b.locator('#lobby-code')).toHaveText(code,{timeout:20000});await b.locator('#team-chef').click();await expect(a.locator('.player-row')).toHaveCount(2);
 await a.screenshot({path:'work/browser3d/lobby-desktop.png',fullPage:true});await a.locator('#bots').selectOption('false');await a.locator('#ready').click();await b.locator('#ready').click();await a.locator('#start').click();await expect(a.locator('#skip')).toBeVisible();await expect(b.locator('#skip')).toBeVisible();await a.screenshot({path:'work/browser3d/briefing-desktop.png'});await a.locator('#skip').click();await b.locator('#skip').click();await expect(a.locator('canvas[data-engine]')).toBeVisible({timeout:15000});await expect(b.locator('canvas[data-engine]')).toBeVisible({timeout:15000});
 const start=Date.now();
 const own=()=>[...snaps[0].values()].at(-1)?.entities.find(e=>e.id===[...snaps[0].values()].at(-1)?.selfId);
 await expect.poll(()=>own()?.x).not.toBeUndefined();
 const target={x:22,y:28};
 for(const [axis,positive,negative] of [['x','KeyW','KeyS'],['y','KeyD','KeyA']] as const){for(let tries=0;tries<12;tries++){const d=target[axis]-(own()?.[axis]??target[axis]);if(Math.abs(d)<.09)break;const k=d>0?positive:negative;await a.keyboard.down('ControlLeft');await a.keyboard.down(k);await a.waitForTimeout(Math.min(180,Math.abs(d)/1.21*1000));await a.keyboard.up(k);await a.keyboard.up('ControlLeft');await a.waitForTimeout(180);}}
 await a.bringToFront();const use=a.getByRole('button',{name:'Use',exact:true});await use.hover();await a.mouse.down();try{await expect.poll(()=>own()?.state,{timeout:15000}).toBe('transit');}finally{await a.mouse.up();}await a.screenshot({path:'work/browser3d/tunnel-live.png'});await expect.poll(()=>own()?.state,{timeout:15000}).toBe('free');
 await a.screenshot({path:'work/browser3d/mouse-desktop.png'});await b.screenshot({path:'work/browser3d/chef-phone.png'});
 const targets=await b.locator('.action-button').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {label:e.getAttribute('aria-label'),width:r.width,height:r.height};}));expect(targets.every(t=>t.width>=48&&t.height>=48)).toBe(true);
 await a.waitForTimeout(5000);await a.reload();await expect(a.locator('canvas[data-engine]')).toBeVisible({timeout:20000});expect(ids[0].at(-1)).toBe(ids[0][0]);
 while(Date.now()-start<90000){await a.waitForTimeout(Math.min(1000,90000-(Date.now()-start)));}
 const common=[...snaps[0].keys()].filter(t=>snaps[1].has(t));expect(common.length).toBeGreaterThan(600);for(const tick of common){const x=snaps[0].get(tick)!,y=snaps[1].get(tick)!;expect([x.time,x.heist,x.rating]).toEqual([y.time,y.heist,y.rating]);}
 const transitSnaps=[...snaps[0].values()].filter(s=>s.entities.some(e=>e.id===s.selfId&&e.state==='transit'));expect(transitSnaps.length).toBeGreaterThan(10);for(const s of transitSnaps){const chef=snaps[1].get(s.tick);if(chef)expect(chef.entities.some(e=>e.id===s.selfId)).toBe(false);}
 expect(errors).toEqual([]);writeFileSync('work/browser3d/room90.json',JSON.stringify({url:baseURL,code,commonTicks:common.length,transitSnapshots:transitSnaps.length,reconnectSameIdentity:ids[0][0]===ids[0].at(-1),errors,tapTargets:targets,lastTime:[...snaps[0].values()].at(-1)?.time},null,2));await ca.close();await cb.close();
});

