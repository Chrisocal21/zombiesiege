# Zombie Siege (working title): Handoff Brief

Date: 2026-11-01. Give this file to the coding Claude in VS Code, with ZOMBIESIEGE_FEATURE_MAP.md.

---

## Read This First

- The planning chat that wrote this has NOT seen any code. No repo exists yet.
- DECIDED means Chris settled it. Do not reopen it.
- If something is not specified, say "not specified" and ask. Do not invent mechanics.
- Placeholder numbers are fine, but they go in one config file and get listed for Chris.

---

## Working With Chris

- Solo developer with ADHD. Relies on AI for implementation, wants to stay in control.
- Short, plain replies. One step at a time. One question at a time.
- Explain a new idea simply the first time it comes up.
- No emojis anywhere.
- Commit small and often. Stop at the end of each stage, summarize in under 10 lines, and wait for his go-ahead.
- At the end of each session, write a short summary markdown he can paste back into his planning chat.

---

## What This Is

A browser zombie wave shooter. Krunker.io look, COD Zombies loop. First person, full 3D, desktop only. Free in the browser for now.

**Build order (DECIDED):** 1 player first, then 2, then 4. Right now you are building the solo game only.

---

## Stack (DECIDED)

- TypeScript, Vite, Three.js
- localhost:3000
- Git and GitHub, new repo
- Vercel, its own project
- Later, for co-op: Cloudflare Durable Objects: one per room code, running the real game on the server, with players connected over WebSockets. Not needed until Phase 2. (Replaced WebRTC peer-to-peer on Nov 3, 2026.)

---

## The Rule That Keeps Co-op Cheap (DECIDED)

Build the solo game as a host with one player.

- One game state holds zombies, waves, points, and lives.
- Keyboard and mouse go into that state as input messages, not straight into the player object.
- Adding player 2 later means adding a second input source, not rewriting the game.

If something about this makes solo harder than it should be, tell Chris before working around it.

---

## Architecture (DECIDED)

- Game rules are plain TypeScript, separate from rendering, testable without a browser.
- Levels are data files: boxes (position, size, color), player spawns, zombie spawns, one checkpoint, and an optional first aid kit spot.
- All tuning numbers live in one config file.
- Player count is a setting, not hardcoded.

---

## Solo Rules (DECIDED)

- One pistol, unlimited ammo, reload
- One zombie type, chases the nearest player
- Health auto-regenerates after a few seconds without damage
- Slow wave ramp, timed break between waves
- Level 0 has 5 waves; clearing them wins the level
- Flat points per kill; nothing to buy in Level 0
- 3 lives; going down spends one and restarts the current wave; 0 lives restarts from wave 1
- Lives refill to 3 at the start of each level
- Win screen, then a menu to replay or pick the next level

Co-op rules (checkpoint revive, first aid kit, spectating) are in the Feature Map under Phase 2. Do not build them yet.

---

## Look and Sound (DECIDED)

- Gritty night, fog, blocky shapes
- Plain boxes for now; free CC0 characters later
- CC0 sound clips in Phase 1: gunshot, groan, hit
- Log every asset's license in ASSET_LICENSES.md

---

## Not Specified (ask Chris)

- Zombie movement around obstacles. Propose the simplest approach that works in one small room.
- Whether the HUD is drawn on the canvas, as in his other game, Supplyline.

---

## Step Zero: Solo Loop (build nothing else until this holds up)

1. Scaffold the repo; blank Three.js scene on localhost:3000.
2. Level file format and one config file for numbers.
3. Load one small room from the level file.
4. Host-owned game state fed by input messages.
5. First person movement and mouselook.
6. Pistol: shoot and reload.
7. One zombie that chases the player and hits.
8. Waves with a slow ramp and timed break.

**Done when:** Chris plays waves 1 to 5 and wants another run.

**Not in Step Zero:** lives, points display, win screen, menu, sound, real art, any networking.

---

## Your First Reply to Chris

- The folder layout you propose
- How you will set up the input-message rule, in plain words
- The one question you most need answered

Do not start building until Chris agrees.

---

## Keep in the Repo

- DECISIONS_LOG.md: anything you decided that Chris did not, and every open question
- ASSET_LICENSES.md: source and license for every model, texture, and sound
