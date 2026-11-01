import { resourceExport } from "@aicore-fivem/lib/client";
import { CORE } from "@aicore-fivem/shared";

const core = resourceExport(CORE.resource);

/** ai-core's interaction key as the player bound it (a mouse or pad binding comes back as an icon code: shown as E). */
let interactHash = 0;
export function interactKey(): string {
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
