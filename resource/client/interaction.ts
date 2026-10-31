import { controls, registerExport } from "@aicore-fivem/lib/client";
import { NuiCallback, NuiMessage } from "common/nui";
import type { TargetOption } from "common/options";
import { runOption } from "./actions";
import type { ScanPoint, Scanner } from "./scanner";

/** GTA's own uses of E (INPUT_CONTEXT, INPUT_TALK, INPUT_VEH_HORN) stay off while a marker is focused. */
const BLOCKED_CONTROLS = [38, 51, 86];

type NuiReply = (value: unknown) => void;

/**
 * Focus and use: the overlay says which marker is in focus; ai-core's interaction key asks `HandleInteract` first
 * (one key for prompts and targets). One usable option runs at once, several open the pick menu.
 */
export class Interaction {
  private focus: string | null = null;
  private menu: { point: ScanPoint; options: TargetOption[] } | null = null;

  constructor(private readonly scanner: Scanner) {
    RegisterNuiCallback(NuiCallback.focus, (key: unknown, cb: NuiReply) => {
      this.focus = typeof key === "string" ? key : null;
      if (this.focus !== null) controls.disable("target", BLOCKED_CONTROLS);
      else controls.enable("target");
      cb(true);
    });
    RegisterNuiCallback(NuiCallback.select, (index: unknown, cb: NuiReply) => {
      const menu = this.menu;
      this.closeMenu();
      const option =
        typeof index === "number" ? menu?.options[index] : undefined;
      if (menu && option) runOption(option, menu.point);
      cb(true);
    });
    RegisterNuiCallback(
      NuiCallback.closeMenu,
      (_data: unknown, cb: NuiReply) => {
        this.closeMenu();
        cb(true);
      },
    );
    registerExport("HandleInteract", () => this.interact());
  }

  /** The interaction key: true when a focused marker took it (ai-core then skips its prompts). */
  interact(): boolean {
    const point = this.focus ? this.scanner.points.get(this.focus) : undefined;
    if (!point || this.menu || point.usable.length === 0) return false;
    SendNUIMessage({ action: NuiMessage.pressed });
    if (point.usable.length === 1) {
      runOption(point.usable[0]!, point);
      return true;
    }
    this.menu = { point, options: [...point.usable] };
    SetNuiFocus(true, true);
    SendNUIMessage({
      action: NuiMessage.openMenu,
      data: {
        title: point.visible[0]?.label ?? "",
        options: this.menu.options.map((o, index) => ({
          index,
          label: o.label,
          icon: o.icon,
        })),
      },
    });
    return true;
  }

  private closeMenu(): void {
    if (!this.menu) return;
    this.menu = null;
    SetNuiFocus(false, false);
    SendNUIMessage({ action: NuiMessage.closeMenu });
  }
}
