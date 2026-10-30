import { NuiMessage } from "common/nui"

/** How often the camera is read while markers are on screen (ms). */
const INTERVAL = 24

/**
 * Sends the game camera to the overlay, which projects the markers itself: only while markers exist and only when
 * the camera moved, so a still camera costs three native reads per tick and no message.
 */
export class CameraStream {
  private timer: ReturnType<typeof setInterval> | null = null
  private last = [0, 0, 0, 0, 0, 0]

  set(on: boolean): void {
    if (on && this.timer === null) {
      this.last = [0, 0, 0, 0, 0, 0]
      this.tick()
      this.timer = setInterval(() => this.tick(), INTERVAL)
    } else if (!on && this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private tick(): void {
    const [x = 0, y = 0, z = 0] = GetFinalRenderedCamCoord()
    const [pitch = 0, , yaw = 0] = GetFinalRenderedCamRot(2)
    const fov = GetFinalRenderedCamFov()
    const l = this.last
    if (
      Math.abs(x - (l[0] ?? 0)) < 0.005 &&
      Math.abs(y - (l[1] ?? 0)) < 0.005 &&
      Math.abs(z - (l[2] ?? 0)) < 0.005 &&
      Math.abs(pitch - (l[3] ?? 0)) < 0.02 &&
      Math.abs(yaw - (l[4] ?? 0)) < 0.02 &&
      Math.abs(fov - (l[5] ?? 0)) < 0.01
    ) {
      return
    }
    this.last = [x, y, z, pitch, yaw, fov]
    SendNUIMessage({ action: NuiMessage.camera, data: this.last })
  }
}
