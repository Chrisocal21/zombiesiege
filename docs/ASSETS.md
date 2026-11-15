# Third-party assets

Every model, texture and sound the game ships that we did not make, where it came from, and
its license. **Check the license before an asset goes live**; anything marked *unconfirmed*
needs its download page checked for use in a commercial game.

| In the game | Files | Source | License |
|---|---|---|---|
| Hands (old pistol, shotgun, melee) | `public/models/left-hand.glb`, `right-hand.glb` | see `public/models/hands-LICENSE.md` | see that file |
| Glock 17 with arms and animations | `public/models/glock17.glb` | Fab, "G17 - FPS Weapon Animations Pack (v.1)" | Fab Standard License |
| Pump shotgun (Ithaca 37 style) | `public/models/weapons/pump.glb` | `Shotgun_Model.blend` from the asset folder; its 4K textures were not supplied, so the parts are painted flat steel and wood | *unconfirmed* |
| AK | `public/models/weapons/ak.glb` | `AK files/akSAl.blend` from `AK files(1).zip`; its arms are left out, and the packed camo texture is replaced by flat paint | *unconfirmed* |
| Street buildings (8) | `public/models/city/*.glb` | "Buildings" pack (FBX + baked PBR textures) | *unconfirmed* |
| Zombies (2) and a survivor | `public/models/characters/zombie-a.glb`, `zombie-b.glb`, `survivor.glb` | "3 zombie collection" (FBX, Mixamo skeletons) | *unconfirmed* |
| City rows and skyline (11) | `public/models/blocks/*.glb` | CGTrader "City Building Pack" bundle (Building Collection 1 and 2, FBX) | *unconfirmed* (CGTrader purchase: check the licence on the order) |
| Suburban houses (16) | `public/models/houses/house-*.glb`, `home-*.glb` | CGTrader "Suburban House Collection" 1 and 2 (FBX) | *unconfirmed* (CGTrader purchase) |
| Cargo: barrels, drums, pallets, cartons, crates, sacks, tank | `public/models/props/*.glb` (not medkit, med-items, container) | CGTrader "Box and Cargo Collection" (FBX) | *unconfirmed* (CGTrader purchase) |
| First aid bag (closed, open) and loose medical items | `public/models/props/medkit*.glb`, `med-items.glb`, `med-loose.glb` (the 16 single items, one node each: glove, pills, bandage, ointment, antiseptic, sanitizer, tube, wipes, plaster, tape, gauze, drops, scissors, dressing, coldpack, tweezers) | CGTrader "Emergency Medical Kit, game ready" (FBX + textures; the bag's opacity map is left out) | *unconfirmed* (CGTrader purchase) |
| Ambulance | `public/models/vehicles/ambulance.glb` | CGTrader "Vehicle Ambulance Rescue Truck, game ready 06" (OBJ, textures wired by part) | *unconfirmed* (CGTrader purchase) |
| Burned police car | `public/models/vehicles/police-wreck.glb` | CGTrader "Destroyed Police Car Wreck, post-apocalyptic PBR" (GLB) | *unconfirmed* (CGTrader purchase) |
| Shipping container | `public/models/props/container.glb` | `shipping-container-proz.glb` from the asset folder | *unconfirmed* |
| Two trees, grass bush | `public/models/plants/*.glb` | `projectbaja/assets/plants`: the two low-poly trees in "Realistic Trees" and `grass_bush` in `plants_assets.fbx` | *unconfirmed* |
| Draco decoder | `public/draco/*` | three.js `examples/jsm/libs/draco` | Apache 2.0 |

## How the new packs are used

- `src/render/scenery.ts` draws the edges of every street floor from `Level.scenery`: city rows of the
  block models over shopfronts the game draws (the models are clipped at 4.4 m so their own ground
  floors never cover a doorway), fences with houses behind, hedges with fields and trees, and dark
  towers on the skyline.
- `src/render/props.ts` fills the levels' `barrel`, `cartons` and `crate` boxes with the cargo models,
  draws `tree` trunks as whole trees, leaves small things on counters, desks, shelves and carts, and
  gives the first aid pickup its real bag.
- `src/render/vehicles.ts` draws the crew's ambulance and the P01 police car from their files.

## How the scenery is converted

The source packs live outside the repo (on the Desktop, in `assets/`). Blender converts each to
a GLB: textures shrunk to 1K (roughness and normal maps to 512), geometry Draco compressed, and
heavy meshes reduced when that does not tear them. `src/render/models.ts` loads them with the
Draco decoder from `/draco/`. `tools/models.html?model=city/<name>` shows one from four sides.

The two zombies are posed by the game's own joint angles (`src/render/zombieRig.ts`), so they
need no animation files. Their Mixamo skeletons would also take Mixamo clips as they are.

## Mutant (the brute)

`Mutant.fbx` (tripo, 20k triangles, bare grey) went through `pack.py export` (12k triangles) to a raw
GLB, then `tools/blender/rig_mutant.py` laid a Mixamo-named skeleton along its hunched body and
skinned it with automatic weights. `public/models/characters/mutant.glb` is the brute's body
(`riggedMutant` in `characterRig.ts`); its arms hang at rest, so the rig skips the T-pose arm drop.
The flesh colour is set when it loads.

## Waiting to be used

- Ghillie soldier (tripo, `ghillie.glb`, 884 KB): exported with `pack.py ... turn=-90 tris=14000 tex=1024` (it
  faced +x), then rigged by `tools/blender/rig_ghillie.py` (A pose, Mixamo-named bones, auto weights). It is the
  crew's look: every other player in co-op is drawn in it (`remotePlayers.ts`), in a dirty grey tint.
- `ghillie-lite.glb`: the same suit with half the gear (`tools/blender/lite_ghillie.py` drops loose pieces under
  150 welded vertices, the leaf clutter, pouches and straps, then `rig_ghillie.py`). Worn by about a third of the
  walkers and runners on the army levels (Checkpoint, The barricades; `ARMY_LEVELS` in `zombies.ts`). Cosmetic only.
  Both fall back to the survivor and ordinary bodies if a file is missing.
- Amber (Character Creator, `amber.glb`, 7 MB): the 1.6M-triangle model cut down by `tools/blender/amber.py` (tear
  lines, teeth, underwear dropped; every mesh decimated to a budget; shape keys removed; the root bone taken out so
  the hips hang off the armature; 22 bones renamed to Mixamo names; textures to 1024 or less). She is the first
  rescued survivor on the Commercial District floor (`survivors.ts`, loaded when a level has survivors), wearing her
  own clothes. Her materials are re-set at load: cloth and skin solid, hair and lashes as cut-outs (the export
  marked them alpha-blended, which broke the headless render). Source: Amber_Blender.rar on the Desktop.
- `post-apocalyptic-survivor-*.zip` is a saved web page, not a model: download it again.
- The rest of the building packs (glass apartment and brick tower meshes tear when reduced and are
  too heavy whole), the rooftop HVAC sets, the other plants and the big trees (millions of triangles).

- Zombie Schoolgirl: rigged (its own skeleton, not Mixamo), no animations.
- CGT Facades (CGTrendy "Free Facades"): street fronts, lampposts, trees, benches.
- City kit, RainCity, city2, SimpleCityBuildingPack, Underground Garage Scene.
- Remington 870 and Ithaca 37 shotguns (pump actions), AK with arms.
