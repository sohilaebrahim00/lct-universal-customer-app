/**
 * End-to-end booking walk against the PRODUCTION build.
 *
 * The one path the client is guaranteed to take: book a car, then find the
 * booking in Trips. Uses real mouse clicks at element coordinates, because
 * React Native Web keeps the previous screen mounted underneath after a push
 * and a naive text locator resolves to the hidden copy.
 */
import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
function rp(){const c=join(process.env.LOCALAPPDATA??'','npm-cache','_npx');
  for(const d of readdirSync(c)){const p=join(c,d,'node_modules','playwright');if(existsSync(p))return p;}throw new Error('no pw');}
const { chromium } = createRequire(import.meta.url)(rp());

const BASE='http://localhost:5055', OUT='design/progress';
const b=await chromium.launch({channel:'chrome'});
const page=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,colorScheme:'dark'})).newPage();
const problems=[];
page.on('console',m=>{if(m.type()==='error')problems.push(`[console] ${page.url().replace(BASE,'')}: ${m.text().slice(0,160)}`);});
page.on('pageerror',e=>problems.push(`[pageerror] ${page.url().replace(BASE,'')}: ${e.message.slice(0,160)}`));

async function clickText(label){
  const loc = page.getByText(label,{exact:false});
  const n = await loc.count();
  for (let i=n-1;i>=0;i--){                     // last match = topmost screen
    const el = loc.nth(i);
    if (!(await el.isVisible().catch(()=>false))) continue;
    const box = await el.boundingBox().catch(()=>null);
    if (!box || box.width===0) continue;
    await page.mouse.click(box.x+box.width/2, box.y+box.height/2);
    await page.waitForTimeout(1500);
    return true;
  }
  console.log(`    (could not click "${label}")`);
  return false;
}
async function fillVisible(index, value){
  const inputs = page.locator('input');
  const n = await inputs.count();
  const visible = [];
  for (let i=0;i<n;i++) if (await inputs.nth(i).isVisible().catch(()=>false)) visible.push(inputs.nth(i));
  if (visible[index]) { await visible[index].fill(value); await page.waitForTimeout(500); return true; }
  return false;
}
const at = () => page.url().replace(BASE,'') || '/';

await page.goto(BASE+'/',{waitUntil:'load',timeout:120000}); await page.waitForTimeout(3000);
await clickText('Book a car');                       console.log('  1 pickup      ', at());
await fillVisible(0,'1240 Hillcrest Rd, Beverly Hills');
await clickText('Confirm Location');                 console.log('  2 destination ', at());
await fillVisible(0,'LAX Terminal 7');
await clickText('Confirm Location');                 console.log('  3 when & who  ', at());
await page.screenshot({path:`${OUT}/W-3-details.png`});
// The REORDER: date and time now come before the car, so the fare quoted on the
// vehicle screen is computed from the real scheduledAt and is genuinely final.
await fillVisible(0,'2026-09-15'); await fillVisible(1,'14:30');
await clickText('Choose your car');                  console.log('  4 vehicle     ', at());
await page.screenshot({path:`${OUT}/W-1-vehicle.png`});
await clickText('Executive Sedan');
await page.screenshot({path:`${OUT}/W-2-vehicle-selected.png`});
await clickText('Review & pay');                     console.log('  5 payment     ', at());
await page.screenshot({path:`${OUT}/W-4-payment.png`});
const payText = await page.evaluate(()=>document.body.innerText);
console.log('    payment total line:', (payText.match(/Authorise \$[\d.,]+/)||['(none)'])[0]);
await clickText('Authorise');
await page.waitForTimeout(2600);                     console.log('  6 confirmed   ', at());
await page.screenshot({path:`${OUT}/W-5-confirmed.png`});
const conf = await page.evaluate(()=>document.body.innerText);
console.log('    says "reserved":', /reserved/i.test(conf), '| code:', (conf.match(/LCT-[A-Z0-9]+/)||['(none)'])[0]);

// Tab click, NOT page.goto — a full reload resets the in-memory demo store,
// which is correct behaviour but would not test what the client actually does.
await clickText('View trip');
await page.waitForTimeout(2000);
await clickText('Trips');
await page.waitForTimeout(2600);
await page.screenshot({path:`${OUT}/W-6-trips-after.png`});
const after = await page.evaluate(()=>document.body.innerText);
console.log('  7 trips       ', (after.match(/Upcoming\s*\d+/)||['n/a'])[0]);

await b.close();
console.log('\n=== WALK RESULT ===');
if(problems.length){console.log(`${problems.length} problem(s):`);[...new Set(problems)].forEach(p=>console.log('  - '+p));process.exit(1);}
console.log('clean');
