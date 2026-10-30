/** NUI contract of ai-target (client script <-> overlay), shared by both sides. */

/** A marker: one entity or zone with options; world position, what the prompt says, whether it is in reach. */
export interface TargetPoint {
  key: string
  x: number
  y: number
  z: number
  label: string
  /** Options in reach; more than one opens the menu. */
  count: number
  reachable: boolean
}

/** The game camera: x, y, z, pitch, yaw (degrees), vertical fov (degrees). */
export type TargetCamera = [number, number, number, number, number, number]

export interface MenuOption {
  index: number
  label: string
  icon?: string
}

/** Client -> NUI messages: `{ action, data }`. */
export const NuiMessage = {
  /** data: { points: TargetPoint[], key: string }, the markers (or the bound interaction key) changed; sent only on change. */
  points: "points",
  /** data: TargetCamera, sent while markers exist and the camera moved. */
  camera: "camera",
  /** data: { title, options: MenuOption[] }, several options: pick one. */
  openMenu: "openMenu",
  closeMenu: "closeMenu",
} as const

/** NUI -> client callbacks. */
export const NuiCallback = {
  /** (key | null) -> true, the marker in focus changed. */
  focus: "focus",
  /** (index) -> true, an option of the open menu was picked. */
  select: "select",
  /** () -> true, the menu was closed without a pick. */
  closeMenu: "closeMenu",
} as const
