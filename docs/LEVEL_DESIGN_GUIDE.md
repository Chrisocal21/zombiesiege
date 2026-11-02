# Tower level and asset guide

November 1, 2026. The garage is implemented. Floors 1-4 below are a proposed campaign plan, not playable levels. These SVG maps are editable design schematics; the garage collision coordinates remain authoritative in `src/levels/level0.ts`. Floor count can expand without changing the kit.

## Floor maps

| Floor | Map | Identity and encounter | Reused kit |
|---|---|---|---|
| B1 Garage | [Map](maps/floor-0.svg) | Enter from the street, descend ramp, close shutter, defend two of four entrances. Container creates a climbable landmark. | Cars, vans, concrete columns, crates, pallet cartons, shutter, lamps |
| 1 Lobby | [Map](maps/floor-1.svg) | Reception divides entry; two routes around an atrium. Security room is a risky supply detour. | Concrete, glazing, metal trim, signs, crates; add reception desk and benches |
| 2 Offices | [Map](maps/floor-2.svg) | Offset workstation lanes break sightlines. Meeting rooms provide cross-links rather than dead ends. | Glazing, doors, ceiling fittings, cartons; add desk and partition modules |
| 3 Maintenance | [Map](maps/floor-3.svg) | Central machinery creates a perimeter loop; electrical room is the objective detour. | Pipes, containers, hazard bands, pallets; add plant cabinet |
| 4 Roof | [Map](maps/floor-4.svg) | Two HVAC islands split the approach to the signal point; return to helipad for final holdout. | Concrete, rails, lamps, plant cabinets; add helipad paint and extraction landmark |

## Reusable kit rules

- Use meters and Y-up. Snap structural modules to 0.5 m, large rooms to a 3 m bay. Doors need at least 1.2 m clear width, combat routes at least 2 m, main loops 3 m.
- Keep collision in level data and visual construction in renderer builders. Avoid adding decorative collision that can snag players. Large props must visibly match their collision envelopes.
- Reuse geometry/materials by family. Change placement, silhouette, route topology, purpose and lighting per floor; recoloring the same room is insufficient.
- Concrete: matte, subtle meter-scale bump; painted metal: moderate roughness; glass: dark reflections; fleece: fine weave, soft folds and ribbed cuffs. Do not use multi-meter bump displacement for fine texture.
- Buildings use 3 m floor bands, framed windows, ground-floor glazing and canopies. Lit windows retain mullions. Keep window emission subdued so the structure remains visible.
- Place road lamps on curbs and lot lamps beside drive aisles, never in parking bays or ramp paths. Aim lights down. Keep the expensive real-light budget explicit; use restrained distant glows.
- Cars need a sloped cabin, separate tires/rims, handles, mirrors, grille and lamps. Crates need edge thickness, straps and readable shipping labels. Preserve the gameplay bounds when varying silhouettes.
- Every floor gets one recognizable landmark, a loop with two escape choices, a risky optional supply branch, and a visibly marked exit. No spawn should have an unavoidable direct shot at the player entry.

## Authoring and validation

1. Copy the Level schema, not the entire renderer. Define room bounds, entry/exit, doors, cover, lights and pickups in data.
2. Block out the floor's unique circulation first. Walk every route, then check zombie navigation around cover and through each doorway.
3. Keep stairs/ramps, gate controls, pickup locations and respawn spots clear. Check each doorway both open and boarded.
4. Add modular art and signage after navigation works. Use warm/cool light to differentiate zones while retaining readable silhouettes.
5. Test normal movement, sprint, crouch, lean, jump, reload, death/restart and all five waves. Verify collision at narrow corners and elevated cover.
6. Capture entry, landmark, combat loop and exit views; compare draw calls and frame time with the garage before increasing prop density.

## Implementation boundary

Only the garage is currently wired into main.ts. Upper-floor maps are design deliverables. Floor loading, stair transitions, new room modules, checkpoints and helicopter extraction still need gameplay implementation. Existing garage-specific floor decals, ceiling utilities and B1 signs must become floor-configured before shipping another floor.


## Implemented presentation tools

The HUD now includes an actual-geometry tactical map (M by default, remappable in Controls), door status, live enemy locations and remaining board pickups. The display switches between the garage and street according to player elevation. Combat continues with the map open.

Use the shared dressing builders for contact shadows, wet patches, grates, cargo detail and signage. Bake immutable opaque scenery by material; keep doors, pickups, animated characters and particles outside the bake. Share facade textures rather than creating one texture pair per building.
