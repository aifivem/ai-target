import type { TargetPoint } from "../../../resource/common/nui";

/** A marker the overlay knows; `leaving` while its ring shrinks away after it left the client's list. */
export type Marker = TargetPoint & { leaving?: boolean };

/** A marker on screen this frame: position in px, distance to the screen centre in screen heights. */
export interface Spot {
  marker: Marker;
  x: number;
  y: number;
  d: number;
}

export interface FocusState {
  key: string | null;
  challenger: string | null;
  challengerSince: number;
}

/** A marker turns into the prompt within this much of the screen centre (screen heights)... */
export const FOCUS_RADIUS = 0.02;
/** ...the crosshair shows once the aim is this close to a marker in reach... */
export const CROSSHAIR_RADIUS = 0.15;
/** ...and markers count as near or far against this many metres. */
export const MAX_DISTANCE = 7;
/** The focused marker is kept while it stays within this many focus radii. */
const KEEP_RADIUS = 2;
/** Another marker takes over only when its score is this much better... */
const SWITCH_RATIO = 0.7;
/** ...for this long (ms), so walking past a row of markers does not flick between them. */
const SWITCH_DWELL = 180;
/** How much being nearer to the player counts against being nearer to the screen centre. */
const DISTANCE_WEIGHT = 0.5;

export const emptyFocus = (): FocusState => ({
  key: null,
  challenger: null,
  challengerSince: 0,
});

const score = (spot: Spot): number =>
  spot.d / FOCUS_RADIUS +
  (DISTANCE_WEIGHT * spot.marker.distance) / MAX_DISTANCE;

/** In reach and still in the client's list. */
export const focusable = (spot: Spot): boolean =>
  spot.marker.reachable && !spot.marker.leaving;

/**
 * Sticky focus (tgiann-radialmenu-target): the focused marker stays until it leaves the keep radius or another one
 * scores clearly better for a while.
 */
export function pickFocus(
  spots: Spot[],
  state: FocusState,
  now: number,
): Spot | null {
  const current =
    state.key === null
      ? null
      : (spots.find(
          (spot) => spot.marker.key === state.key && focusable(spot),
        ) ?? null);

  let best: Spot | null = null;
  let bestScore = Infinity;
  for (const spot of spots) {
    if (spot === current || !focusable(spot) || spot.d > FOCUS_RADIUS) continue;
    const value = score(spot);
    if (value < bestScore) {
      best = spot;
      bestScore = value;
    }
  }

  if (!current || current.d > FOCUS_RADIUS * KEEP_RADIUS) {
    state.challenger = null;
    return best;
  }
  if (!best || bestScore >= score(current) * SWITCH_RATIO) {
    state.challenger = null;
    return current;
  }
  if (state.challenger !== best.marker.key) {
    state.challenger = best.marker.key;
    state.challengerSince = now;
    return current;
  }
  if (now - state.challengerSince < SWITCH_DWELL) return current;
  state.challenger = null;
  return best;
}
