import { MARKER_EXTRA, reachOf, type TargetOption } from "common/options";
import { allowed } from "./conditions";
import type { Vec3 } from "./zones";

/** A marker with what it needs to act: its options in reach, the entity or zone, where it is. */
export interface ScanPoint {
  key: string;
  entity: number;
  zone: number | null;
  coords: Vec3;
  distance: number;
  /** Options the player can use now (in reach and allowed). */
  usable: TargetOption[];
  /** Options whose marker shows (allowed, within reach + a few metres). */
  visible: TargetOption[];
  /** On a moving entity: where on it the marker sits (the camera stream follows it every frame). */
  follow?: Vec3;
}

/** Adds the marker for these options when any of them shows (allowed, within reach + a few metres); returns it. */
export function collectPoint(
  out: ScanPoint[],
  key: string,
  entity: number,
  zone: number | null,
  coords: Vec3,
  distance: number,
  options: TargetOption[],
  held: Map<string, number>,
): ScanPoint | undefined {
  const visible: TargetOption[] = [];
  const usable: TargetOption[] = [];
  for (const option of options) {
    const reach = reachOf(option);
    if (
      distance > reach + MARKER_EXTRA ||
      !allowed(option, entity, distance, coords, held)
    )
      continue;
    visible.push(option);
    if (distance <= reach) usable.push(option);
  }
  if (visible.length === 0) return undefined;
  const point = { key, entity, zone, coords, distance, usable, visible };
  out.push(point);
  return point;
}
