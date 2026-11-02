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
| Nov 1, 2026 | Pistol fires while the mouse button is held, up to 4 shots per second; R reloads; pulling the trigger on an empty magazine reloads automatically | Coding Claude |
| Nov 1, 2026 | Shots are instant hits along the aim line, not travelling bullets | Coding Claude |
| Nov 1, 2026 | Shot tracer line removed. A short bullet now flies to the hit point at 90 m/s and bursts into sparks on impact; it is visual only, damage still lands instantly | Chris asked for it |
| Nov 1, 2026 | Weapon visual upgrade: the pistol and a gloved right hand with a jacket sleeve are built in code from blocks, so there is no downloaded model and nothing to add to ASSET_LICENSES.md. A real CC0 model is still an option for the Phase 4 art pass | Chris asked for it |
| Nov 1, 2026 | The hand was rebuilt from rounded shapes (capsule fingers with knuckles, soft palm, round thumb, tapered forearm) after the first blocky version looked like a slab. It is still a tan glove; a bare skin hand is a one-line color change | Chris asked for it |
| Nov 1, 2026 | Hand redone a second time after Chris said it looked terrible: slimmer fingers, no lump on the back of the hand, a short glove cuff then the green sleeve straight away, and the gun moved out toward the right corner at a smaller scale. Checked at Chris's window size this time | Chris asked for it |
| Nov 1, 2026 | The weapon is drawn in a separate pass on top of the world so it never pokes through walls, with reflections so the metal reads as metal. Gloves are tan and the sleeve olive so the hand separates from the dark gun at night | Coding Claude |
| Nov 1, 2026 | Weapon animation: walk bob, breathing, lag when turning, recoil with the slide kicking back, slide locked back when empty, and a reload where the magazine drops out and a new one slides in | Coding Claude |
| Nov 1, 2026 | Responsiveness pass after Chris's feedback: game ticks raised from 60 to 120 per second, clicks are remembered until the next tick so none are dropped, shot spacing cut from 0.25 to 0.15 seconds, raw mouse input requested | Chris asked for it |
| Nov 1, 2026 | Movement now speeds up and slows down over 0.1 seconds and slides along walls; the picture is drawn between the last two ticks, and mouse turning is drawn immediately without waiting for a tick | Chris asked for it |

---

## Open Questions

- Final name
- Exact checkpoint spot in the Level 0 room
- State sync method for Phase 2: full snapshots or only changes
