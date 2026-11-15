# Zombie Siege — Lore, Levels and Reasons

A single file that holds the whole story so far, every decision, everything the game already shows the player, and what's still open. It's made to be pasted into a chat on the Claude website and talked through away from the code.

---

## For the Claude reading this

You're helping Chris build the story for Zombie Siege. Chris is a solo developer. This chat is only about **lore, levels and the reasons things happen**: why the crew is where it is, why the zombies act the way they do, what each place is and why it matters. No code.

How to work with Chris:
- Short, plain replies. One topic at a time.
- No emojis.
- Everything in this file is decided unless it sits under **Where the game and the story disagree**, **Questions to settle**, **Proposed** or **Parked**. Build on the rest; don't reopen it unless Chris asks to.
- **What the game already shows** is a record of the words and places that are built. It isn't a decision. Names in it (like Northline) are placeholders until Chris keeps them.
- When offering choices, make them multiple choice and always leave room for Chris's own answer.
- Chris is using this round to research and settle the story before building more levels. **Research leads** lists the real-world topics worth looking into.
- At the end, write a short summary of what was decided, in the same style as this file, so Chris can paste it back into the project.

---

## The game in one minute

- **Zombie Siege** (working title): a browser zombie wave shooter. First person, full 3D, chunky low-poly look.
- The core loop: survive waves of zombies, earn points, buy guns and ammo at wall stations, board up doors between waves.
- Solo and online co-op both work now (room codes, up to 4). Zombie variety comes next.
- At the start of each prep phase, zombies rush through every door.
- All four acts now exist as playable levels, from the street outside the hospital garage to the park at the end: 21 stops in a row. Only Act 1 has its story in the build. Acts 2 to 4 are levels with no radio, notes or scientist yet.

---

## The world

| Decision | Detail |
|---|---|
| Cause | A lab made it by mistake and it got out of hand |
| When | The very start of the crisis |
| Scale | Worldwide. Our crew holds one zone of a much bigger world |
| The zone | A made-up region: a city, the outskirts, and the towns around it. Camps sit in the outskirts |
| Spin-offs | Other zones, other crews, other jobs, same point in the crisis |
| The zombies | Infected people who keep changing, and later mutate |
| What they remember | They drift to places they knew. Patients stay in wards, office workers at their desks |
| The series | Games, shorts and longer stories. No cure for a long time |

**In the build, not decided:** the city is called **Northline**. The hospital is Northline General Hospital. Street signs name the districts **City Centre**, **Old Town**, **Riverside** and **West End**. The roads out are closed with "EVACUATION IN EFFECT" signs. See **Questions to settle**.

---

## The crew

| Decision | Detail |
|---|---|
| Who they are | A mixed crew. The core is paramedics with the air ambulance. Members also come from ex-military, contractors, hospital staff and survivors |
| Identity | Named characters with callsigns and personalities |
| Roles | Story flavor only. No gameplay difference yet |
| Talking in play | Short call-outs, plus a few story lines at key moments. One or two sentences each |
| Who sends them | An independent group built around the air ambulance. It takes requests from camps and survivors |
| Can the voice be trusted | Yes. Everyone is in this together |
| The air crew | The same pilot every time, plus a female co-pilot |
| The crew's job | Hold their zone, help whoever is in it, and move the scientist wherever he needs to go |

**Every level is a job for someone:** help the scientist, bring supplies to camps, escort high-security people, clear areas and move people.

---

## The scientist and the sample

| Decision | Detail |
|---|---|
| Who he is | The scientist whose lab made the virus by mistake |
| Personality | Calm and professional. His calm cracks as things get worse |
| Why he is in the vault | He moved to the pharmacy lab to keep working. His guards caught it from outside, and he was sealed in |
| His work | Reversing the virus |
| The sample | The last pure copy of the original virus, from before the leak. It's the only way to test a cure |
| Why zombies come for it | They sense it as "the mother": the pure source they're pulled back to |
| Who else wants it | Everyone wants the cure, but few places can make it. Nobody tries to steal it |
| In gameplay | He follows the crew and can't be hurt. Story only |
| When we see him | Voice only until the vault opens, apart from one security camera glimpse near the bottom of the tower |
| After the vault | He steps out and the crew moves on. No boss, no infection |
| His later trips | Other labs, back to the hospital, anywhere with people who can help test and find solutions |

---

## The campaign arc

The acts switch between **hold** (stay in one spot and fight off waves) and **move** (fight from A to B). That stops every act being "survive in a room." Nightfall climbs and holds, Descent moves, The Vault holds, and Daybreak moves and then holds. New places should keep the switch going.

### Prologue — The Road to Northline (five levels before the hospital) · levels built

From the master campaign handoff (Nov 14). The crew's ground ambulance runs out of fuel after the day's earlier rescues, **nine miles from Northline General**, and they fight in on foot, about two miles a level. It ends on the **Operation 001: Nightfall** title.

| Level | Mile | What it is | Objective | Waves |
|---|---|---|---|---|
| P01 Breakdown | 9 | Country road. Quiet at first: look round for a radio. The hospital's call comes through, then the dead come from the farm tracks | Find the police radio | 2 |
| P02 Roadside Station | 7 | A petrol station with no fuel. The alarm draws the dead. Survivors are trapped, and a delivery van is their way out | Hold the forecourt while the van warms up (45 s) | 3 |
| P03 Checkpoint | 5 | The army's evacuation screening point. The infected turned inside the tents | Throw three gate controls | 3 |
| P04 Commercial District | 3 | Shops and restaurants, with a row of buildings down the middle so there are a north lane and a south lane. No clock | Find the kitchen's service key in the back alley | 3 |
| P05 Final Push | 1 | The last mile of old town, cars choking the road | Switch three cabinets to raise the hospital access barrier | 4 |

- Built as floors -5 to -1, so the hospital keeps its numbers. The way on is a steel gate on foot, with no lift ride. P05's gate goes down to the hospital garage.
- **In the build (Nov 14):** all five are playable from Level Select (Prologue tab). A new game still starts at the hospital garage with the opening scene. **Not built from the handoff:** the optional restaurant rescue, the survivors' van escaping on screen, branching story outcomes, the radio and broadcast lines, the evacuation map.
- The levels reuse the street kit, so they look alike. The five objectives are the build's own stand-ins for the handoff's beats.
- The hand-off's doc and the build still disagree on: Acts 2 to 4 (built as lift floors, not a stairwell descent), where Brutes and Screamers first appear, and a full-team wipe restarting the whole run (the build restarts the floor).

### Act 1 — Nightfall (the hospital) · built

- The crew drives a ground ambulance in to rescue survivors and is overrun in the parking garage.
- The ground is blocked and some survivors can't walk, so the air ambulance is the only way out. But the helipad is broken, so the crew has to fix it.
- The crew rides the elevator up, floor by floor. The hospital has more storeys than the elevator stops at. Each stop fixes one part of the helipad, and also gets the elevator going again:

| Stop | What the floor is | Objective | What it fixes | Waves |
|---|---|---|---|---|
| Ground (Level 0) | Parking garage, B1 | Survive the waves | — | 5 |
| Floor 3 | Admissions: lobby, open-plan office, medical records, the administrator's office | Find the manager's keycard | Helipad control key | 3 |
| Floor 6 | Pharmacy and laboratories: pharmacy, Lab 1 (biohazard), Lab 2 (pathology), cold storage, dispensary. The power is out | Throw three breakers | Power to the roof | 3 |
| Floor 9 | Surgery: two operating theatres, scrub, recovery | Start the charger and hold the Recovery room for 60 seconds | Helipad battery | 4 |
| Floor 12 | Intensive care: bays 1 to 5, Isolation A and B (infection control) | Carry three lamp cases to the elevator | Landing lamps | 4 |
| Roof (level 14) | Helipad, machine room, AC plant, water tank, four stair heads | Switch on the helipad lights, hold 90 seconds, get everyone on the pad | Extraction: the air ambulance lands | 2 |

- Rescued people are found outside and behind locked doors on each floor. They're story only: they appear on the roof and count toward a **people saved** total. (Not built yet.)
- Hospital clues hint at the scientist, but the crew first hears about him from a radio call on the air ambulance after Act 1. (Not built yet.)

### Act 2 — Descent (the office tower) · levels built

- The streets are too overrun to land on, so the air ambulance drops the crew on the tower roof.
- The only safe way to the pharmacy is the tunnel system, through the tower's parking garage.
- The lab's company owns the tower, and other tenants fill the rest of the floors. Some floors hold story clues; the rest give variety.
- The building was evacuated downward, and the garage and tunnel let the dead in from underneath. Waves come **up the stairs** (the crew has the high ground) and **burst out of the floors** you pass.
- The bottom is dark and packed with zombies. Getting the power back on is a real goal on the way down.
- The descent is long. Only the story floors are full levels. The rest are stairwell landings with short holds.
- The stairwell isn't one long run (proposed):
  - a collapsed flight forces a detour across a full office floor
  - a fire door stays locked until the breakers are back on
- The scientist is on the radio or intercom the whole way down: short lines, calm at first. The crew catches one glimpse of him on a security camera near the bottom.

**In the build (Nov 14):** seven levels. The air ambulance drops the crew on the tower roof, and they go down by **freight lift**, not stairs. Every floor's job also gets the lift working, as in the hospital. Nothing comes up the stairs or bursts out of floors yet. The scientist is on the radio from the roof, and the crew sees him once on a security monitor on floor 20. Floors 41, 34 and 27 are **sweeps**: no waves, the floor's own dead slumped at the desks and between the shelves, and a gunshot brings more through the doors.

| Stop | What the floor is | How it plays | Objective | Story added |
|---|---|---|---|---|
| Tower roof | The hospital roof's shape under a new name: plant room, four stair heads, no helipad | Siege, 2 waves | Start the roof controls and hold them for 40 seconds | The scientist's first call on the roof intercom. He doesn't say where he is |
| Floor 41 | Open-plan offices: desk rows, kitchen, meeting room behind a paid door. The power is out | Sweep, 13 sleepers | Throw three breakers | Note: the evacuation notice |
| Floor 34 | Records floor: shelving aisles, standby generator room | Sweep, 11 sleepers | Step 1: take the transfer file from the front desk. Step 2: start the generator and hold the room for 45 seconds (the hold brings the dead) | Note: the transfer order that moved him "to the pharmacy facility" |
| Floor 27 | Executive suites: warm wood, boardroom, the chief executive's suite behind a paid door | Sweep, 13 sleepers | Find the executive keycard | Note: the board memo (the food-poisoning cover story). The scientist goes quiet when he hears the floor number |
| Floor 20 | Server floor: racks, the power out, a UPS room behind a paid door | Siege, 4 waves | Throw three breakers | The camera glimpse: when the power returns, a monitor shows a man in a white coat with a steel case |
| Lobby | Ground-floor reception: marble hall, columns, a security booth with the lift's service controls | Siege, 4 waves; a brute leads the last wave | Start the controls and hold the booth for 50 seconds | The street doors are barricaded and something heavy is leaning on them |
| Tower garage (B1) | The tower's own parking level, dark and packed, tunnel mouths in the east wall | Siege, 5 waves | Step 1: throw three breakers. Step 2: carry a car battery from a parked car to the dead tunnel lift | "Under the street. That is how they moved me" |

**Notes to read (clues).** Press use beside one for a card, and it goes in the **RUN LOG** on the pause screen. They're optional and never block progress. **Wording settled Nov 14** (Chris asked for my recommendation on what works for the story):

- *Evacuation notice* (floor 41): all staff to the lower levels; not the street entrances, not the main stairs; the freight lift is reserved for transfers.
- *Transfer order* (floor 34): patient and materials to the pharmacy facility; sign-off by the director only; route by freight lift, garage and tunnel, not the street; no copy kept on site.
- *Board memo* (floor 27): the sample stays with the programme; if the facility needs explaining, the line is food poisoning from a bad canteen batch.

### Act 3 — The Vault (the pharmacy and lab) · levels built

- A normal street pharmacy with a secret lab behind it, reached **underground** through the tunnel from the tower's garage.
- It's overrun because people ran there for medicine, and the sample pulled in more.
- The closer the crew gets to the vault, the worse it gets, and the mutations are at their worst near the vault.
- The vault runs a timed unlock while the crew holds the pharmacy (proposed; reuses the Floor 9 hold).
- The vault opens, the scientist steps out, and the crew moves on.

**In the build (Nov 13):** four levels. The vault opening, the scientist stepping out and the mutations are **not built**: the vault is an ordinary hold with ordinary zombies, and the lift out of it goes straight to Act 4.

| Stop | What the floor is | Objective | Waves |
|---|---|---|---|
| Service tunnel | A long, narrow concrete run under the street with barriers staggered down it | Throw three breakers spread along it | 4 |
| Pharmacy | A street-level shop: shelves, a dispensing counter, the street doors at the front. The tunnel lift comes up in the stockroom | Find the manager's keycard behind a paid door | 3 |
| Hidden lab | The lab behind the pharmacy, reached by lift down. Ring corridor round a central lab, cold storage behind a paid door. The power is out | Throw three breakers | 4 |
| The vault | A cold chamber with the vault door in the north wall | Start the time lock and hold the door for 60 seconds | 5 |

**In the build (Nov 14):** the first three floors now play differently, and the scientist is on the radio, heard but not seen.

| Stop | How it plays now | What it adds to the story |
|---|---|---|
| Service tunnel | A run: no waves. The dead keep coming out of the doors behind the crew, faster the longer it takes | The crew sees this is how he was moved, out of sight under the street |
| Pharmacy | A sweep: no waves. The shop's dead stand still among the shelves until they see or hear someone. A gunshot brings the crowd in off the street | He warns them to keep it quiet, or the whole street comes in |
| Hidden lab | Still a siege, now in two steps: breakers to put the -80C freezer back on backup power, then two cryo carriers from cold storage to the lift | The carriers are the only safe way to move the sample. His calm starts to go: he can hear them at the vault door |

**The vault, built Nov 14:**

- The time lock runs as before.
- Partway through, Patient O comes in through the west door and goes for whoever is on the panel. The scientist names it over the radio: "a subject on twelve, at the hospital".
- When the lock releases, a short scene plays: the vault door swings open, and the scientist steps out of a small strongroom in a white lab coat with the sample case. He says: "You came. I have the sample. All of it that is left." and "That thing came for it. Get me to the lift."
- Patient O, enraged, then stands between the crew and the lift. It can't be killed: beaten down, it falls back into the strongroom, and the door is shut on it.
- From then on the scientist follows the crew, on into Act 4. He can't be hurt, and the dead pay him no mind.

### Act 4 — Daybreak (the street run) · levels built

- The first time the crew is outside. The sun is coming up.
- The street changes block by block: it starts with shopping streets and ends at failed barricades near the edge of the zone.
- Waves come the whole way, drawn by the sample.
- The extraction site is a park or sports field. Throw a flare and hold until the ride lands (proposed).
- The extraction goes to plan: the ride lands and the crew gets out. Trouble waits for the next trip.

**In the build (Nov 14):** four outdoor levels, the first that aren't inside a building.
- The transit kiosks are gone. Each block ends in a **steel gate** at its east end, and everyone through it goes straight on to the next block (Questions item 12, answer c).
- The crew comes up out of the vault at the west end of Main Street at first light. The sky lightens block by block to sunrise at the park.
- The scientist walks with the crew the whole way.

| Stop | What the place is | How it plays | Objective |
|---|---|---|---|
| Main Street | Shopfronts both sides, parked cars, two staggered barriers turning the road into an S-bend | Run: the dead come from behind, and standing still is worse. Six sleepers in the north shop | Throw the control box by the gate. **Shop shortcut:** in one shop door and out the other, past the sleepers. It's about 6 m shorter than the road |
| Market square | A paved plaza with a fountain and stalls, the town hall on the north side, six side streets | Run | Start the radio relay on the town hall wall and hold the steps for 30 seconds. The pilot answers: "Find us somewhere flat" |
| The barricades | A road checkpoint torn open, army trucks left where they stopped, generator trailers | Run | Throw three generators along the route. An army **evacuation map** to read |
| The park | Grass, paths, trees, a hedge broken at five gates, a groundskeeper's shed | Siege, 3 waves | Throw the signal flares and hold 90 seconds until the air ambulance lands in the smoke, then get aboard |

**The flight out (04-C).** When everyone is aboard, an 18-second film plays. The helicopter lifts off, the camera goes from the ground to high over the city to a wide shot of the sunrise, and the run is won. Captions:
- AIR AMBULANCE · RADIO: "Everyone aboard. Lifting. Hold on."
- EMERGENCY BROADCAST: "Northline is lost. New outbreaks are reported beyond the city. Do not return."
- EMERGENCY BROADCAST: "Survivors are being received at the outskirts camp. Follow the signal east."
- Title card: **OUTSKIRTS CAMP** / Safe. For now.

The broadcast deliberately names no other towns. The handoff only asks for a hint of wider collapse here, and naming places would get ahead of Acts 5 to 12.

**Evacuation map** (the barricades), settled Nov 14: *ZONE 4 / EVACUATION ROUTES. Assembly point: the outskirts camp, east. All roads past this line are closed to civilians. Air ambulance pickups only where flares are lit. Public park, east of the checkpoint. Do not stop on the route.*

The extraction has no painted pad: five red flares are thrown onto the grass and red smoke goes up. The run ends when everyone is aboard.

### Act 5: Last Refuge (draft, first slice built)

The air ambulance sets the crew down at the outskirts camp at nightfall. It is the first place anyone wants to protect: tents and a garage shed inside a chain-and-timber fence, a supply stack in the middle, a medical yard behind an inner fence. The generators are down, so the floodlights are dark. The dead come for the noise through four gaps in the fence; the crew can plank two of them. When both generators are thrown the camp is lit, and the lift opens. The message at the end names fuel and a way out as the next priorities (leads to Act 6, Broken Roads).

Inventory of the Living (05-A, built, draft): the first quiet hour, before anything attacks. The crew walks the camp and checks its four needs: medical, water, shelter and the generator. A ledger card at each says what it has and lacks (low bandages, one tank a third full, sixty-eight people in forty-one beds, three days of generator fuel). Each check lights that part of the camp. The road gate opens after all four.

The Missing Delivery (05-B, built, draft): on the camp road before the siege, the camp's supply convoy lies wrecked along the road with its loads spilled, and three people from a stalled bus are hiding in it. A case takes both hands and the dead are about, so the crew chooses what to carry and whom to cover. Cases and people go to the camp gate.

Not built yet in this act: a real fence breach in the siege, assigning defenders, and a choice of first repair with consequences (the ledger is read-only cards for now).

### Act 6: Broken Roads (draft, first slice built)

Running on Empty (06-B, built, draft): the camp has three days of generator fuel and nothing to move a vehicle. The fuel yard on the road out of the valley still has a tanker delivered the night before the roads closed, eleven thousand litres. The crew throws the two power cabinets, hooks up the tanker and holds the bay while it fills. The pumps are loud and call the dead. The message at the end: the camp has fuel, the road east is open. The driving missions (06-A Bay E05 with the scientist's El Cajon car, 06-C Broken Convoy) need a vehicle controller and are not built.

### Act 7: Dead Air (draft, first slice built)

High Ground (07-B, built, draft): the regional broadcast went quiet at a hilltop relay in a rising storm. The crew enters by the service road or the scramble path up the south slope, throws the generator shed and the battery cabinet, then aligns the dish by hand at the equipment hut while the work lights stay on. The lights they need are the lights the dead can see: on this hill a flashlight calls the dead in and speeds up the hold, and the dark is safe but blind. The engineer's log says the north feed was cut deliberately, which was not the dead. At the end the region is back on the air, other relays answer, and the pilot is out there. Not built: 07-A The Silence (stealth and the evidence journal) and 07-C False Instructions (a dialogue and broadcast choice).

### Act 8: Blackwater (draft, first slice built)

High Water (08-A, built, draft): after days of rain the river is over the bank at a survivor community's water intake. The flood channel fills in three stages, to a metre and a tenth, slowing anyone wading in it, the dead included. Two catwalks along the walls stay dry. The crew opens both sluice gates from the catwalks and the channel drains, protecting the clean water supply. The intake log mentions delivery manifests for the plant listing a contractor on no register, a lead to the waste transport records. Not built: 08-B and 08-C, hazard (energised) areas, and the pump station.

### Act 9: Fault Lines (draft, first slice built)

Doors Shut (09-B, built, draft): the Lincoln Road settlement has shut itself in behind a wall across a school yard and is not answering the radio. A group of evacuees the crew is looking for went in and has not come out. The main gate is locked from inside: the crew can force it for points, and every person inside hears it. Or the service door in the north corner is still unlocked (the cook uses it) and leads across a courtyard where some of the dead were shut in with the settlement. Inside, three frightened evacuees are hiding in the stores; nobody meant them harm, the doors were shut because everyone was afraid. The register in the east hall points east, and one of the rescued remembers the family being sent that way. Not built: negotiated entry (needs a dialogue or barter system), 09-A Split Claim and 09-C Shared Wall.

Empty Houses (10-B, built, draft): Mill Street in the old town, the morning after an evacuation. Nobody is hunting the crew. A child's coat and a packed bag in one house; in the middle house a handwritten note says the street was sent by bus to the old school, and that the Ward family went with the second bus, Sam with a fever. The north-east house holds sleepers; going in there and firing wakes the street. Not built: 10-A and 10-C.

### After Act 6

Not written yet. See **Places** for what's next.

---

## Zombies and bosses

| Decision | Detail |
|---|---|
| Place looks | Each place has its own zombie look (patients, office workers, shoppers, police) |
| Mutations | The special types are mutations, and they get worse near the vault |
| First specials | Runner, Brute, Screamer |
| Later specials | Crawler, Bloater, Armored, with later places |
| Bosses | Only at big story moments. Until real bosses are built, big waves led by a Brute or Screamer stand in |
| First meetings | The first Brute is on Floor 6 and the first Screamer on Floor 9 (handoff canon; the build matches since Nov 14) |
| Patient O | A Floor 12 subject at the hospital, later transferred. Comes back as a mutation near the pharmacy vault and threatens the extraction (handoff canon) |
| Patient O's fate in Act 3 | **Decided Nov 14:** driven back and sealed in the vault when its door shuts. Not killed. Its return later is left open. Built Nov 14: a huge, pale brute in a patient's gown that can't be killed |

**In the build:** one kind of zombie, in two body models with mixed skin, hair and clothes. No patient or staff looks yet, and no specials. They come through doors, press against steel cages, and collapse when killed.

---

## Tone and storytelling

| Decision | Detail |
|---|---|
| Tone | Action movie: tense but fun, with dry humor. The scientist's cracking calm carries the serious moments |
| How it's told | Radio voices, pickup notes, files and emails, and short text cards between places |
| Cutscenes | Later, when the game is bigger |
| How much story | Light. Always there, never in the way |
| Story pickups | Collectibles with a count and a place to read them again |
| Ending | Not decided. It gets found as the series grows |
| Twist | None for now. "The scientist is immune" stays in the back pocket for a later reveal |

**In the build:** the only story the player sees is the three captions in the opening scene and the signs on the walls. There are no radio lines, notes, files or text cards yet. The studio name on the title screen is "Probably Fine Studios", which fits the dry humor.

---

## Structure

| Decision | Detail |
|---|---|
| Full game | One long run from the garage to the end, like COD Zombies. No level picker |
| During development | The win screen and level menu stay for testing, then come out |
| Co-op | The same story for 1 to 4 players |
| Failure | When every player is out of lives, the whole run restarts |

**In the build:** 3 lives each. The menu lets you start at any floor, for testing.

---

## Loadout and survival

### The plan

| Slot | Rule |
|---|---|
| Melee | 1 (machete or baseball bat) |
| Small weapons | 2, any mix (two pistols, two sawed-offs, or one of each) |
| Big weapons | 2 (machine gun, 12-gauge shotgun, and so on) |
| Item slots | 5. One for bandages or first aid, one for water, three free |

- **Thirst meter.** Water bottles and soda keep you hydrated.
- **Hydrated** means health regenerates. **Dehydrated** means regen stops.
- **Medicine** (bandages, first aid kits) heals big and fast in a crisis.
- **Radial wheel** for carry items. It doesn't slow time in co-op. Hotkeys for bandages and water make the emergency items one press.
- **Carry items stay with you** for the whole run.

### What's built now

| Thing | In the build |
|---|---|
| Starting gun | P9 service pistol, 12 rounds. The character screen calls it the "field kit" |
| Guns on the walls | Pump shotgun and AK, bought with points |
| Melee | Machete and spiked bat are built but switched off until they look right |
| Items | Bandage, first aid kit, water. Carry up to 10 of each |
| Thirst | Hydration drains slowly. Low hydration halves regen, it doesn't stop it |
| Restocks | A set of bandages, water and so on is set out by the elevator after every wave and when a floor is cleared |
| Doors | Boards to nail up, and steel cages that zombies press against but can't pass |
| Hotbar and wheel | Guns, cages and items on a hotbar and a radial wheel |
| Flashlight | On F. It matters on Floor 6, where the power is out |
| Lives | Each player has their own: 3 to start, never more than 5 (nothing gives more yet) |
| Going down | At 0 health you're down: you can crawl and fire what's left in the gun in hand, with no reload, and you have 45 s before you bleed out. A teammate who kneels beside you for 4 still seconds brings you back, free. Alone, you can get up yourself in 6 s for a life, but not on your last |
| Bleeding out | Costs a life. With lives left you're back at the next quiet moment (a break between waves, a cleared floor, the open lift, the next floor). With none you're out of the run and watch |
| Nobody standing | The run is over and starts again from P01 (locked canon). Floors started from the floor list are practice, where the wave or floor starts again instead |

---

## Pickups by place

### Rules

- **Found, not bought.** Stations keep selling guns and ammo. Pickups are what's lying around.
- **Each item fits its place.**
- **Three kinds:**
  - **Use now:** takes effect when you pick it up.
  - **Carry:** goes into one of the item slots, used from the radial wheel or a hotkey.
  - **Story:** clues, notes, files and emails. These count as collectibles.
- **Weapons** found in the world go into the loadout slots, not the item slots.

### Hospital (Nightfall)

| Item | Kind | What it does |
|---|---|---|
| Bandages | Carry | Built: fast heal |
| First aid kit | Carry | Built: full heal, slower to use |
| Water bottle | Carry | Built: keeps you hydrated |
| Adrenaline syringe | Carry | Revive a downed teammate faster, or get yourself up once |
| Painkillers | Carry | Take less damage for a short time |
| Fire extinguisher | Use now | Spray to push zombies back and blind them |
| Patient files, lab sample | Story | Hints at the scientist |
| Boards | Use now | Built: barricade the doors |
| Steel cages | Carry | Built: block a door completely |

### Office tower (Descent)

| Item | Kind | What it does |
|---|---|---|
| Wall first aid box | Use now | About one per floor: a full heal, once |
| Vending machine soda, water cooler | Carry / use now | Hydration |
| Energy drink / coffee | Carry | Faster sprint and reload for a short time |
| Fire axe (fire cabinet) | Melee | A melee weapon for crowds on the stairs |
| Security desk | Weapon | A pistol and ammo in the guard's desk |
| Access badge | Use now | Opens locked floors and doors |
| Emails, hard drives | Story | The lab's company, and what the sample is |
| Car battery (garage) | Carry | Powers the tunnel door to the pharmacy |

### Pharmacy and lab (The Vault)

| Item | Kind | What it does |
|---|---|---|
| Bandages, first aid kits | Carry | Fast heal (the best place to restock) |
| Pills | Carry | Painkillers: take less damage for a while |
| Stimulants | Carry | Move faster for a short time |
| Med pouch | Use now | Fills your medical slot |
| Lab chemicals | Carry | An improvised firebomb |
| The scientist's notes | Story | What the sample does to zombies, and why they call it "the mother" |

### City street (Daybreak)

| Item | Kind | What it does |
|---|---|---|
| Shop fridges | Carry | Water and soda |
| Road flares | Carry | Light a dark spot and pull zombies to it. The last one calls the ride |
| Gas can | Carry | Drop it and shoot it to blow up a crowd |
| Car alarm | Use now | Draws zombies away from the crew |
| Police car | Weapon | A shotgun and shells in the trunk |
| Ambulance | Use now | Medical restock |
| Fallen soldier's kit | Use now | Ammo and maybe a grenade, from the failed barricades |

---

## Places

| Place | What it's good for | Where it fits |
|---|---|---|
| Hospital | Climbing up, helipad extraction | Act 1 (built) |
| Office tower | Going down, varied floors, parking garage at the bottom | Act 2 (built) |
| Pharmacy and lab | A tight space to clear, the vault hold, mutations | Act 3 (built, no mutations) |
| City street and field | Open ground, a moving fight, the final hold | Act 4 (built) |
| Apartment block | Tight hallways, door by door | Next |
| Subway | Dark tunnels that link to the Act 3 tunnels | Next |
| Police station | Armory, cells, Armored zombies | Next |
| School or university | A lab site for the scientist's other trips | Next |
| Mall, military base, bridge, harbor, stadium | — | Open for later acts and spin-offs |

---

## What the game already shows

Every piece of story the player can see in the build today, word for word where it's text. Useful for checking new ideas against what's already there.

### Title, menus and end screen

- Boot screen: "PROBABLY FINE STUDIOS PRESENTS", then **"THE TOWER · NIGHTFALL"**, then "PRESS ANY KEY TO START".
- Main menu footer: "PROBABLY FINE STUDIOS · PRE-ALPHA BUILD".
- Mission card: **"OPERATION 001 — THE TOWER"**, "Fight up a hospital tower to the helicopter." Threat 4 of 5. Footer: total waves, 5 stops, "1 WAY OUT".
- Route list on the card: G Garage, 3 Admissions, 6 Pharmacy and lab, 9 Surgery, 12 Intensive care, ROOF Helipad ("EXTRACT").
- Character screen: "YOUR SURVIVOR". Outfits are military camouflage (Woodland, Desert, Urban, Digital, Special Ops, Winter) and tactical gloves (Black Tactical, Coyote, Ranger, Urban Grey). "Enter to deploy."
- Bodycam camera option, with an overlay reading "REC / BODY 01" and a timestamp.
- Win screen: **"EXTRACTED"**, "THE HELICOPTER IS HERE. YOU MADE IT OUT OF THE TOWER", floors cleared, lives left.
- Death: "OVERRUN", "OUT OF LIVES".

### The opening scene (14 seconds, skippable)

Two camera shots on the street outside the garage at night: wide over the street, a parked ambulance and the mouth of the ramp, then low at the top of the ramp, looking down into the dark as five zombies shamble up it. Then the camera settles into the player's view.

Captions, in order:
1. **LEVEL 0** — "The hospital parking garage"
2. "The crew drove in to bring survivors out."
3. "The garage is already overrun."

### The street outside the garage

- The players start on the street, run down a ramp into the garage and close a metal gate behind them.
- A parked ambulance in the hospital's ambulance bay. Its livery reads "AMBULANCE / NORTHLINE GENERAL HOSPITAL".
- The **El Cajon**, a 1960s coupe utility in dark blue, parked in bay **E05**, which is signed "E05 RESERVED / KEEP BAY CLEAR". It's the most detailed vehicle in the game. Nobody has said whose it is.
- Ordinary saloons, estates and a cargo van in the lot and on the road, and a concrete barrier.
- Hospital signs: "NORTHLINE GENERAL HOSPITAL / ACUTE CARE / TRAUMA CENTRE", "MAIN ENTRANCE", "ENTRANCE CLOSED / EMERGENCY ACCESS VIA B1 RAMP", "EMERGENCY / 24 HOURS / ACCESS VIA B1".
- Lot signs: "VISITOR PARKING", "HOSPITAL TRANSPORT / AMBULANCE BAY / KEEP ACCESS CLEAR".
- Shopfronts along the block, each under "NORTHLINE / CITY CENTRE": **Northline Offices, Corner Market, Metro House, Night Owl Cafe, West End House, Northline Pharmacy, Riverside House, 24 / Seven Market**.
- Both ends of the road are sealed: tunnel portals signed **"OLD TOWN"** and **"RIVERSIDE"** with "ROAD CLOSED / EVACUATION IN EFFECT", concrete closures reading "ROAD CLOSED / EMERGENCY ACCESS ONLY", and shut security gates.
- Tall towers on the skyline behind.
- The HUD's compass reads "NORTHLINE / STREET".

### Level 0 — the garage (B1)

- Signs: "B1 / STAFF PARKING / NORTHLINE GENERAL HOSPITAL", "LIFTS / HOSPITAL / FOLLOW THE GREEN WALKWAY", "10 / SLOW", "PARKING B1", "LOADING DOCK".
- A loading dock, a shipping container, crates, and doorways in each wall where zombies come from.
- The elevator up to the hospital.

### Floor 3 — Admissions

- Signs: "ADMISSIONS / FLOOR 3 / RECEPTION", "MEDICAL RECORDS / STAFF ONLY", "ADMINISTRATOR / PRIVATE", "ELEVATOR / OUT OF SERVICE / KEYCARD OVERRIDE".
- Lobby with a reception counter and waiting seats, an open-plan office, the records room (filing cabinets) and the manager's office. The manager's keycard is on the desk. It overrides the elevator and opens the helipad's control box on the roof.

### Floor 6 — Pharmacy and laboratories

- Signs: "FLOOR 6 / PHARMACY AND LABORATORIES", "PHARMACY / AUTHORISED STAFF", "LAB 1 / BIOHAZARD", "LAB 2 / PATHOLOGY", "COLD STORAGE / SAMPLES / -20C", "DISPENSARY / COLLECT HERE", "ELEVATOR / NO POWER / RESET THE BREAKERS".
- The power is out. Only red emergency lamps until the breakers are thrown, one circuit at a time.

### Floor 9 — Surgery

- Signs: "SURGERY / FLOOR 9", "THEATRE 1" and "THEATRE 2 / STERILE / NO ENTRY", "SCRUB / WASH BEFORE ENTRY", "RECOVERY / QUIET PLEASE", "ELEVATOR / ON BATTERY / CHARGE IN RECOVERY".
- The charger in Recovery fills the helipad battery. Zombies keep coming while it charges.

### Floor 12 — Intensive care

- Signs: "INTENSIVE CARE / FLOOR 12 / QUIET", "ISOLATION A" and "ISOLATION B / INFECTION CONTROL", "BAYS 1 TO 5 / ONE VISITOR AT A TIME", "ELEVATOR / HELIPAD SPARES / LOAD HERE".
- Three lamp cases to carry to the elevator.

### The roof (level 14)

- Sign: "HELIPAD / ROOF / LEVEL 14".
- Open night sky over the city. Zombies climb the stairwells and come out of four stair heads.
- The light box is on the far east parapet. Once it's on: "Lights on. It is on its way", a 90-second hold, then "HELICOPTER DOWN / Everyone onto the helipad".
- The helicopter is a white twin-engine light helicopter marked **"AIR AMBULANCE"**.

### Objective words on screen

"HELIPAD PART 1 OF 4" and so on, with the part named: Helipad control key, Power to the roof, Helipad battery, Landing lamps. Between floors: "THE WAY UP", "ELEVATOR READY", "GOING UP".

---

## Where the game and the story disagree

Things the build says that clash with the decisions above, or with each other. Each needs a call before more levels get built.

1. **"The tower" is used for two buildings.** The game calls the hospital "The Tower" (title screen, mission card, win screen). The story uses "the office tower" for Act 2.
   - a) The hospital keeps "The Tower"; Act 2 gets another name (the high-rise, the head office, the company's name)
   - b) The hospital becomes "Northline General" or similar on screen; "the tower" stays for Act 2
   - c) Your own answer

2. **There's already a pharmacy on the street outside the hospital.** "Northline Pharmacy" sits a few metres from the garage ramp. Act 3's pharmacy is meant to be reached underground from the office tower. The hospital's own Floor 6 is a pharmacy and lab floor too, with cold storage for samples.
   - a) It's just a shop; the Act 3 pharmacy is somewhere else in the city
   - b) It *is* the Act 3 pharmacy, and the long way round through the office tower is because the street is overrun
   - c) Rename the street shop so it doesn't point the wrong way
   - d) Your own answer

3. **Whose ambulance is in the opening shot?** The ambulance parked outside wears Northline General Hospital livery, in the hospital's own bay. The story says the crew drove a ground ambulance in, and the Proposed section says it ran out of fuel 9 miles out.
   - a) It's the hospital's own ambulance, abandoned. The crew's is dead somewhere else (fits the fuel proposal)
   - b) It's the crew's ambulance, and the livery should change to the crew's group
   - c) Your own answer

4. **The players look like soldiers, not paramedics.** Outfits are all camouflage, the starting gun is a "service pistol" in a "field kit", the menu says "deploy" and "Operation 001", and the bodycam says "BODY 01". The core crew is meant to be paramedics.
   - a) Fine: the player characters are the ex-military side of the mixed crew
   - b) Add paramedic and civilian outfits, and soften the military words
   - c) Your own answer

5. **The player is "your survivor".** The story says the crew are named characters with callsigns.
   - a) Pick from named crew members on the character screen
   - b) A custom survivor who joins the named crew
   - c) Your own answer

6. **The opening caption says "drove in".** This is the line the fuel proposal would change.

7. **Thirst is already in, and it's softer than the plan.** The plan says dehydrated stops regen and that thirst waits for Phase 3. The build has it now, and low hydration only halves regen.

8. **Item carrying.** The plan has 5 item slots. The build carries up to 10 each of bandages, first aid kits and water.

9. **Melee.** The plan says machete or baseball bat. The build has a machete and a spiked bat (switched off for now).

---

## Questions to settle

New story questions raised by what's in the build. Multiple choice, with room for your own answer.

1. **Is the city called Northline?** It's on the hospital, the street signs, the shops and the HUD.
   - a) Yes, the city is Northline, and the zone is named after it
   - b) Northline is just the hospital and that part of town; the city has another name
   - c) Replace it
   - d) Your own answer

2. **Old Town, Riverside, West End and City Centre.** These districts are on the signs. Do they become the map of the zone?
   - a) Yes: they're the districts of the city, and later levels happen in them (Old Town for the apartments, Riverside for the harbor and bridge, and so on)
   - b) Background only
   - c) Your own answer

3. **"Road closed / evacuation in effect."** The city was evacuated, at least in the centre. Who ran it, and where did people go?
   - a) The authorities ran it and it failed; the camps in the outskirts are what's left of it
   - b) It's still going, and the military holds the edge of the zone (ties to the failed barricades in Act 4)
   - c) Your own answer

4. **Who leaves the supplies by the elevator after every wave?** It happens in the build on every floor.
   - a) Hospital staff hiding on the floor, who slip them out once it's quiet (ties to "people saved")
   - b) The crew's own kit, dropped from a bag the team carries
   - c) The air crew or camps send them up, and it's never explained in play
   - d) Your own answer

5. **Why are there steel cages to block the doors?** Players carry them and set them across doorways.
   - a) Hospital security shutters and trolley cages
   - b) The crew's own gear, built for exactly this
   - c) Your own answer

6. **Floor 12 has isolation rooms marked "Infection control".** A strong place for a clue.
   - a) The first patients were isolated here, before anyone knew what it was. Their charts are the first patient files
   - b) Just a normal ICU
   - c) Your own answer

7. **Floor 6 has "Cold storage: samples" and a biohazard lab.** Does it connect to the scientist?
   - a) Yes: the hospital tested early cases here and sent results to his lab. A clue, not the sample
   - b) No, a normal hospital lab
   - c) Your own answer

8. **Whose is the El Cajon in reserved bay E05?** It's the most detailed thing on the street, and the reserved bay makes it look like someone's.
   - a) The hospital manager's (the keycard owner), a small human touch
   - b) The scientist's, left behind when he moved to the pharmacy lab
   - c) It becomes a vehicle the crew uses later
   - d) Just a car
   - e) Your own answer

9. **Why does the elevator need each fix?** In the build, each floor's job also wakes the elevator (keycard override, breakers, battery, spares loaded). Does the story keep both reasons, or just the helipad?

10. **The hospital has 14 storeys but the elevator stops at five.** Are the floors in between part of the story (sealed off, overrun, where survivors are), or just skipped?

11. **Decided Nov 14: a), keep the lift.** The stairwells are packed solid, so the freight lift is the only way down. The quiet detour the handoff asks for is played on the sweep floors (41 and 34). **Stairs or freight lift in the tower?** The story says the dead come up the stairs and burst out of floors. The build uses a freight lift that needs power, like the hospital.
   - a) Keep the lift, and the stairs are full, so the lift is the only way down
   - b) Build real stairwell levels: collapsed flights, locked fire doors, dead coming up
   - c) Both: lift between the story floors, stairs for the short landings
   - d) Your own answer

12. **Decided Nov 14: c), shutters and gates, no lift.** **What carries the crew between street blocks in Act 4?** The build has a transit lift in a kiosk on every block.
   - a) A metro or tram entrance, which also ties to the Subway place
   - b) Loading docks and service lifts, so it's a lift everywhere
   - c) No lift: the blocks join by shutters and gates, and the screen cuts
   - d) Your own answer

13. **Decided Nov 14: a), with a change.** He steps out of the vault with the sample in a short scene, then follows the crew as a companion who can't be hurt and can't make a mission fail, all the way to the air ambulance. Until his name is settled the screen calls him THE SCIENTIST, and he wears the player's body with a lab coat and no gun. **Who is the scientist when the vault opens?** There's no scene yet. The run just ends on the vault lift, then Act 4 begins.
   - a) He steps out, a short scene, and he is carried to the air ambulance in the park
   - b) He's already out of sight and only heard until the park
   - c) Your own answer

---

## Research leads

Real-world things worth looking up to ground the story. None of this is decided.

- **Air ambulance (HEMS) operations:** crew make-up (pilot, paramedic, doctor), callsigns, how a hospital helipad is lit and powered, what grounds a helicopter.
- **Hospital layout:** what really sits on which floor (admissions, pharmacy, labs, theatres, ICU), how isolation rooms work, what a hospital does in a mass casualty event or a lockdown.
- **Labs and containment:** biosafety levels, how samples are stored (the "-20C" sign on Floor 6), what a secret or private lab behind a pharmacy would need.
- **Evacuations:** how a city centre gets evacuated, road closures, where people get sent, how it fails.
- **Callsigns and radio talk:** how crews talk on the radio, for the short call-outs.
- **The company:** what kind of company owns a lab, a pharmacy chain and an office tower. Pharma, biotech, a holding company.
- **Place names:** whether Northline, Old Town, Riverside and West End sound like one city, and what country it's in.

---

## Proposed

- **Why the crew is on foot at the hospital:** their ground ambulance ran out of fuel 9 miles out. They had to fight the rest of the way in on foot, and that is why they end up at the hospital's parking garage at all. It sits under the Act 1 line about the crew driving in and being overrun, and replaces "drove in" with "drove most of the way, then fought in".
- **Built (Nov 14):** accepted and built as the Prologue, two levels, Dead Stop and The Approach. The text below is the original proposal.
- **A bonus level for it:** "The Approach", the run from the dead ambulance to the hospital. It is a move level, built when the street is mapped in more detail, and it is the place to set up fights: choke points, cars, shopfronts and rooftops to fight from. It leads straight into the garage, so Level 0 stays the first hold. Not built yet.
- **Where it shows now:** the opening scene outside the garage currently reads "The crew drove in to bring survivors out." If this is accepted, that line becomes something like "The ambulance died 9 miles out. They fought the rest of the way."

---

- **Why the lifts work in an overrun tower (build, Nov 13):** every floor's job also gets its lift going. It reads as one rule from the hospital on: the building's power and lifts are out, and the crew brings them back a floor at a time. For the tower that means breakers and generators. It still needs a line that says why the crew takes the freight lift and not the stairs: the stairwells are full, which fits the dead coming up them.
- **Why the tower floors have names and numbers (build, Nov 13):** floors 41, 34, 27, 20 and the lobby are invented to give the descent variety. The tenants are offices, records, executives and servers, owned by the lab's company. Nothing on them hints at the scientist yet. Executive suites is where a clue belongs.
- **The transit lift (build, Nov 13):** between street blocks the crew rides a lift in a kiosk. It's only there because the game moves between levels by lift. Replace it with something the story supports: a metro entrance, a loading dock, a shutter.
- **Signal flares at the end (build, Nov 13):** the park extraction uses red flares and smoke, as asked, in place of a helipad. It fits a field with no landing site. Who carries the flares, and why the crew has them, isn't said.
- **The barricades (build, Nov 13):** the checkpoint is the military's failed attempt to hold the zone edge. It ties to Questions item 3 (the evacuation) and is a place to show that.

---

## Parked

- Is the first aid slot the same item as the rare first aid kit that revives a teammate, or a different one? (The adrenaline syringe overlaps with this too.)
- How does the long run save progress between sittings? It was meant to be answered before Act 2 was built. Act 2 is built now, and it is 21 stops long, so this is overdue.
- Names for the crew, the pilot, the co-pilot, the scientist, the lab's company and the zone.
- Where "people saved" shows up, and how camps are introduced.

---

## Log

- **Nov 2, 2026:** First riff: hospital extraction → stairwell descent in a second building → pharmacy vault rescue → street run to the next extraction. Fleshed out into four acts, with the office tower, the underground route, the scientist on the radio, the sample, places and pickups.
- **Nov 3, 2026:** Went through the question list on the Claude website. Decided the cause, the scientist, the sample, the crew, the zone, the reasons for every act, zombies, tone, structure and the loadout. The question list was replaced by these decisions.
- **Nov 3, 2026:** Proposed that the crew's ambulance ran out of fuel 9 miles out, which is why they are on foot at the hospital, with the run in as a bonus level once the street is mapped.
- **Nov 10, 2026:** Went through the build and wrote down every piece of story it shows: the opening captions, title and menu words, every sign on every floor, the street, the shops, the vehicles and the gear. Brought the Act 1 table in line with the real floors (Admissions, Pharmacy and laboratories, Surgery, Intensive care, the roof at level 14) and the loadout in line with what's built. Listed where the build and the story disagree, new questions the build raises, and research leads, ready for a research pass before more levels.
- **Nov 13, 2026:** Built the rest of the campaign as levels, ahead of the story: the tower roof and six office floors (Act 2), the tunnel, pharmacy, lab and vault (Act 3), and four outdoor blocks ending at the park (Act 4). Floors, names and objectives here are the build's own and are listed above as in the build. The park extraction is red flares and smoke in place of a pad. Added questions 11 to 13 (stairs or lift, what links the street blocks, the scientist at the vault). Nothing in Acts 2 to 4 has any story delivered yet: no radio, notes or scientist.
- **Nov 14, 2026:** Received the master campaign handoff (12 acts, five-level prologue). Built the prologue as five levels, P01 to P05, Breakdown, Roadside Station, Checkpoint, Commercial District and Final Push. Acts 5 to 12 are working expansion only and not built.
- **Nov 14, 2026:** Settled questions 11 to 13 and Patient O's fate (sealed in the vault). The tunnel became a run, the pharmacy a sweep with the shop's own dead standing in it, and the lab a two-step floor (freezer power, then the cryo carriers), with the scientist on the radio through all three. The first Brute and Screamer now come where the handoff puts them, Floors 6 and 9.
- **Nov 14, 2026:** Built the vault's ending: Patient O in two stages, the vault opening scene, and the scientist stepping out and following the crew. Patient O is sealed back in the vault, as decided.
- **Nov 14, 2026:** Reworked Act 2 for play: floors 41, 34 and 27 are sweeps with sleeping dead, floor 34 is two steps (transfer file, then the generator), floor 20 has the camera glimpse, the lobby's last wave is led by a brute, and the garage needs a car battery for the tunnel lift. Added readable notes (evacuation notice, transfer order, board memo) and a run log on the pause screen. The note texts are draft wording awaiting approval.
- **Nov 14, 2026:** Rebuilt Act 4 for play. The transit kiosks became gates, and Main Street, the market and the barricades are run floors. Main Street has the shop shortcut, the relay stand is 30 seconds, and the park ends with the flight out (04-C) to the outskirts camp. Added the army evacuation map at the barricades.
- **Nov 14, 2026:** Settled the open wording on my recommendation, at Chris's request. The Act 2 notes and the evacuation map stand as written. The broadcast no longer names "the river towns" and says only "beyond the city", so nothing gets ahead of Acts 5 to 12.
- **Nov 14, 2026:** Lives now follow canon. They belong to each player (3, cap 5). Going down comes before dying: 45 s to bleed out, a 4 s revive by a teammate, or a slower self-revive alone that costs a life. Nobody left standing ends the run, which starts again from P01. Floors started from the floor list are practice. A co-op room waits for someone to press DEPLOY before its run begins.
- **Nov 14, 2026:** Prologue pass. P01 Breakdown is quiet at first (the road's dead stand about, the crew looks for the police radio) and turns into a run once the hospital's call comes through. P03 gives the exit gate a 45 second window. The gates between blocks are road checkpoints now, with the one behind the crew left open. Supply stations are duffle bags and crates on the ground. The restaurant rescue in P04 is not built yet.
- **Nov 14, 2026:** P04's restaurant rescue is built. Four people (the cook, a waiter and two diners) hide in Casa Rosa's kitchen. Led out through the back door, they leave in the restaurant's van for the camp. The run log keeps a Casa Rosa entry as the callback, and the end screen counts survivors rescued.

