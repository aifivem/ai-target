import { cache } from "@aicore-fivem/lib/client";
import type { ScanPoint } from "./scanPoint";

/** Line of sight is probed for at most this many markers per scan, the nearest first. */
const LOS_LIMIT = 16;

/** Line of sight one scan behind: a probe started now is read on the next scan, so nothing waits for it. */
export class Sight {
  private readonly probes = new Map<
    string,
    { handle: number; visible: boolean }
  >();

  visible(key: string): boolean {
    return this.probes.get(key)?.visible ?? true;
  }

  update(points: ScanPoint[]): void {
    const [cx = 0, cy = 0, cz = 0] = GetFinalRenderedCamCoord();
    const keep = new Set<string>();
    for (const point of points.slice(0, LOS_LIMIT)) {
      keep.add(point.key);
      const probe = this.probes.get(point.key);
      if (probe) {
        const [status, hit] = GetShapeTestResult(probe.handle);
        // 1 = still running; read it next time.
        if (status === 1) continue;
        probe.visible = !hit;
      }
      // World only (flag 1): the target itself or a rack next to it must not hide its own marker.
      const handle = StartShapeTestLosProbe(
        cx,
        cy,
        cz,
        point.coords.x,
        point.coords.y,
        point.coords.z,
        1,
        cache.ped,
        7,
      );
      this.probes.set(point.key, { handle, visible: probe?.visible ?? true });
    }
    for (const key of this.probes.keys())
      if (!keep.has(key)) this.probes.delete(key);
  }
}
