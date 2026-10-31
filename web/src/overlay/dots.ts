import { FOCUS_RADIUS, MAX_DISTANCE, type Spot } from "./focus";

/** Rings grow towards the screen centre up to this factor. */
const DOT_GROW = 0.15;
const ENTER: Keyframe[] = [
  { opacity: 0, transform: "scale(0.3)" },
  { opacity: 1, transform: "scale(1)" },
];
const EXIT: Keyframe[] = [
  { opacity: 1, transform: "scale(1)" },
  { opacity: 0, transform: "scale(0.3)" },
];
const ENTER_TIMING: KeyframeAnimationOptions = {
  duration: 220,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
};
const EXIT_TIMING: KeyframeAnimationOptions = {
  duration: 160,
  easing: "cubic-bezier(0.4, 0, 1, 1)",
  fill: "forwards",
};

/** The ring inside a dot node; the node itself carries position, size and opacity. */
const ringOf = (node: HTMLElement): HTMLElement | null =>
  node.firstElementChild as HTMLElement | null;

/** A ring that turns visible (new marker, back on screen, the focus moved off it) grows in. */
function showRing(node: HTMLElement): void {
  if (node.dataset.shown === "1") return;
  node.dataset.shown = "1";
  node.style.visibility = "visible";
  const ring = ringOf(node);
  if (!ring) return;
  for (const animation of ring.getAnimations()) animation.cancel();
  ring.animate(ENTER, ENTER_TIMING);
}

/** Off screen or under the prompt: gone at once. */
function hideRing(node: HTMLElement): void {
  if (node.dataset.shown !== "1") return;
  node.dataset.shown = "";
  node.style.visibility = "hidden";
}

/** A marker that left the list shrinks away, then `done` drops its node; a hidden one goes at once. */
export function leaveRing(
  node: HTMLElement | undefined,
  done: () => void,
): void {
  const ring = node && ringOf(node);
  if (!node || !ring || node.dataset.shown !== "1") return done();
  ring.animate(EXIT, EXIT_TIMING).onfinish = done;
}

/** A marker that came back before its exit finished drops the exit. */
export function stayRing(node: HTMLElement | undefined): void {
  const ring = node && ringOf(node);
  if (ring) for (const animation of ring.getAnimations()) animation.cancel();
}

/**
 * One ring per marker on screen, moved with one transform: nearer markers and markers closer to the screen centre
 * draw larger and brighter, out of reach ones at half opacity. The focused one is hidden: the prompt sits on it.
 */
export function placeDots(
  dots: Map<string, HTMLElement>,
  spots: Spot[],
  focused: Spot | null,
): void {
  const shown = new Set<string>();
  const reach = FOCUS_RADIUS * 3;
  for (const spot of spots) {
    if (spot === focused) continue;
    const { marker } = spot;
    const node = dots.get(marker.key);
    if (!node) continue;
    shown.add(marker.key);
    const closeness = Math.max(0, 1 - spot.d / reach);
    const near = Math.max(0, 1 - marker.distance / MAX_DISTANCE);
    const opacity = 0.55 + 0.35 * near + 0.1 * closeness;
    node.style.opacity = String(marker.reachable ? opacity : opacity * 0.5);
    node.style.transform = `translate3d(${Math.round(spot.x)}px, ${Math.round(spot.y)}px, 0) scale(${0.8 + 0.2 * near + DOT_GROW * closeness})`;
    if (!marker.leaving) showRing(node);
  }
  for (const [key, node] of dots) if (!shown.has(key)) hideRing(node);
}
