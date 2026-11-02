# Nightfall presentation pass

Implemented November 1, 2026.

## Player-facing changes

- ACES tone mapping, softer shadows, restrained highlight diffusion, more distant city fog, wet road patches, contact shadows and drifting garage dust.
- Shaped vehicle bodies with wheel arches, angled glass cabins, trim, layered lamps, wipers, license plates and detailed wheels.
- Freight-container ribs, locking hardware and labels; framed and strapped crates; district, storefront and road-closure signs.
- P9 metal wear, engraving, pins, finer grip texture, spring recoil, muzzle flash, reload seating, drop animations and subtle movement/landing response.
- Real hand meshes with fine skin detail, a shaped fleece sleeve, ribbed cuffs and saved appearance colors. The creator previews the same model used during gameplay; arrows select colors and Enter deploys.
- Ejected brass with gravity and bounce, muzzle smoke, brief tracers, surface-aware debris and sparks, and up to 64 persistent impact marks. Effects remain cosmetic; damage still uses hitscan.
- Tailored zombie torsos, connected leg segments with bending knees, facial details, hair variants, varied clothing, hit reactions and existing death animations.
- Unified HUD cards, wave progress, location labels, reload/low-ammo feedback, contextual controls, independent hit markers when aiming, and a tactical map using real collision geometry.
- Keyboard navigation on the title/pause screens. Light diffusion and camera motion can be disabled in Settings. A failed mouse-capture request keeps the menu available.

## Technical checks

`npm.cmd run build` checks TypeScript and creates the production bundle.

`node --experimental-strip-types tools/check-raycast.mjs` checks all six surface normals, limited-range misses, parallel misses, behind-ray misses and rays starting inside a box.

`node tools/shot.cjs --scenarios` uses installed Chrome to capture the title, creator, street, garage, combat, reload, tactical map, settings and controls. Files are written to ignored `artifacts/review/`, with a browser error report. The `--interactions` option checks keyboard navigation, appearance persistence, firing, reload completion and movement. When headless Chrome refuses mouse capture, it verifies that the menu stays usable and runs weapon/movement checks directly through the game engine. Actual pointer lock still needs an interactive-browser check.

The development review harness is opt-in with `?review` and is excluded from production builds. Static scenery batching reduced the captured garage from approximately 1,625 draw calls to 568 before additional material sharing. This is a draw-call comparison, not a hardware FPS guarantee. Active effects are bounded; shared particle geometry/materials are reused.

## Map scope

The garage is the playable map. The four upper-floor SVGs remain campaign design proposals in LEVEL_DESIGN_GUIDE.md. This pass adds the live tactical map and improves the current street/garage assets; upper-floor gameplay and progression are still future work.

Validation: production build and ray tests passed. Browser checks passed for keyboard entry, saved colors, denied-capture fallback, and engine firing/reloading/movement. The production bundle contains no development review API.

## Reference-driven grip, bodycam, vehicle and zombie revision

- The pistol uses a persistent support hand around the firing hand in idle, movement, firing and ADS. A single left-hand rig handles the magazine and slide during reload, then returns to the support grip. Both sleeves attach to the actual rigged wrist positions.
- Settings > Camera style offers Standard and Bodycam. Standard remains the default. Bodycam lowers the camera 0.28 m, widens the selected field of view by 15 degrees (up to 115), adds restrained roll/lens effects and a simulation-time recording indicator. ADS smoothly raises the camera to eye height. Hitscan uses the same camera height; lens warp and camera motion switches remain respected.
- Sedans and cargo vans use shaped continuous shells, real wheel openings, cab glazing, interior and trim detail. Road vehicles follow the lanes, the zebra crossing is clear, surface-lot vehicles fit their bays, and tire bottoms coincide with the ground datum.
- Zombies use continuous shaped anatomy and tailored clothing with connected elbow, wrist, hip, knee and ankle joints. Shared surface atlases and batched segments keep the animated model near 19 draw calls per figure.

Additional review scenes: `garage,aim,reload-drop,reload,reload-return,bodycam,bodycam-aim,bodycam-reload,vehicles,van-close,zombie-close,settings`. `--camera-check` validates chest height, shot alignment and ADS transitions. `--vehicle-check` validates mesh ground contact, lane alignment, clear crossing and parking bays. `--camera-ui` selects Bodycam through the settings UI and checks persistence across a page reload.

Revision validation passed: TypeScript/production build; six-face ray regression checks; standard/ADS/bodycam/reload captures; camera-height and shot-alignment checks; ground contact for all ten vehicle meshes; lane, crossing and parking-bay checks; and Bodycam selection/persistence through a real browser menu click and page reload. Final browser report contains zero runtime errors. Visual review also caught and corrected cab-glass occlusion by the van shell bevel and wrist clipping at the sweatshirt cuffs.
