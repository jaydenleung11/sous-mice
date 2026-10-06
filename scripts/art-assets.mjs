import {chromium} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const svg=await readFile('client/public/icon.svg','utf8');
await mkdir('store/icons',{recursive:true});
for(const size of [192,512,1024]){const page=await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:#302438}svg{width:100%;height:100%}</style>${svg}`);await page.screenshot({path:size===1024?'store/icons/icon-1024.png':`client/public/icon-${size}.png`});await page.close();}
await writeFile('store/icons/maskable.svg',svg);await browser.close();console.log('Rendered original vector install/store icons at192,512,1024px.');
