import {
  cache,
  every,
  medical,
  resourceExport,
} from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import { CORE } from "@aicore-fivem/shared";
import { ResourceName } from "common";
import Locale from "common/locale";
import { NuiMessage, type TargetPoint } from "common/nui";
import { MARKER_EXTRA, reachOf, type TargetOption } from "common/options";
import { CameraStream, type Follow } from "./camera";
import { allowed, currentMemberships } from "./conditions";
import { entityAnchor, entityDistance } from "./geometry";
import { registry } from "./registry";
import { Walker } from "./walker";
import { zoneAnchor, type TargetZone, type Vec3 } from "./zones";

const log = createLogger(ResourceName);
const core = resourceExport(CORE.resource);

/** A marker with what it needs to act: its options in reach, the entity or zone, where it is. */
export interface ScanPoint {
  key: string;
  entity: number;
  zone: number | null;
  coords: Vec3;
  distance: number;
  /** Options the player can use now (in reach and allowed). */
  usable: TargetOption[];
  /** Options whose marker shows (allowed, within reach + a few metres). */
  visible: TargetOption[];
  /** On a moving entity: where on it the marker sits (the camera stream follows it every frame). */
  follow?: Vec3;
}

const SCAN_NEAR = 250;
const SCAN_IDLE = 1000;
const WALK_EVERY = 1000;
/** Zones are looked up this far around the player (their circle radius is added). */
const ZONE_RANGE = 15;
/** Line of sight is probed for at most this many markers per scan, the nearest first. */
const LOS_LIMIT = 16;
/** A ped or vehicle faster than this (m/s) gets its marker moved every frame, not every scan. */
const MOVING_SPEED = 0.05;

/** Line of sight one scan behind: a probe started now is read on the next scan, so nothing waits for it. */
class Sight {
  private readonly probes = new Map<
    string,
    { handle: number; visible: boolean }
  >();

  visible(key: string): boolean {
    return this.probes.get(key)?.visible ?? true;
  }

  update(points: ScanPoint[]): void {
    const [cx = 0, cy = 0, cz = 0] = GetFinalRenderedCamCoord();
    const keep = new Set<string>();
    for (const point of points.slice(0, LOS_LIMIT)) {
      keep.add(point.key);
      const probe = this.probes.get(point.key);
      if (probe) {
        const [status, hit] = GetShapeTestResult(probe.handle);
        // 1 = still running; read it next time.
        if (status === 1) continue;
        probe.visible = !hit;
      }
      // World only (flag 1): the target itself or a rack next to it must not hide its own marker.
      const handle = StartShapeTestLosProbe(
        cx,
        cy,
        cz,
        point.coords.x,
        point.coords.y,
        point.coords.z,
        1,
        cache.ped,
        7,
      );
      this.probes.set(point.key, { handle, visible: probe?.visible ?? true });
    }
    for (const key of this.probes.keys())
      if (!keep.has(key)) this.probes.delete(key);
  }
}

/**
 * The target loop: every 250 ms while markers are around (1 s otherwise) it reads the zones and entities near the
 * player, decides which options show and which are usable, and sends the marker list to the overlay only when it
 * changed. Off while the game is not on the player's own camera, in a vehicle, dead or paused.
 */
export class Scanner {
  points = new Map<string, ScanPoint>();
  disabled = false;
  private readonly walker = new Walker();
  private readonly sight = new Sight();
  private readonly camera = new CameraStream();
  private readonly zones: TargetZone[] = [];
  private lastWalk = 0;
  private lastSent = "";
  private busy = false;
  private readonly near = every(SCAN_NEAR, () => this.tick(), {
    active: false,
    name: "targetScan",
  });
  private readonly idle = every(SCAN_IDLE, () => this.tick(), {
    active: false,
    name: "targetIdle",
  });

  start(): void {
    this.rate();
  }

  /** The fast scan while markers are around, the slow one otherwise. */
  private rate(): void {
    const fast = this.points.size > 0;
    this.near.set(fast);
    this.idle.set(!fast);
  }

  /** One scan at a time (an entity walk awaits). */
  private tick(): void {
    if (this.busy) return;
    this.busy = true;
    void this.run().finally(() => {
      this.busy = false;
      this.rate();
    });
  }

  private active(): boolean {
    return (
      !this.disabled &&
      !IsPauseMenuActive() &&
      !IsNuiFocused() &&
      GetRenderingCam() === -1 &&
      cache.vehicle === false &&
      !medical.isDead()
    );
  }

  private async run(): Promise<void> {
    try {
      if (this.active()) {
        if (GetGameTimer() - this.lastWalk >= WALK_EVERY) {
          this.lastWalk = GetGameTimer();
          await this.walker.walk();
        }
        this.scan();
      } else this.clear();
    } catch (error) {
      log.error("target scan failed", error);
    }
  }

  private clear(): void {
    this.points.clear();
    this.send([]);
  }

  private scan(): void {
    const [px = 0, py = 0, pz = 0] = GetEntityCoords(cache.ped, false);
    const player = { x: px, y: py, z: pz };
    const held = currentMemberships();
    const found: ScanPoint[] = [];

    registry.zones.near(px, py, ZONE_RANGE, this.zones);
    for (const zone of this.zones) {
      const coords = zoneAnchor(zone, pz);
      const distance = Math.hypot(coords.x - px, coords.y - py, coords.z - pz);
      this.collect(
        found,
        `z:${zone.id}`,
        0,
        zone.id,
        coords,
        distance,
        zone.options,
        held,
      );
    }

    for (const near of this.walker.nearby) {
      if (!DoesEntityExist(near.entity)) continue;
      const options = [
        ...(registry.localEntities.map.get(near.entity) ?? []),
        ...(near.netId !== false
          ? (registry.netEntities.map.get(near.netId) ?? [])
          : []),
        ...(registry.models.map.get(near.model) ?? []),
        ...registry.globals[near.kind],
      ];
      if (options.length === 0) continue;
      const isPed = near.kind === "ped" || near.kind === "player";
      const anchor = entityAnchor(near.entity, near.model, isPed);
      const distance = isPed
        ? Math.hypot(...difference(anchor, player))
        : entityDistance(near.entity, near.model, player);
      const point = this.collect(
        found,
        `e:${near.entity}`,
        near.entity,
        null,
        anchor,
        distance,
        options,
        held,
      );
      if (
        point &&
        near.kind !== "object" &&
        GetEntitySpeed(near.entity) > MOVING_SPEED
      ) {
        const [ox = 0, oy = 0, oz = 0] = GetOffsetFromEntityGivenWorldCoords(
          near.entity,
          anchor.x,
          anchor.y,
          anchor.z,
        );
        point.follow = { x: ox, y: oy, z: oz };
      }
    }

    found.sort((a, b) => a.distance - b.distance);
    this.sight.update(found);
    this.points.clear();
    const follows: Follow[] = [];
    for (const point of found) {
      if (!this.sight.visible(point.key)) continue;
      this.points.set(point.key, point);
      if (point.follow)
        follows.push({
          key: point.key,
          entity: point.entity,
          offset: point.follow,
        });
    }
    this.send([...this.points.values()]);
    this.camera.follow(follows);
  }

  private collect(
    out: ScanPoint[],
    key: string,
    entity: number,
    zone: number | null,
    coords: Vec3,
    distance: number,
    options: TargetOption[],
    held: Map<string, number>,
  ): ScanPoint | undefined {
    const visible: TargetOption[] = [];
    const usable: TargetOption[] = [];
    for (const option of options) {
      const reach = reachOf(option);
      if (
        distance > reach + MARKER_EXTRA ||
        !allowed(option, entity, distance, coords, held)
      )
        continue;
      visible.push(option);
      if (distance <= reach) usable.push(option);
    }
    if (visible.length === 0) return undefined;
    const point = { key, entity, zone, coords, distance, usable, visible };
    out.push(point);
    return point;
  }

  /** The overlay gets the list only when something it draws changed. */
  private send(points: ScanPoint[]): void {
    const list: TargetPoint[] = points.map((p) => ({
      key: p.key,
      x: round(p.coords.x),
      y: round(p.coords.y),
      z: round(p.coords.z),
      distance: Math.round(p.distance * 2) / 2,
      label:
        p.usable.length > 1
          ? Locale("TARGET_OPTIONS", p.usable.length)
          : (p.usable[0]?.label ?? ""),
      count: p.usable.length,
      reachable: p.usable.length > 0,
    }));
    const key = interactKey();
    const text = JSON.stringify(list) + key;
    if (text === this.lastSent) return;
    this.lastSent = text;
    SendNUIMessage({ action: NuiMessage.points, data: { points: list, key } });
    this.camera.set(list.length > 0);
  }
}

const round = (n: number): number => Math.round(n * 100) / 100;

/** ai-core's interaction key as the player bound it (a mouse or pad binding comes back as an icon code: shown as E). */
let interactHash = 0;
function interactKey(): string {
  if (!interactHash) {
    // The mapping command carries the default key the admin panel set (`+aicore_interact_<key>`); asked until known.
    const key = core.GetKeybindKey("aicore_interact");
    if (typeof key !== "string") return "E";
    interactHash = GetHashKey(`+aicore_interact_${key}`) | 0x80000000;
  }
  const label = GetControlInstructionalButton(0, interactHash, true).substring(
    2,
  );
  return /^\w{1,6}$/.test(label) ? label : "E";
}
const difference = (a: Vec3, b: Vec3): [number, number, number] => [
  a.x - b.x,
  a.y - b.y,
  a.z - b.z,
];
