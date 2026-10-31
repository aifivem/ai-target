import type { TargetCamera } from "../../../resource/common/nui";

/** A sample that comes later than this (ms) after the previous one starts a new motion. */
const MAX_GAP = 100;
/** A new motion blends over the usual send interval... */
const START_BLEND = 24;
/** ...unless the camera jumped (turned this many degrees or moved this many metres between two samples): then it snaps. */
const JUMP_TURN = 5;
const JUMP_MOVE = 1;
/** Blend length bounds (ms); the blend takes as long as the gap between the last two samples. */
const MIN_BLEND = 8;
const MAX_BLEND = 50;

const wrapAngle = (degrees: number): number =>
  degrees > 180 ? degrees - 360 : degrees < -180 ? degrees + 360 : degrees;

/**
 * The client sends the camera every few ms while it moves. Each frame in between blends from where the markers were
 * drawn to the newest camera over the time the last gap took, so they glide; nothing is predicted, so they never run
 * past their target.
 */
export class CameraSmoother {
  private from: TargetCamera | null = null;
  private to: TargetCamera | null = null;
  private startedAt = 0;
  private duration = 0;
  private receivedAt = 0;

  push(camera: TargetCamera, now: number): void {
    const gap = now - this.receivedAt;
    this.receivedAt = now;
    const shown = this.current(now).camera;
    const jumped =
      !shown ||
      Math.abs(wrapAngle(camera[4] - shown[4])) > JUMP_TURN ||
      Math.abs(camera[3] - shown[3]) > JUMP_TURN ||
      Math.hypot(
        camera[0] - shown[0],
        camera[1] - shown[1],
        camera[2] - shown[2],
      ) > JUMP_MOVE;
    if (jumped) {
      this.from = camera;
      this.to = camera;
      this.duration = 0;
      return;
    }
    this.from = shown;
    this.to = camera;
    this.startedAt = now;
    this.duration =
      gap > MAX_GAP
        ? START_BLEND
        : Math.min(Math.max(gap, MIN_BLEND), MAX_BLEND);
  }

  /** The camera for this frame, and whether the blend still runs (the next frame differs). */
  current(now: number): { camera: TargetCamera | null; moving: boolean } {
    const { from, to } = this;
    if (!from || !to) return { camera: null, moving: false };
    if (this.duration <= 0) return { camera: to, moving: false };
    const t = Math.min((now - this.startedAt) / this.duration, 1);
    if (t >= 1) return { camera: to, moving: false };
    return {
      camera: [
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t,
        from[2] + (to[2] - from[2]) * t,
        from[3] + (to[3] - from[3]) * t,
        from[4] + wrapAngle(to[4] - from[4]) * t,
        from[5] + (to[5] - from[5]) * t,
      ],
      moving: true,
    };
  }
}
