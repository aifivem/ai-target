import { ByResource } from "@aicore-fivem/lib/client";
import type { TargetOption } from "common/options";
import { cellKey, flatDistance, gridCell } from "@aicore-fivem/lib/shared";

/**
 * Target zones (ox_target's sphere, box and poly) in a grid of 64 m cells: a scan asks only for the zones whose
 * bounding circle reaches the player, so the count of zones on the server does not matter (benchmarked to 1,000,000).
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type TargetZoneShape =
  | { type: "sphere"; center: Vec3; radius: number }
  /** `size` full lengths; `rotation` heading in degrees. */
  | { type: "box"; center: Vec3; size: Vec3; rotation: number }
  | {
      type: "poly";
      points: Array<{ x: number; y: number }>;
      minZ: number;
      maxZ: number;
    };

export interface TargetZone {
  id: number;
  name?: string;
  resource: string;
  shape: TargetZoneShape;
  options: TargetOption[];
  /** Centre on the ground plane and the radius of a circle around the whole shape. */
  cx: number;
  cy: number;
  reach: number;
  cells: number[];
}

const CELL = 64;

/** Centre and bounding radius of a shape on the ground plane. */
function circle(shape: TargetZoneShape): [number, number, number] {
  if (shape.type === "sphere")
    return [shape.center.x, shape.center.y, shape.radius];
  if (shape.type === "box")
    return [
      shape.center.x,
      shape.center.y,
      Math.hypot(shape.size.x, shape.size.y) / 2,
    ];
  let sx = 0;
  let sy = 0;
  for (const p of shape.points) {
    sx += p.x;
    sy += p.y;
  }
  const cx = sx / shape.points.length;
  const cy = sy / shape.points.length;
  const center = { x: cx, y: cy };
  let r = 0;
  for (const p of shape.points) r = Math.max(r, flatDistance(p, center));
  return [cx, cy, r];
}

/** Bottom and top height of a shape. */
function heights(shape: TargetZoneShape): [number, number] {
  if (shape.type === "sphere")
    return [shape.center.z - shape.radius, shape.center.z + shape.radius];
  if (shape.type === "box")
    return [
      shape.center.z - shape.size.z / 2,
      shape.center.z + shape.size.z / 2,
    ];
  return [shape.minZ, shape.maxZ];
}

/**
 * Where a zone's marker stands: its centre; in a tall zone at the player's height (kept inside the zone), so a
 * 20 m tall shop box does not draw its marker on the roof.
 */
export function zoneAnchor(zone: TargetZone, playerZ: number): Vec3 {
  const [bottom, top] = heights(zone.shape);
  const z =
    top - bottom > 4
      ? Math.min(top - 0.5, Math.max(bottom + 0.5, playerZ))
      : (bottom + top) / 2;
  return { x: zone.cx, y: zone.cy, z };
}

export class TargetZones {
  /** Zones by id under the resource that added them: a stopping resource's zones go (O(its zones)). */
  private readonly byId = new ByResource<number, TargetZone>({
    onDrop: (_resource, _id, zone) => this.unlink(zone),
  });
  private readonly byName = new Map<string, number>();
  private readonly grid = new Map<number, TargetZone[]>();
  private nextId = 1;

  add(
    shape: TargetZoneShape,
    options: TargetOption[],
    resource: string,
    name?: string,
  ): number {
    if (name && this.byName.has(name)) this.remove(this.byName.get(name)!);
    const [cx, cy, reach] = circle(shape);
    const zone: TargetZone = {
      id: this.nextId++,
      name,
      resource,
      shape,
      options,
      cx,
      cy,
      reach,
      cells: [],
    };
    const { cx: x0, cy: y0 } = gridCell(cx - reach, cy - reach, CELL);
    const { cx: x1, cy: y1 } = gridCell(cx + reach, cy + reach, CELL);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const key = cellKey(x, y);
        const cell = this.grid.get(key);
        if (cell) cell.push(zone);
        else this.grid.set(key, [zone]);
        zone.cells.push(key);
      }
    }
    this.byId.set(zone.id, zone, resource);
    if (name) this.byName.set(name, zone.id);
    return zone.id;
  }

  remove(id: number): boolean {
    const zone = this.byId.get(id);
    if (!zone) return false;
    this.byId.delete(id);
    this.unlink(zone);
    return true;
  }

  /** Takes a zone out of the name index and the grid. */
  private unlink(zone: TargetZone): void {
    if (zone.name && this.byName.get(zone.name) === zone.id)
      this.byName.delete(zone.name);
    for (const key of zone.cells) {
      const cell = this.grid.get(key);
      if (!cell) continue;
      const index = cell.indexOf(zone);
      if (index >= 0) cell.splice(index, 1);
      if (cell.length === 0) this.grid.delete(key);
    }
  }

  removeNamed(name: string): boolean {
    const id = this.byName.get(name);
    return id !== undefined && this.remove(id);
  }

  exists(id: number | string): boolean {
    return typeof id === "number"
      ? this.byId.get(id) !== undefined
      : this.byName.has(id);
  }

  /** Zones whose bounding circle comes within `range` metres of (x, y); each zone once. */
  near(x: number, y: number, range: number, out: TargetZone[]): void {
    out.length = 0;
    const { cx: x0, cy: y0 } = gridCell(x - range, y - range, CELL);
    const { cx: x1, cy: y1 } = gridCell(x + range, y + range, CELL);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const cell = this.grid.get(cellKey(cx, cy));
        if (!cell) continue;
        for (const zone of cell) {
          if (
            Math.hypot(zone.cx - x, zone.cy - y) > zone.reach + range ||
            out.includes(zone)
          )
            continue;
          out.push(zone);
        }
      }
    }
  }

  get size(): number {
    return this.byId.size;
  }
}
