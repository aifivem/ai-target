import type { Marker } from "./focus";

type Position = [number, number, number];

/** Time constant (ms) of the glide when a marker's spot changes between scans. */
const GLIDE_MS = 70;
/** Closer than this (metres) counts as arrived. */
const SETTLED = 0.002;

/**
 * Drawn world position of every marker: a marker whose spot changes between scans glides to it instead of jumping;
 * markers on moving entities (frame `moves`) snap so they stick to the entity.
 */
export class Positions {
  private shown = new Map<string, Position>();

  /** Forgets the markers that are gone. */
  keep(markers: Map<string, Marker>): void {
    for (const key of this.shown.keys())
      if (!markers.has(key)) this.shown.delete(key);
  }

  snap(marker: Marker): void {
    this.shown.set(marker.key, [marker.x, marker.y, marker.z]);
  }

  /** Moves every marker towards its spot; false while one still glides. */
  step(markers: Iterable<Marker>, dt: number): boolean {
    const k = 1 - Math.exp(-dt / GLIDE_MS);
    let settled = true;
    for (const marker of markers) {
      const position = this.shown.get(marker.key);
      if (!position) {
        this.snap(marker);
        continue;
      }
      const dx = marker.x - position[0];
      const dy = marker.y - position[1];
      const dz = marker.z - position[2];
      if (
        Math.abs(dx) < SETTLED &&
        Math.abs(dy) < SETTLED &&
        Math.abs(dz) < SETTLED
      ) {
        position[0] = marker.x;
        position[1] = marker.y;
        position[2] = marker.z;
        continue;
      }
      position[0] += dx * k;
      position[1] += dy * k;
      position[2] += dz * k;
      settled = false;
    }
    return settled;
  }

  get(key: string): Position | undefined {
    return this.shown.get(key);
  }
}
