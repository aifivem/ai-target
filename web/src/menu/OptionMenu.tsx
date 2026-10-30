import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { fetchNui, useNuiEvent } from "fivem-nui-react"
import {
  NuiCallback,
  NuiMessage,
  type MenuOption,
} from "../../../resource/common/nui"
import { mockMenu } from "../dev/mock"

const OPEN_OPTIONS = { mockData: mockMenu(), mockDelay: 200 }
/** glide(0.25, 0.1) from tgiann-ui nui-performance: compositor tween. */
const ENTER = {
  type: "tween",
  duration: 0.22,
  ease: [0.229, 0.098, 0.248, 0.985],
} as const

function toMenu(
  value: unknown
): { title: string; options: MenuOption[] } | null {
  if (typeof value !== "object" || value === null) return null
  const { title, options } = value as { title?: unknown; options?: unknown }
  if (!Array.isArray(options)) return null
  const list = options.filter(
    (o): o is MenuOption =>
      typeof o === "object" &&
      o !== null &&
      typeof (o as MenuOption).index === "number" &&
      typeof (o as MenuOption).label === "string"
  )
  return { title: typeof title === "string" ? title : "", options: list }
}

/** Several options on one target: a small list in the middle; a click or its number picks, Esc closes. */
export function OptionMenu() {
  const [menu, setMenu] = useState<{
    title: string
    options: MenuOption[]
  } | null>(null)

  useNuiEvent(
    NuiMessage.openMenu,
    (value: unknown) => setMenu(toMenu(value)),
    OPEN_OPTIONS
  )
  useNuiEvent(NuiMessage.closeMenu, () => setMenu(null))

  const pick = (index: number) => {
    setMenu(null)
    void fetchNui<boolean>(NuiCallback.select, index, { mockData: true })
  }

  useEffect(() => {
    if (!menu) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(null)
        void fetchNui<boolean>(NuiCallback.closeMenu, undefined, {
          mockData: true,
        })
      }
      const number = Number(event.key)
      const option =
        Number.isInteger(number) && number > 0
          ? menu.options[number - 1]
          : undefined
      if (option) pick(option.index)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [menu])

  if (!menu) return null
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, transform: "scale(0.96)" }}
        animate={{ opacity: 1, transform: "scale(1)" }}
        transition={ENTER}
        className="flex w-[38vh] flex-col gap-[1.2vh] rounded-[1.4vh] p-[1.5vh] [box-shadow:0_0_0_0.1vh_rgba(255,255,255,0.08),inset_0_0.1vh_0_rgba(255,255,255,0.06)] [background:linear-gradient(0deg,rgba(0,0,0,0.8),rgba(0,0,0,0.8)),linear-gradient(rgba(94,94,94,0.1),rgba(94,94,94,0.1))]"
      >
        {menu.title && (
          <p className="truncate pt-[0.3vh] font-display text-[1.8vh] leading-[1.2] tracking-[-0.01em] text-white uppercase">
            {menu.title}
          </p>
        )}
        <div className="flex flex-col gap-[0.2vh]">
          {menu.options.map((option, i) => (
            <button
              key={option.index}
              type="button"
              onClick={() => pick(option.index)}
              className="group flex h-[4vh] w-full items-center gap-[1.2vh] rounded-[0.8vh] px-[1vh] text-left transition-colors duration-150 hover:bg-white/6 active:bg-white/10"
            >
              <span className="min-w-0 grow truncate text-[1.4vh] leading-[1.3] font-semibold text-white">
                {option.label}
              </span>
              <span className="flex size-[2.4vh] shrink-0 items-center justify-center rounded-[0.5vh] bg-tgi-green-20 text-[1.2vh] font-bold text-tgi-green tabular-nums transition-colors duration-150 group-hover:bg-tgi-green group-hover:text-tgi-green-text">
                {i + 1}
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
