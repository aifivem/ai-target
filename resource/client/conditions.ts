import { getPlayerData } from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import { ResourceName } from "common";
import type { TargetOption } from "common/options";
import type { Vec3 } from "./zones";

const log = createLogger(ResourceName);

/** The player's jobs and gangs with their grades, from ai-core's player data; read once per scan, not per option. */
export function currentMemberships(): Map<string, number> {
  const out = new Map<string, number>();
  for (const job of getPlayerData("jobs") ?? []) out.set(job.job, job.grade);
  for (const gang of getPlayerData("gangs") ?? [])
    out.set(gang.gang, Math.max(gang.grade, out.get(gang.gang) ?? -1));
  return out;
}

function inGroups(
  groups: NonNullable<TargetOption["groups"]>,
  held: Map<string, number>,
): boolean {
  if (typeof groups === "string") return held.has(groups);
  if (Array.isArray(groups)) return groups.some((name) => held.has(name));
  return Object.entries(groups).some(
    ([name, grade]) => (held.get(name) ?? -1) >= grade,
  );
}

/**
 * Whether an option may show now: its groups, then its own canInteract. Options come from other resources: one
 * that throws is treated as hidden and logged, never breaks targeting.
 */
export function allowed(
  option: TargetOption,
  entity: number,
  distance: number,
  coords: Vec3,
  held: Map<string, number>,
): boolean {
  if (option.groups !== undefined && !inGroups(option.groups, held))
    return false;
  if (!option.canInteract) return true;
  try {
    return Boolean(
      option.canInteract(
        entity,
        distance,
        [coords.x, coords.y, coords.z],
        option.name,
      ),
    );
  } catch (error) {
    log.error(
      `canInteract of "${option.name}" from ${option.resource} failed`,
      error,
    );
    return false;
  }
}
