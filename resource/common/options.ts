import { isRecord } from "@aicore-fivem/lib/shared";

/**
 * One interaction offered on a zone or entity, in ox_target's shape (other resources register them through the
 * ox_target exports). Functions come from other resources as function references.
 */
export interface TargetOption {
  name: string;
  label: string;
  icon?: string;
  /** Reach in metres (default 2.5); the marker shows a little further. */
  distance?: number;
  /** Jobs or gangs allowed: a name, a list of names, or `{ name: minGrade }`. */
  groups?: string | string[] | Record<string, number>;
  canInteract?: (entity: number, distance: number, coords: number[], name: string) => unknown;
  onSelect?: (data: unknown) => unknown;
  export?: string;
  event?: string;
  serverEvent?: string;
  command?: string;
  /** The resource that registered it: its options go when it stops. */
  resource: string;
}

const str = (value: unknown, max = 64): string | undefined => (typeof value === "string" && value.length > 0 ? value.slice(0, max) : undefined);
const fn = <T>(value: unknown): T | undefined => (typeof value === "function" ? (value as T) : undefined);

function toGroups(value: unknown): TargetOption["groups"] {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (!isRecord(value)) return undefined;
  const out: Record<string, number> = {};
  for (const [name, grade] of Object.entries(value)) if (typeof grade === "number") out[name] = grade;
  return out;
}

function toOption(value: unknown, resource: string): TargetOption | null {
  if (!isRecord(value)) return null;
  const label = str(value.label, 80);
  if (!label) return null;
  return {
    name: str(value.name) ?? label,
    label,
    icon: str(value.icon),
    distance: typeof value.distance === "number" && value.distance > 0 ? Math.min(value.distance, 50) : undefined,
    groups: toGroups(value.groups),
    canInteract: fn(value.canInteract),
    onSelect: fn(value.onSelect),
    export: str(value.export, 128),
    event: str(value.event, 128),
    serverEvent: str(value.serverEvent, 128),
    command: str(value.command, 128),
    resource,
  };
}

/** One option or a list of them; invalid ones (no label) are left out. */
export function toOptions(value: unknown, resource: string): TargetOption[] {
  const list = Array.isArray(value) ? value : [value];
  const out: TargetOption[] = [];
  for (const item of list) {
    const option = toOption(item, resource);
    if (option) out.push(option);
  }
  return out;
}

/** Option names for a removal: one name, a list, or none (= every option). */
export function toNames(value: unknown): Set<string> | null {
  if (typeof value === "string") return new Set([value]);
  if (Array.isArray(value)) return new Set(value.filter((v): v is string => typeof v === "string"));
  return null;
}

export const DEFAULT_REACH = 2.5;
/** How much further than its reach an option's marker already shows. */
export const MARKER_EXTRA = 3;
export const reachOf = (option: TargetOption): number => option.distance ?? DEFAULT_REACH;
