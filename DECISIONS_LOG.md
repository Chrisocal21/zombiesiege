# Zombie Siege — Decisions Log

Decisions made during the build, and every open question.

---

## Decisions

| Date | Decision | Decided By |
|---|---|---|
| Nov 1, 2026 | Folder layout: rules in `src/game`, Three.js in `src/render`, level data in `src/levels`, keyboard and mouse in `src/client`, numbers in `src/config.ts` | Chris accepted the coding Claude's proposal |
| Nov 1, 2026 | Zombies walk straight at the nearest player and slide along anything they bump into; real pathfinding waits for Level 1 | Chris accepted the coding Claude's proposal |
| Nov 1, 2026 | Step Zero: health at 0 restarts the current wave at full health, with no lives system yet | Chris accepted the coding Claude's proposal |
| Nov 1, 2026 | One minimal `index.html` exists because Vite needs it to load the game; no UI is built in HTML | Coding Claude |

---

## Open Questions

- Is the HUD drawn on the canvas, as in Supplyline?
- Final name
- Exact checkpoint spot in the Level 0 room
- State sync method for Phase 2: full snapshots or only changes
