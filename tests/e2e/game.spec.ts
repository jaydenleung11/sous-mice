import {test,expect} from '@playwright/test';
import {WireDecoder} from '../../shared/wire';
import type {Snapshot} from '../../shared/protocol';
import {mkdirSync,writeFileSync} from 'node:fs';

for(const team of ['mouse','chef'])test(`complete ${team} training using visible controls`,async({page,baseURL})=>{
 test.setTimeout(60000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(baseURL!);await page.locator('#training').click();await page.locator(`#learn-${team}`).click();await expect(page.locator('canvas')).toBeVisible();
 const hold=async(label:string,next:string)=>{const b=page.getByRole('button',{name:label,exact:true});await b.hover();await page.mouse.down();try{await expect(page.locator('#training-card')).toContainText(next,{timeout:8000});}finally{await page.mouse.up();}};
 if(team==='mouse'){
  await page.keyboard.down('KeyD');await page.waitForTimeout(700);await page.keyboard.down('Control');await page.waitForTimeout(650);await page.keyboard.up('KeyD');await page.keyboard.up('Control');
  await expect(page.locator('#training-card')).toContainText('Borrow a little cheese.');
  for(const [label,next] of [['Use','A snack with a superpower.'],['Eat','Take the secret route.'],['Use','A very good delivery.'],['Use','Turn up the heat.'],['Use','Never leave a mouse behind.'],['Use','The best heist is a team heist.'],['Use','TRAINING COMPLETE']])await hold(label,next);
 }else{
  for(const [label,next] of [['Use','Something smells suspicious.'],['Inspect','Caught with crumbs.'],['Grab','A short stay in the pantry.'],['Use','Leave a little surprise.'],['Trap','Check the quiet corners.'],['Use','TRAINING COMPLETE']])await hold(label,next);
 }
 await page.locator('#finish-training').click();await expect(page.locator('#create')).toBeVisible();expect(await page.evaluate(t=>localStorage.getItem(`sous-trained-${t}`),team)).toBe('yes');expect(errors).toEqual([]);
});

test('two private browser contexts join, play90seconds and restore after refresh',async({browser,baseURL})=>{
 test.setTimeout(160000);mkdirSync('store/screenshots',{recursive:true});
 const ca=await browser.newContext({viewport:{width:1440,height:900}}),cb=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
 for(const c of [ca,cb])await c.addInitScript(()=>{localStorage.setItem('sous-trained-mouse','yes');localStorage.setItem('sous-trained-chef','yes');});
 const a=await ca.newPage(),b=await cb.newPage();const errors:string[]=[];const snaps=[new Map<number,Snapshot>(),new Map<number,Snapshot>()];const ids:string[][]=[[],[]];
 [a,b].forEach((p,i)=>{p.on('pageerror',e=>errors.push(e.message));p.on('websocket',ws=>{const d=new WireDecoder();ws.on('framereceived',f=>{try{const m=d.decode(String(f.payload));if(m?.type==='snap')snaps[i].set(m.tick,m);if(m?.type==='joined')ids[i].push(m.playerId);}catch{}});});});
 await a.goto(baseURL!);await expect(a.locator('#create')).toBeVisible();await a.locator('#create').click();await a.locator('#nickname').fill('Juniper');await a.getByRole('button',{name:'Create room',exact:false}).click();await expect(a.locator('#lobby-code')).toBeVisible({timeout:20000});const code=(await a.locator('#lobby-code').textContent())!;
 await b.goto(`${baseURL}?room=${code}`);await b.locator('#nickname').fill('Saffron');await b.getByRole('button',{name:'Join the kitchen',exact:false}).click();await expect(b.locator('#lobby-code')).toHaveText(code,{timeout:20000});await b.locator('#team-chef').click();await expect(a.locator('.player-row')).toHaveCount(2);
 await a.screenshot({path:'store/screenshots/lobby-desktop.png',fullPage:true});await a.locator('#ready').click();await b.locator('#ready').click();await a.locator('#start').click();await expect(a.locator('#skip')).toBeVisible();await expect(b.locator('#skip')).toBeVisible();await a.screenshot({path:'store/screenshots/briefing-desktop.png'});await a.locator('#skip').click();await b.locator('#skip').click();await expect(a.locator('canvas')).toBeVisible({timeout:15000});await expect(b.locator('canvas')).toBeVisible({timeout:15000});
 const start=Date.now();await a.keyboard.down('KeyD');await a.waitForTimeout(500);await a.keyboard.up('KeyD');await a.screenshot({path:'store/screenshots/mouse-desktop.png'});await b.screenshot({path:'store/screenshots/chef-phone.png'});
 const targets=await b.locator('.action-button').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {label:e.getAttribute('aria-label'),width:r.width,height:r.height};}));expect(targets.every(t=>t.width>=48&&t.height>=48)).toBe(true);
 await a.waitForTimeout(5000);await a.reload();await expect(a.locator('canvas')).toBeVisible({timeout:20000});expect(ids[0].at(-1)).toBe(ids[0][0]);
 while(Date.now()-start<90000){await a.waitForTimeout(Math.min(1000,90000-(Date.now()-start)));}
 const common=[...snaps[0].keys()].filter(t=>snaps[1].has(t));expect(common.length).toBeGreaterThan(600);for(const tick of common){const x=snaps[0].get(tick)!,y=snaps[1].get(tick)!;expect([x.time,x.heist,x.rating]).toEqual([y.time,y.heist,y.rating]);}
 expect(errors).toEqual([]);writeFileSync('work/browser-live.json',JSON.stringify({url:baseURL,code,commonTicks:common.length,reconnectSameIdentity:ids[0][0]===ids[0].at(-1),errors,tapTargets:targets,lastTime:[...snaps[0].values()].at(-1)?.time},null,2));await ca.close();await cb.close();
});

for(const size of [{width:844,height:390},{width:932,height:430},{width:1024,height:768},{width:1440,height:900}])test(`responsive title and training ${size.width}x${size.height}`,async({browser,baseURL})=>{
 const context=await browser.newContext({viewport:size,hasTouch:size.width<1000});const p=await context.newPage();const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(baseURL!);await p.screenshot({animations:'disabled',path:`store/screenshots/title-${size.width}.png`,fullPage:true});await p.locator('#training').click();await p.locator('#learn-mouse').click();await expect(p.locator('canvas')).toBeVisible();await p.waitForTimeout(800);await p.screenshot({animations:'disabled',path:`store/screenshots/training-${size.width}.png`});const bounds=await p.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,iw:innerWidth,ih:innerHeight}));expect(bounds.width).toBeLessThanOrEqual(bounds.iw);expect(bounds.height).toBeLessThanOrEqual(bounds.ih);expect(errors).toEqual([]);await context.close();
});

