import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { fetchNui, useNuiEvent } from "fivem-nui-react";
import { NuiCallback, NuiMessage } from "../../../resource/common/nui";
import { mockFrame, mockPoints } from "../dev/mock";
import { CameraSmoother } from "./cameraSmoother";
import { leaveRing, placeDots, stayRing } from "./dots";
import {
  CROSSHAIR_RADIUS,
  emptyFocus,
  focusable,
  pickFocus,
  type Marker,
  type Spot,
} from "./focus";
import { Positions } from "./positions";
import { sameKeys, toFrame, toPoints } from "./parse";
import { makeProjector } from "./projection";

const POINTS_OPTIONS = { mockData: mockPoints(), mockDelay: 200 };
const FRAME_OPTIONS = { mockData: mockFrame(), mockDelay: 300 };

/** The focused marker as the prompt shows it. */
export interface TargetFocus {
  key: string;
  label: string;
}

/**
 * The client sends what changed (the marker list, camera and moving markers); this projects them in one animation
 * frame and moves the DOM nodes directly. React renders only when the marker set, the focus or the crosshair change.
 */
export function useTargetOverlay() {
  const markers = useRef(new Map<string, Marker>());
  const positions = useRef(new Positions());
  const camera = useRef(new CameraSmoother());
  const dots = useRef(new Map<string, HTMLDivElement>());
  const button = useRef<HTMLDivElement>(null);
  const focusState = useRef(emptyFocus());
  const focusShown = useRef<TargetFocus | null>(null);
  const crosshairShown = useRef(false);
  const frame = useRef<number | null>(null);
  const lastLayout = useRef(0);
  const [keys, setKeys] = useState<string[]>([]);
  const [keyLabel, setKeyLabel] = useState("E");
  const [focus, setFocus] = useState<TargetFocus | null>(null);
  const [crosshair, setCrosshair] = useState(false);
  const [pressId, setPressId] = useState(0);

  const changeFocus = useCallback((next: Marker | null) => {
    const shown = focusShown.current;
    if (next && shown?.key === next.key && shown.label === next.label) return;
    if (!next && !shown) return;
    const value = next && { key: next.key, label: next.label };
    focusShown.current = value;
    setFocus(value);
    const key = next?.key ?? null;
    if (key === focusState.current.key) return;
    focusState.current.key = key;
    void fetchNui<boolean>(NuiCallback.focus, key, { mockData: true });
  }, []);

  const layout = useCallback(() => {
    frame.current = null;
    const now = performance.now();
    const dt = Math.min(now - lastLayout.current, 100);
    lastLayout.current = now;
    const settled = positions.current.step(markers.current.values(), dt);
    const { camera: cam, moving } = camera.current.current(now);
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    const project = cam ? makeProjector(cam, aspect) : null;

    const spots: Spot[] = [];
    if (project) {
      for (const marker of markers.current.values()) {
        const at = positions.current.get(marker.key);
        const screen = at && project(at[0], at[1], at[2]);
        if (!screen) continue;
        const dx = (screen[0] - 0.5) * aspect;
        const dy = screen[1] - 0.5;
        spots.push({
          marker,
          x: screen[0] * w,
          y: screen[1] * h,
          d: Math.sqrt(dx * dx + dy * dy),
        });
      }
    }

    const focused = pickFocus(spots, focusState.current, now);
    changeFocus(focused?.marker ?? null);
    placeDots(dots.current, spots, focused);

    const aimNear =
      !focused &&
      spots.some((spot) => focusable(spot) && spot.d <= CROSSHAIR_RADIUS);
    if (aimNear !== crosshairShown.current) {
      crosshairShown.current = aimNear;
      setCrosshair(aimNear);
    }
    if (button.current && focused)
      button.current.style.transform = `translate3d(${Math.round(focused.x)}px, ${Math.round(focused.y)}px, 0)`;

    // Keep going while the camera blends, a marker glides or another marker waits to take the focus.
    if (moving || !settled || focusState.current.challenger !== null)
      frame.current = requestAnimationFrame(layout);
  }, [changeFocus]);

  const schedule = useCallback(() => {
    frame.current ??= requestAnimationFrame(layout);
  }, [layout]);

  const finishLeave = useCallback((key: string) => {
    if (!markers.current.get(key)?.leaving) return;
    markers.current.delete(key);
    setKeys((prev) => prev.filter((other) => other !== key));
  }, []);

  useNuiEvent(
    NuiMessage.points,
    (value: unknown) => {
      const data = toPoints(value);
      if (!data) return;
      const previous = markers.current;
      const next = new Map<string, Marker>();
      for (const point of data.points) {
        if (previous.get(point.key)?.leaving)
          stayRing(dots.current.get(point.key));
        next.set(point.key, point);
      }
      // Markers that are gone stay until their ring has shrunk away.
      const leaving: string[] = [];
      for (const old of previous.values()) {
        if (next.has(old.key)) continue;
        next.set(old.key, old.leaving ? old : { ...old, leaving: true });
        if (!old.leaving) leaving.push(old.key);
      }
      markers.current = next;
      positions.current.keep(next);
      for (const key of leaving)
        leaveRing(dots.current.get(key), () => finishLeave(key));
      const nextKeys = [...next.keys()];
      setKeys((prev) => (sameKeys(prev, nextKeys) ? prev : nextKeys));
      setKeyLabel(data.key);
      schedule();
    },
    POINTS_OPTIONS,
  );

  useNuiEvent(
    NuiMessage.frame,
    (value: unknown) => {
      const data = toFrame(value);
      if (!data) return;
      if (data.camera) camera.current.push(data.camera, performance.now());
      for (const move of data.moves ?? []) {
        const marker = markers.current.get(move.key);
        if (!marker) continue;
        marker.x = move.x;
        marker.y = move.y;
        marker.z = move.z;
        positions.current.snap(marker);
      }
      schedule();
    },
    FRAME_OPTIONS,
  );

  useNuiEvent(NuiMessage.pressed, () => setPressId((id) => id + 1));

  // New dot nodes exist after the render: place them in the same frame.
  useLayoutEffect(() => {
    schedule();
  }, [keys, schedule]);

  return { keys, keyLabel, focus, crosshair, pressId, dots, button };
}
