# ZOMBIE SIEGE — MASTER CAMPAIGN & GAMEPLAY HANDOFF

> **Version:** 2.0 — Story Expansion / Implementation Planning  
> **Prepared:** 2026-11-14  
> **Format:** Markdown; place in the repository's `docs/` folder  
> **Audience:** Chris, The Forge, Claude Code / VS Code / Copilot, future collaborators  
> **Status:** **Q001–Q130 canon preserved.** New Acts 5–12 and architectural recommendations are **working proposals**, not established canon.  
> **Scope:** Design and implementation planning only; this file does **not** assert that proposed mechanics exist in the codebase.

---

## 0. READ THIS FIRST — RULES FOR ANY CODING ASSISTANT

1. **Read the repository and current project files before changing code.** The hospital is the reported playable foundation. Confirm what is actually implemented; don't infer implementation from a design document.
2. **Do not overwrite Q001–Q130 Forge decisions.** If a recommended change conflicts with them, treat it as a **proposed canon amendment** requiring explicit approval.
3. **Keep source status separate:** `LOCKED CANON`, `REPORTED BUILT — VERIFY`, `APPROVED FOR DEVELOPMENT`, `PROPOSED`, `PARKED`.
4. **No automatic massive code generation.** Inspect, propose one smallest useful vertical slice with acceptance tests, obtain approval, then implement.
5. **Preserve solo and co-op (1–4) viability**, mission persistence, established game-over semantics, and the known story spine.
6. **Browser-first performance.** Do not implement a seamless open world or a large physically simulated battlefield to achieve the illusion of scale.
7. **Never equate a story act with a single arena.** A mission changes the *player's actions*, stakes, and environment, not merely the building.
8. **Maintain a changelog.** Record decision IDs, feature ownership, dependencies, and known regressions.

### Status vocabulary

| Status | Meaning |
|---|---|
| `LOCKED CANON` | Established in the prior 130-question storyboard or original lore handoff. |
| `REPORTED BUILT — VERIFY` | Previously described as implemented; only the live repository can confirm. |
| `WORKING EXPANSION` | Deliberate recommendation in this document; coherent enough to plan, but not an amendment to canon. |
| `PROPOSED AMENDMENT` | Conflicts with a locked decision; **do not implement until approved**. |
| `PARKED` | Interesting future possibility, deliberately excluded from near-term work. |

---

# 1. EXECUTIVE DIRECTION

## The game we are making

**Zombie Siege** is a browser-first, first-person 3D zombie survival action game in a chunky low-poly visual style. Play solo or online with up to four players in room-code co-op. Its narrative begins with an independent emergency-response crew trapped in the collapse of fictional **Northline**, then expands into regional rescues, tactical operations, supply runs, camp defense, vehicles, research, human relationships, and a campaign-wide struggle to preserve a path toward treatment.

The central promise:

> **A long, cinematic survival story where every operation feels different, but all operations use a connected set of reliable game systems.**

The game is **not** (a) an endless sequence of locked-room waves, (b) an open-world crafting simulator, (c) a military PvP shooter, or (d) an imitation of a named franchise.

### Inspiration: extract principles, not IP

| Inspiration | Borrow the design principle | Original Zombie Siege application | Do **not** copy |
|---|---|---|---|
| Call of Duty campaigns | Pacing, mission variety, cinematic transitions | Evacuations, infiltration, dramatic movement under fire | Named characters, maps, scripts, branded presentation |
| CoD Zombies | Pressure, points, fortification and waves | Hospital and special siege encounters | Exact progression economy, maps, wonder weapons |
| Left 4 Dead / Back 4 Blood | Team-readable enemy roles, pressure and changing runs | Dynamic but fair travel encounters | Their enemy roster, characters, special mechanics verbatim |
| Rainbow Six Siege | Breach/defend choices, gadgets and room tactics | Alternate entries, fortification, information gathering | Operators, maps, destructibility model |
| Counter-Strike | Objective clarity, risk, precision, constrained gear | Timed device operations, site defense, extraction control | PvP bomb modes as such |
| Halo | Distinct enemy silhouettes, vehicles, changing encounter spaces | Readable mutation counters, open/close combat transitions | Factions, weapons, locations |
| Battlefield / Battlefront | Perceived scale, layered frontline objectives, vehicles | Convoys, retreating defenses, airfield set pieces | Massively simulated player armies, franchise content |
| 7 Days to Die | Preparing, scavenging, repairing, defending | Camp workstations, logistics, sieges | Endless grind, block-by-block construction |
| Extraction shooters / Deadside | Decide what to carry and whether to risk staying | Optional regional recovery operations | PvP extraction economy, loot treadmill |
| Vein / survival horror | Uncertainty, oppressive exploration, environmental peril | Dark utility tunnels and medical/research facilities | Setting-specific creatures or lore |
| Doom | Responsive weapons, movement, enemy counterplay | Short violent spikes and purposeful mobility | Arena-only pacing or matching enemy designs |

**Selection rule:** Use one clear signature from each reference when it serves Zombie Siege; reject features that dilute the story or consume the solo developer's schedule.

## Editorial decisions for this revision

1. **Use 12 acts, not 14.** Group them into three four-act arcs. The original Acts 1–4 remain unchanged; Acts 5–12 are new proposals. The removed/combined ideas were redundant, not lost: large-scale containment and community-wide collapse are folded into Act 12.
2. **A different dominant verb for every act.** Hold, descend, recover, escape, establish, transport, reconnect, navigate, negotiate, investigate, expose, coordinate.
3. **One shared mission framework.** Escort, repair, defend, scout, interact, route-choice, extract, and consequence triggers are reusable pieces, not individually hardcoded one-off levels.
4. **Vehicles, factions, complex economy, and large siege systems arrive later.** They must not block completing the original four-operation arc.
5. **Original sample and scientist remain central.** The global outbreak is not magically cured at the finale. The crew secures an actionable *research path*, not a guaranteed universal cure.
6. **Human survivors are not default target practice.** Conflict includes distrust, negotiation and evacuation; lethal hostile encounters exist sparingly and with narrative justification.
7. **Surface the existing full-wipe vs long-story problem.** Recommend a separate Story mode and Hardcore mode; this is explicitly a `PROPOSED AMENDMENT`, not current canon.

---

# 2. LOCKED STORY / GAME CANON — DO NOT REWRITE

## 2.1 World and outbreak

- Northline is fictional. Established districts include **City Centre, Old Town, Riverside (harbor/bridge/island), West End, and the outskirts camp**; a military base/stadium can serve later operations.
- The outbreak began with an **accidental corporate laboratory leak**, about **three weeks before the visible societal collapse**. Early symptoms and events were misrepresented as food poisoning.
- A company moved a scientist from the hospital to a hidden facility behind **Northline Pharmacy**, two days before the original story. The scientist holds the **last pure pre-leak sample**; infected are unusually drawn to it, described in-world as **“the mother.”** This describes infected behavior and rumor; it is not a confirmed supernatural force.
- **Patient O** was a hospital Floor 12 subject later transferred. Patient O returns as a mutation near the pharmacy vault; do not invent a different identity or death/escape outcome without an approved story decision.
- A **dark-blue El Cajon car** connected to the scientist remains in **Northline General parking bay E05** until a later plot-supported recovery. The crew is meant to hotwire it after a failed extraction in a later operation and it becomes their **first playable driving mission**. Do not silently place that drive before its established setup or retcon the successful Act 4 helicopter extraction.
- The crew are established acquaintances with independent emergency air-ambulance backing, paramedic experience and some ex-military background. The same **pilot** and **female copilot** recur.
- Daily emergency radio/broadcast segments report towns lost, newly hit, or evacuating. These give the wider outbreak continuity.
- Family rescue, regional camps, eventual university/other-lab research, and long-running cure work are established future story threads. The story should be expandable over years.
- Established history is fixed. Player theories can alter optional leads or reactions, not who created the outbreak or what actually happened.

## 2.2 Opening story structure

**Prologue — The Road to Northline**

1. **P01 Breakdown:** Ambulance runs out of fuel following prior rescues; quiet discovery turns into horde escape; hospital radio motivates movement.
2. **P02 Roadside Station:** No useful fuel; trapped survivors trigger alarm; defend so they escape in a delivery van to camp.
3. **P03 Failed Evacuation Checkpoint:** Infected turned inside screening; unlock gates, timed exit, evacuation map and first meaningful broadcast.
4. **P04 Commercial District:** Branching paths, optional restaurant civilians rescued through kitchen/rear alley, survivor callbacks, no punitive rescue deadline.
5. **P05 Final Push:** Escalating hospital approach; **OPERATION 001 — NIGHTFALL** title transition.

**Act / Operation 001 — NIGHTFALL (`REPORTED BUILT — VERIFY`)**

- Garage Level 0: **5 waves**.
- Floor 3 Admissions: manager keycard, **3 waves**.
- Floor 6 Pharmacy/Labs: three breakers, **3 waves**, first Brute.
- Floor 9 Surgery: Recovery battery hold **60 seconds**, **4 waves**, first Screamer.
- Floor 12 ICU: move three lamp cases, **4 waves**, Patient O trail.
- Roof Floor 14: **90-second** heliport hold and helicopter extraction, **2 waves**.
- All floors contribute to shared emergency-power/helipad restoration.
- Clues: food-poisoning cover story, corporate sample in roughly -20°C storage, Patient O transfer. Hospital sample draws infected.

**Act / Operation 002 — DESCENT**

Company tower descent, stairwaves, power and investigation, company-to-pharmacy private tunnel, car battery used for tunnel access, ongoing scientist contact. Do not flatten into a generic tower horde.

**Act / Operation 003 — THE VAULT**

Northline Pharmacy and concealed lab, backup -80°C freezer, time-sensitive unlock, Patient O encounter, scientist and pure sample recovery, guards/transport risk outside. Scientist is initially heard, not visibly revealed before the vault. The scientist follows the crew after rescue and is protected by mission logic rather than a fragile escort AI.

**Act / Operation 004 — DAYBREAK**

Street run to park/field flare helicopter extraction. Survivor camp first reached after this operation. The pilot and copilot remain part of the ongoing story.

## 2.3 Locked player and campaign rules

- 1–4 players, solo and online co-op using room codes; same authored story for every party size.
- Character starts with **3 lives**, cap **5**; additional recovery rare and bounded. Lives belong to individuals.
- Downed state: approximately **45-second bleed-out**; crawl/limited sidearm, weak combat ability, no reload while downed. A teammate uses an adrenaline syringe for an approximately **4-second uninterrupted revive**; dragging/stabilization are supported concepts. Solo has a constrained self-revive option.
- **Full-team wipe restarts the campaign run** under existing canon; act-start/prologue autosaves resume interrupted sessions, **not retries after death**. See §13 for a clearly labeled proposed mode split.
- Short safe-window character upgrades, modest backgrounds/specialties, limited respec, optional specializations; no permanent combat advantages across fresh runs.
- Health/hydration and supplies carry within the active campaign. Low hydration impairs regeneration; personal bandages, first-aid and water have stated carry limits (10 each where established). Rare adrenaline at designated spots.
- Initial pistol **P9, 12 rounds**, wall-mounted pump shotgun and AK-style weapon; machete/spiked bat were intentionally disabled pending model readiness.
- Barricades, traps, environmental hazards, researched countermeasures and medical items remain tools with scarcity/cost, not infinite inventory.
- Co-op join/leave, resources, and disconnect recovery must avoid duplicating items or corrupting persistent mission state.

## 2.4 Locked later systems, high-level

- Infected respond to sight, sound, threat, local alerts and environments; mutations have readable counterplay. Existing categories: Runner, Brute, Screamer; later Crawler, Bloater, Armored. Patient O is a named mutation encounter.
- Evidence journal, collaborative theories, field guide, optional research samples, specimen storage, blueprints, research/fabrication and campaign chronicles are designed systems.
- Camp: facilities, resources, rescued survivor contributions, morale/wellbeing, defense, power, equipment, maintenance and after-action recovery; avoid death spirals and mandatory specialist locks.
- Regional missions: contextual urgency, environmental hazards, weather, preparation, vehicle operations, cargo and scavenging with recovery paths and no exploit loops.
- Survivor groups: distinct local priorities, relationships, conflict, diplomacy, barter, trade obligations and persistent consequences; no universal morality meter.
- Replay: modifiers, challenges, personal/team theories, narrative records, event-based highlights and achievement cosmetics; no permanent combat power advantage.
- Production: Q130 locked **phased vertical-slice development** with browser performance budgets and incremental co-op integration.

---

# 3. CAMPAIGN ARCHITECTURE — THREE ARCS, TWELVE ACTS

## The narrative question driving each arc

- **ARC I — THE SIGNAL (Acts 1–4):** *What happened, and who can tell us?* The crew gets the scientist and the original sample out alive.
- **ARC II — THE NETWORK (Acts 5–8):** *Can we keep anyone alive long enough for the knowledge to matter?* Establish a functioning camp, restore roads and communications, secure vital infrastructure.
- **ARC III — THE COST (Acts 9–12):** *Who gets saved, what is the company hiding, and what will communities risk for a possible future?* Resolve human conflicts, rescue family, discover the outbreak's origin, and complete a regional joint operation.

These arcs are **story divisions**, **not** new save or death mechanics. A separate release-volume model is recommended, but it must not silently change campaign canon.

## Overall act table

| Act | Working title | Status | Primary gameplay verb | Signature location / set piece | Narrative payoff |
|---|---|---|---|---|---|
| P | The Approach | Locked | **Survive / learn** | Roadside, checkpoint, commercial district | Crew arrives at Northline General |
| 1 | Nightfall | Locked; built reported | **Hold / restore** | Multilevel hospital, helipad | First evidence, helicopter extraction |
| 2 | Descent | Locked | **Descend / infiltrate** | Corporate tower and hidden tunnel | Company connection confirmed |
| 3 | The Vault | Locked | **Recover / protect** | Pharmacy freezer vault, Patient O | Scientist and original sample found |
| 4 | Daybreak | Locked | **Escape / extract** | Dawn street chase, flare extraction | Crew reaches survivor camp |
| 5 | Last Refuge | Working expansion | **Build / defend** | Outskirts camp, perimeter crisis | The camp becomes a character |
| 6 | Broken Roads | Working expansion | **Drive / transport** | First car drive, roadblock, convoy | Supply lifeline opens |
| 7 | Dead Air | Working expansion | **Reconnect / scout** | Relay station, radio center | Survivor network restored |
| 8 | Blackwater | Working expansion | **Navigate / restore** | Flood control and harbor pumps | Drinking-water capability recovered |
| 9 | Fault Lines | Working expansion | **Negotiate / breach** | Contested depot, threatened settlement | Human relationships have consequences |
| 10 | Ghost Signal | Working expansion | **Investigate / rescue** | Old Town homes, shelter, last evacuation | Family thread gets personal payoff |
| 11 | Ground Zero | Working expansion | **Expose / contain** | Original corporate research complex | Leak history verified; research path established |
| 12 | First Light | Working expansion | **Coordinate / evacuate** | Military perimeter, airfield and camp | Regional victory with global stakes intact |

### Why twelve?

The earlier fourteen-act draft separately featured military containment, broad regional breakdown and a final evacuation. Those can become **Act 12's three major mission phases**, avoiding a repetitious sequence of ever-larger sieges. A tighter campaign has more deliberate escalation. It is **not** a mandate to ship twelve acts at once.

### Scope language

A **story act** = a narrative chapter. An **operation** = one playable deployment or seamless mission sequence. A **mission beat** = an objective sequence inside an operation. Some acts may have multiple deployments. Do not require a separate map/build/release for every beat.

---

# 4. COMPLETE ACT-BY-ACT MISSION BIBLE

Each new mission specifies: **objective**, **what the player actually does**, **complication**, **payoff**, and a **reusable system**. Specific timings, voice lines, and branches are placeholders pending production review.

## PROLOGUE — THE APPROACH [LOCKED]

P01–P05 as in §2.2. Its job is to teach basic movement, danger recognition, barricades, supplies, objectives, cooperative assistance, alternate routes and extraction under rising pressure. **Do not rebuild the prologue as five wave arenas.**

## ACT 1 / OPERATION 001 — NIGHTFALL [LOCKED / BUILT REPORTED]

**Identity:** A vertical emergency-power puzzle under wave pressure.  
**Arc:** Stranded responders become witnesses to a concealed biological emergency.  
**Keep:** The six existing areas and their wave counts/objectives.  
**Improve only after code audit:** environmental hints between floors, distinct lighting/audio/line-of-sight, survivor voices, clear cross-floor power feedback and meaningful roof payoff.  
**Do not change:** the existing floor order, exact built-objective sequence or helicopter extraction without a separate approved change.

## ACT 2 / OPERATION 002 — DESCENT [LOCKED; PRESENTATION DETAILS PROPOSED]

**Identity:** Reverse vertical assault plus information gathering.  
**Primary verbs:** descend, reroute, expose.

- **02-A / Corporate Reception:** Enter a partially locked-down company tower; access lower floors through access-control choices instead of killing every infected. *Reuse:* keycards, power circuits, readable environmental clues.
- **02-B / Stairwell Descent:** One section requires movement under pressure, another a quiet detour around a dangerous nest. A Brute threatens a barricaded escape route. *Reuse:* sound AI, path blocking, alternate exits.
- **02-C / The Private Tunnel:** Find evidence of how the scientist was moved; use the known car-battery solution to unlock access; transition toward the pharmacy. *Reuse:* repair/transport interaction, mission state, tunnels.

**Story purpose:** Connect hospital clues to corporate logistics. Scientist stays mostly radio-only; no premature vault reveal.

## ACT 3 / OPERATION 003 — THE VAULT [LOCKED; PRESENTATION DETAILS PROPOSED]

**Identity:** A tense specimen-recovery heist with time pressure and horror.  
**Primary verbs:** breach, recover, contain.

- **03-A / Public Pharmacy:** Secure a practical entry without drawing the entire district. Find access routes and defenses. *Reuse:* alternative entrances, sound, tactical doors.
- **03-B / The Cold Room:** Restore backup freezer power and manage a time-sensitive unlock; collect evidence and protect unique specimen-handling equipment. *Reuse:* power circuits, timed interactions, special-item inventory.
- **03-C / Patient O:** The mutation threatens the extraction, forcing movement between limited cover and controlled spaces. Complete the rescue of the scientist and sample. *Reuse:* boss behavior, adaptive encounter stages, scripted companion extraction.

**Story purpose:** Confirm the original sample's uniqueness. The scientist is a protected story companion after reveal, not a fragile AI-follow experiment.

## ACT 4 / OPERATION 004 — DAYBREAK [LOCKED; PRESENTATION DETAILS PROPOSED]

**Identity:** Mobile escape across an open-feeling city district, not another stationary siege.  
**Primary verbs:** move, signal, extract.

- **04-A / The Street Run:** Choose between safer long routes and dangerous shortcuts; avoid unnecessary stands. *Reuse:* route blockers, local alarms, chase pacing.
- **04-B / Flare Point:** Reach the known park/field and signal the recurring air crew; hold for pickup using changing cover. *Reuse:* simple extraction controller and radio callbacks.
- **04-C / Flight and Arrival:** Cinematic transition to outskirts camp with crew, rescued scientist and relevant survivors. Broadcast hints of wider collapse. *Reuse:* story transitions, persistence.

**Story purpose:** Conclude the original opening arc. **The helicopter extraction succeeds.** The first playable car drive happens in a later crisis.

## ACT 5 — LAST REFUGE [WORKING EXPANSION]

**Identity:** The first *place* players want to protect. Contrast with four acts of desperate movement.  
**Primary verbs:** establish, choose, defend.  
**Location kit:** Camp tents, garages, storage, perimeter, adjacent fields, short access road.

### 05-A / Inventory of the Living

- **Goal:** Assess medical, water, shelter, fuel, generator and perimeter needs.
- **Player actions:** Meet returning survivors; inspect facilities; choose a first repair; make a limited shared-resource decision.
- **Complication:** Different survivors need the same scarce supply.
- **Payoff:** Camp changes visibly; scientist is given a protected research space.
- **Reuse:** Three-panel camp UI, resource ledger, facility states, brief dialogue events.
- **Pacing:** Mostly quiet; no mandatory horde.

### 05-B / The Missing Delivery

- **Goal:** Investigate a vanished supply delivery on the outskirts.
- **Player actions:** Follow clues, inspect vehicles, choose what to carry, help stranded survivors, return with limited cargo.
- **Complication:** A high-value item competes with room for rescued civilians.
- **Payoff:** First meaningful tradeoff between supplies and people; named survivor callbacks.
- **Reuse:** Search, contextual cargo, recovery mission, extraction zone.

### 05-C / Last Refuge

- **Goal:** Defend the settlement through a first escalating siege.
- **Player actions:** Prepare two or three perimeter points, assign simple defenders, repair a generator, fall back if breached, counterattack final chokepoint.
- **Complication:** Loss of power makes one defense ineffective; no arbitrary unavoidable camp destruction.
- **Payoff:** Camp remains standing with visible scars and repairs. A message identifies fuel and mobility as next priorities.
- **Reuse:** Camp siege phases, circuit priority, traps, after-action report.

**Signature moment:** Player retreats from a broken fence to an interior medical triage yard while survivors move supplies behind them.

## ACT 6 — BROKEN ROADS [WORKING EXPANSION]

**Identity:** The open road turns the environment into the objective.  
**Primary verbs:** recover, drive, escort.  
**Location kit:** Hospital exterior return path, garage, two road segments, fuel yard, overpass.

### 06-A / Bay E05

- **Setup:** Later air extraction is unavailable/aborted due to changing conditions; this does **not** negate Act 4's successful rescue.
- **Goal:** Recover the scientist's dark-blue **El Cajon car** from Northline General's E05 bay as a practical transport alternative.
- **Player actions:** Enter the compromised garage, find the car, hotwire/start it using a simple contextual interaction, choose a breakout route.
- **Complication:** The engine attracts infected and the garage exit is blocked.
- **Payoff:** **First playable driving mission**, honoring the established car thread.
- **Reuse:** Story car flag, simple vehicle controller, noise, destructible blocker via authored interaction.

### 06-B / Running on Empty

- **Goal:** Recover fuel and spare parts without emptying the team's medical supplies.
- **Player actions:** Scout pumps, restore power, run a fuel transfer, defend the refueling area, load cargo.
- **Complication:** Vehicle capacity and rising noise force a time/loot decision.
- **Payoff:** The camp secures short-term transport capability.
- **Reuse:** Resource nodes, loading, timed work, defense trigger.

### 06-C / Broken Convoy

- **Goal:** Escort a short transport convoy to a neighboring survivor route.
- **Player actions:** Drive sections, stop at a roadblock, defend while clearing passage, stabilize an injured passenger, choose a detour.
- **Complication:** A damaged vehicle limits speed and its cargo must be partially transferred.
- **Payoff:** The crew establishes its first reliable ground supply route.
- **Reuse:** Vehicle states, escort waypoint, roadside repair, mission outcome grading.

**Signature moment:** Co-op teammates dismount and defend opposite sides of a stranded convoy while one player repairs and another loads survivors; solo uses an alternate simplified sequence.

## ACT 7 — DEAD AIR [WORKING EXPANSION]

**Identity:** The difference between loud and quiet matters.  
**Primary verbs:** scout, bypass, restore.  
**Location kit:** Hill road, relay tower, broadcast office, service tunnels.

### 07-A / The Silence

- **Goal:** Determine why the regional emergency broadcast stopped.
- **Player actions:** Follow inconsistent transmissions; investigate abandoned broadcast equipment; discover the damage was not caused by infected alone.
- **Complication:** A loud approach draws a substantial infected cluster to the tower.
- **Payoff:** Discover a partial list of communities still transmitting.
- **Reuse:** Radio clues, stealth/noise, evidence journal.

### 07-B / High Ground

- **Goal:** Restore a hilltop relay before weather closes the route.
- **Player actions:** Approach through two entry routes, power the station, align antenna at two endpoints, defend an engineer or remote repair device.
- **Complication:** The relay's lights and equipment attract nearby infected; player chooses power priorities.
- **Payoff:** Reconnect with the pilot/copilot air crew and scattered settlements.
- **Reuse:** Multi-step machinery, weather visibility, power circuits, limited defense.

### 07-C / False Instructions

- **Goal:** Verify an emergency evacuation signal that may route civilians into danger.
- **Player actions:** Trace the source, inspect logs, confront or negotiate with the responsible survivor group, send corrected instructions.
- **Complication:** Communications require the crew to reveal their presence.
- **Payoff:** Earn credibility and uncover the first credible family-related broadcast lead.
- **Reuse:** Investigation flags, relationship outcomes, dialogue/interaction, broadcast system.

**Signature moment:** On a windswept tower, the crew has to choose between keeping bright repair lights on and staying hidden from infected below.

## ACT 8 — BLACKWATER [WORKING EXPANSION]

**Identity:** Water and industrial infrastructure control the route. Not another corridor zombie rush.  
**Primary verbs:** navigate, reroute, salvage.  
**Location kit:** Riverside flood channel, pump station, treatment plant, bridge access.

### 08-A / High Water

- **Goal:** Prevent polluted floodwater from disabling a nearby survivor community's intake.
- **Player actions:** Scout flooded paths, open two control points, traverse catwalks, avoid hazardous energized areas.
- **Complication:** Water rises in authored stages, changing walkable routes.
- **Payoff:** Protect a clean-water supply and reveal corporate waste transport records.
- **Reuse:** Environmental state graph, water-plane stages, valves, hazard volumes.

### 08-B / Under Pressure

- **Goal:** Recover treatment components from a partly submerged plant.
- **Player actions:** Cut local power, descend into a service tunnel, recover a bulky filter assembly, restore exit access.
- **Complication:** Limited visibility and one-way sections create tension; no open swimming system required.
- **Payoff:** The camp gains a substantial water upgrade.
- **Reuse:** Special cargo, portable light, environmental audio, alternate safe route.

### 08-C / Spillway

- **Goal:** Escort survivors and recovered equipment across a failing spillway.
- **Player actions:** Move between changing defensive points, operate a gate, recover one optional stranded group, escape as water cuts the original route.
- **Complication:** The apparent best route becomes impassable; a previously scouted alternate remains viable.
- **Payoff:** A regional alliance becomes feasible through access to clean water.
- **Reuse:** Escort, retreat route, extraction, environmental variation.

**Signature moment:** A huge floodgate opens while infected are attempting to cross an upper maintenance bridge; players must move as the landscape changes. No full fluid simulation.

## ACT 9 — FAULT LINES [WORKING EXPANSION]

**Identity:** Other people have their own needs, and the best outcome is not always another firefight.  
**Primary verbs:** negotiate, investigate, breach.  
**Location kit:** Contested supply depot, inhabited block, market yard, improvised checkpoint.

### 09-A / Split Claim

- **Goal:** Resolve a dispute over medicine/food arriving at a shared depot.
- **Player actions:** Investigate stock, meet two leaders, compare records, trade or propose an escort arrangement.
- **Complication:** One group has urgent needs and incomplete information; no omniscient morality meter.
- **Payoff:** Relationship and supply-route consequences.
- **Reuse:** Barter UI, conditional mission flags, dialogue, shared team vote.

### 09-B / Doors Shut

- **Goal:** Locate missing evacuees inside a settlement that is refusing contact.
- **Player actions:** Choose a quiet service entry, negotiated entry or forced breach depending on intelligence and conditions; search rooms for people, not loot.
- **Complication:** Defensive humans can be panicked rather than malicious. Hostile combat is a *possible* outcome, not guaranteed.
- **Payoff:** Evidence of worsening regional strain and a survivor who knows the family's evacuation route.
- **Reuse:** Alternate entry, tactical door, nonlethal/avoidance options, rescue.

### 09-C / Shared Wall

- **Goal:** Help two communities withstand an infected attack on a common evacuation corridor.
- **Player actions:** Divide supplies, coordinate two defense sites, move defenders between them, protect families in transit.
- **Complication:** No single group has enough equipment; alliances change resources available to the player.
- **Payoff:** Credible regional cooperation without turning factions into RPG score bars.
- **Reuse:** Multiple objective zones, survivor defenders, defense phases, after-action relationships.

**Signature moment:** A contested checkpoint becomes a joint defense line, and earlier negotiations determine who arrives with help.

## ACT 10 — GHOST SIGNAL [WORKING EXPANSION]

**Identity:** The crew stops chasing abstract clues and searches for actual people.  
**Primary verbs:** trace, search, rescue.  
**Location kit:** Old Town residences, emergency records office, shelter, outbound road.

### 10-A / Names on the Frequency

- **Goal:** Trace a credible family-related call and evacuation record.
- **Player actions:** Listen to broadcasts, compare a manifest to older clues, locate the correct district.
- **Complication:** The lead is incomplete; evidence distinguishes where people *were* from where they *are*.
- **Payoff:** Family rescue arc advances without magical certainty.
- **Reuse:** Journal and evidence links, broadcast, investigation markers.

### 10-B / Empty Houses

- **Goal:** Search a neighborhood for traces of a departure and possible survivors.
- **Player actions:** Choose which houses to enter; locate possessions, a handwritten route note, and an accessible back-lane passage; avoid waking a dangerous infected cluster.
- **Complication:** A quiet mission may become a pursuit if alarms are triggered, but success doesn't require shooting every room.
- **Payoff:** A shelter designation is confirmed.
- **Reuse:** Search objects, ambient AI, optional evidence, stealth route.

### 10-C / Shelter Zero

- **Goal:** Reach an evacuation shelter whose generator failed.
- **Player actions:** Restore emergency light, locate trapped people, stabilize injuries and open a secured exit.
- **Complication:** The extraction vehicle cannot carry both all optional supplies and rescued civilians; choices are explicit and recoverable.
- **Payoff:** A **meaningful but bounded family-thread resolution**; named characters and outcomes require a dedicated later Forge story decision, not automatic random generation.
- **Reuse:** Rescue, medical supply, cargo/passenger tradeoff, conditional dialogue.

### 10-D / Last Departure

- **Goal:** Escort the survivors through the final block to transportation.
- **Player actions:** Protect moving evacuees, clear barricades, respond to one stalled vehicle and reach a safe corridor.
- **Complication:** Infected pressure forces movement, not prolonged wave farming.
- **Payoff:** Personal story stakes connect back to the camp.
- **Reuse:** Escort, chase, vehicle repair, extraction.

**Signature moment:** A low-combat search through a familiar-looking neighborhood turns into an urgent rescue when evacuation records prove some missing people may still be nearby.

## ACT 11 — GROUND ZERO [WORKING EXPANSION]

**Identity:** Detective work becomes a hostile research-site expedition.  
**Primary verbs:** expose, contain, recover.  
**Location kit:** Exterior campus, security checkpoint, archive, containment lab, escape tunnel.

### 11-A / The Original Site

- **Goal:** Verify the scientist's account using original company records.
- **Player actions:** Enter a remote corporate complex, access the archive through two alternative routes, piece together chronological evidence.
- **Complication:** The site's emergency security protocols block some entrances; a reactor/generator hazard limits safe access.
- **Payoff:** Establish the accidental leak and subsequent concealment as documented truth.
- **Reuse:** Security keycard, environmental evidence, power routing.

### 11-B / Containment Protocol

- **Goal:** Recover specialized equipment needed to compare the preserved sample against contaminated research materials.
- **Player actions:** Secure a clean work area, route filtered air/power, handle specialized sample containers, guard one slow equipment transfer.
- **Complication:** Damage can compromise *optional* specimens, but the unique campaign sample has protected recovery logic.
- **Payoff:** Scientist narrows the scope of a viable treatment/research direction.
- **Reuse:** Specimen state, research stations, equipment hold, contamination zones.

### 11-C / The Last Record

- **Goal:** Recover final incident data while the facility becomes unstable.
- **Player actions:** Move through dark sectors, use countermeasures against advanced mutations, avoid hazardous shutdown sections, exit through an unexpected maintenance route.
- **Complication:** Infected converge toward research materials; not every threat can be defeated by holding a doorway.
- **Payoff:** The crew possesses a defensible chain of evidence and a path to further scientific work—**not an instant cure**.
- **Reuse:** Threat-based AI, alternate evacuation, evidence chronicle, unique-item recovery.

**Signature moment:** In a dark containment corridor, the team sees original corporate timelines contradict early public broadcasts; the horror is both biological and institutional.

## ACT 12 — FIRST LIGHT [WORKING EXPANSION]

**Identity:** A finale that combines what the players learned instead of simply spawning the largest wave.  
**Primary verbs:** coordinate, defend, evacuate.  
**Location kit:** Outskirts staging area, military quarantine corridor, airfield, camp epilogue.

### 12-A / Three Calls

- **Goal:** Coordinate a regional medical/equipment evacuation before roads and air access close.
- **Player actions:** Review incomplete intelligence, allocate available transport/cargo, request help from communities with whom the crew has relationships.
- **Complication:** No plan can save every resource; essential story goals remain viable independent of perfect reputation.
- **Payoff:** Earlier decisions visibly affect available optional support.
- **Reuse:** Deployment, allies-as-events, resource ledger, team vote.

### 12-B / Perimeter Fall

- **Goal:** Clear a safe corridor through an overrun military perimeter.
- **Player actions:** Help defenders on one flank, cross a broken checkpoint, operate an emergency gate, then retreat to a secondary line.
- **Complication:** There are **two or three controlled encounter zones**, not a real-time simulation of an army. Distant battles convey scale.
- **Payoff:** The convoy reaches the airfield staging zone.
- **Reuse:** Tactical objective zones, retreat, scripted ambient combat.

### 12-C / Lift Window

- **Goal:** Keep essential scientists/survivors, the original sample and research records secure through a scheduled extraction.
- **Player actions:** Restore lighting, cover fuel operations, protect evacuation queues, respond to a terminal power failure, complete a final extraction under pressure.
- **Complication:** The crew must prioritize moving people and research over optional equipment; the route changes when a gate fails.
- **Payoff:** A significant regional evacuation succeeds; the scientific record survives intact.
- **Reuse:** Airfield defense, power circuits, evacuation controller, cargo priority.

### 12-D / The Morning After

- **Goal:** Walk through a calmer, visibly changed camp/receiving site and hear the next honest emergency broadcast.
- **Player actions:** Speak with survivors, inspect records, see acknowledgments of losses, future university/lab contacts and family-thread effects.
- **Complication:** The wider world remains in crisis; research will take more time.
- **Payoff:** **A real ending to this regional story**, with a durable foundation for later campaigns.
- **Reuse:** Chronicle, survivor NPC callbacks, persistent achievements, world-state epilogue.

**Signature moment:** Helicopters lift off over a defended evacuation corridor; the final broadcast describes one region finally organizing a response while other regions remain dark.

### Finale guardrails

- Don't resolve the worldwide outbreak with one button or serum.
- Don't reset survivor relationships at the finale.
- Don't require any particular optional alliance to finish.
- Don't place all players in a long unskippable cutscene.
- Don't make the finale only a larger version of the hospital rooftop hold.

---

# 5. WHY THESE MISSIONS FEEL DIFFERENT

## Dominant interaction matrix

Legend: `●` dominant, `○` supporting. Each act must be differentiated by what players **do**.

| Act | Waves/defense | Mobile escape | Investigation | Stealth/tactics | Vehicle/cargo | Environmental operation | Diplomacy/camp |
|---|---|---|---|---|---|---|---|
| 1 Nightfall | ● | ○ | ○ | | | ○ | |
| 2 Descent | ○ | ○ | ● | ● | | ○ | |
| 3 Vault | ○ | ● | ● | ○ | ○ | ● | |
| 4 Daybreak | ○ | ● | | | | | |
| 5 Last Refuge | ● | | ○ | | ○ | ○ | ● |
| 6 Broken Roads | ○ | ● | | | ● | ○ | |
| 7 Dead Air | ○ | ○ | ● | ● | | ● | ○ |
| 8 Blackwater | ○ | ● | ○ | | ○ | ● | |
| 9 Fault Lines | ○ | | ● | ● | ○ | | ● |
| 10 Ghost Signal | ○ | ● | ● | ● | ○ | | ○ |
| 11 Ground Zero | ○ | ● | ● | ● | ○ | ● | |
| 12 First Light | ● | ● | ○ | ○ | ● | ○ | ● |

### Level-design constraints

- **Never three consecutive major operations with the same primary verb.**
- Each act gets **one memorable mechanic or set piece**, not five untested new systems.
- Every act has a **quiet beat**, **complication**, **climax**, and **aftermath**; some can occur in the same mission.
- At least one location per act changes routes or tactical options due to **player action**, not just random enemy placement.
- Unique mechanics should be reusable in at least **two** operations or existing systems unless their production cost is tiny.
- Avoid spamming “restore three switches,” “hold 90 seconds,” “find keycard,” or “reach flare” as the default pattern. Existing missions may retain these when canon requires.
- There is no need for endless procedurally generated buildings: a few authored environments with controllable variations create better FPS pacing.

## Reusable mission verbs

`REACH`, `SEARCH`, `INVESTIGATE`, `CLEAR`, `DEFEND`, `REPAIR`, `REROUTE_POWER`, `OPERATE_MACHINERY`, `ESCORT`, `LOAD_CARGO`, `DRIVE`, `RECOVER_VEHICLE`, `RESCUE`, `NEGOTIATE`, `CONTAIN`, `SURVIVE_PURSUIT`, `SIGNAL`, `EXTRACT`, `MAKE_DECISION`.

A **mission recipe** combines 2–4 verbs, a strong location, an unexpected but fair complication, and a narrative consequence.

### Example recipes (for reuse)

1. **Silent approach → terminal access → communications broadcast → escape pursuit.**
2. **Drive to depot → pump fuel → defend machinery → choose limited cargo → extract.**
3. **Negotiate access → investigate occupied rooms → rescue civilians → share or withhold evidence.**
4. **Set traps → defend outer wall → fall back to generator → evacuate wounded.**
5. **Follow radio clue → search homes → disable alarm → rescue family contact.**
6. **Enter pump station → isolate power → raise gate → route changes → extract under rising water.**

## Mission failure design

- **Main objectives:** failure may mean mission failure or death; essential campaign-critical items always have a recovery path.
- **Optional objectives:** may fail without softlocking progression.
- **Partial extraction:** keep a subset of supplies or people when possible.
- **Shared choices:** major decisions use established co-op voting behavior; timers do not run while players are offline.
- **Difficulty:** scarcity and aggression scale while preserving counters, sightlines, readable hazards and solo alternatives.

---

# 6. COMBAT, AI AND ENCOUNTER SYSTEMS

## Enemy philosophy

Every mutation changes positioning, equipment choice, and urgency. More HP is rarely enough to create a distinct enemy.

| Established enemy | Primary pressure | Readable counter |
|---|---|---|
| Standard infected | Numbers and route obstruction | Discipline, spacing, weakpoints, environment |
| Runner | Speed and flank pressure | Early audio/visual detection, controlled lanes |
| Brute | Breaks barricades, forces repositioning | Exposed weakpoints, coordinated fire, movement |
| Screamer | Escalates local threat with calls | Identify and interrupt before the call |
| Crawler | Low approach and cluttered spaces | Ground-level awareness and positioning |
| Bloater | Hazard/area denial | Distance, avoidable detonation or environmental response |
| Armored | Breaks simple damage habits | Weakpoints, flanks, appropriate tools |
| Patient O | Authored narrative mutant | Boss stages specifically designed for the vault |

**Additional mutations are `PARKED`** until existing AI and encounter budget are stable. If a later act requires one, prioritize a single *new movement or coordination behavior* with clear cues over a large enemy roster.

## Encounter director — practical, not magical

Inputs: operation phase, active players, local combat intensity, noise sources, safe zones, known mutations, encounter budget, and regional conditions.  
Outputs: choose **authored** spawn doors/approaches, bounded composition, limited reinforcement timing, retreat pressure and quiet windows.  
Never: spawn inside direct player view, spawn on rescue objectives, ignore stealth/noise rules, or create unwinnable hallway stunlock.

### Encounter patterns

- **Pressure from behind:** encourage movement rather than camping.
- **Intercept:** infected move toward a noisy route, leaving a quieter alternate available.
- **Hold then relocate:** defend while operating a task, then retreat before overwhelming numbers.
- **Dual-front defense:** split the team or use solo-friendly automated support.
- **Escort vulnerability:** pressure arrives at predictable but varied moments, not permanent escort health-drain.
- **Mutation teaching:** introduce a counter safely, then combine with other pressures later.

## Human conflict

- Mostly **relationships, obstacles, suspicion, and negotiation**.
- Rare hostile humans have distinct motivations and can retreat or stand down. No indiscriminate human-killing reward loop.
- Human tactical combat needs separate cover/visibility/communication logic; **do not implement full shooter-versus-shooter AI before the existing infected AI is solid**.
- The player's choices may change **who helps**, not rewrite major established history.

## Tactical equipment

Existing focus: barricades, traps, medical tools, lights, environmental controls, field research.  
Possible limited additions when needed by a mission: compact door breach tool, portable sensor, cable/valve tool, flare, smoke/distraction tool, simple vehicle repair kit. Avoid bloated attachment trees and complex inventory juggling.

---

# 7. WORLD, TRAVEL AND MAP STRATEGY

## The region as connected missions

Keep the world **mission-based**, not seamless open-world. Use a shared regional map/briefing plus recognizable route transitions. NPC radio reports, persistent consequences, repeated landmarks, and intermittent driving create world continuity.

| Region | Gameplay identity | Primary act association |
|---|---|---|
| City Centre | Hospital, tower, dense roads, commercial district | Prologue / 1–4, later E05 return |
| Outskirts | Camp, open fields, access roads, defensive structures | 5, 12 |
| Highway / industrial fringe | Convoys, fuel, bridges, roadside recovery | 6 |
| West End / high ground | Communications, suburban edge, relay | 7 |
| Riverside / harbor | Flood controls, water treatment, bridge/island | 8 |
| Old Town / contested districts | Trade, homes, shelter investigations | 9–10 |
| Remote corporate site | Original facility, containment security | 11 |
| Military perimeter / airfield | Large staged objectives and evacuation | 12 |

### Travel presentation

- Routine travel: concise cinematic/radio transition or quick loading scene.
- Playable driving: only where driving itself creates a decision or encounter.
- Mission board indicates travel threats, cargo and available routes; not everything requires live navigation.
- A vehicle's speed, size, condition and passenger capacity matter, but do not construct a heavy driving simulation.
- When aircraft extract the crew, they are actual recurring characters, not a universal teleport button.

### Environmental mechanics

- **Weather:** curated dramatic weather for story missions; event-driven variations at camp and optional regional jobs. No real-time background progression while offline.
- **Water:** stepped state transitions and authored nav/physics triggers. **No fluid simulation**, no full swimming subsystem required.
- **Power:** small circuit graphs with prioritized loads; clear UI/light feedback.
- **Destruction:** designated barricades, doors, gates and cover states; no global voxel destruction.
- **Large fights:** a few active zones with distant sound, smoke, vehicle movement and radio events creating the rest of the perceived battlefield.

---

# 8. CHARACTER, STORY AND RELATIONSHIP STRUCTURE

## Core recurring story roles — canon

- **Player crew:** friends / acquaintances with emergency-response and some military competence; the solo protagonist is viable.
- **Pilot:** recurring extraction and logistics presence.
- **Female copilot:** recurring extraction and communications presence; do not reduce to one-off voice.
- **Scientist:** created/connected to the virus and holds the pure sample; first physically encountered in vault; later camp/research role. His credibility is complicated by responsibility, but do not turn him into a stock evil mastermind without a new decision.
- **Patient O:** established hospital/lab horror thread, mutation near vault.
- **Previously rescued civilians:** return at camp and may offer optional information, labor or call-backs.

## Proposed character-arc beats

| Arc | Early | Middle | Late |
|---|---|---|---|
| Crew | Rescue the trapped | Become regional responders | Coordinate joint survival operations |
| Scientist | Mysterious radio voice | Protect fragile research and deal with guilt | Present a credible treatment/research path, not miracle cure |
| Air crew | Hospital extraction | Weather, fuel and danger constrain rescue | Help stage region-wide evacuation |
| Named rescued survivors | Prologue and hospital encounters | Camp contributions and requests | Remember actions and appear during finale |
| Family search | Hints from broadcasts | Credible route and shelter evidence | Concrete narrative payoff, outcome to be authored later |
| Communities | Strangers with scarce resources | Trade, distrust, cooperation | Support changes finale logistics |

## Fixed truths vs theories

**Confirmed history:** accidental corporate leak, pre-collapse timing, cover-up/communication failures, scientist moved to pharmacy, pure sample, Patient O trail.  
**Optional investigations:** internal decisions, who hid reports, which evacuation instructions were wrong, what surviving executives knew.  
**In-world rumors:** supernatural meanings of “the mother,” certainty about cures, suspected conspiracies. **Do not silently promote rumors to fact.**

## Three revelation checkpoints

1. **Act 3:** The sample and scientist exist; a real chain of evidence begins.
2. **Act 7–9:** Survivor broadcasts and independent records reveal regional misinformation and contested priorities.
3. **Act 11:** Original lab records establish the actual incident and realistic limits of medical research.

## Dialogue and tone

Action-movie tension with dry humor, human reactions and brief comms; not a constant one-liner factory. Short radio cuts and minimal forced cinematics keep the player involved. Emergency broadcasts should deliver both information and emotional geography.

---

# 9. CAMP, VEHICLES, ECONOMY AND RESEARCH — INTEGRATION RULES

## Camp: a playable hub, not a second full management game

Three screens at most for recurring decisions:

1. **Operations board:** Main story, optional leads, regional conditions, active agreements.
2. **Camp status:** Shared food/water/medicine, morale, facilities, survivor wellness, defenses, research.
3. **Deployment:** Personal kit, shared supplies, vehicle roster/cargo, team ready state.

Story progression must never require grinding an arbitrary camp-upgrade bar. Facilities improve support; essential progress always has a baseline route.

## Resource model

- **Personal inventory:** Weapons/ammo, medical, water and limited mission gear.
- **Shared camp inventory:** Supplies and materials; server-authoritative spend/receive events in co-op.
- **Vehicle cargo:** Category capacity, special large objects and passenger tradeoffs; physical handling only for authored key items.
- **Specimen storage:** Special containers and condition state for optional research; pure campaign sample protected.
- **Barter:** Contextual exchanges with distinct communities; no global gold currency or endlessly profitable loops.

## Vehicle rules

- One simple first-drive implementation for **Act 6 / Bay E05**; validate camera, throttle/brake, collision, co-op passenger handling, mission transition before adding many vehicles.
- Later vehicles differentiate **capacity vs maneuverability vs durability**; simplified fuel/body/tires/engine condition, not mechanical engineering simulator.
- Stories must permit recovery after damage or running out of fuel without softlocking objectives.
- Camp garage supports repairs, storage, upgrades and recovery; upgrades bounded and visible.

## Science

Research exists to make survival smarter, not instantly solve the plot. Early applications: understanding mutations, safe specimen handling, environmental protection, situational medical improvements, trap/barricade enhancements. Larger treatment work remains a story-long scientific challenge with outside collaborators.

## Survivor economics

- Named groups with beliefs, shortages, and limited services.
- Negotiations alter specific agreements and relationships.
- Group reputation is not an abstract universal morality meter.
- Trade missions can create optional escort/recovery objectives.
- Time pressure reflects active campaign events; no ticking deadlines while logged off.
- Failed contracts can close optional opportunities, but never delete essential progression.

---

# 10. PLAYER EXPERIENCE: PACING, REPLAY AND ACCESSIBILITY

## A good 30–45-minute story session (target structure, not fixed duration)

1. **Brief:** Know *why* the objective matters and what supplies are at risk.
2. **Approach:** Travel, discovery, tension, early environmental hints.
3. **Main task:** Something interactive beyond just shooting.
4. **Complication:** New threat, lost route, broken equipment or human conflict.
5. **Crisis:** Fight, pursuit, hard choice or extraction.
6. **Aftermath:** At least one visible consequence and clear next lead.

Long acts may contain multiple sessions; avoid requiring uninterrupted marathon play.

## Quiet beats

Walkable camp aftermaths, survivor talks, radio listening, abandoned neighborhoods, science investigation and brief travel are **essential**. Keep long stretches of constant wave combat for rare, memorable peaks.

## Replay

Vary controlled enemy composition, some optional routes, regional weather, supplies, survivor requests, and difficulty modifiers. **Do not randomize** the scientist's identity, original leak facts, the act sequence, or authored family revelations into incoherence.

## Co-op and solo

- Important co-op choices use established voting / tie handling.
- Every simultaneous-cooperation requirement gets a solo equivalent: longer interaction, limited automated support, or a designed alternate route.
- No mandatory class role; backgrounds provide small meaningful perks and contextual information.
- Some mission beats offer multiple useful cooperative tasks without forcing them.
- Include alternate difficulty/accessibility cues for fog, flashing, low light, audio-only clues and narrow timing windows.

---

# 11. TECHNICAL HANDOFF — CONCEPTUAL SYSTEM BOUNDARIES

**The repository decides specific framework and file organization.** This is an implementation *contract*, not a request to rewrite an existing architecture.

## Independent systems

| System | Owns | Publishes or consumes |
|---|---|---|
| Campaign director | Active operation, unlocked beats, transitions, immutable story facts | Objective events, narrative flags, checkpoint/resume |
| Objective controller | Reusable progress rules, success/failure, UI | `objective_started/completed/failed` |
| Encounter director | Local threat budget, phase, spawn volumes and mutation set | Noise, players alive, objective phase |
| Infected AI | Detection, navigation, attack role, local alerts | Player noise, visibility, environment |
| Inventory/resources | Personal/shared amounts, reservations, capacity | Pickup, spend, transfer, recover |
| Vehicle manager | Roster, condition, occupants, cargo, deployment | Repair, load, drive, extract |
| Camp state | Facilities, power, survivor wellbeing, security | Resources, missions, after-action |
| Region state | Depletion, weather, rumors, allied access | Scouting, extraction, camp missions |
| Relationship/contract ledger | Group states, agreement terms and fulfillment | Dialogue, trade, mission outcome |
| Research/evidence | Clues, specimen condition, confirmed vs theory | Investigation, facility actions |
| Presentation | Radio, captions, brief cinematics, audio | Canonical gameplay events; no authority on game rules |
| Persistence | Versioned run state, joins, resumes | Only validated authoritative snapshots and events |
| Multiplayer authority | Shared decisions, valid state transitions, anti-duplication | All shared resource/objective events |

### Event integrity

- Shared rewards, supplies and trade fulfillment must be **idempotent**: one mission completion cannot grant the same item twice after reconnect/retry.
- Every objective change has a unique event ID, mission ID, phase and authoritative actor/context.
- Relevant story flags are append-only or carefully versioned when possible.
- Unique items such as the pure sample require exactly-one ownership and safe recovery.
- Co-op late joins receive authoritative campaign and objective snapshots; they must not replay item grants.
- Mission clients can animate outcomes locally, but must not decide shared inventory or story completion without authority.

### Mission configuration — conceptual schema

Fields: `operationId`, `actId`, `locationKit`, `startFlags`, `requiredObjectives`, `optionalObjectives`, `objectiveDependencies`, `allowedEnemyArchetypes`, `spawnBudget`, `environmentStates`, `radioEvents`, `successConditions`, `failureConditions`, `soloFallbacks`, `sharedDecisionPoints`, `rewards`, `persistentConsequences`, `retryPolicy`.  

**Do not create this schema verbatim without inspecting existing code.** The aim is a reusable data-driven mission layer so 40 objective beats do not become 40 isolated codebases.

### Browser and network budget

- Budget active AI by **encounter zone**, not by theoretical size of a military battle.
- Pool projectiles, infected and common effects where practical.
- Use LOD/visibility, shared materials and modular environment assets.
- Distant battles = audio, lights, smoke, silhouettes, scripted vehicle movement and sparse AI; not hundreds of synchronized combatants.
- Treat fog/rain/water as optimized effects and authored state transitions.
- Profile CPU/GPU/network separately in **solo**, **2-player**, and **4-player** cases before declaring success.
- Establish measured frame-time, memory and network budgets from test hardware rather than inventing universal hard limits in lore documentation.

---

# 12. ART / ENVIRONMENT PRODUCTION

## Reusable environment kits (prioritize by implementation phase)

1. **Hospital/city interiors** — preserve existing assets; reuse in tower/pharmacy/office.
2. **Urban streets and roadside** — prologue, Daybreak, return to E05.
3. **Outskirts camp** — hub, perimeter, staging, defense.
4. **Vehicle roadside kit** — fuel depot, highway obstacles, service station, convoy stops.
5. **Communications kit** — relay tower, radio room, hilltop utilities.
6. **Riverside industrial kit** — valves, pumps, walkways, treatment plant.
7. **Neighborhood/occupied settlement kit** — homes, market, barricaded checkpoint, shelter.
8. **Research/military kit** — sterile lab, security doors, perimeter, airfield staging.

**Use modular pieces**, not fully bespoke props for every mission: door types, cabinets, circuit panels, fuel pumps, generator, valves, gates, roadblocks, rescue gurneys, barricade mounts, radio equipment, cargo cases, flare point, vehicle repair zone.

## Signature art moments

- Act 1: Rooftop helipad under emergency lamps.
- Act 5: Camp at dusk with repaired perimeter and survivor activity.
- Act 6: Blue E05 car emerging from dark garage into blocked daylight.
- Act 7: Tower silhouette in rain or wind while signals flicker.
- Act 8: Floodgate and industrial channels changing level.
- Act 9: Two communities behind a single defensive line.
- Act 10: Evacuation notices and personal belongings in quiet houses.
- Act 11: Lab archive lit only by emergency systems.
- Act 12: Airfield evacuation with distant combat and first daylight.

## Cinematics

Prefer short in-engine camera-caption scenes and radio. Keep player control wherever possible. Record the same pilot/copilot voices as recurring continuity. Avoid large amounts of unique character animation before core gameplay is stable.

---

# 13. IMPORTANT PROPOSED CANON AMENDMENT — RUN FAILURE

## The conflict

Current **LOCKED CANON**: **a total team wipe resets the campaign run**, with act-start autosaves only for interrupted sessions. This is understandable for a compact wave shooter, but with a long 12-act narrative and dozens of mission beats it could push story-focused players away after losing many hours.

## Recommended solution (NOT LOCKED)

Offer **two selectable campaign rule sets** at *new-run setup*; maintain no permanent combat-power advantages in either:

### Story Campaign [PROPOSED AMENDMENT]

- On full-team wipe, retry the **current operation from its clean entry snapshot**.
- Reset that operation's temporary pickups, enemy state, cargo consumed and objectives to the saved entry condition. No duplication or reload farming.
- Preserve completed prior operations and story consequences already committed.
- A meaningful consequence could be an optional record/stats penalty, not a plot softlock.
- Act-start/resume remains separate from death-retry state.

### Hardcore Run [PRESERVES CURRENT FULL-WIPE RULE]

- Full-team wipe ends the current run. Start a fresh campaign run.
- Character lives, revives, scarcity and equipment risk remain consequential.
- Cosmetics, chronicles and non-power achievements may persist as already canon.

**Until explicitly approved**, all implementation and balancing must respect the pre-existing full-wipe rule. The above is a recommendation only, not permission for a coding assistant to change save logic.

### Design alternative if mode split is rejected

Keep original wipe semantics, but make the complete story available as **separately launched authored campaign volumes** only if explicitly approved as another canon change. Otherwise do not assume checkpoints grant death retries.

---

# 14. DEVELOPMENT ROADMAP — BUILDABLE VERTICAL SLICES

The expanded outline is a *content plan*, not one development sprint. The first deliverable is a polished **existing** playable loop.

| Milestone | Build / proof | Why now | Hard stop before next |
|---|---|---|---|
| **M0 Repo audit** | Inventory working hospital systems, network authority, performance, save model, assets | Prevent contradictions and duplicate architecture | Actual status list and regression path exist |
| **M1 Core operation** | Stable garage→roof gameplay, combat, waves, pickups, AI, objectives, extraction | Core fun is foundational | One complete solo + co-op test run passes |
| **M2 Prologue** | P01–P05 leading seamlessly into the hospital | Establish story, tutorial pacing, route variety | No repeated arena-only missions; save continuity verified |
| **M3 Opening arc** | Acts 2–4 with scientist, Vault, Patient O, Daybreak | Complete first narrative payoff | Acts 1–4 can be played in sequence; no story softlocks |
| **M4 Camp slice** | A hub + Act 5 including one resource recovery and one siege | First persistent systems with purpose | Camp state/repair/mission outcome persists |
| **M5 Vehicle slice** | E05 car recovery + one road/fuel convoy scenario | Tests driving before buying vehicle content | Solo/co-op driving and cargo failure recovery pass |
| **M6 Region slice** | Act 7 relay + Act 8 one flood-control operation | Prove stealth, machinery and hazard variation | Two missions feel different with reusable systems |
| **M7 People slice** | Act 9 trade/negotiation + Act 10 investigation/rescue | Human drama and consequences | No mandatory hostile-human-combat AI for first pass |
| **M8 Research slice** | Act 11 archive and laboratory recovery | Turns mystery into grounded payoff | Specimen/evidence/unique item state cannot duplicate |
| **M9 Finale slice** | Act 12 coordinated corridor/airfield/epilogue | Pays off relationships, vehicles and science | Full story resolves regionally; global continuity remains |
| **M10 Polish** | Scalable AI, accessible cues, difficulty modifiers, archives, performance | Reliability and replayability | Tested across target browsers and party sizes |

### Release recommendation

- **Initial playable campaign:** Prologue + Acts 1–4. This alone should feel like a completed story chapter.
- **First major expansion:** Acts 5–8, delivered through one proven vertical slice at a time.
- **Second major expansion:** Acts 9–12, after relationships, research, and co-op persistence are stable.

These are **release-planning recommendations**; they do not convert the single narrative campaign into separate permadeath runs unless approved.

### Vertical-slice acceptance checklist

- [ ] The mission has a specific narrative *reason*.
- [ ] Its main verb differs from recent missions.
- [ ] It works solo without relying on a human second player.
- [ ] It works with four players and disconnect recovery.
- [ ] Required objectives and unique items cannot softlock.
- [ ] Main/optional success and partial success are distinguished.
- [ ] Rewards/resources cannot be duplicated by retry or reconnect.
- [ ] Save/resume obeys existing canon.
- [ ] Environmental/AI cues are fair and readable.
- [ ] Existing hospital regression checks pass.
- [ ] Browser performance has been profiled rather than guessed.
- [ ] Content status and canon changes have been recorded.

---

# 15. DELIBERATE EXCLUSIONS / ANTI-FEATURE-CREEP

Not for the near-term roadmap:

- Seamless open-world Northline or a fully physically simulated city.
- 50 versus 50 online military battles or PvP modes.
- Hundreds of active zombie AI at once.
- True volumetric flood simulation or complex free swimming/diving.
- Destructible-everything building systems.
- Fully simulated trade markets and autonomous factions with every NPC running offscreen.
- Vehicle engine-part fabrication or realistic mechanical sim.
- Dozens of weapons/attachments and arbitrary rarity tiers.
- Large skill trees with permanent combat power between runs.
- Mandatory character classes or co-op-only progression locks.
- Procedurally random main plot or random family outcomes.
- A miracle cure at the end of the opening saga.

These can be reconsidered only when a clear player benefit and feasible implementation plan exist.

---

# 16. LOCKED STORYBOARD REFERENCE INDEX

**This index is a compact design summary, not a reconstruction of the original 130 full question texts.** Keep the source storyboard/archive for exact option wording and all narrative nuances.

## Q001–Q074 — Established design groups

- Core mission timeline, prologue P01–P05, Acts 1–4, scientist, sample, Patient O, recurring air crew and Northline history.
- Game sessions, co-op scaling, join/leave/disconnect, character lives, campaign save and full-wipe behavior.
- Health, water, inventory, downed states, revives, medical stabilization and supplies.
- Infected detection, threats, local alerts, mutation role behavior and fair spawning.
- Barricades, traps, engineering support, environmental hazards, defend/retreat tactics and solo/co-op viability.

> Exact Q001–Q074 option-by-option mappings are **not included in the available condensed canon handoff**. Do not invent them or claim this summary replaces their original transcript.

## Q075–Q100 — Character, evidence, replay and samples

| ID | Locked decision (condensed) |
|---|---|
| Q075 | Hybrid personal/shared medical resource handling and transfers. |
| Q076 | Contextual character backgrounds and modest progression specialization. |
| Q077 | Active upgrades reset each run; permanent cosmetics/achievements only. |
| Q078 | Upgrade selection in safe windows, not forced mid-combat pauses. |
| Q079 | Limited in-run respecialization in safe areas. |
| Q080 | Background expertise reveals optional leads and approaches, not essential locks. |
| Q081 | Shared evidence journal with personal discovery attribution. |
| Q082 | Progressive investigation board; facts, rumors, theories differentiated. |
| Q083 | Collaborative personal/team theories; optional vote, no forced consensus. |
| Q084 | Theories affect optional scenes/approaches, not canon outbreak history. |
| Q085 | Contextual co-op voting; majority, fair tie/disconnect handling. |
| Q086 | Campaign chronicle of decisions, outcomes and delayed consequences. |
| Q087 | Legacy recognition without cross-run power or world-memory distortion. |
| Q088 | Permanent archive of completed campaigns, rosters, choices and stats. |
| Q089 | Event-triggered highlights and bookmarks; no continuous video demand. |
| Q090 | Optional local sharing/export with privacy and spoiler controls. |
| Q091 | Layered story, survival, combat, rescue, craft, investigation and co-op achievements. |
| Q092 | Solo/co-op-scaled challenges with fair eligibility/rewards. |
| Q093 | Difficulty presets + optional modifiers selected before the run. |
| Q094 | Progressive modifier discovery through milestones; no grind. |
| Q095 | Validated modifier combinations with warnings and viability safeguards. |
| Q096 | Difficulty via smarter infected behavior, not inflated enemy HP alone. |
| Q097 | Infected telegraphing, gradual threat teaching and optional hints. |
| Q098 | Field guide records observed behavior, counters and science evidence. |
| Q099 | Optional field research/specimens; no mandatory sampling grind. |
| Q100 | Specimen containers, condition, storage risk; pure sample unique/protected. |

## Q101–Q130 — Systems and implementation

| ID | Locked decision (condensed) |
|---|---|
| Q101 | Applied research: medical, traps, countermeasures and survival knowledge. |
| Q102 | Station/field fabrication with blueprints, materials and repairs. |
| Q103 | Cooperative fabrication using shared blueprints/resources with no dupe exploits. |
| Q104 | Fixed/portable fabrication infrastructure and power requirements. |
| Q105 | Phased camp upgrades tied to story milestones and resources. |
| Q106 | Persistent named survivor contributions, modest assignments and callbacks. |
| Q107 | Layered food/water/medical/morale/security wellbeing with recovery paths. |
| Q108 | Authored/contextual camp rescue, scavenging, repair, escort and defense missions. |
| Q109 | Clearly warned mission urgency; fair active-play deadlines, no offline punishment. |
| Q110 | Layered camp barricades, traps, defenders, sieges and repair consequences. |
| Q111 | Tactical siege preparation, defense zones, supplies, survivor assignments. |
| Q112 | Multiple recognizable siege phases and emergency fallback. |
| Q113 | After-action damage, recovery, salvage, injuries and visible consequences. |
| Q114 | Progressive mutation-specific defenses and research-driven adaptation. |
| Q115 | Camp power priorities, fuel, sensors, limited automated defenses. |
| Q116 | Emergency repair and backup power, warning cues and no dead ends. |
| Q117 | Environmental combat effects for weather, light, smoke and sound. |
| Q118 | Scripted story weather + controlled regional variations, continuity. |
| Q119 | Incomplete but useful mission intelligence and gear recommendations. |
| Q120 | Deployment loadouts, shared supply decisions, ready check and presets. |
| Q121 | Authored ground/air transitions, selected playable driving and route choices. |
| Q122 | Simplified vehicle handling, fuel/damage/repairs, carrying and recovery. |
| Q123 | Roadside breakdown events with solo alternatives and recovery. |
| Q124 | Camp vehicle garage, roster, repairs, upgrades and protected story vehicles. |
| Q125 | Vehicle cargo capacity, survivors-vs-supplies choices, recovery, partial success. |
| Q126 | Location-based regional scavenging with controlled depletion/replenishment. |
| Q127 | Contextual survivor communities, relationships, diplomacy and consequences. |
| Q128 | Layered barter, negotiations, trade runs and changing community stock. |
| Q129 | Clear tracked agreements, flexible fulfillment and recoverable relationship damage. |
| Q130 | Phased vertical-slice development, modularity, performance and testing. |

---

# 17. DECISION LEDGER — WHAT CAN CHANGE, AND WHAT CANNOT

## Locked / leave alone

- Full original Prologue + Acts/Operations 1–4 story sequence.
- Hospital floor counts and objectives as previously built/reported.
- Company leak history, last pure sample, scientist reveal timing, Patient O evidence and vault appearance.
- El Cajon car E05 and **later** first playable driving mission after a failed extraction scenario.
- Same crew and recurring pilot/copilot; Daybreak helicopter extraction and camp arrival.
- 1–4 player co-op, solo viability, personal lives and current full-run wipe semantics.
- Research/camp/vehicle/relationships/recap systems as approved **design**, whether implemented yet or not.
- Phased implementation rather than doing everything at once.

## Working expansion choices made in this document

| Decision | Editorial recommendation | Implementation permission? |
|---|---|---|
| Campaign length | 12 acts organized into three four-act arcs | **No**; story planning only |
| Act 5 | Camp establishment and first siege | **No** |
| Act 6 | E05 car return, first drive, fuel and convoy | **No** |
| Act 7 | Radio relay and misinformation tracing | **No** |
| Act 8 | Riverside flood/water infrastructure | **No** |
| Act 9 | Factions, barter, tactical rescue | **No** |
| Act 10 | Family search with meaningful outcome | **No**; exact outcome intentionally open |
| Act 11 | Original leak site, verified records, research equipment | **No** |
| Act 12 | Joint regional evacuation, airfield, epilogue | **No** |
| Additional enemy mutations | Parked until core AI proves stable | **No** |
| Human combat | Occasional possibility, not mandatory for early roadmap | **No** |
| Story vs Hardcore wipe modes | **PROPOSED CANON AMENDMENT** | **Absolutely no until explicitly approved** |

## Open story decisions requiring dedicated approval eventually

1. Named survivors and faction leaders: identities, roles, moral complexity.
2. Exact family member identities, status, and Act 10 outcome; no random death generation.
3. What the research proves at Act 11 and who at a university or outside lab can continue it.
4. If Patient O's Act 3 encounter has later consequences, decide only after the original vault outcome is fixed.
5. How many survivor communities can become recurring locations.
6. Which optional outcomes impact Act 12 staging, without mandatory alliance locks.
7. Which acts are release commitments vs long-horizon narrative placeholders.
8. Whether to approve the two-rule-set story/hardcore wipe amendment.

---

# 18. EXACT NEXT DEVELOPMENT TASK — NOT “BUILD ALL ACTS”

**Do not start building Act 5 just because its design is complete.** First establish current source-of-truth implementation status.

### Step 1 — Audit

Read the active repo, project logs and current hospital scenes. Create a truthful table:

| Feature | Verified built? | Relevant source files | Known bugs | Needed for next slice |
|---|---|---|---|---|
| Garage through roof | | | | |
| Enemy AI and waves | | | | |
| Weapons/ammo | | | | |
| Downed/lives/revive | | | | |
| Objectives/scene transitions | | | | |
| Save/resume/wipe | | | | |
| Room-code co-op | | | | |
| Inventory/resources | | | | |
| Radio/captions | | | | |
| Performance instrumentation | | | | |

### Step 2 — Pick one smallest vertical slice

Recommended first target after audit: **complete and polish one existing Act 1 operation end-to-end** with objective completion, extraction, save/resume and solo/co-op test coverage. If already stable, choose **P01 Breakdown** as the first new mission.

### Step 3 — Produce a tiny implementation plan

For that slice only, state:

- Player-visible behavior.
- Exact files to change (from the inspected repo).
- Existing systems to reuse.
- Required mission flags/events.
- Success/failure and disconnect cases.
- Browser/AI performance budget.
- Tests and manual verification.
- Features deliberately deferred.

### Step 4 — Wait for implementation approval

**The Forge makes and records design decisions. The coding assistant implements approved, scoped work in the repo.** Do not let tools silently rewrite canon while “helpfully” extending gameplay.

---

# 19. READY-TO-PASTE PROMPT FOR A VS CODE CODING ASSISTANT

> Read `docs/ZOMBIE_SIEGE_MASTER_CAMPAIGN_HANDOFF_v2.md` and the existing repository/project documentation. Treat the 130 Forge decisions and original Acts 1–4 as locked. Everything labeled WORKING EXPANSION, PARKED or PROPOSED AMENDMENT is **not approved to implement**. Do **not** code yet. First audit the current repo and produce (1) a built/planned/missing feature matrix with exact file paths, (2) main dependencies and potential canon conflicts, (3) the smallest playable next vertical slice, (4) a short implementation plan and acceptance tests. Preserve solo + 1–4 player co-op, browser performance, current save and full-wipe semantics. Wait for my go-ahead before making code edits.

---

# 20. FINAL NORTH STAR

A player finishing Zombie Siege should remember **what happened** and **what they had to do**:

- They desperately powered a hospital so a helicopter could land.
- They followed evidence through a corporate tower to a hidden vault.
- They got a scientist and the original sample out.
- They escaped a city at dawn.
- They gave a fragile camp its first real defenses.
- They hotwired the blue car in E05 and drove through a broken city.
- They repaired a relay in weather that hid infected movement.
- They crossed a flooding industrial site as routes disappeared.
- They negotiated with desperate people instead of shooting them all.
- They searched neighborhoods for family, not just ammunition.
- They uncovered what actually happened at the original laboratory.
- They helped a region complete an evacuation that mattered—while the world remained in danger.

**Make the next playable slice excellent. Then make the world bigger.**

