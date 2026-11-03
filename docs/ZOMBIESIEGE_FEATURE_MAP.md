# Zombie Siege (working title) — Feature Map

> Browser zombie wave shooter. Krunker.io look, COD Zombies loop. First person, full 3D, Three.js, desktop only. Built solo first, then 2-player co-op, then 4. Opened Nov 1, 2026 as Chris's main project. Road Survival is shelved, Supplyline continues slowly.
> Tags: [stated] Chris said it. [agreed] Chris accepted a Forge recommendation. [open] not decided yet.

---

## The Idea

Hold out against waves of zombies in a dark, foggy, blocky world. Kill zombies for points and survive the set number of waves to clear the level. Later, a friend joins: if they go down, you fight your way to the halftime checkpoint, or find the rare first aid kit, to bring them back.

**Core loop:** survive a wave, take the timed break, survive the next, clear the level.

**Build order:** [stated] 1 player first, then 2, then 4.

**Differentiator:** every level has its own layout and personality. Levels are data files, so new maps are cheap.

---

## Level 0 at a Glance (Solo)

| Item | Level 0 |
| --- | --- |
| Map | A parking garage and loading dock under a tower, reached from the street by a ramp and a metal gate, built from a level data file |
| Players | 1 (2 in Phase 2) |
| Weapon | One pistol, unlimited ammo, reload |
| Zombies | One type, chases the nearest player |
| Waves | 5, slow ramp, timed break between |
| Lives | 3; going down spends one and restarts the current wave |
| Points | Flat per kill, count only, nothing to buy |
| Win | Clear wave 5, win screen, back to menu |

---

## Locked Decisions

### Platform and Tech

- [stated] Browser game, desktop only, keyboard and mouse
- [stated] Three.js, full 3D world, first person camera
- [agreed] TypeScript + Vite, localhost:3000
- [agreed] Own Vercel project, linked from the Probably Fine Studios site later
- [agreed] Free in the browser for now; a paid path stays open
- [agreed] Electron is a later option for a desktop or Steam version, same code

### Players and Co-op

- [stated] Build order: 1 player, then 2, then 4
- [agreed] The solo game is built as a host with one player, so co-op adds players instead of rewriting
- [stated] Join by room code from the host (Phase 2)
- [agreed] Host-authoritative: the host runs the real game; other players send inputs and see the host's result
- [agreed] Cloudflare Durable Objects: one per room code, running the real game on the server, with players connected over WebSockets. Solo keeps running in the browser with no server. (Replaced WebRTC peer-to-peer on Nov 3, 2026)

### Lives

- [stated] 3 lives per player
- [agreed] A life is spent each time you go down; lives refill to 3 at the start of every level
- [agreed] Solo: going down restarts the current wave; at 0 lives, restart from wave 1

### Co-op Revive (Phase 2)

- [agreed] A downed player waits and spectates their partner
- [stated] The survivor reaches the checkpoint to revive the partner
- [agreed] The checkpoint opens at halftime (after the middle wave)
- [stated] A rare first aid kit revives a partner on the spot; only some levels have one
- [agreed] The kit sits at a fixed spot set in the level file
- [agreed] Revived players return at full health
- [stated] Both down at once, or both out of lives: restart from wave 1

### Combat and Waves

- [stated] One pistol in Level 0
- [agreed] Unlimited ammo with a reload
- [agreed] Auto-regenerating health after a few seconds without damage
- [agreed] One zombie type; zombies chase the nearest player
- [agreed] Slow wave ramp, timed break between waves
- [agreed] A level is a set number of waves; Level 0 has 5
- [agreed] Flat points per kill; points only count up in Level 0
- [agreed] Win screen, then a menu to replay or pick the next level
- [stated] Dual wielding: a player can pick up a second weapon, such as another pistol or a sawed-off shotgun, and hold one in each hand (Phase 3)

### Look and Sound

- [agreed] Gritty night, fog, blocky shapes
- [agreed] Plain boxes first; free CC0 characters (Quaternius, Kenney) later
- [agreed] Basic CC0 sound effects: gunshot, zombie groan, hit

---

## Core Architecture Principles

- **The host owns the game.** Zombies, waves, points, and lives live in one game state. Solo, you are the host.
- **Inputs are messages.** Even solo, keyboard and mouse go into the game state as input messages, not straight into the player. Adding a second player means adding a second input source.
- **Rules separate from graphics.** Game rules are plain TypeScript and can be tested without a browser.
- **Levels are data.** A level file holds boxes, player spawns, zombie spawns, the checkpoint, and an optional kit spot.
- **Numbers live in one config file.** Wave sizes, break length, damage, regen delay, and points per kill are placeholders until playtested.
- **Player count is a setting.** 1, 2, or 4 is a number change.

---

## Step Zero — Solo Loop

**Goal:** plain boxes, one pistol, chasing zombies, waves 1 to 5.

- One small room loaded from a level file
- First person movement and mouselook
- Pistol with shoot and reload
- Zombies that chase and hit
- Waves with a slow ramp and timed break
- Host-owned game state fed by input messages

**Done when:** Chris plays waves 1 to 5 and wants another run.

---

## Phase 1 — Solo Level 0 Complete

- 3 lives; going down restarts the current wave
- Auto-regen health and a points counter
- Level cleared after wave 5, win screen, menu
- Basic sound effects
- [stated] Level flow: the players start in the street, run across it and down a ramp into the garage, and close the metal gate behind them. Closing the gate starts the 30 second countdown to choose which doors to block, and wave 1 follows. The boards are permanent, so the door choice is a strategy
- [stated] Between waves is a rest of 20 to 30 seconds, long enough for buying weapons and moving on once those exist
- [stated] Each level is a floor higher up the tower, ending on the roof where the players are airlifted out by helicopter
- [stated] A studio-quality HUD and menus: title screen, pause menu, rebindable keys, settings
- [stated] Doorways and boards: zombies come out of four doorways. Two bundles of boards lie on the floor to be found, and in the opening 30 seconds the player boards up two of the four doors, so the waves have to use the other two
- [stated] Movement and cover: lean left and right while aiming (Q and E), crouching, jumping, climbing onto boxes and other objects, ladders, and standing with your back to a wall and peeking round the edge to shoot

---

## Phase 2 — Two Players

- Cloudflare Durable Objects: one per room code, running the real game on the server, with players connected over WebSockets
- Second player joins and sees the same zombies in the same places
- Downed state and spectate camera
- Halftime checkpoint revive and first aid kit
- Restart when both are down or out of lives
- Real internet testing and disconnect handling

**Done when:** Chris and a friend play Level 0 together without the screens disagreeing.

---

## Phase 3 — Level 1 and Spending

- First real map with multiple areas
- Doors that cost points
- Weapon stations on walls
- More weapons and limited ammo, once stations exist
- Dual wielding: a second pistol or a sawed-off shotgun in the left hand
- More zombie types, added as data

---

## Phase 4 — Four Players and Polish

- 4-player support
- Real CC0 characters and animations
- More levels, each with its own personality
- Audio pass
- Bonus points for headshots and fast kills
- Electron desktop or Steam version, if wanted

---

## Things Considered and Set Aside

| Idea | Why It Was Set Aside |
| --- | --- |
| Competitive PvP like Krunker | Needs cheat-proofing and tight lag handling; AI zombies avoid both |
| Co-op from the very first build | Gets to fun faster solo; host-with-one-player design keeps co-op cheap later |
| Electron to skip the matching server | Electron still needs a go-between to connect two home networks |
| Third person camera | More to build, and it shows rough animations |
| Mobile support | Aiming on a phone is hard to get right |
| Shared pool of lives | Per-player lives are easier to read |
| Revive in place | Weakens the halftime checkpoint |
| Kit as a random zombie drop | Can feel unfair; fixed spots keep levels designed |
| Lives carry over between levels | Each level should be tuned on its own |
| Instant game over in solo | Respawning on a life matches the co-op rules |
| Endless waves | Levels need a finish line |
| Health pickups | Auto-regen is less to build |

---

## Ideas in the Backlog

- Headshot and fast-kill bonuses
- Zombie types: fast, tank
- Perks bought with points
- More weapons
- Leaderboards per level
- Mobile mode later if wanted

---

## Build Rules

- No HTML in any output
- No emojis in any output
- SVG icons only when genuinely needed
