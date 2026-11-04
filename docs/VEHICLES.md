# Vehicles

The El Cajon ([src/render/elCajon.ts](../src/render/elCajon.ts)) is the reference for how a vehicle in this game should look. It is a 1960s coupe utility, parked in bay E05 on the street. The saloons, estates, cargo van and ambulance are built the same way in [vehicleModels.ts](../src/render/vehicleModels.ts), from the shared helpers in [vehicleKit.ts](../src/render/vehicleKit.ts). They borrow the El Cajon's tyre and rim, scaled to fit. They are simpler than the El Cajon (no tread, fewer badges, plainer interiors), so the El Cajon stays the high-water mark.

## What makes it read as real

- **Shaped panels, not boxes.** The body is built from curved surfaces (`surface`) and flat patches (`patch`) that share their edges, so fenders, the sill, the hood and the roof have a crown and a shoulder. Rounded boxes are only for small parts.
- **Wheel arches are cut into the side.** The lower edge of the body follows a circle around each axle, with a black inner arch and a thin chrome lip.
- **Everything has an edge.** Door shut lines, a belt crease, a rocker moulding, a hood fold, window surrounds with a rubber seal and a satin trim, a tailgate with a pressed inset. These are thin tubes (`line`) laid on the surface.
- **Glass is a surface with a frame.** Windows are a transparent pane set inside a painted surround, never a flat dark rectangle.
- **Lamps have housings and lenses.** Quad headlamps sit in a ring with a chrome rim and a textured lens; tail lamps have a housing, a red lens and ribbing.
- **Bumpers sweep back at the ends** and have uprights, rather than a straight bar.
- **There is an interior.** A bench with pleats and piping, a dash with gauges and a radio, a steering wheel on a column, a floor. It is visible through the glass.
- **Wheels are machined.** A rounded tyre, tread grooves, a brake rotor, an alloy rim with spokes, lug nuts and a centre cap.
- **Materials do the rest.** Clear-coated paint, chrome, brushed metal, rubber, upholstery and carpet are separate materials; the badges are canvas textures.

## How it is built

- It is built facing +z in metres, with the axle centres at y -0.286 and the lowest point of the tyres at y -0.676.
- `createElCajon()` returns the body and four wheels. The caller places the wheels (`WHEEL_X`, `AXLE_Y`, `CAR.wheelRearZ`, `CAR.wheelFrontZ`).
- All the small parts are merged by material, so the whole car is a few dozen draw calls, not thousands of meshes.
- [vehicles.ts](../src/render/vehicles.ts) `buildElCajonVehicle` scales it to the level box (the shell is about 5.1 m long) and turns it to face the drive aisle. A box with `vehicleRole: 'elCajon'` gets it.

## To do the same for another vehicle

1. Pick a real vehicle and write down its length, width, height, wheelbase and wheel size.
2. Build the shell from the side silhouette first (a `surface` with a height function along z), then the hood, roof and windows.
3. Cut the arches, add the lines and mouldings, then the lamps, bumpers and interior, then the wheels.
4. Merge by material at the end, and test it next to the El Cajon in the street.

The El Cajon code was supplied by the project owner from another project.
