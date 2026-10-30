/** A marker on screen this frame: its key, reach, and distance to the screen centre in vh. */
export interface Spot {
  key: string;
  reachable: boolean;
  d: number;
}

/** A marker comes into focus within this many vh of the screen centre... */
export const FOCUS_RADIUS = 9;
/** ...and keeps it until it is this many radii away, so a marker at the edge does not flicker. */
const KEEP_RADIUS = 2;
/** Another marker takes over only when it is this much closer to the centre. */
const SWITCH_RATIO = 0.6;

/** Sticky focus: the nearest reachable marker to the screen centre, keeping the current one while it stays close. */
export function pickFocus(
  spots: Spot[],
  current: string | null,
): string | null {
  let kept: Spot | null = null;
  let best: Spot | null = null;
  for (const spot of spots) {
    if (!spot.reachable) continue;
    if (spot.key === current) kept = spot;
    if (spot.d <= FOCUS_RADIUS && (!best || spot.d < best.d)) best = spot;
  }
  if (kept && kept.d <= FOCUS_RADIUS * KEEP_RADIUS) {
    return best && best.key !== kept.key && best.d < kept.d * SWITCH_RATIO
      ? best.key
      : kept.key;
  }
  return best?.key ?? null;
}
