# Zombie Siege (working title) — Project Log

---

## Zombie Siege -- Session 1 -- 2026-11-01

**Status:** Active

---

### What We Decided

- Opened a browser zombie wave shooter as the new main project
- Road Survival shelved, files untouched; Supplyline continues slowly
- Working title: Zombie Siege
- Three.js, first person, desktop only, own Vercel project, free in the browser for now
- Build order: solo first, then 2 players, then 4
- Solo is built as a host with one player, with inputs sent as messages, so co-op adds players instead of rewriting
- Co-op: room code join, host runs the game, a small Cloudflare Worker matches players
- Electron kept as a later desktop or Steam option
- 3 lives per player, one spent per down, refilled each level
- Solo: going down restarts the current wave; 0 lives restarts from wave 1
- Co-op: revive at the halftime checkpoint or with a rare first aid kit, at full health; downed players spectate; both down restarts
- One pistol, unlimited ammo, auto-regen health, one zombie type chasing the nearest player
- Slow wave ramp, timed breaks, 5 waves in Level 0, flat points per kill
- Gritty night, fog, blocky shapes; plain boxes now, CC0 characters later; basic CC0 sound

---

### What Was Learned

- Seeing how fast browser games are to build pulled Chris toward this genre
- Chris wants co-op to give players a reason to stick together, which the revive loop does
- Chris wants short answers and one question at a time, and often takes the Forge recommendation
- Peer-to-peer still needs a go-between to connect home networks, in the browser or in Electron

---

### What Changed

- Shifted from a Krunker-style competitive idea to co-op wave survival
- Road Survival moved from active to shelved
- Build order changed from co-op in Step Zero to solo first; co-op work moved to Phase 2

---

### Open Questions Added

- Final name
- Checkpoint spot in the Level 0 room
- HUD drawn on the canvas or not
- State sync method (coding Claude's call)

---

### Open Questions Closed

- Scope, build order, co-op connection, lives, solo death, revive, checkpoint, combat, waves, look, sound, release plan, Electron, build approach

---

### Progress Updates

- Project created at 0%. Pre-production, Step Zero, and Phases 1 to 4 defined, 41 tasks total

---

### Documents Updated

- ZOMBIESIEGE_FEATURE_MAP.md — created, reviewed, updated for solo-first
- ZOMBIESIEGE_PROGRESS_TRACKER.md — created, reviewed, updated for solo-first
- ZOMBIESIEGE_OPEN_QUESTIONS.md — created, reviewed, updated for solo-first
- ZOMBIESIEGE_PROJECT_LOG.md — created
- ZOMBIESIEGE_HANDOFF_BRIEF.md — created, reviewed, updated for solo-first

---

### Next Session

Give the Handoff Brief to the coding Claude, get a blank Three.js scene running, and start the solo Step Zero.

---

## Build Rules

- No HTML in any output
- No emojis in any output
- SVG icons only when genuinely needed
