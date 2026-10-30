import type { TargetCamera } from "../../../resource/common/nui";

const DEG = Math.PI / 180;
/** Points closer than this in front of the camera are not drawn. */
const NEAR = 0.05;

export type Projector = (
  x: number,
  y: number,
  z: number,
) => [number, number] | null;

/**
 * World to screen (0-1) the way GTA's final rendered camera sees it: rotation order 2 (pitch, then yaw), no roll,
 * vertical fov. Points behind the camera or well outside the screen give null.
 */
export function makeProjector(camera: TargetCamera, aspect: number): Projector {
  const [cx, cy, cz, pitch, yaw, fov] = camera;
  const cp = Math.cos(pitch * DEG);
  const sp = Math.sin(pitch * DEG);
  const cyw = Math.cos(yaw * DEG);
  const syw = Math.sin(yaw * DEG);
  // Forward and up vectors of the camera; right is (cos yaw, sin yaw, 0).
  const fx = -syw * cp;
  const fy = cyw * cp;
  const fz = sp;
  const ux = syw * sp;
  const uy = -cyw * sp;
  const uz = cp;
  const tanHalf = Math.tan((fov * DEG) / 2);

  return (x, y, z) => {
    const dx = x - cx;
    const dy = y - cy;
    const dz = z - cz;
    const forward = dx * fx + dy * fy + dz * fz;
    if (forward < NEAR) return null;
    const right = dx * cyw + dy * syw;
    const up = dx * ux + dy * uy + dz * uz;
    const ndcX = right / (forward * aspect * tanHalf);
    const ndcY = up / (forward * tanHalf);
    if (ndcX < -1.1 || ndcX > 1.1 || ndcY < -1.1 || ndcY > 1.1) return null;
    return [(ndcX + 1) / 2, (1 - ndcY) / 2];
  };
}
