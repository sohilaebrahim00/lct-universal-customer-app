/**
 * THE ADMIN CONSOLE WALK.
 *
 * Reaches all sixteen sections and asserts two things the console exists to
 * respect: that every section renders something, and that the panels with NO
 * DATA do not show a currency figure.
 *
 * That second assertion is the point. An admin console is where fabrication is
 * most tempting — plausible numbers are what make one look finished — and every
 * invented thing this project has deleted (a driver, testimonials, a rating, a
 * plate) would have looked at home on a dashboard.
 *
 * It also asserts that the class-name conflict is VISIBLE in Class Builder.
 * Showing the business its own inconsistency is the job; a console that tidied
 * it away would be hiding a live pricing defect.
 *
 * Usage: node scripts/admin-walk.mjs   (needs `serve dist -l 5055 --single`)
 */
import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
function rp(){ const c=join(process.env.LOCALAPPDATA??'','npm-cache','_npx');
  for(const d of readdirSync(c)){const p=join(c,d,'node_modules','playwright'); if(existsSync(p)) return p;}
  throw new Error('playwright not found'); }
const { chromium } = createRequire(import.meta.url)(rp());
const BASE='http://localhost:5055';
const SECTIONS=['Overview','Live Dispatch','Fleet','Class Builder','Chauffeurs','Bookings','Notifications',
  'Users & Roles','Ratings','Revenue','Promotions','Coverage','Messages','Push Broadcast','Support','Settings'];
const b = await chromium.launch({ channel:'chrome' });
const ctx = await b.newContext({ viewport:{width:1440,height:900}, colorScheme:'dark' });
const page = await ctx.newPage();
const problems=[];
page.on('pageerror', e=>problems.push('[pageerror] '+e.message.slice(0,140)));
page.on('console', m=>{ if(m.type()==='error') problems.push('[console] '+m.text().slice(0,140)); });

await page.goto(BASE+'/_role/admin',{waitUntil:'load',timeout:120000});
await page.waitForTimeout(3200);
const first=(await page.evaluate(()=>document.body.innerText||'')).trim();
if(/could not be found/i.test(first)) problems.push('[404] /_role/admin');
console.log('route loaded, chars:', first.length);

for (const s of SECTIONS){
  try { await page.getByText(s, { exact: true }).first().click({ timeout: 12000 }); }
  catch { problems.push(`[nav] could not reach "${s}"`); continue; }
  await page.waitForTimeout(1100);
  const t=(await page.evaluate(()=>document.body.innerText||'')).trim();
  const short = t.length < 200;
  console.log(`  ${short?'THIN':'ok  '} ${s.padEnd(16)} ${t.length} chars`);
  if(short) problems.push(`[thin] ${s} rendered ${t.length} chars`);
  // No panel may show a currency figure it did not get from real data.
  if(/Revenue|Ratings|Promotions|Coverage|Support/.test(s) && /\$\d/.test(t.split(s)[1]??'')){
    problems.push(`[fabrication] ${s} rendered a currency figure`);
  }
}

// The class-name conflict must be visible in Class Builder.
await page.getByText('Class Builder', { exact: true }).first().click({ timeout: 12000 });
await page.waitForTimeout(1400);
const cb=(await page.evaluate(()=>document.body.innerText||'')).trim();
for(const need of ['Preview data','memory only','Luxury SUV','Executive SUV','From $110','From $130']){
  if(!cb.includes(need)) problems.push(`[classbuilder] missing "${need}"`);
}
console.log('class builder conflict shown:', ['Luxury SUV','Executive SUV','From $110','From $130'].every(n=>cb.includes(n)));

await b.close();
console.log('\n=== ADMIN WALK ===');
if(!problems.length) console.log('clean: all 16 sections reachable, no console errors, no fabricated figures');
else problems.slice(0,20).forEach(p=>console.log('  '+p));
process.exit(problems.length?1:0);
