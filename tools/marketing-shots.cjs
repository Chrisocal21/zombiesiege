// Takes 1920x1080 screenshots of the game for the website, using the dev review hooks.
// Usage: node tools/marketing-shots.cjs [name,name,...]   (dev server must be running on port 3000)
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ramp = (z) => ((z - 10.5) / 24) * 4.9;

// Camera yaw 0 faces -z, positive turns left. A scene is either a place() call or a show() name.
const SCENES = {
  title: { menu: 'title' },
  'street-start': { place: { x: -2, y: 4.9, z: 46.5, yaw: 0.2, pitch: 0.06 } },
  'street-crosswalk': { show: 'street' },
  'street-cars': { show: 'vehicles' },
  'ramp-down': { place: { x: 3, y: ramp(30), z: 30, yaw: 0, pitch: -0.13 } },
  'gate-lever': { place: { x: 3, z: 6.8, yaw: Math.PI, pitch: 0.04, phase: 'entry' } },
  'gate-closed-prep': { place: { x: 3.5, z: 6.5, yaw: Math.PI + 0.25, pitch: 0.03, gate: true, phase: 'prep', timer: 21 } },
  'garage-wide': { place: { x: -6, z: 1, yaw: -0.9, pitch: -0.06, gate: true, phase: 'prep', timer: 14, boarded: [0, 2] } },
  'garage-boarded-doors': { place: { x: 0, z: 6.5, yaw: 0.65, pitch: 0.02, gate: true, phase: 'prep', timer: 9, boarded: [1, 3] } },
  'combat-doorway': { place: { x: 1, z: 4, yaw: -0.375, pitch: -0.02, gate: true, phase: 'active', wave: 3, boarded: [1, 2], ammo: 7, fire: true, lunge: true, zombies: [[6.5, -6.6], [5.2, -3.6], [2.4, -1.8], [-3.5, -2.5]] } },
  'combat-aim': { place: { x: 1, z: 4, yaw: -0.18, pitch: -0.03, aim: true, gate: true, phase: 'active', wave: 4, boarded: [1, 2], ammo: 9, lunge: true, zombies: [[2.2, -2.4], [6.2, -4.4], [4.4, -6.5]] } },
  'zombie-close': { place: { x: -2, z: 4.5, yaw: 0, pitch: -0.1, gate: true, phase: 'active', wave: 2, health: 38, lunge: true, zombies: [[-2, 2.1, Math.PI]] } },
  'tactical-map': { show: 'map' },
  'survivor-screen': { show: 'character' },
  controls: { show: 'controls' },
  settings: { show: 'settings' },
};

async function main() {
  const wanted = process.argv[2] ? process.argv[2].split(',') : Object.keys(SCENES);
  const output = path.resolve('screenshots');
  fs.mkdirSync(output, { recursive: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'siege-shots-'));
  const port = 20000 + Math.floor(Math.random() * 30000);
  const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--no-first-run', '--disable-extensions', `--remote-debugging-port=${port}`,
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1920,1080',
    `--user-data-dir=${profile}`, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  try {
    let pages;
    for (let i = 0; i < 60; i++) {
      try { pages = await (await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(2000) })).json(); if (pages.length) break; } catch { /* retry */ }
      await delay(500);
    }
    const socket = new WebSocket(pages.find((page) => page.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let id = 0; const pending = new Map();
    socket.onmessage = (event) => { const data = JSON.parse(event.data); if (data.id && pending.has(data.id)) pending.get(data.id)(data); };
    const send = (method, params = {}) => new Promise((resolve) => { const key = ++id; pending.set(key, resolve); socket.send(JSON.stringify({ id: key, method, params })); });
    const run = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;

    await send('Runtime.enable'); await send('Page.enable');
    await send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    // The warning screen first, with reduced flashing off so the muzzle flash shows.
    await send('Page.navigate', { url: 'http://127.0.0.1:3000/?review' });
    await delay(5000);
    await run("document.getElementById('launch-reduced-flashing').checked = false; document.getElementById('launch-continue').click()");
    await delay(14000);

    for (const name of wanted) {
      const scene = SCENES[name];
      if (!scene) { console.log('unknown scene', name); continue; }
      if (scene.place) await run(`window.__siegeReview.place(${JSON.stringify(scene.place)})`);
      else if (scene.show) await run(`window.__siegeReview.show(${JSON.stringify(scene.show)})`);
      else await run("window.__siegeReview.place({x:-2,y:4.9,z:46.5,yaw:0,menu:'main'})");
      // The renderer is slow without a graphics card, so give it a few frames to settle.
      await delay(9000);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(output, `${name}.png`), Buffer.from(shot.result.data, 'base64'));
      console.log('saved', name);
    }
    socket.close();
  } finally {
    browser.kill();
  }
}
main().catch((error) => { console.error(error); process.exit(1); });
