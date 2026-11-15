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

## What to Tackle Next (updated Nov 14, 2026)

Done and committed but not pushed: silencers (238b1ea), hospital rescue ambulances and varied street cars (3734142), elevator stays open on arrival (latest commit). Loading screen is pushed.

Open, in suggested order (one phase each, compact between):

- [x] Zombie clothing (done, not yet seen in game): the surgical mask floats under the chin and shirts read as paper panels (Sonnet, medium)
- [x] Pharmacy and medical supplies (done: med-loose.glb items restock shelf gaps and cart tops, spill on counters and desks; no boxes on shelving above 1.9 m; crash cart oxygen bottle moved to the side): place health items (bandages, IV bags, syringes, first-aid kits) individually on shelves, counters and carts; fix ceiling boxes sitting on shelves and signs (Opus, high)
- [x] Park upgrade: textured lawn and gravel paths with stone kerbs (no more flicker where they overlapped), a fountain plaza, park benches facing the paths, flower beds along the hedges, iron lantern posts (were wall brackets in mid-air), a plank shed with a pitched roof (was a crate stack), a bandstand with steps, posts and a roof, gates hung open in front of the hedge (Nov 14)
- [x] Roof upgrade: vents, pipes, lights, a better skyline; the roof is dark and bare (Sonnet, medium)
- [x] Apartment streets: Final Push (Old Town) has four kerbed lawn islands with park benches and shrubs down the middle of the road, in the gaps between the barriers (the road stays open)
- [ ] Garage ambulances (level0.ts): look at them in the game; they were never seen rendered
- [x] Check-flow: the Pharmacy has one extra walker after a team wipe with the lift open; the check was loosened, find the cause and restore the strict count
- [ ] Optional manual lift control: a button to open and close the doors by hand (the doors now only shut on the ride)
- [ ] Play the roof finale and the loading screen on a real graphics card
- [x] Co-op: teammates' shots are heard (panned, falling off with distance) and drawn as tracers; admin tools act on the player who opens the menu
- [ ] Co-op: balance tuning needs a playtest
- [ ] Character phase: the survivor zip (re-download). Amber done (first rescued survivor); her walk and the hiding crouch are unseen. Ghillie soldier done: the crew wears it in co-op, a half-gear version is on a third of the infected at Checkpoint and the barricades; animation unseen, and the co-op teammate look is unseen. Mutant done: it is the brute's body (rigged by `tools/blender/rig_mutant.py`); still to see: how it walks and swings in play, and the boss Patient O wearing it
- [x] The three failing checks fixed (admin list, melee skipped while melee is off, ramp excludes the El Cajon bay)
- [ ] Lore: note texts, town names and the evacuation map text are draft wording awaiting approval

---

## Build Rules

- No HTML in any output
- No emojis in any output
- SVG icons only when genuinely needed

## Next acts (from `ZOMBIE_SIEGE_MASTER_CAMPAIGN_HANDOFF_v2.md`, Acts 5 to 12 are working expansion)

Order of work chosen Nov 14, 2026: bugs first (done), then co-op gaps, then the optional features, then the acts.
- [x] Act 5 slice 05-C built (floor 21, camp.ts, check-camp.mjs): siege through four fence gaps, dark floodlights until two generators are thrown, lift ends the run. Wave-3 fall-back call and the last-push call are radio cues (new cue kind wave); the inner fence gate is the chokepoint. Still to do: a real fence breach and assigning defenders
- [x] Act 5 slice 05-B built (floor 21, delivery.ts, check-delivery.mjs): sweep road, three cases to carry to the gate drop-off, three bus survivors to bring out. The camp siege is now floor 22. Still to do: the cargo-versus-people choice has no consequence in the camp yet
- [x] Act 5 slice 05-A built (floor 21, inventory.ts, check-inventory.mjs): quiet camp, four facility checks that light the camp, ledger cards as readable notes. Order is now 05-A, 05-B, 05-C (floors 21 to 23). Still to do: a choice of first repair with consequences, a returning-survivors meeting
- [ ] Act 5, Last Refuge, built as three slices, each from existing mechanics: 05-C the camp siege first (reuses the park's siege waves, adds a generator to repair and a fall-back yard), then 05-B The Missing Delivery (a search run with a cargo-versus-people choice), then 05-A Inventory of the Living (the quiet camp: needs a small ledger screen, so it comes last)
- [x] Act 6 slice 06-B built (floor 24, fuelYard.ts, check-fuel.mjs): two power cabinets then a held fuel transfer; it is the last floor built. 06-A and 06-C need a vehicle controller (the biggest open item)
- [x] Act 7 slice 07-B built (floor 25, highGround.ts, check-relay.mjs): storm relay, power then a held antenna alignment; it is the last floor built. The checks now find Act 5 floors through LAST_REFUGE and do not depend on LAST_FLOOR
- [ ] Act 6 06-A and 06-C, Act 7 07-A and 07-C, then Acts, 8 Blackwater, 9 Fault Lines, 10 Ghost Signal, 11 Ground Zero, 12 First Light: outlined in the handoff, none built
- [ ] Needs you: the survivor zip (re-download) and lore approval of the draft wording

