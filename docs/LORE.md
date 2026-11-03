# Zombie Siege — Lore, Levels and Reasons

A single file that holds the whole story so far, every decision, and every open question. It's made to be pasted into a chat on the Claude website and talked through away from the code.

---

## For the Claude reading this

You're helping Chris build the story for Zombie Siege. Chris is a solo developer. This chat is only about **lore, levels and the reasons things happen**: why the team is where it is, why the zombies act the way they do, what each place is and why it matters. No code.

How to work with Chris:
- Short, plain replies. One topic at a time.
- No emojis.
- Everything under **Decided** is settled. Build on it; don't reopen it unless Chris asks to.
- Everything under **Proposed** is an idea Chris liked but can still change.
- The **Questions** section at the bottom is multiple choice. Chris may pick a letter, mix letters, or write a different answer. Go through them in any order Chris likes, and suggest what each answer leads to.
- At the end, write a short summary of what was decided, in the same style as this file, so Chris can paste it back into the project.

---

## The game in one minute

- **Zombie Siege** (working title): a browser zombie wave shooter. First person, full 3D, chunky low-poly look.
- The core loop: survive waves of zombies, earn points, buy guns and ammo at wall stations, board up doors between waves.
- Solo now; co-op for 2 and then 4 players is next on the roadmap. Zombie variety comes after co-op.
- Health regenerates. Guns and ammo are bought at stations. Boards are picked up to barricade doors.
- At the start of each prep phase, zombies rush through every door.

---

## What is already built: Act 1, Nightfall (the hospital)

The title screen says **THE TOWER · NIGHTFALL**. The team climbs a hospital tower from the parking garage to the roof. Every floor fixes one part of the helipad so the air ambulance can land.

| Level | Place | Objective | What it fixes |
|---|---|---|---|
| Level 0 | Parking garage | Survive the waves (no objective) | — |
| Floor 3 | Hospital floor | Find the manager's keycard | Helipad control key |
| Floor 6 | Hospital floor | Turn on three breakers | Power to the roof |
| Floor 9 | Recovery ward | Hold the Recovery room for 60 seconds while it charges | Helipad battery |
| Floor 12 | Hospital floor | Carry three lamp cases to the drop-off | Landing lamps |
| Roof | Helipad | Stand on the pad for 90 seconds with the lights on | Extraction: the air ambulance lands |

The floors are linked by a lift. The hospital is fully furnished: desks, counters, beds, shelves, fridges and operating theatre kit.

---

## The campaign arc

### Act 1 — Nightfall (the hospital) · built

- The team fights up the hospital, floor by floor, repairing the helipad.
- *Proposed:* clues along the way point to the scientist: patient files, a sample in one of the lamp cases, a badge. One of them opens the vault in Act 3.
- Ends when the air ambulance lifts the team off the roof.

### Act 2 — Descent (the office tower)

- The team is dropped on the roof of an office tower. This time they go **down**.
- Down is where the danger is. The deeper you go, the darker and worse it gets.
- Waves come **up the stairs** (the team has the high ground) and **burst out of the floors** you pass.
- The stairwell isn't one long run:
  - a collapsed flight forces a detour across a full office floor
  - a fire door stays locked until the breakers are back on
  - every few landings becomes a short hold
- The scientist talks to the team over the radio or intercom the whole way down: short, panicked, useful lines ("the 4th floor doors won't hold").
- At the bottom is the parking garage, which connects underground to the pharmacy.

### Act 3 — The Vault (the pharmacy and lab)

- The team reaches the pharmacy **underground** from the tower's garage, through a service tunnel or a shared basement.
- The pharmacy is overrun: clear it.
- The vault runs a timed unlock, and the team holds the pharmacy until it opens.
- The shelves are a place to restock medical supplies.
- The scientist is carrying a **sample that draws zombies**. From here on, everything comes for the team.

### Act 4 — Daybreak (the street run)

- The first time the team goes outside. The sun is coming up.
- With the scientist and the sample, the team fights down the street to the next extraction site.
- Waves come the whole way, drawn by the sample.
- At the extraction point the ride isn't there yet: throw a flare and hold until it lands.

### After Act 4

Not written yet. More places will follow (see **Places**).

---

## Decided

| Decision | Why |
|---|---|
| Act 1 is the hospital, climbing up to a helipad extraction | Built |
| Act 2 is an **office tower**, going down | Glass, cubicles and server rooms look clearly different from the hospital; the parking garage at the bottom leads into the underground route |
| The tower connects **underground** to the pharmacy | Fewer maps; the descent leads straight to the vault; the open street is saved for the finale |
| The scientist talks to the team over the radio during the descent | A narrator without cutscenes; makes the rescue mean something |
| The sample draws zombies | Explains the street waves, gives the team something to protect, sets up the mutated zombies |
| Acts switch between **hold** (stay in one spot, fight off waves) and **move** (fight from A to B) | Stops every act being "survive in a room." Nightfall climbs and holds, Descent moves, The Vault holds, Daybreak moves and then holds |
| Act names: Nightfall, Descent, The Vault, Daybreak | — |
| There will be many places beyond these four; each goes where it fits the story best | — |

---

## Proposed, to build when we reach each act

- Vault timed hold (reuses the Floor 9 charge hold)
- Last stand at extraction: flare, then wait for the ride (mirrors the helipad)
- Stairwell detours and breaker-locked doors (reuse the Floor 6 breakers)
- Hospital clues pointing to the scientist (could go into Act 1 now, using the lamp cases)

## Proposed, for later

- **Zombie types per place**, after co-op:
  - hospital: patients in gowns
  - office tower: office workers
  - pharmacy: mutated zombies from the scientist's work
- **Night to dawn:** Nightfall in the hospital, Daybreak on the street.
- **Callsigns** for the co-op characters, and a **pilot** on the radio for extraction calls. One or two lines at a time, never stopping the action.

---

## Places

| Place | What it's good for | Where it fits |
|---|---|---|
| Hospital | Climbing up, helipad extraction | Act 1 (built) |
| Office tower | Going down, varied floors, parking garage at the bottom | Act 2 |
| Pharmacy / lab | A tight space to clear, the vault hold, mutated zombies | Act 3 |
| City street | Open ground, a moving fight, the final hold | Act 4 |
| Apartment block | Claustrophobic hallways, a personal feel, fighting door by door | Unplaced |

More candidates appear in the questions below.

---

## Pickups by place

### Rules

- **Found, not bought.** Stations keep selling guns and ammo. Pickups are what's lying around.
- **Health already regenerates**, so medical items do what regen can't: heal instantly, protect you for a moment, or get a downed teammate up faster.
- **Each item fits its place.**
- **Three kinds:**
  - **Use now:** takes effect when you pick it up.
  - **Carry:** goes in a small pouch, with a quick-use key.
  - **Story:** clues and notes.

### Hospital (Nightfall)

| Item | Kind | What it does |
|---|---|---|
| Bandages | Carry | Instant small heal |
| Adrenaline syringe | Carry | Revive a downed teammate faster, or get yourself up once |
| Painkillers | Carry | Take less damage for a short time |
| Fire extinguisher | Use now | Spray to push zombies back and blind them |
| Patient files, lab sample | Story | Clues pointing to the scientist |
| Boards | Use now | Built: barricade the doors |

### Office tower (Descent)

| Item | Kind | What it does |
|---|---|---|
| Wall first aid box | Use now | About one per floor: a full heal, once |
| Energy drink / coffee | Carry | Faster sprint and reload for a short time |
| Fire axe (fire cabinet) | Carry | Melee weapon for crowds on the stairs |
| Security desk | Use now | A pistol and ammo in the guard's desk |
| Access badge | Use now | Opens locked floors and doors |
| Emails, hard drives | Story | Who funded the scientist, and what the sample is |
| Car battery (garage) | Carry | Powers the tunnel door to the pharmacy |

### Pharmacy and lab (The Vault)

| Item | Kind | What it does |
|---|---|---|
| Bandages | Carry | Instant small heal (best place to restock) |
| Pills | Carry | Painkillers: take less damage for a while |
| Stimulants | Carry | Move faster for a short time |
| Med pouch | Use now | Fills every medical slot |
| Lab chemicals | Carry | An improvised firebomb |
| The scientist's notes | Story | What the sample does to zombies |

### City street (Daybreak)

| Item | Kind | What it does |
|---|---|---|
| Road flares | Carry | Light a dark spot and pull zombies to it. The last one calls the ride |
| Gas can | Carry | Drop it and shoot it to blow up a crowd |
| Car alarm | Use now | Draws zombies away from the team |
| Police car | Use now | A shotgun and shells in the trunk |
| Ambulance | Use now | Medical restock |
| Fallen soldier's kit | Use now | Ammo and maybe a grenade, from an earlier rescue that failed |

---

# Questions

Pick a letter, combine letters, or write your own answer.

## 1. The world and the outbreak

**Q1. What caused the outbreak?**
- A) A lab accident: something escaped from the scientist's research
- B) A deliberate release: someone used it as a weapon
- C) Unknown: nobody knows yet, and finding out is part of the story
- D) Something natural (a disease, a fungus, something in the water) that the lab was trying to stop
- E) Your own answer:

**Q2. How long ago did it start?**
- A) Tonight: the game begins on the first night, and everything is falling apart in real time
- B) A few days: the city is lost but the military is still trying
- C) Weeks: the city is abandoned, and the team is one of the few groups still working
- D) Your own answer:

**Q3. How far has it spread?**
- A) One city, sealed off
- B) The whole country
- C) Worldwide
- D) Nobody knows; the radio has gone quiet
- E) Your own answer:

**Q4. What are the zombies?**
- A) Dead people brought back
- B) Living people who are infected: sick, mindless and violent
- C) Something in between that changes over time (and later mutates into new types)
- D) Your own answer:

**Q5. Do the zombies keep any of who they were?**
- A) No, they're empty
- B) A little: they drift toward places they knew (patients stay in wards, office workers at their desks)
- C) Yes, enough to be unsettling: they use doors, follow sounds and gather in groups
- D) Your own answer:

**Q6. What is the city called, and when is it set?**
- A) A made-up city, present day
- B) A made-up city, near future
- C) Never named: just "the city"
- D) Your own answer:

## 2. The team

**Q7. Who is the team?**
- A) Private contractors hired to get the scientist out
- B) A military recovery squad
- C) Paramedics and hospital staff who got caught up in it
- D) Ordinary survivors who keep getting pulled into bigger jobs
- E) Your own answer:

**Q8. Why does the game start in the hospital's parking garage?**
- A) The team's vehicle crashed or was overrun there on the way in
- B) They were sent to the hospital first to find the scientist, who had already gone
- C) They were sheltering there when the outbreak hit
- D) The garage is the only way into a locked-down hospital
- E) Your own answer:

**Q9. Did the team know about the scientist from the start?**
- A) Yes, the scientist was always the mission, and the hospital was a detour
- B) No, they learn about the scientist from the clues in the hospital
- C) They're told on the air ambulance, after Act 1
- D) Your own answer:

**Q10. Do the team members have their own identities?**
- A) Yes, named characters with callsigns and personalities
- B) Callsigns only, so players fill in the rest
- C) No, they stay faceless
- D) Your own answer:

**Q11. Do the characters have different roles (medic, heavy, scout)?**
- A) Yes, each has a role with a small bonus
- B) Story flavor only, with no gameplay difference
- C) No roles
- D) Your own answer:

**Q12. Does the team talk during play?**
- A) Short call-outs only ("reloading," "behind us")
- B) Call-outs plus a few story lines at key moments
- C) Silent; only the radio voices talk
- D) Your own answer:

## 3. Who is in charge

**Q13. Who runs the extractions and gives the orders?**
- A) The military
- B) The company that funded the scientist
- C) A small independent group of survivors with a helicopter
- D) Nobody knows; it's a voice on the radio
- E) Your own answer:

**Q14. Can that voice be trusted?**
- A) Yes, they're on the team's side
- B) Mostly, but they're hiding something about the sample
- C) No, and finding out is a big twist later
- D) Your own answer:

**Q15. Who flies the air ambulance and the later rides?**
- A) The same pilot every time, who becomes a recurring character
- B) A different pilot each time
- C) Whoever is left
- D) Your own answer:

**Q16. Why does the air ambulance drop the team on the office tower's roof, and not next to the pharmacy?**
- A) The streets are too overrun to land on
- B) The tower roof is the only safe landing spot nearby
- C) The scientist told them the tunnel from the tower's garage is the only way into the vault
- D) The pilot is low on fuel or under fire and has to drop them early
- E) Your own answer:

## 4. The scientist

**Q17. Who is the scientist to the outbreak?**
- A) The person who made it
- B) The person closest to a cure
- C) A whistleblower who knows who caused it
- D) An ordinary researcher who happens to have the only sample
- E) Your own answer:

**Q18. Why is the scientist locked in a pharmacy vault?**
- A) They hid there when the outbreak hit
- B) The lab is hidden behind the pharmacy, and the vault is its door
- C) Someone locked them in on purpose
- D) Your own answer:

**Q19. What is the scientist like?**
- A) Calm and professional, and their calm cracks as things get worse
- B) Panicked and guilty
- C) Cold and secretive: they care more about the sample than the team
- D) Your own answer:

**Q20. During the street run, what is the scientist in gameplay terms?**
- A) An escort: they can be hurt, and if they go down you fail
- B) They follow and can't be hurt; story only
- C) They help: they heal the team or point out pickups
- D) They fight, with a weak weapon
- E) Your own answer:

**Q21. Do you ever see the scientist's face before Act 3?**
- A) No, only the voice, so meeting them is a moment
- B) A photo on a badge or in the hospital files
- C) Through a security camera in the office tower
- D) Your own answer:

## 5. The sample

**Q22. What is the sample?**
- A) The cure, or the start of one
- B) The original strain: the cause of it all
- C) A new mutation that's worse than the first
- D) Something nobody fully understands yet
- E) Your own answer:

**Q23. Why does the sample draw zombies?**
- A) A smell or chemical signal only they can sense
- B) They're drawn to their own original strain
- C) It's unclear, and that's part of the mystery
- D) Your own answer:

**Q24. Who else wants the sample?**
- A) No one; it's just the team against the dead
- B) The company that funded the work
- C) Another armed group, which leads to human enemies later
- D) Your own answer:

## 6. The office tower (Descent)

**Q25. What company owns the tower?**
- A) The company that funded the scientist (their files are on these floors)
- B) An unrelated company: just an office building
- C) A mix of tenants: a law firm, a call centre, a tech company, so the floors look different
- D) Your own answer:

**Q26. Why do zombies come up from below and burst out of the floors?**
- A) The building was evacuated downward and everyone got stuck at the bottom
- B) The garage and tunnel connect to the street, so the dead come in from underneath
- C) The sample's pull reaches them through the building
- D) Your own answer:

**Q27. How many floors does the descent cover?**
- A) A short run: 3 or 4 levels
- B) Matches the hospital: about 5 levels
- C) Long: many floors, but only some are full levels and the rest are stairwell landings
- D) Your own answer:

**Q28. What makes the bottom of the tower worse than the top?**
- A) Darkness: the power is out below a certain floor
- B) Water: a burst main has flooded the bottom floors
- C) Fire: the lower floors are burning
- D) Crowds: the most zombies are packed at the bottom
- E) Your own answer:

## 7. The pharmacy and lab (The Vault)

**Q29. What kind of place is it?**
- A) A normal street pharmacy with a secret lab behind it
- B) A hospital pharmacy annex
- C) A big medical research building with a pharmacy at street level
- D) Your own answer:

**Q30. Why is the pharmacy so overrun?**
- A) People ran there for medicine when the outbreak started
- B) The lab's test subjects got out
- C) The sample is in the vault, pulling zombies in
- D) Your own answer:

**Q31. What happens when the vault opens?**
- A) The scientist steps out, and you move straight on
- B) Something else gets out too (a mutated zombie, a boss)
- C) The scientist is hurt or infected, which changes things
- D) Your own answer:

## 8. The street (Daybreak)

**Q32. Where is the next extraction site?**
- A) A park or sports field big enough for a helicopter
- B) A military checkpoint at the edge of town
- C) A bridge out of the city
- D) A rooftop a few blocks away
- E) Your own answer:

**Q33. What's on the street?**
- A) Wrecked cars, abandoned barricades and a failed military line
- B) A crowded shopping street: storefronts and bus stops
- C) Both, changing block by block
- D) Your own answer:

**Q34. Does the extraction at the end of Daybreak go to plan?**
- A) Yes, the ride lands and the team gets out
- B) The ride is shot down or overrun, and the team has to move on foot
- C) The ride takes them, but the scientist or the sample is lost
- D) Your own answer:

## 9. After Act 4

**Q35. How many acts or places in total?**
- A) 4: the story ends at Daybreak
- B) 6 to 8 places
- C) Open-ended: keep adding places for as long as the game grows
- D) Your own answer:

**Q36. What's the big goal of the whole campaign?**
- A) Get the scientist and the sample out of the city
- B) Find and stop the cause of the outbreak
- C) Survive and find somewhere safe
- D) Your own answer:

**Q37. Which places appeal to you next?** (pick any)
- A) Apartment block: tight hallways, door by door
- B) Subway: dark tunnels, platforms, a train
- C) Shopping mall: big open floors, stores to loot
- D) Police station: armory, cells, a locked-down building
- E) School or university: classrooms, gym, a lab
- F) Military checkpoint or base: walls, gear, a failed defense
- G) Bridge: a long fight out of the city
- H) Harbor or docks: containers, a boat out
- I) Stadium: a huge last stand, a helicopter on the pitch
- J) Your own answer:

**Q38. How does the story end?**
- A) Hopeful: the cure gets out
- B) Bittersweet: it works, but at a cost
- C) Dark: it was never going to work
- D) Not decided until we get there
- E) Your own answer:

**Q39. Is there a twist?**
- A) The voice on the radio caused the outbreak
- B) The scientist is infected, or immune
- C) The team was sent in as bait
- D) No twist; keep it a straight survival story
- E) Your own answer:

## 10. Zombies

**Q40. How do new zombie types fit the story?**
- A) Each place has its own look (patients, office workers, shoppers, police)
- B) Special types come from the sample and mutate as the story goes on
- C) Both: each place has its own look, and the specials are mutations
- D) Your own answer:

**Q41. Which special zombies appeal to you?** (pick any)
- A) Runner: fast and fragile
- B) Brute: slow, tough, breaks barricades
- C) Screamer: calls more zombies
- D) Crawler: comes through vents and under floors
- E) Bloater: explodes when it dies
- F) Armored: police or riot gear, needs a headshot
- G) Your own answer:

**Q42. Are there bosses?**
- A) Yes, one at the end of each act
- B) Only at big story moments (the vault opening, the last stand)
- C) No bosses, just bigger waves
- D) Your own answer:

## 11. Tone and how the story is told

**Q43. What is the tone?**
- A) Grim and serious
- B) Action-movie: tense but fun, with some dry humor
- C) Camp: over the top and silly
- D) Your own answer:

**Q44. How is the story told?** (pick any)
- A) Radio voices during play
- B) Notes, files and emails you pick up
- C) A short text card between places
- D) Short cutscenes (like the air ambulance flying in)
- E) Your own answer:

**Q45. How much story is there?**
- A) Very little: the player can ignore it completely
- B) Light: always there, never in the way
- C) Heavy: the story is a main reason to play
- D) Your own answer:

## 12. Pickups and how they work

**Q46. How many carry items can you hold?**
- A) One, so every choice counts
- B) Three slots
- C) One slot per kind (one medical, one throwable, one boost)
- D) Your own answer:

**Q47. How do you use carry items?**
- A) One quick-use key, cycled with another key
- B) A key for each slot
- C) A quick radial wheel
- D) Your own answer:

**Q48. Do carry items stay with you between places?**
- A) Yes, everything carries over
- B) No, each place starts fresh
- C) Some carry over (medical items), and some stay behind (fire axe, gas can)
- D) Your own answer:

**Q49. Are story pickups collectibles?**
- A) Yes, with a count and a place to read them again
- B) They're read once and gone
- C) They unlock something (a skin, a gun, a secret level)
- D) Your own answer:

## 13. Structure

**Q50. How do you play through the story?**
- A) One long run from the garage to the end
- B) Chapters you pick from a menu once unlocked
- C) Each act is its own mode, playable alone
- D) Your own answer:

**Q51. In co-op, does the story change with more players?**
- A) No, the same story for 1 to 4 players
- B) Small changes: more call-outs, some team-only moments
- C) Some objectives need the team to split up
- D) Your own answer:

**Q52. What happens if the team fails?**
- A) Restart the current floor or place
- B) Restart the whole act
- C) Restart the whole run, like a wave survival game
- D) Your own answer:

---

## Log

- **Nov 2, 2026**: First riff: hospital extraction → stairwell descent in a second building → pharmacy vault rescue → street run to the next extraction.
- **Nov 2, 2026**: Fleshed out. The second building is an office tower, linked underground to the pharmacy. Added the scientist on the radio, the sample that draws zombies, the vault hold, the last stand, act names, a table of places, pickups by place, and the question list.
