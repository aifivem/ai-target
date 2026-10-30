import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { config, type IconDefinition } from "@fortawesome/fontawesome-svg-core";

// The svg-core CSS is imported in index.css (layer base).
config.autoAddCss = false;

/**
 * Every solid icon by its name: options come from any script (ox_target style `fa-solid fa-store` or `store`). The
 * set is its own chunk, loaded after the overlay starts, so the first frame does not wait for ~1 MB of icons.
 */
let byName: Map<string, IconDefinition> | null = null;
const waiting = new Set<() => void>();
void import("@fortawesome/free-solid-svg-icons").then(({ fas }) => {
  byName = new Map(Object.values(fas).map((icon) => [icon.iconName, icon]));
  for (const done of waiting) done();
  waiting.clear();
});

/** `fa-solid fa-credit-card`, `fas fa-credit-card` or `credit-card` -> the icon; null when unknown or not loaded yet. */
function iconOf(name: string | undefined): IconDefinition | null {
  if (!name || !byName) return null;
  const last = name.trim().split(/\s+/).pop() ?? "";
  return byName.get(last.replace(/^fa-/, "")) ?? null;
}

export function OptionIcon({ name, className }: { name?: string; className?: string }) {
  const [, setLoaded] = useState(byName !== null);
  useEffect(() => {
    if (byName) return;
    const done = () => setLoaded(true);
    waiting.add(done);
    return () => void waiting.delete(done);
  }, []);
  const icon = iconOf(name);
  return icon ? <FontAwesomeIcon icon={icon} className={className} aria-hidden /> : null;
}
