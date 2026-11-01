# ai-target

The target eye: markers on entities and zones near the camera, the interaction key picks the focused one, several options open a small menu. Answers the ox_target API under its own name and as `ox_target` (`provide`), so ox_target scripts and lib `Points` (target mode) work on it. Depends on ai-core (interaction key).

## Decisions

- ai-target is the provider: it never uses lib `Points` itself.
- Option icons are any Font Awesome solid name (`fa-solid fa-store`, `fas fa-store` or `store`); the overlay loads the whole solid set as its own chunk after start (`web/src/lib/icon.tsx`), so the first frame stays light.
- Global options (`addGlobalOption`) are not offered: they belong on a radial menu.
- The calling resource is lib `caller()`. Zones are kept per resource in a lib `ByResource` (a stopping resource's zones go in O(its zones)); options on models, entities and global kinds carry their `resource` and are filtered on that resource's stop (one key holds options of several resources, which `ByResource` does not model).

## Contracts

- ox_target exports (zones, models, entities, local entities, global ped / vehicle / object / player options): `resource/client/api.ts`; option shape `resource/common/options.ts`.
- NUI messages and callbacks: `resource/common/nui.ts`.

## Entry points

- Start (scanner, key and exports wired together) `resource/client/target.ts`; exports `resource/client/api.ts`, what is near and in focus `client/scanner.ts` (markers and their usable options `scanPoint.ts`, line of sight `sight.ts`, the overlay list `targetPoints.ts`, the bound key `interactKey.ts`), the key and the menu `client/interaction.ts`.
- Overlay markers, crosshair and focus prompt `web/src/overlay/` (look, focus and positioning: its `CLAUDE.md`), option menu `web/src/menu/OptionMenu.tsx`; preview `bun run webdev` with `?view=target`, `?view=aim` or `?view=menu`.
