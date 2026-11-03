# Zombie Siege

A first-person zombie wave shooter that runs in the browser, by Probably Fine Studios. Working title, early days.

Hold a parking garage under a tower at night. Run in from the street, close the gate, board up two of the four doors, and survive five waves. Built with TypeScript, Three.js and Vite. Desktop only, solo for now with co-op planned.

## Run it

```
npm install
npm run dev      # http://localhost:3000
npm run build    # type check and production build
```

## Controls and testing

Press **P** or **Esc** during a run to pause. The pause menu has controls and settings; press P
again to resume. Controls can be rebound, including pause. **O** freezes the zombies and wave
clock for testing (older saved bindings are moved off P).

The pause menu's **Admin Menu** is a testing aid for the current run. Enter an amount to add or
remove points, select a P9 pistol or sawed-off shotgun from the list to spawn it, or add spare
ammo to an owned weapon. Weapons appear in the spare inventory slot; use X or the scroll wheel to
swap. Ammo is added to that weapon's reserve, up to its normal capacity. Duplicate weapons are
not replaced, and points cannot go below zero. Restarting a run resets these changes. Set
`config.testing.adminMenu` to `false` before a release to hide the admin menu.

The focused regression check is [check-admin.mjs](./tools/check-admin.mjs); it requires Node
22.15 or newer with `--experimental-strip-types`.

## Layout

- `src/game/` the rules, plain TypeScript with no rendering
- `src/render/` Three.js scenes, textures, HUD and menus
- `src/levels/` level data
- `src/config.ts` every tuning number
- `docs/` design notes, feature map and open questions

Models, textures and sources are listed in `ASSET_LICENSES.md`.
