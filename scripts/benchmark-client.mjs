import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const url=process.argv[2]||'https://sous-mice.vercel.app';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto(url);await page.locator('#training').click();await page.locator('#learn-mouse').click();await page.locator('canvas').waitFor();await page.waitForTimeout(1500);
 const metrics=await page.evaluate(()=>new Promise(resolve=>{const samples=[];const start=performance.now();let previous=start;function measure(now){samples.push(now-previous);previous=now;if(now-start<10000){requestAnimationFrame(measure);return;}const sorted=[...samples].sort((a,b)=>a-b);resolve({seconds:(now-start)/1000,frames:samples.length,averageFps:samples.length*1000/(now-start),frameIntervalP95Ms:sorted[Math.floor(sorted.length*.95)],maxFrameIntervalMs:sorted.at(-1),jsHeapBytes:performance.memory?.usedJSHeapSize??null,resourceTransferBytes:performance.getEntriesByType('resource').reduce((n,r)=>n+(r.transferSize||0),0)});}requestAnimationFrame(measure);}));
 const report={url,viewport:'1440x900',scenario:'Idle mouse tutorial, headless Chromium, 10 seconds',metrics,limitations:['This measures animation callback intervals, not isolated renderer CPU time.','Shared desktop load and headless graphics affect results.','Not a physical phone/tablet benchmark or full match performance certificate.']};
 mkdirSync('evidence',{recursive:true});writeFileSync('evidence/client-benchmark.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
