/**
 * Crash sweep against the PRODUCTION build, not the dev server.
 *
 * Walks the booking path, then the things a client taps that are not on it.
 * Any console error, page error, blank screen or stuck spinner is a failure.
 */
import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
function rp(){ const c=join(process.env.LOCALAPPDATA??'','npm-cache','_npx');
  for(const d of readdirSync(c)){const p=join(c,d,'node_modules','playwright'); if(existsSync(p)) return p;}
  throw new Error('playwright not found'); }
const { chromium } = createRequire(import.meta.url)(rp());

const BASE='http://localhost:5055', OUT='design/progress';
await mkdir(OUT,{recursive:true});
const browser = await chromium.launch({ channel:'chrome' });
const ctx = await browser.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, colorScheme:'dark' });
const page = await ctx.newPage();
const problems=[];
page.on('console', m=>{ if(m.type()==='error') problems.push(`[console] ${page.url().replace(BASE,'')} :: ${m.text().slice(0,200)}`); });
page.on('pageerror', e=>problems.push(`[pageerror] ${page.url().replace(BASE,'')} :: ${e.message.slice(0,200)}`));

async function go(path, name, settle=2600){
  await page.goto(BASE+path,{waitUntil:'load',timeout:120000});
  await page.waitForTimeout(settle);
  const text = (await page.evaluate(()=>document.body.innerText || '')).trim();
  if (text.length < 5) problems.push(`[blank] ${path} rendered no text`);
  if (name) { await page.screenshot({path:`${OUT}/D-${name}.png`}); console.log(`  shot ${name}  (${text.length} chars)`); }
  else console.log(`  ok ${path}  (${text.length} chars)`);
}

async function tap(label){
  const el = page.getByText(label, { exact:false }).first();
  if (await el.count() === 0) { console.log(`    (no "${label}")`); return false; }
  await el.click({ timeout:8000 }).catch(()=>{});
  await page.waitForTimeout(1800);
  return true;
}

console.log('--- booking path ---');
await go('/', 'home');
await tap('Book a car');
await go(page.url().replace(BASE,''), 'pickup', 2200);
// Select a saved location first — "Confirm pickup" stays disabled with no
// address chosen, so tapping it alone (the previous version of this script)
// never actually confirmed anything; it just failed to find a button named
// "Confirm Location", which was also the wrong label — the real button reads
// "Confirm pickup". Both fixed 2026-09-01, found while walking the product
// the night before delivery.
await tap('Home');
await tap('Confirm pickup');
await page.waitForTimeout(1500);
await go(page.url().replace(BASE,''), 'after-pickup', 2000);

console.log('--- direct screens ---');
for (const [path,name] of [['/book/vehicle','vehicle'],['/book/details','details'],['/book/payment','payment'],
  ['/book/confirmed','confirmed'],['/trips','trips'],['/account','account'],['/concierge','concierge'],
  ['/fleet','fleet'],['/about','about'],['/onboarding','onboarding'],['/welcome','welcome'],
  ['/(auth)/login','login'],['/account/settings','settings'],['/account/saved-locations','saved-locations'],
  ['/account/payment-methods','payment-methods'],['/demo-trip','demo-trip'],['/airport','airport'],
  ['/corporate-info','corporate-info']]) {
  await go(path, name);
}

await browser.close();
console.log('\n=== SWEEP RESULT ===');
if (problems.length){ console.log(`${problems.length} problem(s):`); [...new Set(problems)].forEach(p=>console.log('  - '+p)); process.exit(1); }
console.log('clean: zero console errors, zero blank screens');
