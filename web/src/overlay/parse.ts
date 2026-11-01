import type {
  TargetCamera,
  TargetMove,
  TargetPoint,
} from "../../../resource/common/nui";

export function toPoints(
  value: unknown,
): { points: TargetPoint[]; key: string } | null {
  if (typeof value !== "object" || value === null) return null;
  const { points, key } = value as { points?: unknown; key?: unknown };
  // The client builds this list itself; only its outer shape is checked.
  return Array.isArray(points)
    ? {
        points: points as TargetPoint[],
        key: typeof key === "string" ? key : "E",
      }
    : null;
}

export function toFrame(
  value: unknown,
): { camera?: TargetCamera; moves?: TargetMove[] } | null {
  if (typeof value !== "object" || value === null) return null;
  const { camera, moves } = value as { camera?: unknown; moves?: unknown };
  const isCamera =
    Array.isArray(camera) &&
    camera.length === 6 &&
    camera.every((n) => typeof n === "number");
  return {
    camera: isCamera ? (camera as TargetCamera) : undefined,
    moves: Array.isArray(moves) ? (moves as TargetMove[]) : undefined,
  };
}

export const sameKeys = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((key, i) => key === b[i]);
