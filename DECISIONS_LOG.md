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
| Nov 1, 2026 | The HUD is drawn on a 2D canvas layered over the 3D view | Chris accepted the coding Claude's proposal |
| Nov 1, 2026 | Level 0 room is 20 by 20 meters with 4 meter walls and two crates; zombies spawn in the corners | Coding Claude |
| Nov 1, 2026 | Level 0 checkpoint is a placeholder at the north wall until the real spot is chosen | Coding Claude |
| Nov 1, 2026 | Wave sizes are 3, 5, 7, 9, 12, with all tuning numbers placeholders in `src/config.ts` | Coding Claude |

| Nov 1, 2026 | Game runs on a fixed 60 ticks per second, separate from the screen frame rate | Coding Claude |
| Nov 1, 2026 | Mouse look is sent as turn amounts per tick, not absolute angles, so a networked player can send the same message | Coding Claude |
| Nov 1, 2026 | Click the game to capture the mouse; Esc releases it | Coding Claude |

---

## Open Questions

- Final name
- Exact checkpoint spot in the Level 0 room
- State sync method for Phase 2: full snapshots or only changes
