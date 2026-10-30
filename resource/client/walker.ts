import { cache } from "@aicore-fivem/lib/client";
import { sleep } from "@aicore-fivem/lib/shared";
import { registry, type GlobalKind } from "./registry";

/** An entity near the player that has options of some kind. */
export interface Nearby {
  entity: number;
  model: number;
  kind: GlobalKind;
  netId: number | false;
}

/** How far around the player entities are collected (markers only show within a few metres of reach). */
const WALK_RADIUS = 25;
/** Entities read per frame; the rest waits for the next frame so a full pool never costs one long frame. */
const PER_FRAME = 200;

const POOLS: Array<{ pool: string; kind: "ped" | "vehicle" | "object" }> = [
  { pool: "CPed", kind: "ped" },
  { pool: "CVehicle", kind: "vehicle" },
  { pool: "CObject", kind: "object" },
];

const unsigned = (hash: number): number => hash >>> 0;

/** Which kind of entity a model is (models are registered without saying so). */
function kindOfModel(model: number): "ped" | "vehicle" | "object" {
  return IsModelAPed(model)
    ? "ped"
    : IsModelAVehicle(model)
      ? "vehicle"
      : "object";
}

/**
 * Finds the entities around the player that have options, once a second: only the pools that can hold one (a pool
 * with a registered model or with global options) are read, in slices across frames.
 */
export class Walker {
  nearby: Nearby[] = [];
  private poolsVersion = -1;
  private modelPools = new Set<string>();

  /** The pools to read now: global options of the kind, or a registered model of that kind. */
  private pools(): typeof POOLS {
    if (this.poolsVersion !== registry.modelsVersion) {
      this.poolsVersion = registry.modelsVersion;
      this.modelPools = new Set(
        [...registry.models.map.keys()].map(kindOfModel),
      );
    }
    const g = registry.globals;
    return POOLS.filter(
      ({ kind }) =>
        this.modelPools.has(kind) ||
        g[kind].length > 0 ||
        (kind === "ped" && g.player.length > 0),
    );
  }

  async walk(): Promise<void> {
    const [px = 0, py = 0, pz = 0] = GetEntityCoords(cache.ped, false);
    const found: Nearby[] = [];
    const seen = new Set<number>();
    const keep = (entity: number, kind: GlobalKind): void => {
      if (seen.has(entity)) return;
      seen.add(entity);
      const netId = NetworkGetEntityIsNetworked(entity)
        ? NetworkGetNetworkIdFromEntity(entity)
        : false;
      found.push({
        entity,
        model: unsigned(GetEntityModel(entity)),
        kind,
        netId,
      });
    };
    const near = (entity: number): boolean => {
      const [x = 0, y = 0, z = 0] = GetEntityCoords(entity, false);
      const dx = x - px;
      const dy = y - py;
      const dz = z - pz;
      return dx * dx + dy * dy + dz * dz <= WALK_RADIUS * WALK_RADIUS;
    };

    // Entities registered by handle or net id are known without walking a pool.
    for (const entity of registry.localEntities.map.keys())
      if (DoesEntityExist(entity) && near(entity)) keep(entity, kindOf(entity));
    for (const netId of registry.netEntities.map.keys()) {
      if (!NetworkDoesEntityExistWithNetworkId(netId)) continue;
      const entity = NetworkGetEntityFromNetworkId(netId);
      if (near(entity)) keep(entity, kindOf(entity));
    }

    let read = 0;
    for (const { pool, kind } of this.pools()) {
      const handles: unknown = GetGamePool(pool);
      if (!Array.isArray(handles)) continue;
      const globals =
        registry.globals[kind].length > 0 ||
        (kind === "ped" && registry.globals.player.length > 0);
      for (const entity of handles as number[]) {
        if (++read % PER_FRAME === 0) await sleep(0);
        if (entity === cache.ped || !DoesEntityExist(entity)) continue;
        if (
          !globals &&
          !registry.models.map.has(unsigned(GetEntityModel(entity)))
        )
          continue;
        if (!near(entity)) continue;
        keep(entity, kind === "ped" && IsPedAPlayer(entity) ? "player" : kind);
      }
    }
    this.nearby = found;
  }
}

/** The global kind of an entity found by handle (entity type 1 ped, 2 vehicle, 3 object). */
function kindOf(entity: number): GlobalKind {
  const type = GetEntityType(entity);
  if (type === 1) return IsPedAPlayer(entity) ? "player" : "ped";
  return type === 2 ? "vehicle" : "object";
}
