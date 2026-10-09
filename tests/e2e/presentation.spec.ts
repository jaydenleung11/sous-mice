import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const rect=(e:Element)=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};};
for(const [width,height]of [[650,360],[844,390],[932,430]])for(const left of [false,true])test(`touch HUD stays separated ${width}×${height}, left ${left}`,async({browser,baseURL})=>{
 const ctx=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});await ctx.addInitScript(({left})=>localStorage.setItem('sous-settings',JSON.stringify({left,large:true,reduced:true,muted:true})),{left});const p=await ctx.newPage();const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(baseURL+'?r=3d');await p.locator('#training').click();await p.locator('#learn-mouse').click();await expect(p.locator('canvas[data-engine]')).toBeVisible();await p.waitForTimeout(400);
 const geometry=await p.evaluate(()=>{const selectors=['.training-card','.player-info','#stealth-eye','.joystick-wrap','.action-buttons','#context-prompt','.hud-top','.navigation-buttons','.timer-panel','.score-panel','.rating-panel'];return Object.fromEntries(selectors.map(s=>{const e=document.querySelector(s)!;const r=e.getBoundingClientRect();return[s,{x:r.x,y:r.y,w:r.width,h:r.height}];}));});
 const overlap=(a:any,b:any)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
 for(const [a,b]of [['.training-card','.player-info'],['.training-card','#stealth-eye'],['#context-prompt','.action-buttons'],['#context-prompt','.joystick-wrap'],['.navigation-buttons','.timer-panel'],['.navigation-buttons','.score-panel'],['.navigation-buttons','.rating-panel']]){
 expect(overlap(geometry[a],geometry[b]),`${a} overlaps ${b}`).toBe(0);
 }
 for(const s of ['.action-buttons','.joystick-wrap','#context-prompt','.navigation-buttons']){const r=geometry[s];expect(r.x).toBeGreaterThanOrEqual(0);expect(r.y).toBeGreaterThanOrEqual(0);expect(r.x+r.w).toBeLessThanOrEqual(width);expect(r.y+r.h).toBeLessThanOrEqual(height);}
 await p.locator('#map3d-toggle').click();await expect(p.locator('#map3d-panel')).toBeVisible();const map=await p.locator('#map3d-panel').boundingBox(),actions=await p.locator('.action-buttons').boundingBox();expect(overlap({x:map!.x,y:map!.y,w:map!.width,h:map!.height},{x:actions!.x,y:actions!.y,w:actions!.width,h:actions!.height})).toBe(0);
 mkdirSync('evidence/presentation/after',{recursive:true});await p.screenshot({path:`evidence/presentation/after/touch-${width}-${left?'left':'right'}.png`});expect(errors).toEqual([]);await ctx.close();
});
test('dialogs contain focus and remapped bindings reach instructions and actions',async({page,baseURL})=>{
 await page.goto(baseURL+'?r=3d');await page.locator('#settings').click();await page.locator('#modal-close').focus();await page.keyboard.press('Shift+Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('.modal'))).toBe(true);await page.keyboard.press('Tab');await expect(page.locator('#modal-close')).toBeFocused();await page.locator('#modal-close').click();await expect(page.locator('#settings')).toBeFocused();
 await page.locator('#training').click();await page.locator('#learn-chef').click();await expect(page.locator('canvas[data-engine]')).toBeVisible();await page.locator('#pause').click();await page.locator('#open-settings').click();await expect(page.locator('.remap')).toHaveCount(1);await page.getByText('3D keyboard controls',{exact:true}).click();await page.locator('[data-remap3d=use]').click();await page.keyboard.press('KeyK');await page.locator('#modal-close').click();await page.locator('.lesson-detail summary').click();await expect(page.locator('.lesson-detail p')).toContainText('hold Use');await expect(page.locator('.training-progress kbd')).toContainText('K');await expect(page.locator('[data-action=use] kbd')).toHaveText('K');await expect(page.locator('#context-prompt')).toContainText('K');await page.keyboard.down('KeyK');try{await expect.poll(()=>page.evaluate(()=>(window as any).__sous3d.state().trainingStep)).toBe(1);}finally{await page.keyboard.up('KeyK');}
});

test('desktop role selection keeps the start action in view',async({page,baseURL})=>{
 await page.goto(baseURL+'?r=3d');await page.locator('#create').click();await page.locator('#nickname').fill('Visual review');await page.getByRole('button',{name:'Create room',exact:false}).click();await expect(page.locator('#start')).toBeVisible();
 for(const team of ['mouse','chef']){await page.locator('#team-'+team).click();await expect(page.locator('#team-'+team)).toHaveAttribute('aria-pressed','true');await expect.poll(async()=>{const r=await page.locator('#start').boundingBox();return r?r.y+r.height:Infinity;}).toBeLessThanOrEqual(900);}
});

test('connection loading and errors provide visible recovery',async({page,baseURL})=>{
 await page.routeWebSocket(u=>u.pathname==='/ws'||u.pathname.startsWith('/parties/'),socket=>socket.onMessage(()=>setTimeout(()=>socket.send(JSON.stringify({type:'error',message:'This kitchen could not connect. Please try again.'})),1200)));
 await page.goto(baseURL+'?r=3d');await page.locator('#create').click();await page.locator('#nickname').fill('Pip');await page.getByRole('button',{name:'Create room',exact:false}).click();
 await expect(page.locator('#connection-state')).toContainText(/Waking|Connected/);await expect(page.locator('#toast')).toContainText('Please try again.');await expect(page.locator('.modal')).toHaveCount(0);await expect(page.locator('#create')).toBeVisible();
});

test('short touch objective stays clear with carrying and buff status',async({browser,baseURL})=>{
 const ctx=await browser.newContext({viewport:{width:650,height:360},hasTouch:true,isMobile:true});
 await ctx.addInitScript(()=>{localStorage.setItem('sous-settings',JSON.stringify({large:true,reduced:true,muted:true}));const raf=requestAnimationFrame;window.requestAnimationFrame=f=>raf(t=>{if(!(window as any).freezeReview)f(t);});});
 const page=await ctx.newPage();await page.goto(baseURL+'?r=3d');await page.locator('#training').click();await page.locator('#learn-mouse').click();await page.waitForFunction(()=>(window as any).__sous3d.metrics()?.frames>5);
 // Freeze the real HUD and apply a labeled layout fixture for simultaneous status.
 await page.evaluate(()=>{(window as any).freezeReview=true;const c=document.querySelector<HTMLElement>('#carry-info')!;c.hidden=false;c.textContent='Carrying Food crate';document.querySelector('#buff-info')!.textContent='Sticky paws - 35s';});
 const a=await page.locator('.training-card').boundingBox(),b=await page.locator('.player-info').boundingBox();expect(a!.y+a!.height).toBeLessThanOrEqual(b!.y);await page.screenshot({path:'evidence/presentation/after/status-stress.png'});await ctx.close();
});
