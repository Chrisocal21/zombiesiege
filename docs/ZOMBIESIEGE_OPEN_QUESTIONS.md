# Zombie Siege (working title) — Open Questions

---

## Still Open

| Question | Why It Matters | Forge Lean |
|---|---|---|
| Final name | Zombie Siege is a working title; the repo and domain depend on it | Keep the working title until the game is fun |
| Exact checkpoint spot in the Level 0 room | Needed for the Level 0 file before Phase 2 | Decide while sketching the room |
| Is the HUD drawn on the canvas, as Supplyline does? | Matches Chris's no-HTML rule for UI | Yes; coding Claude to confirm the cost |
| State sync: full snapshots or only changes? | Shapes the Phase 2 networking build | Start with full snapshots from the server 20 to 30 times a second; send only changes later if they are too big |
| Can zombies reach a player standing high up? | Right now a player on a crate or the container roof is out of reach, so camping up there wins every wave. Options: zombies climb ladders and crates too, or the high spots get a limit | Let zombies climb crates and ladders in Phase 3; keep high spots safe for now, and see if it spoils Level 0 |
| Do zombies chase the players in the street? | Right now the street is empty, so closing the gate is only a short run. A few chasing zombies would make the gate urgent | Add a handful that start far down the road and walk at you |
| How many levels, and what is each floor? | The tower climbs to the roof and a helicopter airlift. Level 0 is the garage. The floors in between, and how a level ends (a stairwell, a lift), are not planned | Plan in Phase 3 once Level 0 has been played |
| How does buying work between waves? | The rest between waves is now 25 seconds for it. Wall stations are planned for Phase 3 | Decide with Phase 3 |
| Is the cover mode as wanted? | Built as F to stick to a wall or barrier, slide along it, and lean without aiming. Low barriers make you duck on your own | Play it, then adjust |
| How do you get the second weapon for dual wielding? | Chris said "pick up"; the plan so far is wall stations that cost points. Fixed spots, zombie drops, and stations each play differently | Decide in Phase 3; zombie drops were set aside for the first aid kit as unfair |

---

## Answered

| Question | Answer | Session |
|---|---|---|
| What kind of project? | Browser zombie wave shooter: Krunker.io look, COD Zombies loop | Nov 1, 2026 |
| Real project or Inbox? | Real project, the new main one; Road Survival shelved, Supplyline slow | Nov 1, 2026 |
| Name? | Zombie Siege, working title | Nov 1, 2026 |
| Engine and world? | Three.js, full 3D | Nov 1, 2026 |
| Camera? | First person | Nov 1, 2026 |
| Devices? | Desktop only | Nov 1, 2026 |
| Where does it live? | Own Vercel project | Nov 1, 2026 |
| Release plan? | Free in the browser for now; paid path stays open | Nov 1, 2026 |
| Electron? | Works for the game but still needs a matching server; kept as a later desktop or Steam option | Nov 1, 2026 |
| Assets? | Plain boxes first, free CC0 characters later | Nov 1, 2026 |
| Build order? | Solo first, then 2 players, then 4 | Nov 1, 2026 |
| How is solo built? | As a host with one player, inputs sent as messages, so co-op adds players without a rewrite | Nov 1, 2026 |
| How do players find each other? | A small Cloudflare Worker matching by room code (Phase 2) | Nov 1, 2026 |
| How does co-op connect? | Cloudflare Durable Objects: one per room code, running the real game on the server, with players connected over WebSockets. Replaces peer-to-peer | Nov 3, 2026 |
| How do players join? | Room code from the host | Nov 1, 2026 |
| Lives? | 3 per player, one spent per down, refilled each level | Nov 1, 2026 |
| Solo death? | Going down spends a life and restarts the current wave; 0 lives restarts from wave 1 | Nov 1, 2026 |
| Co-op revive? | Halftime checkpoint, or a rare first aid kit on the spot | Nov 1, 2026 |
| When does the checkpoint open? | After the middle wave | Nov 1, 2026 |
| Where is the kit? | Fixed spot in the level; only some levels have one | Nov 1, 2026 |
| Revived health? | Full | Nov 1, 2026 |
| Downed player view? | Spectates the partner | Nov 1, 2026 |
| Co-op game over? | Both down, or both out of lives, restarts from wave 1 | Nov 1, 2026 |
| Weapons in Level 0? | One pistol, unlimited ammo with a reload | Nov 1, 2026 |
| Healing? | Auto-regenerate | Nov 1, 2026 |
| Zombies in Level 0? | One type, chases the nearest player | Nov 1, 2026 |
| Waves? | Slow ramp, timed break; Level 0 has 5 | Nov 1, 2026 |
| Points? | Flat per kill; nothing to buy in Level 0 | Nov 1, 2026 |
| After a level? | Win screen, then menu | Nov 1, 2026 |
| Tone and look? | Gritty night, fog, blocky shapes | Nov 1, 2026 |
| Sound? | Basic CC0 effects | Nov 1, 2026 |
| Build approach? | Planning files first, then scaffold in VS Code | Nov 1, 2026 |
| What is "back against a wall and peek with the gun"? | A cover mode on F, plus the lean | Nov 1, 2026 |
| Boards: temporary or permanent? | Permanent, one bundle per door and two bundles, so the choice is a strategy | Nov 1, 2026 |
| What can be climbed, and how? | Jump facing a ledge up to 2.25 m above your feet and you pull up onto it; ladders are listed in the level file | Nov 1, 2026 |

---

## Build Rules

- No HTML in any output
- No emojis in any output
- SVG icons only when genuinely needed
