# Third-party assets

Every model, texture and sound the game ships that we did not make, where it came from, and
its license. **Check the license before an asset goes live**; anything marked *unconfirmed*
needs its download page checked for use in a commercial game.

| In the game | Files | Source | License |
|---|---|---|---|
| Hands (old pistol, shotgun, melee) | `public/models/left-hand.glb`, `right-hand.glb` | see `public/models/hands-LICENSE.md` | see that file |
| Glock 17 with arms and animations | `public/models/glock17.glb` | Fab, "G17 - FPS Weapon Animations Pack (v.1)" | Fab Standard License |
| Street buildings (8) | `public/models/city/*.glb` | "Buildings" pack (FBX + baked PBR textures) | *unconfirmed* |
| Draco decoder | `public/draco/*` | three.js `examples/jsm/libs/draco` | Apache 2.0 |

## How the scenery is converted

The source packs live outside the repo (on the Desktop, in `assets/`). Blender converts each to
a GLB: textures shrunk to 1K (roughness and normal maps to 512), geometry Draco compressed, and
heavy meshes reduced when that does not tear them. `src/render/models.ts` loads them with the
Draco decoder from `/draco/`. `tools/models.html?model=city/<name>` shows one from four sides.

## Waiting to be used

- Zombie Schoolgirl, 3 zombie collection: rigged, no animations yet.
- CGT Facades (CGTrendy "Free Facades"): street fronts, lampposts, trees, benches.
- City kit, RainCity, city2, SimpleCityBuildingPack, Underground Garage Scene.
- Remington 870 and Ithaca 37 shotguns (pump actions), AK with arms.
