# ai-target

What it does in 1-2 sentences. What it depends on (ai-core, other scripts).

## Decisions

- Why it is built this way; owner decisions; rejected alternatives and why.

## Contracts

- Exports, callback/event names (direction and payload type, pointing at the file in `resource/common/`), state bag keys, DB tables, links to other scripts.

## Pitfalls

- Problems already paid for that reading the code does not reveal.

## Entry points

- For X start at `resource/server/...`.
- For Y in the NUI see `web/src/features/...`.

<!--
Rules (this comment may stay in the copy):
- Delete a section that would stay empty. No file, function or column lists: what reading the code shows does not go here.
- No dates, phases, TODOs or "changed/removed" notes; current truth in imperative form.
- Knowledge about one folder (a subsystem, the NUI) goes into a CLAUDE.md in that folder (resource/server/<topic>/CLAUDE.md,
  web/CLAUDE.md); it loads automatically when a file there is read. This root file keeps what the whole script needs.
-->
