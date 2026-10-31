import { useEffect, useRef } from "react";
import { motion } from "motion/react";

const EASE_OUT = "cubic-bezier(0.2, 0, 0, 1)";
const ENTER = { type: "tween", duration: 0.15, ease: [0.2, 0, 0, 1] } as const;
const LABEL_ENTER = { ...ENTER, delay: 0.03 } as const;
const CAP_POP: Keyframe[] = [
  { transform: "scale(1)" },
  { transform: "scale(1.14)", offset: 0.35 },
  { transform: "scale(1)" },
];
const PULSE: Keyframe[] = [
  { opacity: 0.9, transform: "scale(1)" },
  { opacity: 0, transform: "scale(1.8)" },
];
const SHADOW = "[box-shadow:0.1vh_0.1vh_0_rgba(0,0,0,0.75)]";

/**
 * The focused marker (tgiann-radialmenu-target): a small white key cap centred on the marker with the action beside
 * it. It pops in, and pops again with a ring going out when the key is pressed on it (`pressId` goes up).
 */
export function TargetButton({
  keyLabel,
  label,
  pressId,
}: {
  keyLabel: string;
  label: string;
  pressId: number;
}) {
  const cap = useRef<HTMLDivElement>(null);
  const pulse = useRef<HTMLDivElement>(null);
  const firstPress = useRef(pressId);

  useEffect(() => {
    if (pressId === firstPress.current) return;
    cap.current?.animate(CAP_POP, { duration: 340, easing: EASE_OUT });
    pulse.current?.animate(PULSE, { duration: 420, easing: EASE_OUT });
  }, [pressId]);

  return (
    <div className="absolute top-[-0.9vh] left-[-0.9vh] flex h-[1.8vh] items-center gap-[0.7vh]">
      <motion.div
        initial={{ opacity: 0, transform: "scale(0.6)" }}
        animate={{ opacity: 1, transform: "scale(1)" }}
        transition={ENTER}
        className="relative h-[1.8vh] min-w-[1.8vh]"
      >
        <div
          ref={pulse}
          className="absolute inset-0 rounded-[0.3vh] border-[0.15vh] border-white opacity-0"
        />
        <div
          ref={cap}
          className={`flex size-full items-center justify-center rounded-[0.3vh] bg-white px-[0.3vh] text-[1.05vh] leading-none font-bold text-row ${SHADOW}`}
        >
          {keyLabel}
        </div>
      </motion.div>
      {label !== "" && (
        <motion.div
          initial={{ opacity: 0, transform: "translateX(-0.5vh)" }}
          animate={{ opacity: 1, transform: "translateX(0vh)" }}
          transition={LABEL_ENTER}
          className="flex max-w-[32vh] items-center text-[1.6vh] font-bold whitespace-nowrap text-white uppercase italic [text-shadow:0.1vh_0.1vh_0_rgba(0,0,0,0.75)]"
        >
          <span className="truncate leading-[1.3]">{label}</span>
        </motion.div>
      )}
    </div>
  );
}
