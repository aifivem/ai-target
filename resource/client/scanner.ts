import { cache, every, medical } from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import { ResourceName } from "common";
import { NuiMessage } from "common/nui";
import { CameraStream, type Follow } from "./camera";
import { currentMemberships } from "./conditions";
import { difference, entityAnchor, entityDistance } from "./geometry";
import { interactKey } from "./interactKey";
import { registry } from "./registry";
import { collectPoint, type ScanPoint } from "./scanPoint";
import { Sight } from "./sight";
import { toTargetPoints } from "./targetPoints";
import { Walker } from "./walker";
import { zoneAnchor, type TargetZone } from "./zones";

const log = createLogger(ResourceName);

const SCAN_NEAR = 250;
const SCAN_IDLE = 1000;
const WALK_EVERY = 1000;
/** Zones are looked up this far around the player (their circle radius is added). */
const ZONE_RANGE = 15;
/** A ped or vehicle faster than this (m/s) gets its marker moved every frame, not every scan. */
const MOVING_SPEED = 0.05;

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
      collectPoint(
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
      const point = collectPoint(
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

  /** The overlay gets the list only when something it draws changed. */
  private send(points: ScanPoint[]): void {
    const list = toTargetPoints(points);
    const key = interactKey();
    const text = JSON.stringify(list) + key;
    if (text === this.lastSent) return;
    this.lastSent = text;
    SendNUIMessage({ action: NuiMessage.points, data: { points: list, key } });
    this.camera.set(list.length > 0);
  }
}
