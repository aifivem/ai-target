import type { TargetOption } from "common/options"
import { TargetZones } from "./zones"

export type GlobalKind = "ped" | "vehicle" | "object" | "player"

/** The list without the options named in `names` (empty when `names` is null: every option goes). */
function without(
  list: TargetOption[],
  names: Set<string> | null
): TargetOption[] {
  return names ? list.filter((option) => !names.has(option.name)) : []
}

/** Puts options on a key of a map, or takes named ones off it (the key goes when nothing is left). */
class OptionMap<K> {
  readonly map = new Map<K, TargetOption[]>()

  add(key: K, options: TargetOption[]): void {
    const current = this.map.get(key)
    if (!current) return void this.map.set(key, [...options])
    // An option with the same name from the same resource replaces the old one (scripts re-register on restart).
    const names = new Set(options.map((o) => `${o.resource}:${o.name}`))
    this.map.set(key, [
      ...current.filter((o) => !names.has(`${o.resource}:${o.name}`)),
      ...options,
    ])
  }

  remove(key: K, names: Set<string> | null): void {
    const current = this.map.get(key)
    if (!current) return
    const left = without(current, names)
    if (left.length) this.map.set(key, left)
    else this.map.delete(key)
  }

  removeResource(resource: string): void {
    for (const [key, list] of this.map) {
      const left = list.filter((option) => option.resource !== resource)
      if (left.length === list.length) continue
      if (left.length) this.map.set(key, left)
      else this.map.delete(key)
    }
  }
}

/**
 * Every option registered on this client, by what it hangs on: zones (grid), models, networked entities (net id),
 * local entities (handle) and global kinds. Lookups by key are O(1); a resource's options go when it stops.
 */
class Registry {
  readonly zones = new TargetZones()
  readonly models = new OptionMap<number>()
  readonly netEntities = new OptionMap<number>()
  readonly localEntities = new OptionMap<number>()
  readonly globals: Record<GlobalKind, TargetOption[]> = {
    ped: [],
    vehicle: [],
    object: [],
    player: [],
  }
  /** Changes when the set of models with options changes, so the scanner knows which pools to walk. */
  modelsVersion = 0

  addGlobal(kind: GlobalKind, options: TargetOption[]): void {
    const names = new Set(options.map((o) => `${o.resource}:${o.name}`))
    this.globals[kind] = [
      ...this.globals[kind].filter(
        (o) => !names.has(`${o.resource}:${o.name}`)
      ),
      ...options,
    ]
  }

  removeGlobal(kind: GlobalKind, names: Set<string> | null): void {
    this.globals[kind] = without(this.globals[kind], names)
  }

  addModels(models: number[], options: TargetOption[]): void {
    for (const model of models) this.models.add(model, options)
    this.modelsVersion++
  }

  removeModels(models: number[], names: Set<string> | null): void {
    for (const model of models) this.models.remove(model, names)
    this.modelsVersion++
  }

  removeResource(resource: string): void {
    this.zones.removeResource(resource)
    this.models.removeResource(resource)
    this.netEntities.removeResource(resource)
    this.localEntities.removeResource(resource)
    for (const kind of Object.keys(this.globals) as GlobalKind[])
      this.globals[kind] = this.globals[kind].filter(
        (o) => o.resource !== resource
      )
    this.modelsVersion++
  }
}

export const registry = new Registry()
