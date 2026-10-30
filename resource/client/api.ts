import { provideExport, registerExport } from "@aicore-fivem/lib/client";
import { createLogger, isRecord } from "@aicore-fivem/lib/shared";
import { ResourceName } from "common";
import { toNames, toOptions } from "common/options";
import { registry, type GlobalKind } from "./registry";
import type { Scanner } from "./scanner";
import type { TargetZoneShape, Vec3 } from "./zones";

const log = createLogger(ResourceName);
const caller = (): string => GetInvokingResource() || ResourceName;

/** A vector from another resource: a Lua vector3 arrives as an array, a table as an object. */
function toVec3(value: unknown): Vec3 | null {
  if (
    Array.isArray(value) &&
    value.length >= 3 &&
    value.slice(0, 3).every((n) => typeof n === "number")
  )
    return { x: value[0], y: value[1], z: value[2] };
  if (
    isRecord(value) &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    typeof value.z === "number"
  )
    return { x: value.x, y: value.y, z: value.z };
  return null;
}

const list = <T>(value: unknown, read: (v: unknown) => T | null): T[] =>
  (Array.isArray(value) ? value : [value])
    .map(read)
    .filter((v): v is T => v !== null);
const toModel = (value: unknown): number | null =>
  typeof value === "number"
    ? value >>> 0
    : typeof value === "string"
      ? GetHashKey(value) >>> 0
      : null;
const toHandle = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) ? value : null;

function addZone(type: TargetZoneShape["type"], data: unknown): number {
  if (!isRecord(data)) return 0;
  const name = typeof data.name === "string" ? data.name : undefined;
  let shape: TargetZoneShape | null = null;
  if (type === "sphere") {
    const center = toVec3(data.coords);
    if (center)
      shape = {
        type,
        center,
        radius: typeof data.radius === "number" ? data.radius : 2,
      };
  } else if (type === "box") {
    const center = toVec3(data.coords);
    if (center)
      shape = {
        type,
        center,
        size: toVec3(data.size) ?? { x: 2, y: 2, z: 2 },
        rotation: typeof data.rotation === "number" ? data.rotation : 0,
      };
  } else {
    const points = list(data.points, toVec3);
    const thickness = typeof data.thickness === "number" ? data.thickness : 4;
    if (points.length >= 3) {
      const z = points.reduce((sum, p) => sum + p.z, 0) / points.length;
      shape = {
        type,
        points,
        minZ: z - thickness / 2,
        maxZ: z + thickness / 2,
      };
    }
  }
  if (!shape) {
    log.warn(`${caller()} sent a ${type} zone without valid coordinates`);
    return 0;
  }
  return registry.zones.add(
    shape,
    toOptions(data.options, caller()),
    caller(),
    name,
  );
}

/**
 * The ox_target API, answered under this resource's name and under `ox_target` (the manifest provides it), so
 * scripts written for ox_target work unchanged.
 */
export function registerApi(scanner: Scanner): void {
  const api: Record<string, (...args: never[]) => unknown> = {
    addSphereZone: (data: unknown) => addZone("sphere", data),
    addBoxZone: (data: unknown) => addZone("box", data),
    addPolyZone: (data: unknown) => addZone("poly", data),
    removeZone: (id: unknown) => {
      if (typeof id === "string") registry.zones.removeNamed(id);
      else if (typeof id === "number") registry.zones.remove(id);
    },
    zoneExists: (id: unknown) =>
      typeof id === "number" || typeof id === "string"
        ? registry.zones.exists(id)
        : false,
    addModel: (models: unknown, options: unknown) =>
      registry.addModels(list(models, toModel), toOptions(options, caller())),
    removeModel: (models: unknown, names: unknown) =>
      registry.removeModels(list(models, toModel), toNames(names)),
    addEntity: (netIds: unknown, options: unknown) => {
      for (const netId of list(netIds, toHandle))
        registry.netEntities.add(netId, toOptions(options, caller()));
    },
    removeEntity: (netIds: unknown, names: unknown) => {
      for (const netId of list(netIds, toHandle))
        registry.netEntities.remove(netId, toNames(names));
    },
    addLocalEntity: (entities: unknown, options: unknown) => {
      for (const entity of list(entities, toHandle))
        registry.localEntities.add(entity, toOptions(options, caller()));
    },
    removeLocalEntity: (entities: unknown, names: unknown) => {
      for (const entity of list(entities, toHandle))
        registry.localEntities.remove(entity, toNames(names));
    },
    // Options that hang on nothing (ox_target's "global option") belong on a radial menu, which ai-target has not.
    addGlobalOption: () =>
      log.warn(
        `${caller()} used addGlobalOption, which ai-target does not offer`,
      ),
    removeGlobalOption: () => undefined,
    disableTargeting: (state: unknown) => {
      scanner.disabled = state === true;
    },
    isActive: () => scanner.points.size > 0,
  };
  for (const kind of ["Ped", "Vehicle", "Object", "Player"] as const) {
    const key = kind.toLowerCase() as GlobalKind;
    api[`addGlobal${kind}`] = (options: unknown) =>
      registry.addGlobal(key, toOptions(options, caller()));
    api[`removeGlobal${kind}`] = (names: unknown) =>
      registry.removeGlobal(key, toNames(names));
  }
  for (const [name, fn] of Object.entries(api)) {
    registerExport(name, fn);
    provideExport("ox_target", name, fn);
  }
  on("onClientResourceStop", (resource: string) =>
    registry.removeResource(resource),
  );
}
