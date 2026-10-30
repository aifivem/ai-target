import type {
  MenuOption,
  TargetCamera,
  TargetPoint,
} from "../../../resource/common/nui";

/**
 * Browser preview only: `?view=target` places a camera at the origin looking north and four markers in front of it
 * (the one in the middle gets the focus, one is out of reach); `?view=menu` opens the pick menu.
 */
const view = new URLSearchParams(window.location.search).get("view");

export function mockPoints():
  { points: TargetPoint[]; key: string } | undefined {
  if (view !== "target") return undefined;
  return {
    key: "E",
    points: [
      {
        key: "e:1",
        x: 0.05,
        y: 4,
        z: 1.55,
        label: "Open the trunk",
        count: 3,
        reachable: true,
      },
      {
        key: "e:2",
        x: -1.6,
        y: 5,
        z: 1.2,
        label: "Talk",
        count: 1,
        reachable: true,
      },
      {
        key: "z:3",
        x: 1.8,
        y: 6,
        z: 1.6,
        label: "Use the ATM",
        count: 1,
        reachable: true,
      },
      {
        key: "e:4",
        x: 4,
        y: 12,
        z: 2,
        label: "Far away",
        count: 0,
        reachable: false,
      },
    ],
  };
}

export function mockCamera(): TargetCamera | undefined {
  return view === "target" ? [0, 0, 1.6, 0, 0, 50] : undefined;
}

export function mockMenu():
  { title: string; options: MenuOption[] } | undefined {
  if (view !== "menu") return undefined;
  return {
    title: "Vehicle",
    options: [
      { index: 0, label: "Open the trunk" },
      { index: 1, label: "Lock the doors" },
      { index: 2, label: "Check the fuel" },
    ],
  };
}
