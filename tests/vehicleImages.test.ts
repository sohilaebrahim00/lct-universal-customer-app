import { describe, expect, it } from '@jest/globals';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/*
 * Parsed from source, not imported: the module `require()`s .jpg files, which
 * Jest has no transformer for. Reading the text is also the right instrument
 * here — the claim under test is about what the FILE says, the same shape as
 * `adminPanelCoverage` reading the render switch.
 */

/**
 * THE VEHICLE ART, ASSERTED — because nothing did.
 *
 * `vehicleIdentity.test.ts` and `catalogueIntegrity.test.ts` were the two
 * suites expected to have an opinion when the picker art changed. **Neither
 * mentions an image.** They passed across the swap and their passing meant
 * nothing about it — a green result that is silent, which is the shape this
 * project keeps naming.
 *
 * What can actually be asserted from here, and what cannot:
 *
 *  - **Can:** every class has art, every referenced file exists, and nothing
 *    unreferenced is left lying in `assets/vehicles/` for someone to wire back
 *    up by accident. That last one is the real risk after a swap — a
 *    superseded render sitting beside its replacement is an invitation.
 *  - **Cannot:** whether the picture shows the right vehicle. No test can look
 *    at a photograph. That is why the render defects (a cargo van for a
 *    14-passenger class; an S-Class on gold aftermarket wheels) survived every
 *    gate this project has for weeks, and it is worth stating rather than
 *    implying the suite now covers it.
 */

const ASSET_DIR = join(__dirname, '..', 'assets', 'vehicles');
const SRC = readFileSync(join(__dirname, '..', 'src', 'lib', 'vehicleImages.ts'), 'utf8');

/** The asset filenames the module actually `require()`s, parsed from source. */
function referenced(): { key: string; file: string }[] {
  const map = SRC.slice(SRC.indexOf('export const VEHICLE_IMAGES'));
  const body = map.slice(0, map.indexOf('\n};'));
  return [...body.matchAll(/^\s*(\w+):\s*require\('\.\.\/\.\.\/assets\/vehicles\/([^']+)'\)/gm)].map((m) => ({
    key: m[1]!,
    file: m[2]!,
  }));
}

describe('vehicle art', () => {
  it('references at least one image per class the app can name', () => {
    const keys = referenced().map((r) => r.key);
    const names = SRC.slice(SRC.indexOf('export const VEHICLE_DISPLAY_NAME'));
    const body = names.slice(0, names.indexOf('\n};'));
    const classes = [...body.matchAll(/^\s*(\w+):\s*'/gm)].map((m) => m[1]!);
    expect(classes.length).toBeGreaterThan(0);
    for (const type of classes) expect(keys).toContain(type);
  });

  it('references only files that exist on disk', () => {
    for (const { key, file } of referenced()) {
      if (!existsSync(join(ASSET_DIR, file))) {
        throw new Error(`${key} requires assets/vehicles/${file}, which is not there`);
      }
    }
  });

  /*
   * THE ONE THAT WOULD HAVE CAUGHT A HALF-DONE SWAP.
   *
   * Metro only bundles what is required, so an orphan costs no bytes — it costs
   * a future mistake. When two classes moved to real photographs on 2026-09-02
   * the superseded renders were deleted rather than left beside them, and this
   * is what keeps that true.
   */
  it('leaves no unreferenced image in assets/vehicles', () => {
    const used = new Set(referenced().map((r) => r.file));
    const orphans = readdirSync(ASSET_DIR)
      .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .filter((f) => !used.has(f));
    expect(orphans).toEqual([]);
  });

  /*
   * Picker art rides in the JS bundle, and HANDOFF §9 measures a 6-10 second
   * first load on cellular. The camera originals are 560-633 KB each; they were
   * resized on the way in. This is the guard on that, not a style preference.
   */
  it('keeps every image small enough to ship on the booking picker', () => {
    for (const { file } of referenced()) {
      const kb = readFileSync(join(ASSET_DIR, file)).byteLength / 1024;
      if (kb > 320) throw new Error(`assets/vehicles/${file} is ${kb.toFixed(0)} KB — resize before shipping`);
    }
  });
});
