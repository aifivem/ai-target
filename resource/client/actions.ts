import { cache } from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import { ResourceName } from "common";
import type { TargetOption } from "common/options";
import type { ScanPoint } from "./scanPoint";

const log = createLogger(ResourceName);

/** What ox_target hands an option's handler: the option's plain fields plus where it was used. */
function response(
  option: TargetOption,
  point: ScanPoint,
  forServer: boolean,
): Record<string, unknown> {
  let entity = point.entity;
  if (forServer)
    entity =
      entity !== 0 && NetworkGetEntityIsNetworked(entity)
        ? NetworkGetNetworkIdFromEntity(entity)
        : 0;
  const [px = 0, py = 0, pz = 0] = GetEntityCoords(cache.ped, false);
  return {
    name: option.name,
    label: option.label,
    entity,
    coords: [point.coords.x, point.coords.y, point.coords.z],
    distance: Math.hypot(
      point.coords.x - px,
      point.coords.y - py,
      point.coords.z - pz,
    ),
    zone: point.zone ?? undefined,
  };
}

/** Runs an option the way ox_target does (onSelect, export, event, serverEvent, command); a failing one is logged. */
export function runOption(option: TargetOption, point: ScanPoint): void {
  try {
    if (option.onSelect) option.onSelect(response(option, point, false));
    else if (option.export) {
      const [resource = option.resource, name = option.export] =
        option.export.includes(".")
          ? option.export.split(".")
          : [option.resource, option.export];
      // Another resource's export named by the option (ox_target "resource.name" form).
      const target = (
        globalThis.exports as unknown as Record<
          string,
          Record<string, (...args: unknown[]) => unknown> | undefined
        >
      )[resource];
      target?.[name]?.(null, response(option, point, false));
    } else if (option.event) emit(option.event, response(option, point, false));
    else if (option.serverEvent)
      emitNet(option.serverEvent, response(option, point, true));
    else if (option.command) ExecuteCommand(option.command);
  } catch (error) {
    log.error(
      `target option "${option.name}" from ${option.resource} failed`,
      error,
    );
  }
}
