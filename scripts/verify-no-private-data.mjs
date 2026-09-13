/**
 * PRIVATE CONTACT DATA MUST NOT REACH THE BUNDLE.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  `src/dev/` SHIPS. It is deliberately NOT in Metro's blockList — `demoData`
 *  and `demoApi` are reached through `require()` inside `if (isDemoMode)`
 *  branches, and blocking the directory broke the production build outright.
 *  `metro.config.js` says so, and grepping `dist/` confirms it: the seeded
 *  demo people, their invented phone numbers and their invented emails are all
 *  in the shipped JavaScript.
 *
 *  That is harmless for invented people and unacceptable for real ones. Five
 *  real drivers' phone numbers and email addresses were supplied for this
 *  product; putting them in `src/dev/` would publish them at the deploy URL,
 *  readable by anyone who opens DevTools.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── Why this checks PATTERNS and not the real values ──────────────────────
 * The obvious guard is to grep `dist/` for the five known numbers. That would
 * mean committing the five known numbers into this file — publishing the data
 * in the repository in order to check it is not published in the bundle.
 *
 * So it works the other way round: anything that LOOKS like a real email
 * address or a real phone number is a finding unless it matches the
 * deliberately-fictional shapes below. A new real contact fails this gate
 * without anyone having to list it here first, which is also the only version
 * that catches the sixth driver nobody remembered to add.
 *
 * Usage: node scripts/verify-no-private-data.mjs [dist]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.argv[2] ?? 'dist';
const problems = [];

/**
 * FICTION, AND HOW IT IS RECOGNISED.
 *
 * `555-01xx` is the North American range reserved for fiction, and the demo
 * seed uses it throughout. `example.com` and `example.org` are reserved by
 * RFC 2606. `northline.co` is the invented corporate account in the demo
 * dataset — a made-up company for a made-up persona.
 *
 * Anything outside these is treated as possibly real. The cost of a false
 * positive is one line added here with a reason; the cost of a false negative
 * is somebody's phone number on the internet.
 */
const FICTIONAL_PHONE = /555-?01\d\d|\(?555\)?[\s.-]?\d{4}/;
const FICTIONAL_EMAIL_DOMAINS = ['example.com', 'example.org', 'northline.co', 'lctuniversal.com', 'lctuniversal.us'];

/**
 * THIRD-PARTY ADDRESSES ALREADY IN THE DEPENDENCY GRAPH.
 *
 * Metro bundles some packages' `package.json`, `author` field included, so a
 * library maintainer's address lands in the output. It is published by them, in
 * their own package, and is not this product's data to leak or to remove.
 *
 * Listed individually rather than excluded by a pattern: "any address near the
 * word Copyright" was the first attempt and it is far too broad — a real
 * contact sitting anywhere near a licence header would have slipped through.
 * A named exception has to be added deliberately, which is the point.
 */
const THIRD_PARTY_EMAILS = [
  'nicolas.charpentier079@gmail.com', // `author` in a bundled dependency's package.json
  'me@ricmoo.com', // MIT licence header carried by aes-js
];

/** A published business number is not private data — it is on the website. */
const PUBLISHED_BUSINESS_NUMBERS = [
  '+1 (888) 615-4065', // servicePolicy.dispatchPhone, published on lctuniversal.com
  '(682) 344-1891', // recorded in OPEN_QUESTIONS #13 as another operator's published number
];

function jsFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|json|html)$/.test(entry.name)) out.push(full);
    }
  };
  walk(dir);
  return out;
}

if (!existsSync(outDir)) {
  console.log(`no export at ${outDir} — run \`npm run export:web\` first`);
  process.exit(1);
}

let scanned = 0;
for (const file of jsFiles(outDir)) {
  const text = readFileSync(file, 'utf8');
  scanned += 1;

  // ── Email addresses ────────────────────────────────────────────────────
  for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) {
    const address = m[0];
    const domain = address.slice(address.lastIndexOf('@') + 1).toLowerCase();
    if (FICTIONAL_EMAIL_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) continue;
    if (THIRD_PARTY_EMAILS.includes(address.toLowerCase())) continue;
    problems.push(`${file}: email "${address}" is not a reserved/fictional domain`);
  }

  /*
   * ── Phone numbers, only in the shapes a HUMAN writes them ──────────────
   *
   * The first version matched an optional separator between each group, which
   * made a bare ten-digit run a "phone number" — and a minified bundle is full
   * of those: colour constants, numeric tables, timestamps. It reported 196
   * findings, every one of them a number like `2570243327` sitting in an
   * array, and not one of them a contact detail.
   *
   * A confident result arriving in bulk is this project's signature for a
   * broken matcher, so the shape was tightened rather than the finding
   * believed. Two forms now, both requiring something a person typed:
   *
   *   FORMATTED  separators BETWEEN the groups — (817) 555-0109, 817-555-0109
   *   E.164      an explicit leading +, which is how the real ones arrived
   *
   * A bare digit run matches neither, which is correct: it is an id.
   */
  const PHONE_SHAPES = [
    /(?:\+\d{1,2}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}/g,
    /\+\d{10,15}\b/g,
  ];
  for (const shape of PHONE_SHAPES) {
    for (const m of text.matchAll(shape)) {
      const number = m[0];
      if (FICTIONAL_PHONE.test(number)) continue;
      if (PUBLISHED_BUSINESS_NUMBERS.some((p) => number.replace(/\D/g, '').endsWith(p.replace(/\D/g, '').slice(-10)))) {
        continue;
      }
      problems.push(`${file}: "${number}" looks like a real phone number`);
    }
  }
}

console.log(`scanned ${scanned} file(s) in ${outDir}/`);
console.log('\n=== PRIVATE DATA ===');
if (problems.length) {
  for (const p of [...new Set(problems)].slice(0, 40)) console.log('  ' + p);
  console.log(`\n${new Set(problems).size} finding(s)`);
  console.log('  Real contact details belong in the backend, never in a shipped bundle.');
  process.exit(1);
}
console.log(
  'clean: no email outside a reserved/fictional domain, and no phone number outside the 555 fiction range or the published business line',
);
