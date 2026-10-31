# Overlay: markers, crosshair, focus prompt

Copies tgiann-radialmenu-target's target overlay (owner decision: look and behaviour match it). The page is transparent over the game; nothing here takes the NUI focus.

## Look

- Ambient marker: white ring 1.3vh with a 0.4vh dot, hard 0.1vh black shadow. Its node scales `0.8 + 0.2 * near + 0.15 * closeness` and its opacity is `0.55 + 0.35 * near + 0.1 * closeness` (`near` = 1 - distance / 7 m, `closeness` = 1 - distance to the screen centre / 3 focus radii); out of reach markers at half that opacity. A ring grows in (scale 0.3 to 1, 220 ms) when it appears, comes back on screen or loses the focus, and shrinks away (160 ms) when its marker leaves the list; off screen or under the prompt it hides at once.
- Crosshair: a 0.5vh white dot in the screen centre (150 ms fade) while the aim is within 0.15 screen heights of a marker in reach and nothing is focused.
- Focused marker: the ring is replaced by a 1.8vh white key cap with the bound key (centred on the marker) and the label beside it in Inter 700 italic uppercase 1.6vh. The cap pops in (scale 0.6, 150 ms), the label slides in 0.5vh; when the interaction key takes the marker (`pressed` message) the cap pops to 1.14 and a ring pulses out. The label is the option's label, or `TARGET_OPTIONS` ("3 options") for several, built on the client from the lang file.
- ai-core's interaction key is a press, so tgiann's hold trace around the cap is not drawn.

## Focus

- Sticky focus (`focus.ts`): a marker in reach within 0.02 screen heights of the centre takes the focus (score = centre distance / radius + 0.5 * player distance / 7 m); the focused one stays until it is 2 radii away, another takes over only with a 30 % better score held for 180 ms. The overlay tells the client with the `focus` callback (key or null).

## Positions (compositor-friendly)

- The client sends the marker list only when it changes, and a `frame` message (camera, plus `moves` for markers on peds and vehicles moving faster than 0.05 m/s) every 10 ms only when something moved. The overlay projects with the camera itself (`projection.ts`), so nothing per marker crosses the bridge while the camera turns.
- `useTargetOverlay` runs one rAF layout per change and keeps going only while the camera blend (`cameraSmoother.ts`, blends between samples, snaps on jumps), a marker glide (`positions.ts`, 70 ms between scans; moves snap) or a focus challenger runs. Nodes move with one `translate3d(...) scale(...)` written straight to the style; React renders only when the marker set, the focus or the crosshair changes. Ring enter/exit and the press pop are WAAPI transform/opacity animations on inner elements, never on the positioned node.

## Preview

`bun run webdev`, then `?view=target` (centre marker focused), `?view=aim` (camera turned 3 degrees: crosshair, no focus), `?view=menu`.
