/**
 * ASSET INTEGRITY — the gap between the machine that verifies and the machine
 * that serves.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  Every gate in this project runs on WINDOWS against a local `dist/`.
 *  The artifact runs on LINUX, served by Netlify.
 *  No gate has ever executed in the environment that serves the client.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * That gap has been there since the first slice, invisible because nothing had
 * depended on it. It is NOT the shape of the other failures in
 * `DESIGN_CHANGELOG.md` — those are all *the assertion is true in the failure
 * state*. This one is different, and worse to reason about:
 *
 *   **The assertion was true. In the environment where it ran.**
 *
 * Case sensitivity is the first thing through that gap. Windows resolves
 * `Sprinter-Exterior.jpg` to `sprinter-exterior.jpg` and Linux does not, so a
 * mis-cased literal loads locally, verifies in a local `dist/`, passes every
 * check, and 404s on the deploy. Path separators, line endings and
 * case-insensitive route matching all live in the same gap.
 *
 * ── The rule that makes a check survive the gap ───────────────────────────
 * **Compare STRINGS. Never ask the filesystem whether a file exists**, because
 * on Windows the filesystem is the thing that lies. `existsSync()` returns true
 * for the wrong case; a directory listing does not.
 *
 * ── Two checks ────────────────────────────────────────────────────────────
 * 1. SOURCE: every `require('.../assets/...')` literal matches a real directory
 *    entry character for character.
 * 2. ARTIFACT: every asset URL the emitted bundle references exists in `dist/`,
 *    and nothing is referenced that was not emitted. This is the check that
 *    speaks to a broken picture on a deployed page — a bundle referencing a
 *    file that is not beside it renders a hole, with no console error and no
 *    blank screen, so every existing gate passes over it.
 *
 * Usage:  node scripts/verify-assets.mjs        (source only)
 *         node scripts/verify-assets.mjs dist   (source + emitted artifact)
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, posix } from 'node:path';

const problems = [];
const outDir = process.argv[2] ?? null;

/** Directory entries as the OS actually stored them. Never `existsSync`. */
function entries(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name);
  } catch {
    return null;
  }
}

/* ── 1. SOURCE LITERALS ─────────────────────────────────────────────────── */

/** Every module that requires a bundled asset. Add files here, not globs. */
const SOURCES = ['src/lib/vehicleImages.ts', 'src/lib/serviceIcons.ts', 'src/lib/services.ts'];

let literalCount = 0;
for (const file of SOURCES) {
  if (!existsSync(file)) continue;
  const src = readFileSync(file, 'utf8');
  // require('../../assets/<dir>/<name>')  — captured exactly as written.
  for (const m of src.matchAll(/require\('((?:\.\.\/)+assets\/[^']+)'\)/g)) {
    literalCount += 1;
    const rel = m[1].replace(/^(\.\.\/)+/, '');
    const dir = posix.dirname(rel);
    const name = posix.basename(rel);
    const present = entries(dir);
    if (present === null) {
      problems.push(`${file}: requires "${rel}" but the directory "${dir}/" does not exist`);
      continue;
    }
    if (!present.includes(name)) {
      // The case-insensitive near miss is the whole point of the message: on a
      // Windows dev box this resolves, and on the Linux box that serves the
      // client it 404s.
      const nearMiss = present.find((p) => p.toLowerCase() === name.toLowerCase());
      problems.push(
        nearMiss
          ? `${file}: requires "${name}" but the file on disk is "${nearMiss}" — differs only by CASE. ` +
            'This loads on Windows and 404s on Linux (Netlify).'
          : `${file}: requires "${name}", which is not in ${dir}/`,
      );
    }
  }
}
console.log(`source: ${literalCount} asset literal(s) checked against directory listings`);

/* ── 2. THE EMITTED ARTIFACT ────────────────────────────────────────────── */

if (outDir) {
  const jsDir = join(outDir, '_expo', 'static', 'js', 'web');
  const bundles = entries(jsDir)?.filter((f) => f.endsWith('.js')) ?? [];
  if (bundles.length === 0) {
    problems.push(`no JS bundle found in ${jsDir} — was there an export?`);
  }

  const referenced = new Set();
  for (const b of bundles) {
    const js = readFileSync(join(jsDir, b), 'utf8');
    /*
     * `(?<!\.\/)` excludes the SERIALIZED APP MANIFEST, which embeds
     * `"icon":"./assets/icon.png"` and `"web":{"favicon":"./assets/favicon.png"}`.
     * Those are configuration strings, not loaded images — the favicon ships as
     * `favicon.ico` at the export root — and flagging them was two false
     * positives on the first run of this gate.
     *
     * Everything else stays in scope. A real asset URL emitted by Metro is
     * never written with a `./` prefix in the bundle.
     */
    for (const m of js.matchAll(/(?<!\.\/)assets\/[A-Za-z0-9._\-/]+\.(?:jpg|jpeg|png|webp|ttf|otf)/g)) {
      referenced.add(m[0]);
    }
  }

  let checked = 0;
  for (const ref of referenced) {
    /*
     * The bundle names the path RELATIVE TO THE EXPORT ROOT, already including
     * its own `assets/` prefix — `assets/assets/vehicles/x.jpg` sits at
     * `dist/assets/assets/vehicles/x.jpg`. An earlier version prepended
     * `assets` a second time and reported all 31 references missing: a
     * confident negative, arriving in a group, which is this project's
     * signature for a broken matcher rather than a finding.
     */
    const dir = join(outDir, posix.dirname(ref));
    const name = posix.basename(ref);
    const present = entries(dir);
    checked += 1;
    if (present === null) {
      problems.push(`artifact: bundle references "${ref}" but "${dir}" is not in the export`);
      continue;
    }
    if (!present.includes(name)) {
      const nearMiss = present.find((p) => p.toLowerCase() === name.toLowerCase());
      problems.push(
        nearMiss
          ? `artifact: bundle references "${name}" but the emitted file is "${nearMiss}" — CASE mismatch`
          : `artifact: bundle references "${name}", which was NOT emitted — this renders as a hole on the ` +
            'deployed page, with no console error and no blank screen',
      );
    }
  }
  console.log(`artifact: ${checked} asset reference(s) in the bundle checked against ${outDir}/`);
}

console.log('\n=== ASSET INTEGRITY ===');
if (problems.length) {
  for (const p of problems) console.log('  ' + p);
  console.log(`\n${problems.length} problem(s)`);
  process.exit(1);
}
console.log(
  outDir
    ? 'clean: every asset literal matches a real filename character for character, and every asset the ' +
      'bundle references was emitted beside it'
    : 'clean: every asset literal matches a real filename character for character',
);
