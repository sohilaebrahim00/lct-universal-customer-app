/**
 * The theme's public surface. Components import from here, never from `./ref`.
 *
 *   import { theme, space, radius, iconSize, resolveType } from '../../theme';
 *
 * Layering:
 *   ref.ts    raw values          — never imported by a component
 *   sys.ts    semantic roles      — the only colour surface components see
 *   type.ts   typographic roles   — per script
 *   *.ts      motion, elevation, contrast
 *
 * `contrast.ts` is deliberately NOT re-exported here. It is pure and must stay
 * importable from Jest without dragging React Native or Reanimated in, so tests
 * import `src/theme/contrast` directly.
 */

export { theme, sys, type Sys } from './sys';
export { type, resolveType, type Script, type TypeRole, type TypeStyle } from './type';
export { duration, easing, spring, transition, choreography, reduceMotion } from './motion';
export { elevation, elevationRadius, edgeHighlight, hairlineWidth } from './elevation';
export {
  space,
  gutter,
  radius,
  iconSize,
  iconStroke,
  minTouchTarget,
  controlHeight,
  fontFamily,
} from './ref';
