# Plan — reworking Acts 2 to 4 (Descent, The Vault, Daybreak)

> Written Nov 14, 2026 (Phase 2 of the rework). This is a plan only: no code has changed yet.
> Sources: `docs/ZOMBIE_SIEGE_MASTER_CAMPAIGN_HANDOFF_v2.md` (the handoff; Acts 1–4 locked), `docs/LORE.md`, and an audit of the build at commit `6fb0120`.
> Items marked **DECIDE** need Chris's call before the phase that uses them.
>
> **Decided Nov 14:** Chris took the recommendation on all four. A: keep the lift. B: Patient O is driven back and sealed in the vault. C: the scientist is the player body in a lab coat, labelled THE SCIENTIST. D: gates (`exitGate`) replace the Act 4 kiosks. Recorded in LORE.
>
> **Phase 3a done Nov 14** (see §7). **Phase 3b done Nov 14** (see §8).

---

## 1. Where the build stands

Acts 2–4 have 15 levels, and all of them are playable. The content is there. The problem is that every stop is played the same way.

**Every stop runs one loop** ([src/game/waves.ts](../src/game/waves.ts)):

1. Waves come through the doors (`prep → active → break`, repeated).
2. The floor goes quiet, and the objective unlocks (`search`). Nothing attacks, except during a charge hold.
3. The lift or gate opens, and the crew leaves.

That loop is right for the hospital. The handoff says it's wrong for the next three acts:

| Act | What the handoff wants players to do most | What the build does |
|---|---|---|
| 2 Descent | Investigation and stealth. Waves only support. | 7 wave floors, each followed by a power objective. No clues, no stealth, no scientist. |
| 3 The Vault | Mobile escape, investigation, and environmental operation | 4 wave floors. The vault is a normal hold. There's no cold room, no Patient O and no scientist. |
| 4 Daybreak | "Mobile escape … **not another stationary siege**" | 4 wave floors, two of them holds, each block ending at a stand-in transit lift. There's no flight or camp arrival. |

**What already exists and can be reused:**

- **Zombie senses.** Zombies already react to sight, gunshot noise and alerts in [zombies.ts](../src/game/zombies.ts) (`sightRange`, `hearNoises`, `alertUntil`). That covers most of what stealth needs.
- **Five objective types:** keycard, breakers, charge, carry and signal.
  - The car battery in 02-C is just a `carry` objective.
  - The flare hold in 04-B is just `signal`.
- **Gates.** The prologue's `exitGate` already joins on-foot levels without a lift. It's the obvious replacement for the Act 4 transit kiosks.
- **Radio lines.** [src/render/radio.ts](../src/render/radio.ts) already plays lines at a floor's start and when its objective is done. It needs more triggers and a SCIENTIST speaker.
- **Brute and Screamer.** Both exist, with charge and scream behaviour.
- **Co-op sync.** Co-op sends the whole game state as JSON ([server/worker.ts](../server/worker.ts)), so new state fields sync with no protocol work.

**What doesn't exist:**

- Floors without waves
- Zombies placed in a level before the crew arrives
- More than one objective per floor
- Clues you can read
- A story companion
- A boss
- A cutscene other than the garage intro

---

## 2. New engine pieces (built once, used across acts)

There are seven pieces. Each one is small, and each is used in at least two places, as the handoff requires.

| # | Piece | What it does | Used in |
|---|---|---|---|
| **E1** | **Objective steps** | `Level.steps: Objective[]` runs 2–3 objectives in order on one floor, such as *find the file → start the generator*. `objective` stays as the one-step shortcut. | 2, 3, 4 |
| **E2** | **Floor flow** | `Level.flow` sets how a floor plays (see below). | 2, 3, 4, and the prologue later |
| **E3** | **Residents** | `Level.residents` places zombies in the level before the crew arrives. They stay still until they see, hear or are alerted. This reuses the existing AI and adds a dormant state. | 2, 3 |
| **E4** | **More radio triggers** | Adds cues for `area` (the first player walks into a zone) and `step` (an objective step is done), plus a **SCIENTIST** speaker. | 2, 3, 4 |
| **E5** | **Clues** | `Level.notes` are objects you press E to read. Each one shows a caption card and goes into a run log on the pause screen. They're optional and never block progress. | 2, 3 (Act 1 later) |
| **E6** | **The scientist** | A story companion who can't be hurt and whom zombies ignore. He trails the nearest player using the existing navigation. When the crew boards he's moved into the cab or through the gate, and if he gets stuck he's moved to the nearest player out of sight. **He can never cause a mission to fail.** | 3, 4 (and later acts) |
| **E7** | **Patient O** | A boss zombie kind with stages tied to the vault floor's objective steps. | 3 (and its later return) |

**The four flows (E2):**

- **`siege`:** today's loop. It's the default, so Act 1 and anything left alone doesn't change.
- **`sweep`:** there are no waves. Residents (E3) hold the floor, and the objective is open from the moment the crew arrives.
  - A gunshot wakes the zombies that hear it, through the existing noise range.
  - Each loud moment also brings a few more through the doors, using `callReinforcements`. Quiet play is rewarded, but loud play isn't punished out of all proportion.
  - The floor is done when its steps are done. Zombies still standing don't block the exit.
- **`run`:** the objective is open straight away and there's no wave count.
  - Zombies stream in from doors **behind** the crew's furthest point, so standing still gets worse over time. This is the handoff's "pressure from behind" pattern.
  - A `charge` step inside a run becomes a short stand, after which the run carries on.
- **`hold`:** the pattern for a `siege` floor whose climax is a charge step. It needs no new code.

Wipe rules stay as they are for now. Everyone going down still costs a team life and restarts the current part. On a sweep or run floor, the current part means "this floor from the start". The canon rule (individual lives, and a full wipe restarting the whole run) is Phase 5.

---

## 3. Act by act

The levels and their layouts stay. What changes is how each one plays, its steps, its clues and its lines. The handoff's beat names (02-A, 02-B and so on) are shown against each floor.

### Act 2 — Descent: *descend, reroute, expose*

The stealth and clue floors run from the top down, and the noise and the crowd build toward the bottom. Act 2 has one memorable mechanic: **noise is a choice**.

| Stop | Beat | Flow | Steps | Story added |
|---|---|---|---|---|
| Tower roof | arrival | siege, 2 waves (as now) | Lift controls hold (as now) | The scientist's first intercom call. He's calm and precise, and he doesn't say where he is. |
| 41 Open-plan | 02-A | **sweep** | Breakers | Dormant office dead among the desks. Clue: the evacuation notice ("all staff to lower levels"). |
| 34 Records | 02-A | **sweep** | **Transfer file** (keycard) → generator hold | Clue: the transfer order that moved him "to the pharmacy facility". The generator hold brings waves. |
| 27 Executive | 02-A | sweep | Executive keycard | **The clue floor** (from LORE): a memo about the sample and the food-poisoning cover story. Radio: the scientist goes quiet for a moment when he hears where they are. |
| 20 Servers | 02-B | siege, 4 waves | Breakers | **The camera glimpse.** When the power comes back, one monitor shows him on a security feed for a moment. This is the one sighting before the vault (LORE). |
| Lobby | 02-B | siege, 4 waves | Service controls hold | **A Brute leads the last wave** at the barricaded street doors. This is the handoff's "Brute threatens a barricaded escape route". |
| Tower garage | 02-C | siege, 5 waves | Breakers → **car battery** (carry: from a parked car to the dead tunnel lift) | The car-battery fix to open the tunnel (handoff canon). Radio: "Under the street. That's how they moved me." |

**DECIDE A — stairs or lift (Q11 in LORE).** The handoff's 02-B asks for movement under pressure plus a quiet detour round a nest. The build has a freight lift.

- *Recommended:* keep the lift. The stairwells are packed solid, so the lift is the only way down, and 41 and 34 become the "quiet detour" floors (sweep).
- A real stairwell level needs stacked-floor geometry the engine hasn't been tested with. Leave that until later.

### Act 3 — The Vault: *breach, recover, contain*

This is the heist. Each floor adds one new pressure, and the act ends on Patient O and the scientist coming out.

| Stop | Beat | Flow | Steps | Story added |
|---|---|---|---|---|
| Service tunnel | (02-C → 03) | **run** | Breakers spread down the tunnel | The dead come in behind the crew from the tower end, so keep moving. A long straight run is the right layout for this already. |
| Pharmacy | 03-A | **sweep** | Manager keycard | The shop is full of dormant dead who came for medicine. A gunshot sets off the **crowd at the street doors**, a large reinforcement. Entering quietly is the "practical entry without drawing the district". |
| Hidden lab | 03-B | siege, 4 waves | Breakers (**backup power to the −80 °C freezer**) → **specimen cases** (carry 2 cases from cold storage to the lift) | Clue: the scientist's notes on "the mother". Radio: he talks them through the freezer, and his calm starts to crack. The carry step is the "protect specimen-handling equipment" beat. |
| The vault | 03-C | siege, 5 waves | **Time lock** (charge hold) → **Patient O** → board | See below. |

**The vault (03-C) in order:**

1. **The time lock.** Start the unlock at the panel, a 60 s hold as now. **Patient O stage 1** arrives partway through the hold: it's heavy and slow, it breaks the cover pillars, and it goes for whoever is on the panel. Hitting its weak point staggers it, and the counter is to move together. Ordinary waves keep coming.
2. **The vault opens.** A short scene with the sim paused, reusing the intro's camera and captions: the door swings open, **the scientist steps out** with the sample case, and his first line is said face to face. He then follows the crew from here on (E6).
3. **Patient O stage 2** stands between the crew and the lift, enraged and faster. What happens to it next is **DECIDE B**. The lift to Act 4 opens.

**DECIDE B — what happens to Patient O.** The handoff says not to invent its death or escape without an approved decision. Options:

- a) It's killed here, and its later return in the handoff becomes "another one like it"
- b) It's **driven back and sealed in the vault** when the door closes. *Recommended:* this keeps its return open and fits "contain".
- c) It breaks off and escapes into the tunnels, and is heard again later
- d) Your own answer

**DECIDE C — the scientist's look.** He reuses the player body with a lab coat and no gun. Placeholder name: "THE SCIENTIST" on screen. His real name is parked in LORE.

### Act 4 — Daybreak: *move, signal, extract*

This is the escape. Running dominates, the crew makes few stands, and the act ends on a real flight out.

| Stop | Beat | Flow | Steps | Story added |
|---|---|---|---|---|
| Main Street | 04-A | **run** | Gate at the east end, opened from a control box. No pass hunt. | The first daylight. The scientist follows. A **shortcut through a shop** is fast but full of residents; the open road is long and clear. This is the handoff's route choice. |
| Market square | 04-A | **run** | Radio relay, a **30 s** stand (was 55) → gate | The crowd from the side streets keeps the pressure on the whole time. Radio: the pilot answers, "Find us somewhere flat." |
| The barricades | 04-A | **run** | Three generators *along the route* (breakers) → gate | Clue: the army's evacuation map, which fits the broadcast canon. |
| The park | 04-B | siege → signal (as now) | Flare hold, 90 s → board | Kept. This is the canon extraction. **The ride lands, and the run ends on success.** |
| *Flight* | 04-C | cinematic | — | **New:** about a 15 s flight scene over the city at sunrise. A broadcast caption names towns lost and newly hit, then **arrival at the outskirts camp**. Win screen. |

**DECIDE D — what replaces the transit kiosks (Q12 in LORE).** *Recommended:* gates, using the prologue's `exitGate` with no lift. The blocks join by shutters and side streets and the screen cuts, which costs almost nothing. The alternative is a metro entrance, which needs new art.

---

## 4. Outside these acts (noted, not planned here)

- **The prologue was built as five wave floors.** The handoff says *"do not rebuild the prologue as five wave arenas"*. Once E2 exists:
  - P01 can become sweep → run (quiet discovery, then the horde escape).
  - P03 can get its timed exit.
  - P04 can get its optional restaurant rescue.

  This is a small pass after Phase 4 and isn't in scope here.
- **Brute and Screamer first appearances.** Canon has the first Brute on Floor 6 and the first Screamer on Floor 9. The build's `kindForSpawn` brings both in from early floors. It's a one-line fix, which I'd include in Phase 3's engine pass. Say if not.
- **Lives and the wipe rule.** Canon has three lives *per person* and a full wipe restarting the run. The build has a shared team pool and restarts the floor. That's Phase 5, as planned.
- **LORE.md doesn't mention Patient O at all,** although the handoff has it as locked canon. I'd add it to LORE after DECIDE B.

---

## 5. Build order (phases)

Each phase ends with a stop for you to compact, as usual.

| Phase | Work | Model |
|---|---|---|
| **3a** | Engine pieces E1–E4 (steps, flows, residents, radio triggers). Apply to the tunnel, pharmacy and lab. Fix Brute/Screamer first appearances. | Opus 5.5, high |
| **3b** | E6 scientist, E7 Patient O and the vault scene | Opus 5.5, high |
| **4a** | Act 2: apply flows, steps and lines to the seven tower floors. E5 clues. Camera glimpse. | Sonnet 5.5, medium |
| **4b** | Act 4: gates for kiosks, run flows, the shop shortcut, the scientist along, the flight cinematic | Sonnet 5.5, medium (Opus high for the cinematic if it fights back) |
| **5** | Run-failure rule (lives per person, wipe → run restart), co-op test pass | Opus 5.5, high |

---

## 6. How each phase is checked

- **New check scripts** in the existing `tools/check-*.mjs` style. Each runs the sim headless:
  - `check-flow`: a sweep floor finishes with no waves. A gunshot wakes the residents in range and leaves the far ones asleep. On a run floor, spawns come only from doors behind the crew.
  - `check-steps`: steps finish in order, and a wipe during step 2 doesn't undo step 1.
  - `check-act3`: drives tunnel → vault with scripted objective use. The scientist exists after the vault opens and is never damaged. Patient O's stages fire in order. The lift opens after DECIDE B's outcome.
  - `check-descent-geometry`, extended so resident, note and battery positions aren't inside walls.
- **Regressions every phase:** tsc, build, check-prelude, check-session and check-radio. Act 1 must play exactly as before, because `siege` is the default.
- **Co-op:** the scientist and Patient O live in the game state, so they sync automatically. Check them with two browsers against the local co-op server, using the run steps in memory.
- **Screenshots** of each reworked floor with `tools/shot.cjs`.

### Done means (from the handoff's checklist)

- Acts 1–4 can be played in sequence with no softlock. Unique items (the transfer file, specimen cases, the sample) always have a recovery path.
- Each act's main verb differs from the one before.
- It works solo, with no second player needed, and with four players.
- The scientist can't fail a mission. The helicopter extraction succeeds.
---

## 7. What Phase 3a built (Nov 14)

**Engine (all in the shared sim, so co-op syncs it):**

- **E1 steps.** `Level.steps`. The game's copy of the level carries the current step as `objective`, so the HUD, map, prompts and renderer follow without changes. `completeStep` keeps a record of each finished step in `state.objective.past` (the renderer uses it to show finished breakers and delivered cases). A new copy of the level is made at each step, so the co-op server resends it.
- **E2 flows.** `Level.flow`: `siege` (default, unchanged), `sweep` (`loud`, `first`, `from` doors) and `run` (`every`, `max`).
  - "Behind" on a run floor is worked out from a trail point a few seconds behind the crew, not from the next objective, which pointed across the tunnel because the breakers are on the side walls. A crew standing still gets spawns from any door well away from it.
  - On sweep and run floors, a wipe sends the crew back to the floor's entry, the residents return to their places, and finished steps stay done.
- **E3 residents.** `Level.residents`. Dormant zombies. They wake when:
  - a player is in sight, using `config.zombie.resident`: 9 m, plus 4 m with a flashlight on, half that range when crouched, and always within 1.8 m;
  - they're alerted (gunfire within the existing 32 m, or being hit);
  - a neighbour within 4.5 m wakes.
- **E4 radio.** `Level.cues` with `start`, `done`, `step` and `area` cues. `state.heard` records when each area was first entered. The scientist's speaker is drawn in blue. When lines overlap, the newer one cuts in.
- **Brute and Screamer.** The first Brute is on stop 2 (Floor 6) and the first Screamer on stop 3 (Floor 9).

**Levels:**

- **Tunnel:** run.
- **Pharmacy:** sweep with 11 residents, including a screamer. The first shot brings 8 through the street doors and each later loud moment brings 3.
- **Lab:** siege with two steps, freezer breakers and then 2 cryo carriers. Scientist and crew lines are on all three.

**Checks:**

- New: `tools/check-flow.mjs` and `tools/check-steps.mjs`.
- Extended: `check-descent-geometry` now covers steps, residents, cases and drop-offs.
- All pass, as do check-prelude, check-session, check-radio, check-zombies, check-descent, check-arrival, check-door-rush, check-doorways, check-ceilings, check-raycast, check-hands, tsc (client and server) and the build.
- `check-admin`, `check-melee` and `check-ramp` were already failing at `6fb0120` and fail the same way.

**Left for later:**

- Residents stand upright and still. A slumped or shuffling idle pose would read better.
- A two-browser co-op pass is still to do (planned for Phase 5).
---

## 8. What Phase 3b built (Nov 14)

**The vault, in order:**

1. **Time lock.** A 60 s hold at the panel, as before.
2. **Patient O arrives.** At 22 s it comes through the west door. It's a Brute flagged as the boss: larger, in a patient's gown, health scaled by player count. It goes for whoever is in the time-lock room and charges like a Brute. It can't be brought below 40% health. A head shot staggers it, at most once every 3 s.
3. **The scene.** It lasts 10.5 s. While it runs the rules stand still: no input, no zombie movement, no wave clock.
   - The rest of the dead are cleared, and Patient O is moved behind the camera to where it will stand.
   - The steel door swings open (a new strongroom alcove behind the north wall).
   - The scientist walks out in a lab coat with the sample case, with two face-to-face captions.
   - The scene runs on game ticks, so co-op players see the same moment.
4. **Patient O enraged.** It stands between the crew and the lift with a fresh health pool, faster. The objective is the new `contain` kind.
5. **Sealed in.** Beaten to zero, it can't be killed. It turns, takes no more damage and walks into the strongroom (it's placed there if it takes longer than 12 s). The door slams shut and the step completes (decision B).
6. **The lift opens.**

**Wipes and restarts:**

- A wipe in stage 1 restarts the time lock, and Patient O goes with it.
- A wipe in stage 2 brings it back where it stood, at full strength.
- Running out of lives restarts the floor from the time lock, with the door shut and no scientist.

**The scientist (E6):** `state.scientist`, in `src/game/story.ts`.

- He follows the nearest player using the zombies' navigation grid and waits 2.4 m away.
- If he's more than 14 m from everyone and out of sight for 2 s, he's placed behind the nearest player.
- He rides in the cab and starts beside the crew on every floor after the vault, and he's there when starting directly on an Act 4 floor.
- He has no health, zombies don't target him, and the mission rules never check on him.
- Drawn: the survivor body with a clean shirt, coat, sleeves and steel case (`src/render/scientist.ts`). A SCIENTIST marker shows when he's more than 6 m away.

**Other pieces:**

- HUD bar for Patient O, with its stage-1 floor marked.
- `boss` radio cue, and a face-to-face `THE SCIENTIST` speaker.
- Vault door sound.
- The time lock reads "VAULT TIME LOCK" with a "BACKUP UPS" pack.
- Chargers at height 1.45 now stand on the floor (deadStop, lobby1, market, records34, vault, towerRoof).
- The tower roof's leftover light-box collider is removed.
- Sleeping zombies stand slumped.

**Checks:** `tools/check-act3.mjs` (new) drives the whole vault and on into Main Street. All other checks pass as before.

**Open:**

- **Wave size this deep is very large.** `waveSize` grows 40% per floor index, so the vault's wave 5 is about 89 zombies, and the deep Act 3–4 floors are similar. It needs a balance pass, best done with Phase 5.
- **Patient O doesn't break the pillars** (the plan's "breaks cover"). Destructible cover is a later job.
- **No two-browser co-op run yet.** It's planned for Phase 5.

---

## 9. Phase 4a: what was built (Act 2)

**New engine piece, E5 clues:** `Level.notes` (`Note`: position, what it is, title, lines, optional `wall` normal).

- Press use beside one (1.6 m, `src/game/notes.ts`) and a paper card goes up for 9 s, for that player only. It goes away early if they walk off.
- The first read of each puts it in `state.log`, which the pause menu shows as **RUN LOG** (a title list and the chosen note's text).
- Drawn as a sheet of paper on the desk or wall with a faint warm glow until it's read (`src/render/notes.ts`).
- `state.read`, `state.log` and `state.card` are all plain data, so co-op syncs them.

**Other new pieces:**

- `Cue.feed`: a security monitor appears in the corner while that line shows (floor 20's glimpse).
- `Level.leads`: who leads the last wave of a siege floor (the lobby's brute).
- A keycard step's marker and brief now use its label (so it can be a "transfer file").

**Floors, as built:**

| Floor | Flow | What changed |
|---|---|---|
| Tower roof | Siege, as before | Radio: the crew, then the scientist's first call, then his line to go down quietly |
| 41 | Sweep, 13 residents, `first: 6` | Notice note, radio lines |
| 34 | Sweep, 11 residents | Steps: transfer file, then the generator hold (this brings the dead). Transfer order note |
| 27 | Sweep, 13 residents | Board memo note, "say it again" radio beat where the scientist goes quiet |
| 20 | Siege, as before | Camera glimpse on the breakers' `done` cue |
| Lobby | Siege, brute leads the last wave | Radio lines |
| Garage | Siege | Steps: breakers, then a car battery (a carry step) to the tunnel lift |

**Residents are kept well away from where the crew arrives.** They notice by line of sight, up to 9 m, and 13 m with the flashlight on (the dark floors), so each sweep floor's nearest sleeper is at least that far from the spawn or behind a wall.

**Checks:** `tools/check-act2.mjs` (new). `check-descent.mjs` now expects floor 41 to be a sweep and raises the alarm with a shot. `check-coop-server` fails the same way on the commit before this phase (walking doesn't move a player there), so it isn't from this work.

**Open:**

- The car battery is drawn as the steel case. A proper battery model is a small art job.
- The lock prices on the sweep floors (250, 500) rely on points from the sleepers and from earlier floors. It needs play-testing.
- Floor 20's monitor is a drawn overlay in the corner, not a screen in the room.

---

## 10. Phase 4b: what was built (Act 4)

**Gates replace the transit lifts (DECIDE D).** Main Street, the market and the barricades have `exitGate` and the exit moved to the **east** end, so the crew starts at the west and runs east. Everyone through the open gate goes straight on, with no cab and no ride.

- Arriving from the vault's lift, the crew steps out at the start of Main Street, not in a cab.
- The banners and briefs say "the gate" on these floors.

**All three blocks are run floors:**

| Block | Run | Steps | Story |
|---|---|---|---|
| Main Street | every 3.6 s, max 12 | One gate-control box beside the east gate. No pass hunt | First daylight. The scientist's line about the shop route |
| Market square | every 3 s, max 16 | The relay stand is now 30 s (was 55), then the gate | The pilot: "Find us somewhere flat." |
| The barricades | every 3.4 s, max 14 | Three generators along the route, then the gate | Note: the army evacuation map (draft wording, in LORE) |

**The Main Street shortcut.** Two barriers across the road and pavements, staggered (gap at the south, then at the north), make the road an S-bend. The north shop is a real room (6 sleepers, three dim lights, a counter and shelves) with doors either side of the barriers, about 6 m shorter than the road. `check-act4` measures both routes.

**The flight out.** `Level.flight` (seconds, shots, captions) on the park. When everyone is aboard the new `flight` phase runs for 18 s: the helicopter lifts off and flies away, the camera takes three shots (from the ground, then high over the city, then wide to the sunrise) with letterbox and captions, then the run is won. Nobody can move during it. The captions are a pilot line, a broadcast naming Northline lost and outbreaks "beyond the city", and "OUTSKIRTS CAMP / Safe. For now." The wording was settled Nov 14 (see LORE.md). An earlier draft named "the river towns"; that was dropped so the broadcast doesn't get ahead of Acts 5 to 12.

**Open:**

- The sunrise is the park's existing sky; the camera never leaves the park's own scenery (flat boxes for the city).
- The scientist stands right beside the spawn on arrival and can block the first view for a moment.
- The prologue's gate floors still say "The barrier is down" and use the old wording.

---

## 11. Phase 5: what was built (lives, wipe rule, co-op pass, balance)

**Lives per person (canon §2.3).** `Player.lives` replaces the team pool: 3 to start, `livesCap` 5 (no source of extra lives yet). New `src/game/downed.ts`:
- **Down** at 0 health: `downTick` set. The player can look, crawl (crouched, at 35% of crouch speed), and fire what's left in the gun in hand. There's no reload, swap, melee or items. Zombies go for whoever is still standing.
- **Revive:** a standing teammate within 1.8 m presses use, then holds still for 4 s. Moving, firing or being hit stops it. It costs nothing, and the player comes back at 30 health.
- **Self-revive (solo only):** press use while down. It takes 6 s, costs a life, and can't be done on the last life.
- **Bleed-out** after 45 s costs a life (`out`). With lives left the player comes back beside a standing teammate at the next quiet moment: a wave break, cleared, the open lift, siege search, or the next floor. With none, they're out of the run and spectate (their own view for now).
- The lift, the gate and the helicopter wait for downed players (who can crawl in), but not for those out.
- **Nobody standing** (and nobody able to get up alone) → `WavePhase 'lost'`. Three seconds later the end screen shows RUN OVER with TRY AGAIN, which starts a new run at P01. That's the locked full-wipe rule.
- **Practice:** `GameState.practice` is true for any game started from the floor list on a floor other than P01. There, a wipe runs the old restart (same wave, or back to the floor's entry with steps kept), everyone back up, no lives lost. The Act 3 wipe behaviours (Patient O's stages) still apply there.
- The HUD shows one cross per life, DOWN / BLED OUT / OUT OF LIVES / REVIVING with the bleed timer and a progress bar, a "Revive player N" prompt, and a red DOWN marker on the compass and radar for a downed teammate. Other players see a downed teammate lying on the floor.

**Wave balance.** The 40% per floor index growth made deep waves about 89 and also made zombies faster than a walking player by the park. `tower.ts depth(floor)` now climbs one step per floor through the hospital and 0.2 per floor after the roof (`config.waves.laterFloorStep`).
- Act 1 and the prologue are unchanged. The prologue keeps its slower pace.
- The last wave on the deep siege floors is now about 41 to 50. The park's final wave is 50.
- Zombie speed growth from depth is capped at depth 6.
- Each extra player adds 25% to a wave (`extraPerPlayer`).
- A wave pauses spawning while 32 are up (`maxAlive`).

**Co-op.**
- The server room now waits, players standing at P01, until someone presses DEPLOY (new `start` message) or restarts. Before this, players sitting on the title screen got overrun.
- Joining a room whose run is over starts the next run.
- Restarts can now go to any floor up to the park; before, they stopped at the roof.
- TRY AGAIN doesn't restart a run someone else already restarted.
- `check-coop-server` was failing only because it assumed the old garage start facing −z. It now measures distance, and also covers the waiting room and an Act 4 restart.
- **Two-browser pass** (headless Chrome ×2 plus a scripted third player, against wrangler and Vite):
  - Both tabs joined and saw the same state tick for tick.
  - Each tab drew the third player.
  - After an idle wipe, both showed the RUN OVER screen.
  - On the practice floor a downed teammate lay on the floor with the "Revive player 3" prompt over them.

**Story items closed on recommendation:**
- The Act 2 notes and the evacuation map stand as written.
- The broadcast drops "the river towns".
- The scientist now starts a step behind the crew (or to one side if a wall is there), so he isn't the first thing in view.
- The prologue's breaker wording ("The barrier is down") is kept, because it fits the checkpoint.

**Still open:**
- Nobody has played Acts 2–4 with a mouse yet.
- An out-of-lives player watches from where they fell, not over a teammate's shoulder.
- No item or event gives extra lives (canon: rare and bounded).
- The canon's "dragging/stabilization" isn't built.
- Act-start autosaves (resume an interrupted session) aren't built.
- Patient O doesn't break pillars.
- The garage battery is drawn as the steel case.
- Floor 20's camera is a HUD overlay.
- `check-admin`, `check-melee` and `check-ramp` still fail as they did before Phase 3a.
