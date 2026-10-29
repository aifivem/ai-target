import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { fetchNui, useNuiEvent } from "fivem-nui-react";
import { NuiCallback, NuiMessage, type TargetCamera, type TargetPoint } from "../../../resource/common/nui";
import { mockCamera, mockPoints } from "../dev/mock";
import { pickFocus, type Spot } from "./focus";
import { makeProjector } from "./projection";

const POINTS_OPTIONS = { mockData: mockPoints(), mockDelay: 200 };
const CAMERA_OPTIONS = { mockData: mockCamera(), mockDelay: 300 };

function toPoints(value: unknown): { points: TargetPoint[]; key: string } | null {
  if (typeof value !== "object" || value === null) return null;
  const { points, key } = value as { points?: unknown; key?: unknown };
  // The client builds this list itself; only its outer shape is checked.
  return Array.isArray(points) ? { points: points as TargetPoint[], key: typeof key === "string" ? key : "E" } : null;
}

const isCamera = (value: unknown): value is TargetCamera => Array.isArray(value) && value.length === 6 && value.every((n) => typeof n === "number");

/**
 * Markers over the world (NUI, not DrawSprite): React draws one node per marker, the positions are set straight on
 * the nodes in one animation frame after each camera or list change (no React render per frame). The focused marker
 * shows the key and its action; markers out of reach are dimmed and never focused.
 */
export function Overlay() {
  const [points, setPoints] = useState<TargetPoint[]>([]);
  const [key, setKey] = useState("E");
  const [focus, setFocus] = useState<string | null>(null);
  const camera = useRef<TargetCamera | null>(null);
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const frame = useRef<number | null>(null);
  const focusRef = useRef<string | null>(null);
  const pointsRef = useRef<TargetPoint[]>([]);

  const place = useCallback(() => {
    frame.current = null;
    const cam = camera.current;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const project = cam ? makeProjector(cam, w / h) : null;
    const spots: Spot[] = [];
    for (const point of pointsRef.current) {
      const node = nodes.current.get(point.key);
      if (!node) continue;
      const screen = project?.(point.x, point.y, point.z) ?? null;
      if (!screen) {
        node.style.visibility = "hidden";
        continue;
      }
      const x = Math.round(screen[0] * w);
      const y = Math.round(screen[1] * h);
      node.style.visibility = "visible";
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      spots.push({ key: point.key, reachable: point.reachable, d: Math.hypot(x - w / 2, y - h / 2) / (h / 100) });
    }
    const next = pickFocus(spots, focusRef.current);
    if (next !== focusRef.current) {
      focusRef.current = next;
      setFocus(next);
      void fetchNui<boolean>(NuiCallback.focus, next, { mockData: true });
    }
  }, []);

  const schedule = useCallback(() => {
    frame.current ??= requestAnimationFrame(place);
  }, [place]);

  useNuiEvent(
    NuiMessage.points,
    (value: unknown) => {
      const data = toPoints(value);
      if (!data) return;
      pointsRef.current = data.points;
      setPoints(data.points);
      setKey(data.key);
    },
    POINTS_OPTIONS,
  );
  useNuiEvent(
    NuiMessage.camera,
    (value: unknown) => {
      if (!isCamera(value)) return;
      camera.current = value;
      schedule();
    },
    CAMERA_OPTIONS,
  );

  // New nodes exist after the render: place them in the same frame.
  useLayoutEffect(() => {
    schedule();
  }, [points, schedule]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden [filter:drop-shadow(0.1vh_0.1vh_0_rgba(0,0,0,0.75))]">
      {points.map((point) => (
        <div
          key={point.key}
          ref={(node) => {
            if (node) nodes.current.set(point.key, node);
            else nodes.current.delete(point.key);
          }}
          className="absolute left-0 top-0"
          style={{ visibility: "hidden", opacity: point.reachable ? 1 : 0.5 }}
        >
          <Marker point={point} focused={point.key === focus} keyLabel={key} />
        </div>
      ))}
    </div>
  );
}

/** Ambient marker = a small white ring with a dot; focused = the key cap and the action. */
function Marker({ point, focused, keyLabel }: { point: TargetPoint; focused: boolean; keyLabel: string }) {
  if (!focused) {
    return (
      <span className="absolute flex size-[1.3vh] items-center justify-center rounded-full border-2 border-text [transform:translate(-50%,-50%)]">
        <span className="size-[0.35vh] rounded-full bg-text" />
      </span>
    );
  }
  return (
    <div className="absolute flex items-center gap-[1vh] [transform:translate(-1.5vh,-50%)]">
      <span className="flex h-[3vh] min-w-[3vh] items-center justify-center rounded-[0.6vh] border border-accent bg-[rgba(var(--panel-rgb),0.92)] px-[0.7vh] text-[1.4vh] font-semibold text-accent">
        {keyLabel}
      </span>
      <span className="flex items-center gap-[0.8vh] whitespace-nowrap rounded-[0.6vh] border border-line bg-[rgba(var(--panel-rgb),0.92)] px-[1.2vh] py-[0.5vh] text-[1.4vh] font-medium text-text">
        {point.label}
        {point.count > 1 && <span className="text-[1.2vh] text-text-3">+{point.count - 1}</span>}
      </span>
    </div>
  );
}
