import { every } from "@aicore-fivem/lib/client";
import { NuiMessage, type TargetMove } from "common/nui";
import type { Vec3 } from "./zones";

/** How often the camera and the moving markers are read while markers exist (ms). */
const INTERVAL = 10;

/** A marker on a moving entity: its key, the entity and where on it the marker sits. */
export interface Follow {
  key: string;
  entity: number;
  offset: Vec3;
}

const round = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * Sends the game camera and the markers on moving entities to the overlay, which projects the markers itself: only
 * while markers exist and only what moved, so a still camera costs three native reads per tick and no message.
 */
export class CameraStream {
  private readonly job = every(INTERVAL, () => this.tick(), {
    active: false,
    name: "camera",
  });
  private last = [0, 0, 0, 0, 0, 0];
  private follows: Follow[] = [];
  private lastMoves = "";

  set(on: boolean): void {
    if (on === this.job.running) return;
    if (on) {
      this.last = [0, 0, 0, 0, 0, 0];
      this.lastMoves = "";
      this.tick();
    } else this.follows = [];
    this.job.set(on);
  }

  /** The markers on moving entities after a scan (the scanner hands them over every scan). */
  follow(list: Follow[]): void {
    this.follows = list;
  }

  private tick(): void {
    const [x = 0, y = 0, z = 0] = GetFinalRenderedCamCoord();
    const [pitch = 0, , yaw = 0] = GetFinalRenderedCamRot(2);
    const fov = GetFinalRenderedCamFov();
    const l = this.last;
    const still =
      Math.abs(x - (l[0] ?? 0)) < 0.005 &&
      Math.abs(y - (l[1] ?? 0)) < 0.005 &&
      Math.abs(z - (l[2] ?? 0)) < 0.005 &&
      Math.abs(pitch - (l[3] ?? 0)) < 0.02 &&
      Math.abs(yaw - (l[4] ?? 0)) < 0.02 &&
      Math.abs(fov - (l[5] ?? 0)) < 0.01;
    if (!still) this.last = [x, y, z, pitch, yaw, fov];

    let moves: TargetMove[] | undefined;
    if (this.follows.length > 0) {
      const list: TargetMove[] = [];
      for (const { key, entity, offset } of this.follows) {
        if (!DoesEntityExist(entity)) continue;
        const [mx = 0, my = 0, mz = 0] = GetOffsetFromEntityInWorldCoords(
          entity,
          offset.x,
          offset.y,
          offset.z,
        );
        list.push({ key, x: round(mx), y: round(my), z: round(mz) });
      }
      const text = JSON.stringify(list);
      if (text !== this.lastMoves) {
        this.lastMoves = text;
        moves = list;
      }
    }

    if (still && !moves) return;
    SendNUIMessage({
      action: NuiMessage.frame,
      data: { camera: still ? undefined : this.last, moves },
    });
  }
}
