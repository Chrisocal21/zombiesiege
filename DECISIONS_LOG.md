# Zombie Siege — Decisions Log

Decisions made during the build, and every open question.

---

## Decisions

| Date | Decision | Decided By |
|---|---|---|
| Nov 1, 2026 | Folder layout: rules in `src/game`, Three.js in `src/render`, level data in `src/levels`, keyboard and mouse in `src/client`, numbers in `src/config.ts` | Chris accepted the coding Claude's proposal |
| Nov 1, 2026 | Zombies walk straight at the nearest player and slide along anything they bump into; real pathfinding waits for Level 1 | Chris accepted the coding Claude's proposal |
| Nov 1, 2026 | Step Zero: health at 0 restarts the current wave at full health, with no lives system yet | Chris accepted the coding Claude's proposal |
| Nov 1, 2026 | One minimal `index.html` exists because Vite needs it to load the game; no UI is built in HTML | Coding Claude |
| Nov 1, 2026 | The HUD is drawn on a 2D canvas layered over the 3D view | Chris accepted the coding Claude's proposal |
| Nov 1, 2026 | Level 0 room is 20 by 20 meters with 4 meter walls and two crates; zombies spawn in the corners | Coding Claude |
| Nov 1, 2026 | Level 0 checkpoint is a placeholder at the north wall until the real spot is chosen | Coding Claude |
| Nov 1, 2026 | Wave sizes are 3, 5, 7, 9, 12, with all tuning numbers placeholders in `src/config.ts` | Coding Claude |

| Nov 1, 2026 | Game runs on a fixed 60 ticks per second, separate from the screen frame rate | Coding Claude |
| Nov 1, 2026 | Mouse look is sent as turn amounts per tick, not absolute angles, so a networked player can send the same message | Coding Claude |
| Nov 1, 2026 | Click the game to capture the mouse; Esc releases it | Coding Claude |
| Nov 1, 2026 | Pistol fires while the mouse button is held, up to 4 shots per second; R reloads; pulling the trigger on an empty magazine reloads automatically | Coding Claude |
| Nov 1, 2026 | Shots are instant hits along the aim line, not travelling bullets | Coding Claude |
| Nov 1, 2026 | Shot tracer line removed. A short bullet now flies to the hit point at 90 m/s and bursts into sparks on impact; it is visual only, damage still lands instantly | Chris asked for it |
| Nov 1, 2026 | Weapon visual upgrade: the pistol and a gloved right hand with a jacket sleeve are built in code from blocks, so there is no downloaded model and nothing to add to ASSET_LICENSES.md. A real CC0 model is still an option for the Phase 4 art pass | Chris asked for it |
| Nov 1, 2026 | The hand was rebuilt from rounded shapes (capsule fingers with knuckles, soft palm, round thumb, tapered forearm) after the first blocky version looked like a slab. It is still a tan glove; a bare skin hand is a one-line color change | Chris asked for it |
| Nov 1, 2026 | Hand redone a second time after Chris said it looked terrible: slimmer fingers, no lump on the back of the hand, a short glove cuff then the green sleeve straight away, and the gun moved out toward the right corner at a smaller scale. Checked at Chris's window size this time | Chris asked for it |
| Nov 1, 2026 | The hand built from shapes was replaced with a real rigged hand model, posed around the grip once at load by bending its finger joints. It is bare skin, not a glove. This replaces the two hand entries above. The model is MIT, not CC0: an exception to the CC0 asset plan, logged in ASSET_LICENSES.md | Chris asked for it |
| Nov 1, 2026 | Pistol redrawn from curved side profiles with bevelled edges, a see-through trigger guard, stippled grip, and metal finishes, after the blocks clashed with the real hand. Built in code instead of a downloaded model so the slide and magazine stay separate parts that can animate | Chris asked for it |
| Nov 1, 2026 | Weapon fit pass: grip cut to a compact size, index finger hooked on the trigger inside the guard, fingers closed up under the guard, and real shadows added on the weapon and hand | Chris asked for it |
| Nov 1, 2026 | Dual wielding is planned for Phase 3: a second pistol or sawed-off shotgun in the left hand. Not built yet. The package that supplied the right hand also has a matching left hand | Chris asked for it |
| Nov 1, 2026 | Trigger pull animated: the index finger and trigger move on every shot. Grip cut shorter again. Muzzle flash changed from solid blocks to a soft glowing burst | Chris asked for it |
| Nov 1, 2026 | Full magazine change on reload: the empty magazine falls away, a left hand brings up a fresh one and seats it, then the slide is released if the gun was empty. Reload time raised from 1.5 to 1.9 seconds to fit it | Chris asked for it; the 1.9 is the coding Claude's number |
| Nov 1, 2026 | Slight fisheye lens on the finished picture, strength in `src/config.ts`. It leaves the center of the screen accurate | Chris asked for it |
| Nov 1, 2026 | Hold right click to aim down the sights: the sight line sits on screen center, the view zooms from 75 to 55 degrees, the crosshair hides, walking drops to 60% speed, and aiming is blocked during a reload. Accuracy is the same as from the hip for now | Chris asked for aiming; the numbers and rules are the coding Claude's |
| Nov 1, 2026 | Bullet is now a small copper round with a short fading streak at 140 m/s, drawn oversized so it can be seen. Still visual only; damage lands instantly | Chris asked for it |
| Nov 1, 2026 | Lean on Q and E while aiming: the head moves 0.35 m out and the picture tilts, a wall stops it short, and shots start from the leaned head so you can fire round a corner. The gun stays fixed on screen while the world tilts | Chris asked for it; distance and speed are the coding Claude's numbers |
| Nov 1, 2026 | Crouching, jumping, climbing, ladders, and back-to-wall peeking are Feature 1.4 in Phase 1 | Chris asked for them |
| Nov 1, 2026 | Height: the player now has a height above the floor. Anything lower than 0.4 m is walked up, a jump rises about 0.9 m, and gravity is 16 | Coding Claude, numbers are placeholders |
| Nov 1, 2026 | Crouch is hold C (or left Ctrl), jump is Space, cover is F. Crouching drops the eyes to 1.05 m and slows to 55% | Coding Claude chose the keys |
| Nov 1, 2026 | Climbing: jumping while facing a ledge between 0.5 and 2.25 m above your feet pulls you up onto it over about half a second, with both hands off the gun. Any box with a free flat top can be climbed, which the game works out itself | Chris asked for it; the 2.25 m is the coding Claude's number |
| Nov 1, 2026 | Ladders are listed in the level file (position, direction, bottom and top). Walk into one facing it to grab it, W up and S down, Space to kick off. Climbing off the top puts you on the roof | Chris asked for it |
| Nov 1, 2026 | Cover: F next to a wall or barrier sticks you to it. You only slide along it, can lean with Q and E without aiming, and step away to leave. Behind a barrier lower than eye height you duck on your own and stand up by aiming. This is the first version of Chris's back-to-wall peek; lean still works on its own | Chris asked for it; the design is the coding Claude's |
| Nov 1, 2026 | Zombies: one type, walk straight at the nearest living player and slide along obstacles, 75 health (3 pistol hits), hit for 10 once a second after a 0.4 s wind-up, 2.5 m/s and 6% faster each wave. A player more than 1 m above a zombie's feet can not be hit, which makes high spots safe for now | Chris asked for zombies; the numbers are placeholders |
| Nov 1, 2026 | Waves: 3, 5, 7, 9 and 12 zombies, one every 1.5 s from the four corners, a 3 s pause before wave 1 and a 10 s break between waves. Clearing wave 5 shows Level 0 cleared, then starts again from wave 1. This is a stand-in for the win screen and menu | Coding Claude |
| Nov 1, 2026 | Health is 100 and comes back at 15 per second after 5 seconds without a hit. At 0 the current wave restarts with full health, as decided for Step Zero. No lives yet | Coding Claude for the numbers |
| Nov 1, 2026 | Zombies now come out of four doorways, one in each wall, instead of the corners. Each doorway opens into a dark roofed alcove outside the wall where the zombie appears, walks through the door to a spot just inside, then chases. This replaces the corners entry above | Chris asked for it |
| Nov 1, 2026 | Boarding up: two bundles of boards lie on the floor (a pillar of light marks them). G picks one up, and G at an open door boards it, one bundle per door, so two of the four doors can be sealed. Boards are solid, so nothing walks or shoots through them. Boards are permanent, and only possible in the opening | Chris asked for it; the keys, the carry rules and the permanent boards are the coding Claude's choice |
| Nov 1, 2026 | The opening before wave 1 is 30 seconds with no zombies, to find the boards and choose the doors. Zombies spawn only at open doors, taking turns. After clearing wave 5 the boards come off and a new 30 second opening starts. After dying, the same wave restarts after 3 seconds with the boards as they were | Chris asked for it; the restart rules are the coding Claude's |
| Nov 1, 2026 | P freezes every zombie and the wave clock, and P again resumes them, so the map can be walked and looked at. Meant as a testing aid, and it is a message to the game so it stays in the rules and not the renderer | Chris asked for it |
| Nov 1, 2026 | Boards are permanent for the level. The door choice is meant to be a strategy | Chris confirmed |
| Nov 1, 2026 | Level 0 is now a parking garage and loading dock in the base of a tower, not a rooftop yard. It has a ceiling, concrete columns, parked cars and vans, cartons on pallets, a shipping container, fluorescent lights and a loading dock sign. This replaces the rooftop yard and its skyline | Chris asked for it |
| Nov 1, 2026 | The level starts in the street at night. The players run across the road, down a long ramp, into the garage, and close a metal gate by pulling the lever beside it (G). The ramp is walked as many small steps and drawn as one slope. Closing the gate starts the 30 second countdown, and wave 1 follows it. This replaces the 30 seconds starting when the level loads | Chris asked for it |
| Nov 1, 2026 | The rest between waves is 25 seconds, up from 10, so there is time for buying weapons and moving on once those exist. The countdown before wave 1 stays 30 | Chris asked for 20 to 30; 25 is the coding Claude's pick |
| Nov 1, 2026 | The plan for the whole game: each level is a floor higher up the tower, ending on the roof with a helicopter airlift. Only Level 0 exists. Waves 1 to 5 are still its goal, and clearing wave 5 sends the players back to the street for another run for now | Chris described it |
| Nov 1, 2026 | Menus and HUD are drawn on the canvas, with no HTML. A title screen with the street behind it, a pause menu on Esc, a controls screen where every key and mouse button is rebound by clicking it and pressing the new one (a key used twice swaps), and a settings screen for mouse sensitivity, field of view, lens warp, radar, compass and hit markers. Choices are saved in the browser | Chris asked for it |
| Nov 1, 2026 | The HUD is rebuilt in a studio style: a compass strip with waypoints, a rotating radar with zombies, a health bar with a trailing loss, big ammo with a mark for every round, keycap prompts that follow the rebound keys, hit and kill markers, red arrows toward whatever hit you, and large banners for waves, the gate and dying. It uses Bahnschrift where it is installed, so other computers will fall back to a similar font | Chris asked for it |
| Nov 1, 2026 | The yard is rebuilt to match the hand and gun: textures painted in code (concrete, panels, wood crates, corrugated container, rusty barrels), bevelled edges, a shipping container with a roof ladder, concrete barriers, wall lamps with real lights (one flickers), puddles, a night sky with stars, a moon casting shadows, and a dark skyline. No downloaded assets, so nothing new for ASSET_LICENSES.md | Chris asked for it |
| Nov 1, 2026 | The weapon is drawn in a separate pass on top of the world so it never pokes through walls, with reflections so the metal reads as metal. Gloves are tan and the sleeve olive so the hand separates from the dark gun at night | Coding Claude |
| Nov 1, 2026 | Weapon animation: walk bob, breathing, lag when turning, recoil with the slide kicking back, slide locked back when empty, and a reload where the magazine drops out and a new one slides in | Coding Claude |
| Nov 1, 2026 | Responsiveness pass after Chris's feedback: game ticks raised from 60 to 120 per second, clicks are remembered until the next tick so none are dropped, shot spacing cut from 0.25 to 0.15 seconds, raw mouse input requested | Chris asked for it |
| Nov 1, 2026 | Movement now speeds up and slows down over 0.1 seconds and slides along walls; the picture is drawn between the last two ticks, and mouse turning is drawn immediately without waiting for a tick | Chris asked for it |
| Nov 2, 2026 | Each floor is its own run of five waves. After wave 5 the floor is cleared, the elevator in the north wall opens, and once everyone is inside it closes, rides up for 6 seconds, and opens on the next floor with a fresh 30 second countdown to board up doors. The street gate stays shut. Each floor up adds 40% more zombies per wave and makes them 8% faster. Every floor reuses the garage layout until real floors are built | Chris asked for it; the numbers and the reuse of the garage are the coding Claude's |
| Nov 2, 2026 | Three lives: going down restarts the wave, running out restarts the floor from wave 1 and clears points. Points: 10 per hit, 60 per kill, 150 per headshot, and a headshot kills outright | Chris asked for it; the numbers are the coding Claude's |
| Nov 2, 2026 | Sound is synthesized in the browser (no audio files) with a volume slider; tuning deferred. A win screen shows at the top floor | Chris deferred tuning; synthesis is the coding Claude's |
| Nov 2, 2026 | Ammo is limited: 12 round magazine plus 48 spare (max 96). An ammo locker sells a refill for 100 points, and every wave starts with at least one reload of spare rounds so a run can never lock | Chris asked for limited ammo and wall stations; numbers are the coding Claude's |
| Nov 2, 2026 | Second weapon is bought at a wall station: a sawed-off shotgun for 500 points (8 pellets, 2 shells, shells 200 points), swapped with X; it replaces the pistol in hand rather than dual wielding. Weapons are kept when a life is lost and lost only when all three lives are gone | Chris said so; dual wielding is still open |
| Nov 2, 2026 | The tower is a hospital, which is why it has a helipad. Floors above the garage each have their own objective, not one shared route: floor 1 find a keycard behind doors that cost points, floor 2 flip breakers in the dark, floor 3 hold a room while something charges. Each gives one part toward switching on the roof's helipad lights, and all are needed before the helicopter will land. Floors have different room layouts (offices, pharmacy and lab, surgery) | Chris's idea; the floor list and objectives are the coding Claude's draft |
| Nov 2, 2026 | The building is tall (about 14 storeys) but the elevator only stops at some: ground, 3, 6, 9 and 12, then the roof. Waves per stop are 5, 3, 3, 4 and 4, so 19 waves plus a roof finale. The elevator display shows real storey numbers and rides last longer the more storeys they climb. Stops are a list in config, so more can be added later | Chris agreed to 19 waves; the stop numbers and names are the coding Claude's |

---

## Open Questions

- Final name
- Exact checkpoint spot in the Level 0 room
- State sync method for Phase 2: full snapshots or only changes
- Whether zombies chase the players in the street
- How many levels the tower has and how each one ends
- Whether zombies should climb crates and ladders, so high spots are not safe
- Whether the cover mode feels right after playing it
- How the second weapon for dual wielding is obtained: floor pickups, wall stations, or something else
