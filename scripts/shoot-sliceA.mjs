import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
function rp(){ if(process.env.PLAYWRIGHT_PATH) return process.env.PLAYWRIGHT_PATH;
  const c=join(process.env.LOCALAPPDATA??'','npm-cache','_npx');
  for(const d of readdirSync(c)){const p=join(c,d,'node_modules','playwright'); if(existsSync(p)) return p;}
  throw new Error('playwright not found'); }
const { chromium } = createRequire(import.meta.url)(rp());

const BASE='http://localhost:8081', OUT='design/progress';
await mkdir(OUT,{recursive:true});
const browser = await chromium.launch({ channel:'chrome' });
const ctx = await browser.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, colorScheme:'dark' });
await ctx.addInitScript(()=>{ localStorage.setItem('lct-universal:onboarding-seen','true'); localStorage.setItem('lct-universal:guest-mode','true'); });
const page = await ctx.newPage();
const problems=[];
page.on('console',m=>{ if(m.type()==='error') problems.push('console.error: '+m.text()); });
page.on('pageerror',e=>problems.push('pageerror: '+e.message));

for (const state of ['populated','loading','error','empty']) {
  await page.goto(`${BASE}/_dev/fixtures?state=${state}`, { waitUntil:'load', timeout:180000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path:`${OUT}/A-home-${state}.png` });
  console.log(`  wrote ${OUT}/A-home-${state}.png`);
}
await page.goto(`${BASE}/_dev/fixtures`, { waitUntil:'load', timeout:180000 });
await page.waitForTimeout(3000);
await page.screenshot({ path:`${OUT}/A-fixture-harness.png` });
console.log(`  wrote ${OUT}/A-fixture-harness.png`);

await browser.close();
if (problems.length) { console.error('\n'+problems.length+' console problem(s):'); problems.forEach(p=>console.error('  - '+p)); process.exit(1); }
console.log('\nzero console errors');
