import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/e2e',timeout:120000,use:{baseURL:process.env.GAME_URL||'http://127.0.0.1:5173',viewport:{width:1440,height:900},headless:true,channel:'chrome'},reporter:[['list'],['json',{outputFile:'work/e2e-results.json'}]],workers:1});
