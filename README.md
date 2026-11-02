# Zombie Siege

A first-person zombie wave shooter that runs in the browser, by Probably Fine Studios. Working title, early days.

Hold a parking garage under a tower at night. Run in from the street, close the gate, board up two of the four doors, and survive five waves. Built with TypeScript, Three.js and Vite. Desktop only, solo for now with co-op planned.

## Run it

```
npm install
npm run dev      # http://localhost:3000
npm run build    # type check and production build
```

## Layout

- `src/game/` the rules, plain TypeScript with no rendering
- `src/render/` Three.js scenes, textures, HUD and menus
- `src/levels/` level data
- `src/config.ts` every tuning number
- `docs/` design notes, feature map and open questions

Models, textures and sources are listed in `ASSET_LICENSES.md`.
