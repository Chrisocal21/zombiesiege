# Zombie Siege (working title) — Progress Tracker

---

## Zombie Siege

**Overall progress:** 67% (38/57)
**Last updated:** November 3, 2026
**Status:** Active, main project
**Build order:** solo first, then 2 players, then 4

---

### Pre-Production

**Progress:** 100% (4/4)

- [x] Create new GitHub repo
- [x] Scaffold TypeScript + Vite + Three.js on localhost:3000
- [x] Create Vercel project and confirm a blank page deploys
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

**Phase progress:** 95% (19/20)

#### Feature 1.1 — Lives and Survival
**Progress:** 100% (3/3)
- [x] 3 lives; going down restarts the current wave; 0 lives restarts from wave 1
- [x] Auto-regenerating health
- [x] Points per hit, kill and headshot (headshots kill outright), counter on screen

#### Feature 1.2 — Level Flow
**Progress:** 100% (3/3)
- [x] Floor cleared after wave 5; the elevator opens and rides up to the next floor
- [x] Win screen at the top of the tower
- [x] Menu: back to title from the win screen

#### Feature 1.3 — Sound
**Progress:** 50% (1/2)
- [x] Gunshots, groans, hits, reloads, elevator and purchases, synthesized in the browser with a volume setting (no clip files, so no licenses)
- [ ] Tune the sounds, or swap in real CC0 clips later

#### Feature 1.4 — Movement and Cover
**Progress:** 100% (6/6)
- [x] Lean left and right while aiming (Q and E), stopped by walls
- [x] Crouching
- [x] Jumping
- [x] Climbing onto boxes and other objects
- [x] Ladders
- [x] Back-to-wall cover: peek round the edge and shoot

#### Feature 1.5 — Doorways and Boards
**Progress:** 100% (3/3)
- [x] Start in the street, run down a ramp, and close the metal gate; closing it starts the 30 second countdown
- [x] Zombies come out of four doorways in the walls
- [x] Two bundles of boards on the floor; board up two of the four doors in the 30 second countdown, forcing the waves through the other two

#### Feature 1.6 — Menu and HUD
**Progress:** 100% (3/3)
- [x] Title screen and pause menu
- [x] Controls screen where every key and mouse button can be rebound, and a settings screen
- [x] Studio-quality HUD: compass, radar, health, ammo, prompts, hit markers, damage direction, banners

---

### Phase 2 — Two Players

**Phase progress:** 0% (0/10)
**Done when:** Chris and a friend play Level 0 together without the screens disagreeing.

#### Feature 2.1 — Connecting
**Progress:** 0% (0/3)
- [ ] Cloudflare Durable Object per room code that runs the game; players connect over WebSockets
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

**Phase progress:** 78% (7/9)

- [x] Level 1 map with multiple areas (floor 3 admissions)
- [x] Climb the tower: floors 3, 6, 9, 12 and the roof each have their own hospital layout, ending with the air ambulance on the helipad
- [x] Floor objectives: keycard, breakers, charge hold, lamp cases, and the helipad lights on the roof
- [x] Doors that cost points (floor 3: records room 250, manager's office 500)
- [x] Weapon stations: ammo locker and a sawed-off shotgun wall
- [x] More weapons and limited ammo: spare rounds per gun, pistol and sawed-off shotgun (more guns later)
- [x] Melee weapons and weapon slots
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
| Nov 1, 2026 | Four doorways with dark alcoves behind them, two bundles of boards to find, 30 second opening to board up two doors, P to freeze the zombies for testing | 38% |
| Nov 1, 2026 | Level 0 rebuilt as a parking garage under a tower, with a street, ramp and gate; waves rest 25 seconds; title and pause menu with rebindable keys and settings; new HUD | 42% |
| Nov 2, 2026 | Floor 3 admissions: lobby, office, records room and manager's office, doors that cost points, keycard objective, zombie pathfinding round walls | 58% |
| Nov 2, 2026 | Elevator and floors, lives, points, headshot kills, synthesized sound, win screen, limited ammo with an ammo station, and a buyable sawed-off shotgun with weapon swap | 56% |
| Nov 2, 2026 | Hospital floors 6, 9 and 12 and the roof, furniture, floor objectives and the air ambulance finale; new title flow, HUD redesign, photosensitivity warning; zombies rush every door at prep | 64% |
| Nov 3, 2026 | Melee weapons, weapon slots and a shotgun model. Story written up in docs/LORE.md. Floor 6 now goes properly dark in the blackout. Repo and Vercel confirmed | 67% |

---

## What to Tackle Next

- [ ] Play the roof finale on a real graphics card
- [ ] Start Phase 2: split the main loop into local (solo) and server (co-op), then the server skeleton on localhost
- [ ] Optional, any time: small Act 1 story touches from docs/LORE.md (opening text card, patient files, people saved, radio call after the extraction)

---

## Build Rules

- No HTML in any output
- No emojis in any output
- SVG icons only when genuinely needed
