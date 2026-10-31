import type {
  MenuOption,
  TargetCamera,
  TargetPoint,
} from "../../../resource/common/nui";

/**
 * Browser preview only: `?view=target` places a camera at the origin looking north and four markers in front of it
 * (the one in the middle gets the focus, one is out of reach); `?view=aim` turns the camera a little so no marker is
 * focused and the crosshair shows; `?view=menu` opens the pick menu.
 */
const view = new URLSearchParams(window.location.search).get("view");
const markers = view === "target" || view === "aim";

export function mockPoints():
  { points: TargetPoint[]; key: string } | undefined {
  if (!markers) return undefined;
  return {
    key: "E",
    points: [
      {
        key: "e:1",
        x: 0.02,
        y: 4,
        z: 1.58,
        distance: 1.5,
        label: "3 options",
        count: 3,
        reachable: true,
      },
      {
        key: "e:2",
        x: -1.6,
        y: 5,
        z: 1.2,
        distance: 2.5,
        label: "Talk",
        count: 1,
        reachable: true,
      },
      {
        key: "z:3",
        x: 1.8,
        y: 6,
        z: 1.6,
        distance: 3.5,
        label: "Use the ATM",
        count: 1,
        reachable: true,
      },
      {
        key: "e:4",
        x: 4,
        y: 12,
        z: 2,
        distance: 6,
        label: "",
        count: 0,
        reachable: false,
      },
    ],
  };
}

export function mockFrame(): { camera: TargetCamera } | undefined {
  if (!markers) return undefined;
  return { camera: [0, 0, 1.6, 0, view === "aim" ? 3 : 0, 50] };
}

export function mockMenu():
  { title: string; options: MenuOption[] } | undefined {
  if (view !== "menu") return undefined;
  return {
    title: "Vehicle",
    options: [
      { index: 0, label: "Open the trunk", icon: "fa-solid fa-box-open" },
      { index: 1, label: "Lock the doors", icon: "lock" },
      { index: 2, label: "Check the fuel", icon: "gas-pump" },
    ],
  };
}
