import { TargetButton } from "./TargetButton";
import { useTargetOverlay } from "./useTargetOverlay";

const SHADOW = "[box-shadow:0.1vh_0.1vh_0_rgba(0,0,0,0.75)]";

/**
 * Markers over the world (tgiann-radialmenu-target look): a white ring with a dot per marker, a crosshair dot in the
 * screen centre once the aim comes near a marker in reach, and the key prompt on the focused one. Positions are set on
 * the nodes by `useTargetOverlay`, not through React.
 */
export function Overlay() {
  const { keys, keyLabel, focus, crosshair, pressId, dots, button } =
    useTargetOverlay();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden [contain:layout_paint]">
      {keys.map((key) => (
        // The node carries position, scale and opacity; the ring inside it grows in and shrinks away.
        <div
          key={key}
          ref={(node) => {
            if (node) dots.current.set(key, node);
            else dots.current.delete(key);
          }}
          className="absolute top-0 left-0 transition-opacity duration-200"
          style={{ visibility: "hidden" }}
        >
          <div className="absolute top-[-0.65vh] left-[-0.65vh] flex size-[1.3vh] items-center justify-center rounded-full border-[0.15vh] border-white [box-shadow:0.1vh_0.1vh_0_rgba(0,0,0,0.75),inset_0.1vh_0.1vh_0_rgba(0,0,0,0.75)]">
            <div className={`size-[0.4vh] rounded-full bg-white ${SHADOW}`} />
          </div>
        </div>
      ))}

      {crosshair && (
        <div
          className={`absolute top-[calc(50%-0.25vh)] left-[calc(50%-0.25vh)] size-[0.5vh] animate-fade-in rounded-full bg-white ${SHADOW}`}
        />
      )}

      <div
        ref={button}
        className="absolute top-0 left-0"
        style={{ visibility: focus ? "visible" : "hidden" }}
      >
        {focus && (
          <TargetButton
            key={focus.key}
            keyLabel={keyLabel}
            label={focus.label}
            pressId={pressId}
          />
        )}
      </div>
    </div>
  );
}
