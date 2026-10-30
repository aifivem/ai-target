# ai-target

The target eye: markers on entities and zones near the camera, the interaction key picks the focused one, several options open a small menu. Answers the ox_target API under its own name and as `ox_target` (`provide`), so ox_target scripts and lib `Points` (target mode) work on it. Depends on ai-core (interaction key).

## Decisions

- ai-target is the provider: it never uses lib `Points` itself.
- Option icons are any Font Awesome solid name (`fa-solid fa-store`, `fas fa-store` or `store`); the overlay loads the whole solid set as its own chunk after start (`web/src/lib/icon.tsx`), so the first frame stays light.
- Global options (`addGlobalOption`) are not offered: they belong on a radial menu.

## Contracts

- ox_target exports (zones, models, entities, local entities, global ped / vehicle / object / player options): `resource/client/api.ts`; option shape `resource/common/options.ts`.
- NUI messages and callbacks: `resource/common/nui.ts`.

## Entry points

- Exports `resource/client/api.ts`, what is near and in focus `client/scanner.ts`, the key and the menu `client/interaction.ts`.
- Overlay markers `web/src/overlay/Overlay.tsx`, option menu `web/src/menu/OptionMenu.tsx`; preview `bun run webdev` with `?view=target` or `?view=menu`.
