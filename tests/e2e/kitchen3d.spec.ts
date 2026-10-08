import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
test('keyboard letters stay visible on touch controls and reflect remapping',async({browser,baseURL})=>{
 const ctx=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true});const p=await ctx.newPage();
 await p.goto(baseURL+'?r=3d');await p.locator('#training').click();await p.locator('#learn-mouse').click();await expect(p.locator('canvas[data-engine]')).toBeVisible();
 for(const [name,key]of [['use','E'],['eat','F'],['aim','Q'],['jump','Space'],['sense','C'],['ability','R'],['dodge','X'],['trap','T']]){await expect(p.locator(`[data-action=${name}] kbd`)).toBeVisible();await expect(p.locator(`[data-action=${name}] kbd`)).toHaveText(key);}
 for(const [id,key]of [['camera3d-toggle','P'],['map3d-toggle','M']]){await expect(p.locator('#'+id+' kbd')).toBeVisible();await expect(p.locator('#'+id+' kbd')).toHaveText(key);}
 await p.locator('#pause').click();await p.locator('#open-settings').click();await p.getByText('3D keyboard controls',{exact:true}).click();await p.locator('[data-remap3d=use]').click();await p.keyboard.press('KeyK');await p.locator('#modal-close').click();await expect(p.locator('[data-action=use] kbd')).toHaveText('K');
 await ctx.close();
});
test('the service kitchen has moving human cooks and six simmering pots',async({page,baseURL})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(baseURL+'?r=3d');await page.locator('#training').click();await page.locator('#learn-chef').click();await expect(page.locator('canvas[data-engine]')).toBeVisible();
 const kitchen=()=>page.evaluate(()=>(window as any).__sous3d.metrics().kitchen);
 await expect.poll(async()=>(await kitchen()).staffVisible).toBe(6);
 const first=await kitchen();expect(first.simmeringPots).toBe(6);expect(first.cookingStaff).toBeGreaterThan(0);
 await expect.poll(async()=>{const next=await kitchen();return first.staff.some((p:any,i:number)=>Math.hypot(p.x-next.staff[i].x,p.y-next.staff[i].y)>.25);},{timeout:10000}).toBe(true);
 const after=await kitchen();expect(errors).toEqual([]);mkdirSync('work/browser3d',{recursive:true});await page.screenshot({path:'work/browser3d/kitchen-service.png'});writeFileSync('work/browser3d/kitchen-service.json',JSON.stringify({url:baseURL,first,after,errors},null,2));
});
