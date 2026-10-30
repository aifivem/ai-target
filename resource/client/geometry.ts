import type { Vec3 } from "./zones"

/** Bone-less ped options sit on the chest. */
const PED_CHEST_BONE = 24818

/** Model bounding boxes, read once per model (they never change). */
const dims = new Map<number, [number[], number[]]>()

function dimensionsOf(model: number): [number[], number[]] {
  let box = dims.get(model)
  if (!box) {
    box = GetModelDimensions(model)
    dims.set(model, box)
  }
  return box
}

/**
 * Where an entity's marker stands: a ped's chest, the centre of anything else. Fixed to the entity, never to where
 * the player stands, so the marker does not slide while walking around it.
 */
export function entityAnchor(
  entity: number,
  model: number,
  isPed: boolean
): Vec3 {
  if (isPed) {
    const [x = 0, y = 0, z = 0] = GetPedBoneCoords(
      entity,
      PED_CHEST_BONE,
      0,
      0,
      0
    )
    return { x, y, z }
  }
  const [min = [], max = []] = dimensionsOf(model)
  const [x = 0, y = 0, z = 0] = GetOffsetFromEntityInWorldCoords(
    entity,
    ((min[0] ?? 0) + (max[0] ?? 0)) / 2,
    ((min[1] ?? 0) + (max[1] ?? 0)) / 2,
    ((min[2] ?? 0) + (max[2] ?? 0)) / 2
  )
  return { x, y, z }
}

/**
 * Distance from the player to the entity's body (its bounding box, 0 inside): standing at the back of a bus counts
 * as standing at the bus. Option reach is measured with this.
 */
export function entityDistance(
  entity: number,
  model: number,
  from: Vec3
): number {
  const [min = [], max = []] = dimensionsOf(model)
  const [lx = 0, ly = 0, lz = 0] = GetOffsetFromEntityGivenWorldCoords(
    entity,
    from.x,
    from.y,
    from.z
  )
  const dx = Math.max((min[0] ?? 0) - lx, 0, lx - (max[0] ?? 0))
  const dy = Math.max((min[1] ?? 0) - ly, 0, ly - (max[1] ?? 0))
  const dz = Math.max((min[2] ?? 0) - lz, 0, lz - (max[2] ?? 0))
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}
