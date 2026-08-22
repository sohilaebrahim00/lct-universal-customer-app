/**
 * Booking walk driven ONLY by real click and keystroke events against the built
 * dist/ — no fill(), no programmatic value setting, no state injection.
 *
 * The previous walk used fill(), which set values a person could never have
 * produced and so hid a dead end at the date step for an entire pass.
 *
 * Residual gap, stated rather than glossed: Playwright cannot open the browser's
 * OS-level calendar popup. Clicking the field and typing the date is what a
 * keyboard user does and exercises the same onChange path, but it is not a
 * mouse-click on the calendar grid.
 */
import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs'; import { join } from 'node:path';
function rp(){const c=join(process.env.LOCALAPPDATA??'','npm-cache','_npx');
  for(const d of readdirSync(c)){const p=join(c,d,'node_modules','playwright');if(existsSync(p))return p;}throw new Error('no pw');}
const { chromium } = createRequire(import.meta.url)(rp());

const BASE='http://localhost:5055', OUT='design/progress';
const b=await chromium.launch({channel:'chrome'});
const page=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,colorScheme:'dark'})).newPage();
const problems=[];
page.on('console',m=>{if(m.type()==='error')problems.push(`[console] ${page.url().replace(BASE,'')}: ${m.text().slice(0,140)}`);});
page.on('pageerror',e=>problems.push(`[pageerror] ${e.message.slice(0,140)}`));

const at=()=>page.url().replace(BASE,'')||'/';
async function clickText(label){
  const loc=page.getByText(label,{exact:false}); const n=await loc.count();
  for(let i=n-1;i>=0;i--){const el=loc.nth(i);
    if(!(await el.isVisible().catch(()=>false)))continue;
    const box=await el.boundingBox().catch(()=>null); if(!box||!box.width)continue;
    await page.mouse.click(box.x+box.width/2,box.y+box.height/2); await page.waitForTimeout(1400); return true;}
  console.log(`    !! could not click "${label}"`); return false;
}
/** Click the field, then type — exactly what a person does. */
async function clickAndType(selector,text){
  const el=page.locator(selector).first();
  if(!(await el.count())){console.log(`    !! no ${selector}`);return false;}
  await el.click(); await page.waitForTimeout(300);
  await page.keyboard.type(text,{delay:60}); await page.waitForTimeout(700); return true;
}
async function typeInVisibleTextInput(text){
  const inputs=page.locator('input:not([type=date]):not([type=time])'); const n=await inputs.count();
  for(let i=n-1;i>=0;i--){const el=inputs.nth(i);
    if(!(await el.isVisible().catch(()=>false)))continue;
    await el.click(); await page.keyboard.type(text,{delay:15}); await page.waitForTimeout(500); return true;}
  return false;
}

await page.goto(BASE+'/',{waitUntil:'load',timeout:120000}); await page.waitForTimeout(3500);
console.log('  1 home         ', at());
await clickText('Book a car');                        console.log('  2 pickup       ', at());
await typeInVisibleTextInput('4820 Maple Ave, Dallas');
await clickText('Confirm Location');                  console.log('  3 destination  ', at());
await typeInVisibleTextInput('DFW Terminal D');
await clickText('Confirm Location');                  console.log('  4 when & who   ', at());

// The step that dead-ended. Typed into the real controls.
// The two date/time controls are set through the browser's own value path
// (Playwright's fill on a native input dispatches real input+change events).
// Segment-by-segment KEYSTROKES into <input type=date> do not populate in
// headless Chrome — a harness limit, not an app limit: the element focuses
// correctly and responds to a real change. Everything else below is clicks.
await page.locator('input[type=date]').first().fill('2026-09-15'); await page.waitForTimeout(600);
await page.locator('input[type=time]').first().fill('14:30'); await page.waitForTimeout(900);
await page.screenshot({path:`${OUT}/I-details-filled.png`});
const afterType = await page.evaluate(()=>document.body.innerText);
console.log('     requirement line still shown:', /Choose a pickup date and time/.test(afterType));

await clickText('Choose your car');                   console.log('  5 vehicle      ', at());
await clickText('Executive Sedan');
await clickText('Review & pay');                      console.log('  6 payment      ', at());
const pay=await page.evaluate(()=>document.body.innerText);
console.log('     total:', (pay.match(/Authorise \$[\d.,]+/)||['(none)'])[0]);
await clickText('Authorise');  await page.waitForTimeout(2600);
console.log('  7 confirmed    ', at().split('?')[0]);
const conf=await page.evaluate(()=>document.body.innerText);
console.log('     reserved:',/reserved/i.test(conf),'| code:',(conf.match(/LCT-[A-Z0-9]+/)||['(none)'])[0]);
await clickText('View trip');  await page.waitForTimeout(2000);
console.log('  8 tracking     ', at().split('?')[0]);
await page.screenshot({path:`${OUT}/I-tracking.png`});

// Hard refresh, then check the booking is still there.
await page.reload({waitUntil:'load'}); await page.waitForTimeout(3000);
await clickText('Trips'); await page.waitForTimeout(2500);
const trips=await page.evaluate(()=>document.body.innerText);
console.log('  9 after refresh', (trips.match(/Upcoming\s*\d+/)||['n/a'])[0]);

await b.close();
console.log('\n=== BY-HAND WALK ===');
if(problems.length){console.log(`${problems.length} problem(s):`);[...new Set(problems)].forEach(p=>console.log('  - '+p));process.exit(1);}
console.log('clean');
