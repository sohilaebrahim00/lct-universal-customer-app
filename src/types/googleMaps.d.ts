/**
 * THE MAPS JS SURFACE THIS APP ACTUALLY USES — and nothing else.
 *
 * `@types/google.maps` is ~400 KB of declarations for an API this project
 * touches in one file, and adding a dependency is a decision this repository
 * asks to be raised rather than taken. These are the exact members
 * `TrackingMap.web.tsx` calls, hand-declared:
 *
 *   - a map with a style array, a centre, a zoom and `fitBounds`
 *   - circle-symbol markers that can be detached with `setMap(null)`
 *   - `LatLngBounds` for framing the pair that matters
 *
 * Narrow on purpose. If a future change needs Places, Directions or the
 * marker-clusterer, the honest move is to widen this deliberately — or to add
 * the real types then, as a decision with a reason — rather than to discover
 * that `any` had been quietly covering for it.
 */
declare namespace google.maps {
  type MapTypeStyle = Record<string, unknown>;

  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  interface MapOptions {
    styles?: MapTypeStyle[];
    disableDefaultUI?: boolean;
    gestureHandling?: string;
    backgroundColor?: string;
    zoom?: number;
    center?: LatLngLiteral;
  }

  class LatLngBounds {
    extend(point: LatLngLiteral): void;
  }

  class Map {
    constructor(element: HTMLElement, options?: MapOptions);
    fitBounds(bounds: LatLngBounds, padding?: number): void;
    setCenter(latlng: LatLngLiteral): void;
    setZoom(zoom: number): void;
  }

  /** Only the circle is used; the marker is drawn as a symbol, not an image. */
  enum SymbolPath {
    CIRCLE = 0,
  }

  interface Symbol {
    path: SymbolPath;
    scale?: number;
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWeight?: number;
  }

  interface MarkerOptions {
    map?: Map | null;
    position?: LatLngLiteral;
    title?: string;
    icon?: Symbol;
  }

  class Marker {
    constructor(options?: MarkerOptions);
    /** `setMap(null)` is how a marker is removed — see the cleanup effect. */
    setMap(map: Map | null): void;
  }
}
