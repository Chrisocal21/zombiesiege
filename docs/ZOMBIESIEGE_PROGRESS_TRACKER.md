# Zombie Siege (working title) — Progress Tracker

---

## Zombie Siege

**Overall progress:** 35% (17/48)
**Last updated:** November 1, 2026
**Status:** Active, main project
**Build order:** solo first, then 2 players, then 4

---

### Pre-Production

**Progress:** 50% (2/4)

- [ ] Create new GitHub repo
- [x] Scaffold TypeScript + Vite + Three.js on localhost:3000
- [ ] Create Vercel project and confirm a blank page deploys
- [x] Add DECISIONS_LOG.md and ASSET_LICENSES.md to the repo

---

### Step Zero — Solo Loop

**Progress:** 100% (8/8)
**Done when:** Chris plays waves 1 to 5 and wants another run.

- [x] Level file format (boxes, player spawns, zombie spawns, checkpoint, kit spot)
- [x] One config file for all tuning numbers
- [x] Load and render one small room from the level file
- [x] Host-owned game state fed by input messages, separate from rendering
- [x] First person movement and mouselook
- [x] Pistol: shoot and reload
- [x] Zombie that chases the nearest player and hits
- [x] Waves: slow ramp and timed break

---

### Phase 1 — Solo Level 0 Complete

**Phase progress:** 50% (7/14)

#### Feature 1.1 — Lives and Survival
**Progress:** 33% (1/3)
- [ ] 3 lives; going down restarts the current wave; 0 lives restarts from wave 1
- [x] Auto-regenerating health
- [ ] Points per kill, counter on screen

#### Feature 1.2 — Level Flow
**Progress:** 0% (0/3)
- [ ] Level 0 cleared after wave 5
- [ ] Win screen
- [ ] Menu: replay or next level

#### Feature 1.3 — Sound
**Progress:** 0% (0/2)
- [ ] Gunshot, groan, and hit clips (CC0)
- [ ] Each clip's license logged in ASSET_LICENSES.md

#### Feature 1.4 — Movement and Cover
**Progress:** 100% (6/6)
- [x] Lean left and right while aiming (Q and E), stopped by walls
- [x] Crouching
- [x] Jumping
- [x] Climbing onto boxes and other objects
- [x] Ladders
- [x] Back-to-wall cover: peek round the edge and shoot

---

### Phase 2 — Two Players

**Phase progress:** 0% (0/10)
**Done when:** Chris and a friend play Level 0 together without the screens disagreeing.

#### Feature 2.1 — Connecting
**Progress:** 0% (0/3)
- [ ] Cloudflare Worker that matches players by room code
- [ ] Host creates a room, friend joins with the code
- [ ] Both players see the same zombies in the same places

#### Feature 2.2 — Co-op Revive
**Progress:** 0% (0/5)
- [ ] Downed state with spectate camera on the partner
- [ ] Checkpoint that opens after the middle wave
- [ ] Checkpoint revive at full health
- [ ] First aid kit pickup that revives on the spot
- [ ] Restart when both are down or out of lives

#### Feature 2.3 — Hardening
**Progress:** 0% (0/2)
- [ ] Play over real internet connections
- [ ] Handle a disconnect mid-game

---

### Phase 3 — Level 1 and Spending

**Phase progress:** 0% (0/6)

- [ ] Level 1 map with multiple areas
- [ ] Doors that cost points
- [ ] Weapon stations
- [ ] More weapons and limited ammo
- [ ] Dual wielding: second pistol or sawed-off shotgun
- [ ] More zombie types as data

---

### Phase 4 — Four Players and Polish

**Phase progress:** 0% (0/6)

- [ ] 4-player support
- [ ] Real CC0 characters and animations
- [ ] More levels
- [ ] Audio pass
- [ ] Headshot and fast-kill bonuses
- [ ] Electron desktop or Steam version, if wanted

---

## Session Update Log

| Date | What Moved | New Overall |
|---|---|---|
| Nov 1, 2026 | Project opened, working title set, design settled, plan and handoff brief written | 0% |
| Nov 1, 2026 | Build order changed to solo first, then 2, then 4; co-op work moved to Phase 2 | 0% |
| Nov 1, 2026 | Project scaffolded on localhost:3000; DECISIONS_LOG.md and ASSET_LICENSES.md added | 5% |
| Nov 1, 2026 | Level file format, Level 0 room data, and config file added | 10% |
| Nov 1, 2026 | Level 0 room renders from the level file with night lighting and fog | 12% |
| Nov 1, 2026 | Game state, input messages, walking with wall and crate collision, mouselook, canvas HUD | 17% |
| Nov 1, 2026 | Pistol: shooting, reloading, ammo on the HUD, gun in view with flash and tracer | 20% |
| Nov 1, 2026 | Weapon visuals: real hand model, redrawn pistol, shadows. Dual wielding added to Phase 3 | 19% |
| Nov 1, 2026 | Aim down sights, fisheye, bullet look, trigger and reload animation. Lean (Q and E) built. Five more movement and cover tasks added to Phase 1 | 19% |
| Nov 1, 2026 | Crouch, jump, ledge climbing, ladders and cover built. Zombies, waves and health regeneration built. Level 0 rebuilt with textured materials, lamps, props and a night sky | 35% |

---

## What to Tackle Next

- [ ] Hand the Handoff Brief and Feature Map to the coding Claude
- [ ] Get a blank Three.js scene running on localhost:3000
- [ ] Start Step Zero: load one room from a level file

---

## Build Rules

- No HTML in any output
- No emojis in any output
- SVG icons only when genuinely needed
