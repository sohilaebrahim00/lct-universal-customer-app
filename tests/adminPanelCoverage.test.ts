import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * REAL VERSUS EMPTY, DERIVED FROM THE RENDER SWITCH.
 *
 * ── The bug this exists to catch, which counting could not ────────────────
 * `HANDOFF.md` claimed a real/empty split derived as `NAV.length - EMPTY.length`.
 * That subtraction is only valid if every `EMPTY` key is actually REACHED.
 *
 * One was not. `AdminConsole.tsx` routed `section === 'broadcast' || section ===
 * 'messages'` to `<Broadcast/>`, so `EMPTY.messages` — a written, sourced empty
 * state explaining that no messaging system exists — could never render. The
 * console showed a working-looking broadcast composer under Messages while the
 * count said Messages was empty, **because a string existed for it**.
 *
 * Counting entries in a lookup table cannot see that. Only the switch can.
 *
 * ── Why this is a test and not a browser walk ─────────────────────────────
 * `verify:admin` proves all 18 tabs are reachable and that no data-less panel
 * prints a currency figure. It counts TABS, not panels — it cannot tell a real
 * panel from an empty one, and it never could. This closes that gap at the
 * source, where the answer is unambiguous.
 */

const SRC = readFileSync(join(__dirname, '..', 'src', 'dev', 'role', 'admin', 'AdminConsole.tsx'), 'utf8');

/** The nav keys, in order, from `NAV`. */
function navKeys(): string[] {
  const block = SRC.slice(SRC.indexOf('const NAV'));
  const body = block.slice(0, block.indexOf('\n];'));
  return [...body.matchAll(/key:\s*'([a-z]+)'/g)].map((m) => m[1]!);
}

/** The keys with a written empty state, from `EMPTY`. */
function emptyKeys(): string[] {
  const block = SRC.slice(SRC.indexOf('const EMPTY'));
  const body = block.slice(0, block.indexOf('\n};'));
  return [...body.matchAll(/^ {2}([a-z]+):/gm)].map((m) => m[1]!);
}

/**
 * The keys the RENDER SWITCH gives a real panel to.
 *
 * Every `section === '<key>'` test in the ternary chain, which is the only
 * thing that decides what a person actually sees.
 */
function renderedKeys(): string[] {
  const start = SRC.indexOf('{rides === null ? (');
  const end = SRC.indexOf('</RoleShell>', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const chain = SRC.slice(start, end);
  return [...new Set([...chain.matchAll(/section === '([a-z]+)'/g)].map((m) => m[1]!))];
}

describe('the admin console, counted from what it renders', () => {
  it('gives every nav section either a real panel or a written empty state', () => {
    const nav = navKeys();
    const rendered = renderedKeys();
    const empties = emptyKeys();
    for (const key of nav) {
      const covered = rendered.includes(key) || empties.includes(key);
      if (!covered) {
        // Falls through to `EMPTY[section]?.what ?? 'Nothing here'` — a section
        // whose empty state says nothing about why it is empty.
        throw new Error(`section "${key}" would render the bare "Nothing here" fallback`);
      }
    }
  });

  /**
   * THE B-2 SHAPE. A key that has BOTH a real panel and an empty state is a
   * lookup-table entry that can never render, and the count derived from
   * `EMPTY` is wrong by one for every such key.
   */
  it('never has a section that is both rendered and written up as empty', () => {
    const rendered = renderedKeys();
    const both = emptyKeys().filter((k) => rendered.includes(k));
    expect(both).toEqual([]);
  });

  it('has no empty state written for a section that is not in the nav', () => {
    const nav = navKeys();
    expect(emptyKeys().filter((k) => !nav.includes(k))).toEqual([]);
  });

  it('has no rendered panel for a section that is not in the nav', () => {
    const nav = navKeys();
    expect(renderedKeys().filter((k) => !nav.includes(k))).toEqual([]);
  });

  /**
   * The numbers `HANDOFF.md` §8 states, derived here from the switch rather
   * than from a subtraction — and printed on failure so the document can be
   * corrected from a run instead of from prose.
   */
  it('renders 10 real panels and 8 empty states across 18 sections', () => {
    const nav = navKeys();
    const rendered = renderedKeys().filter((k) => nav.includes(k));
    const empties = nav.filter((k) => !rendered.includes(k));
    const summary = `${nav.length} sections · ${rendered.length} real (${rendered.join(', ')}) · ${empties.length} empty (${empties.join(', ')})`;
    if (nav.length !== 18 || rendered.length !== 10 || empties.length !== 8) {
      throw new Error(`the console's shape changed — update HANDOFF.md §8 from THIS line: ${summary}`);
    }
  });
});
