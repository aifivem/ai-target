import Locale from "common/locale";
import type { TargetPoint } from "common/nui";
import type { ScanPoint } from "./scanPoint";

const round = (n: number): number => Math.round(n * 100) / 100;

/** The markers as the overlay draws them (positions rounded, the prompt label built here). */
export function toTargetPoints(points: ScanPoint[]): TargetPoint[] {
  return points.map((p) => ({
    key: p.key,
    x: round(p.coords.x),
    y: round(p.coords.y),
    z: round(p.coords.z),
    distance: Math.round(p.distance * 2) / 2,
    label:
      p.usable.length > 1
        ? Locale("TARGET_OPTIONS", p.usable.length)
        : (p.usable[0]?.label ?? ""),
    count: p.usable.length,
    reachable: p.usable.length > 0,
  }));
}
