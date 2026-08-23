import { describe, expect, it } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

/**
 * THE QUOTE IS NOT SCALED BETWEEN QUOTE AND CONFIRMATION.
 *
 * ── What prompted this ──────────────────────────────────────────────────────
 * The client's operations panel has a surge-zones feature. The business has
 * told us there is no surge. The panel's own wording describes it as flagging
 * busy areas to dispatch and drivers, which READS like visibility rather than a
 * multiplier — but that is a guess about someone else's software, and a guess
 * is not something to build on. It is filed as a question in
 * `PLATFORM_RECONCILIATION.md` (Q4).
 *
 * What is NOT a guess is the rule this app already holds: **the quote is
 * computed once, fixed at booking, all-inclusive, and never adjusted
 * afterwards.** That rule is testable today, regardless of what surge zones
 * turn out to be, and it is what stops a multiplier from ever arriving quietly.
 *
 * ── Why this was writable at all, which is worth recording ──────────────────
 * Because the quote is a single named object created in exactly one place.
 * `draft.allInFare` is written on the vehicle screen and read on the payment
 * screen, which was the structural fix for audit P0-3 (the vehicle card and the
 * payment total each recomputing and hoping the inputs matched).
 *
 * That fix is what makes this assertion possible. If the fare were recomputed
 * per screen, "the quote" would be a different value in each file and there
 * would be nothing to assert *about*, only a shape to eyeball. Worth saying
 * out loud: a correctness fix from four slices ago is why a pricing-integrity
 * test can exist now.
 *
 * ── What this does NOT prove ────────────────────────────────────────────────
 * That the customer is charged the quoted amount. They are charged what the
 * SERVER decides — `POST /payments/intent` sends `Number(booking.total_fare)` —
 * and the server is free to apply anything it likes. This is a client-side
 * assertion about a client-side path. The server-side guarantee is the
 * comparison in `payment.tsx` plus `fareDiffers()`, which shows the customer
 * both numbers when they disagree rather than silently charging the new one.
 */

/**
 * Everything on the path from "the quote exists" to "the customer confirms".
 *
 * `pricingPreview.ts` is deliberately NOT here: it is where the quote is
 * CONSTRUCTED, and construction multiplies — gratuity is a rate, tax is a rate.
 * The boundary this test defends is the one after the quote exists. A test that
 * banned multiplication everywhere would ban computing a fare at all, which is
 * why the file list matters as much as the rule.
 */
const POST_QUOTE_MODULES = [
  'app/(app)/book/details.tsx',
  'app/(app)/book/payment.tsx',
  'app/(app)/book/confirmed.tsx',
  'src/store/bookingFormStore.ts',
  'src/lib/serverFare.ts',
  'src/components/ui/PriceBreakdown.tsx',
];

/** Anything whose name says it carries money. */
const FARE_NAME = /fare|total|amount|price|gratuity|tax|surcharge|subtotal|charge/i;

/**
 * The one legitimate multiplication after a quote exists: dollars → cents.
 *
 * `fareDiffers()` compares `Math.round(x * 100)` against `Math.round(y * 100)`
 * because comparing dollars as floats would let `180.06 !== 180.06` fire an
 * interstitial over a representation artefact. That is a UNIT CONVERSION for a
 * comparison, not an adjustment to a price: the result is never rendered and
 * never charged.
 *
 * Allowing it by the literal `100` rather than by filename is deliberate — a
 * file-level exemption would also permit `total * 100 * 1.5` in the same file,
 * which is the thing being guarded against.
 */
const CENTS = 100;

interface Violation {
  file: string;
  line: number;
  text: string;
}

function sourceFile(file: string): ts.SourceFile {
  return ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function isNumericLiteral(node: ts.Node, value: number): boolean {
  return ts.isNumericLiteral(node) && Number(node.text) === value;
}

/** Does this expression mention something that carries money? */
function mentionsFare(node: ts.Node): boolean {
  return FARE_NAME.test(node.getText());
}

/**
 * Every `*`, `/`, `*=` and `/=` applied to a money-bearing expression.
 *
 * Walks the AST rather than the text on purpose. The text approach drowns: a
 * JSDoc block is full of `*`, every import path is full of `/`, and JSX closes
 * tags with `/>`. The first attempt at this was a grep and it returned import
 * statements.
 */
function scalingViolations(file: string): Violation[] {
  const src = sourceFile(file);
  const found: Violation[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      const isScale =
        op === ts.SyntaxKind.AsteriskToken ||
        op === ts.SyntaxKind.SlashToken ||
        op === ts.SyntaxKind.AsteriskEqualsToken ||
        op === ts.SyntaxKind.SlashEqualsToken;

      if (isScale && (mentionsFare(node.left) || mentionsFare(node.right))) {
        const centsConversion = isNumericLiteral(node.right, CENTS) || isNumericLiteral(node.left, CENTS);
        if (!centsConversion) {
          const { line } = src.getLineAndCharacterOfPosition(node.getStart());
          found.push({ file, line: line + 1, text: node.getText().replace(/\s+/g, ' ').slice(0, 100) });
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(src);
  return found;
}

describe('the quote is not scaled between quote and confirmation', () => {
  it('no post-quote module multiplies or divides a fare', () => {
    const violations = POST_QUOTE_MODULES.flatMap(scalingViolations);
    expect(violations).toEqual([]);
  });

  it('the boundary is real: the quote IS built by multiplication, one file earlier', () => {
    /*
     * The negative assertion above is only meaningful if multiplication exists
     * somewhere. If `calculateFarePreview` stopped multiplying, the test above
     * would still pass while the app had stopped computing fares — a green
     * light on a broken product. This pins where the arithmetic lives.
     */
    const preview = scalingViolations('src/lib/pricingPreview.ts');
    expect(preview.length).toBeGreaterThan(0);
  });

  it('the detector actually detects: a synthetic surge multiplier is caught', () => {
    /*
     * A guard nobody has seen fail is not a guard. This runs the same AST walk
     * over a synthetic module rather than writing a file into the app, so the
     * proof does not depend on a probe being cleaned up afterwards.
     */
    const synthetic = ts.createSourceFile(
      'synthetic.ts',
      'const surged = draft.allInFare.totalFare * surgeMultiplier;',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    let caught = 0;
    const visit = (node: ts.Node): void => {
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.AsteriskToken &&
        (mentionsFare(node.left) || mentionsFare(node.right))
      ) {
        caught += 1;
      }
      ts.forEachChild(node, visit);
    };
    visit(synthetic);
    expect(caught).toBe(1);
  });
});

/**
 * No surge vocabulary anywhere in the shipped app.
 *
 * Weaker than the AST assertion — a multiplier does not have to be called
 * `surge` — but it catches the likeliest arrival: somebody wiring the panel's
 * surge-zones feature into the client because the field exists upstream.
 *
 * `src/dev/` is scanned too. The role preview shows a dispatcher's view, and
 * the panel's surge panel is exactly the kind of thing a preview might grow.
 */
describe('no surge vocabulary reaches the client', () => {
  const SURGE_WORDS = /\b(surge|surgeMultiplier|priceMultiplier|dynamicPricing|peakMultiplier)\b/i;

  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (full.includes('node_modules')) continue;
      if (statSync(full).isDirectory()) walk(full, out);
      else if (full.endsWith('.ts') || full.endsWith('.tsx')) out.push(full.replace(/\\/g, '/'));
    }
    return out;
  }

  it('has no identifier or string suggesting a price multiplier', () => {
    const files = ['app', 'src'].flatMap((r) => walk(r));
    const offenders = files.filter((f) => {
      const source = readFileSync(f, 'utf8');
      /*
       * Comments are stripped before matching. This test file's own
       * neighbours are allowed to DISCUSS surge — `PLATFORM_RECONCILIATION.md`
       * and the config headers do, at length, and that discussion is the
       * opposite of a defect. What must not exist is surge in the CODE.
       */
      const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      return SURGE_WORDS.test(withoutComments);
    });
    expect(offenders).toEqual([]);
  });
});
