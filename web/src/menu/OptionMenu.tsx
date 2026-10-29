import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { fetchNui, useNuiEvent } from "fivem-nui-react";
import { NuiCallback, NuiMessage, type MenuOption } from "../../../resource/common/nui";
import { mockMenu } from "../dev/mock";

const OPEN_OPTIONS = { mockData: mockMenu(), mockDelay: 200 };

function toMenu(value: unknown): { title: string; options: MenuOption[] } | null {
  if (typeof value !== "object" || value === null) return null;
  const { title, options } = value as { title?: unknown; options?: unknown };
  if (!Array.isArray(options)) return null;
  const list = options.filter(
    (o): o is MenuOption => typeof o === "object" && o !== null && typeof (o as MenuOption).index === "number" && typeof (o as MenuOption).label === "string",
  );
  return { title: typeof title === "string" ? title : "", options: list };
}

/** Several options on one target: a small list in the middle; a click or its number picks, Esc closes. */
export function OptionMenu() {
  const [menu, setMenu] = useState<{ title: string; options: MenuOption[] } | null>(null);

  useNuiEvent(NuiMessage.openMenu, (value: unknown) => setMenu(toMenu(value)), OPEN_OPTIONS);
  useNuiEvent(NuiMessage.closeMenu, () => setMenu(null));

  const pick = (index: number) => {
    setMenu(null);
    void fetchNui<boolean>(NuiCallback.select, index, { mockData: true });
  };

  useEffect(() => {
    if (!menu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(null);
        void fetchNui<boolean>(NuiCallback.closeMenu, undefined, { mockData: true });
      }
      const number = Number(event.key);
      const option = Number.isInteger(number) && number > 0 ? menu.options[number - 1] : undefined;
      if (option) pick(option.index);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  if (!menu) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", duration: 0.25, bounce: 0 }}
        className="flex w-[32vh] flex-col gap-[0.4vh] rounded-[1vh] border border-line bg-[rgba(var(--panel-rgb),0.96)] p-[0.6vh] [box-shadow:0_1.2vh_3.2vh_rgba(0,0,0,0.55)]"
      >
        {menu.title && <span className="px-[1vh] pb-[0.4vh] pt-[0.6vh] text-[1.2vh] font-medium uppercase tracking-[0.18em] text-text-3">{menu.title}</span>}
        {menu.options.map((option, i) => (
          <button
            key={option.index}
            type="button"
            onClick={() => pick(option.index)}
            className="flex h-[3.6vh] items-center gap-[1vh] rounded-[0.6vh] px-[1vh] text-left text-[1.35vh] text-text-2 transition-colors duration-150 hover:bg-raised hover:text-text active:[transform:scale(0.98)]"
          >
            <span className="flex size-[2.2vh] items-center justify-center rounded-[0.4vh] bg-raised text-[1.1vh] tabular-nums text-text-3">{i + 1}</span>
            <span className="truncate">{option.label}</span>
          </button>
        ))}
      </motion.div>
    </div>
  );
}
