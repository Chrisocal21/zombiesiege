// Local Chrome DevTools capture; no npm/browser download required.
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  const output = path.resolve('artifacts/review');
  fs.mkdirSync(output, { recursive: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'siege-review-'));
  const port = 20000 + Math.floor(Math.random() * 30000);
  const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-networking', '--disable-component-update', `--remote-debugging-port=${port}`,
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900',
    `--user-data-dir=${profile}`, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  let ws;
  try {
    let pages;
    for (let i = 0; i < 60; i++) {
      try { pages = await (await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(2000) })).json(); if (pages.length) break; } catch {}
      await delay(500);
    }
    if (!pages?.length) throw new Error('Chrome debugging endpoint did not start');
    ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0; const pending = new Map(); const errors = [];
    ws.onmessage = event => {
      const data = JSON.parse(event.data);
      if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails);
      if (data.method === 'Log.entryAdded' && data.params.entry.level === 'error') errors.push(data.params.entry);
      if (data.id) { const p = pending.get(data.id); if (p) { pending.delete(data.id); data.error ? p.reject(data.error) : p.resolve(data.result); } }
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const key = ++id;
      const timer = setTimeout(() => { pending.delete(key); reject(new Error(`Timed out: ${method}`)); }, 30000);
      pending.set(key, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: value => { clearTimeout(timer); reject(value); } });
      ws.send(JSON.stringify({ id: key, method, params }));
    });
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const capture = async name => {
      await delay(800);
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(output, `${name}.png`), Buffer.from(data, 'base64'));
    };
    await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
    await send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'http://127.0.0.1:3000/?review' });
    await delay(6500);
    await capture('title');
    if (process.argv.includes('--interactions')) {
      const key = async code => {
        const value = code === 'Enter' ? { key: 'Enter', code, windowsVirtualKeyCode: 13 } : { key: code.replace('Key', '').toLowerCase(), code, windowsVirtualKeyCode: code.charCodeAt(3) };
        await send('Input.dispatchKeyEvent', { type: 'keyDown', ...value });
        await delay(250);
        await send('Input.dispatchKeyEvent', { type: 'keyUp', ...value });
      };
      const click = async (x, y) => {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
      };
      const check = async (expression, label) => {
        for (let i = 0; i < 40; i++) { if (await evaluate(expression)) { console.log(`PASS: ${label}`); return; } await delay(250); }
        console.log(JSON.stringify(await evaluate('window.__siegeReview.inspect()')));
        await capture('interaction-failure');
        fs.writeFileSync(path.join(output, 'browser-errors.json'), JSON.stringify(errors, null, 2));
        throw new Error(`Interaction failed: ${label}`);
      };
      await key('Enter');
      await check("window.__siegeReview.inspect().menu === 'character'", 'keyboard opens character creator');
      await click(430, 295);
      await check("JSON.parse(localStorage.getItem('zombiesiege-appearance')).sweatshirt === '#722f36'", 'swatch saves sweatshirt color');
      await click(390, 734);
      await delay(1200);
      if (await evaluate('window.__siegeReview.inspect().locked')) {
        console.log('PASS: deploy captures pointer');
        await click(720, 450);
        await check('window.__siegeReview.inspect().ammo < 12', 'fire consumes a round');
        await key('KeyR');
        await check('window.__siegeReview.inspect().reload > 0', 'reload begins');
        await check('window.__siegeReview.inspect().ammo === 12 && window.__siegeReview.inspect().reload === 0', 'reload completes');
        await key('KeyM'); await capture('map-interaction'); await key('KeyM');
        await capture('play-interaction');
      } else {
        await check("window.__siegeReview.inspect().menu === 'character'", 'denied mouse capture retains a usable menu');
        console.log('Headless Chrome denied pointer lock; testing weapon and movement through the game engine.');
        const result = await evaluate(`(async () => {
          const [{createGameState}, {step}, {level0}] = await Promise.all([import('/src/game/state.ts'), import('/src/game/update.ts'), import('/src/levels/level0.ts')]);
          const state = createGameState(level0), player = state.players[0];
          const input = {playerId: 0, moveForward: 0, moveRight: 0, lookYaw: 0, lookPitch: 0, fire: false, reload: false, aim: false, lean: 0, crouch: false, jump: false, toggleCover: false, use: false, toggleFreeze: false};
          step(state, [{...input, fire:true}], 1/120);
          const fired = player.ammo === 11 && player.lastShotTick >= 0;
          step(state, [{...input, reload:true}], 1/120);
          const reloadBegan = player.reloadLeft > 0;
          for(let i=0;i<240;i++) step(state, [input], 1/120);
          const reloaded = player.ammo === 12 && player.reloadLeft === 0;
          const z = player.z;
          for(let i=0;i<60;i++) step(state, [{...input, moveForward:1}], 1/120);
          return {fired,reloadBegan,reloaded,moved:player.z < z};
        })()`);
        if (!Object.values(result).every(Boolean)) throw new Error(`Engine check failed: ${JSON.stringify(result)}`);
        console.log(`PASS: engine firing, reload start/completion, movement ${JSON.stringify(result)}`);
      }
    }
    if (process.argv.includes('--scenarios')) {
      const selection = process.argv.find(arg => arg.startsWith('--scenes='));
      const scenarios = selection ? selection.slice('--scenes='.length).split(',') : ['character', 'street', 'garage', 'combat', 'reload', 'map', 'settings', 'controls'];
      for (const name of scenarios) {
        console.log(`Capture: ${name}`);
        await evaluate(`window.__siegeReview.show('${name}')`);
        await capture(name);
        if (name === 'bodycam' || name === 'bodycam-aim' || name === 'aim') {
          const inspect = await evaluate('window.__siegeReview.inspect()');
          if (name === 'bodycam' && (inspect.cameraDrop < 0.25 || inspect.cameraFov < 85)) throw new Error('Bodycam height or wide lens did not apply');
          if (name.includes('aim') && (inspect.cameraDrop !== 0 || inspect.cameraFov > 60)) throw new Error('ADS camera did not return to eye level');
        }
      }
      console.log(JSON.stringify(await evaluate('window.__siegeReview.inspect()')));
    }
    if (process.argv.includes('--camera-check')) {
      const results = await evaluate(`(async () => {
        const [{createGameState,eyeY}, {step}, {level0}, {config}] = await Promise.all([import('/src/game/state.ts'),import('/src/game/update.ts'),import('/src/levels/level0.ts'),import('/src/config.ts')]);
        const state=createGameState(level0), player=state.players[0];
        const input={playerId:0,cameraStyle:'bodycam',moveForward:0,moveRight:0,lookYaw:0,lookPitch:0,fire:false,reload:false,aim:false,lean:0,crouch:false,jump:false,toggleCover:false,use:false,toggleFreeze:false};
        for(let i=0;i<60;i++) step(state,[input],1/120);
        const chest=Math.abs(player.cameraDrop-config.view.bodycamDrop)<1e-6;
        step(state,[{...input,fire:true}],1/120);
        const shotAligned=Math.abs(player.lastShotEnd.y-eyeY(player))<1e-6;
        for(let i=0;i<60;i++) step(state,[{...input,aim:true}],1/120);
        const ads=player.cameraDrop===0;
        for(let i=0;i<60;i++) step(state,[{...input,cameraStyle:'standard'}],1/120);
        return {chest,shotAligned,ads,standard:player.cameraDrop===0};
      })()`);
      if (!Object.values(results).every(Boolean)) throw new Error('Camera integration check failed: '+JSON.stringify(results));
      console.log('PASS: camera height, shot alignment, ADS and standard mode '+JSON.stringify(results));
    }
    if (process.argv.includes('--vehicle-check')) {
      const result = await evaluate(`(async () => {
        const [{level0},{buildVehicle},THREE]=await Promise.all([import('/src/levels/level0.ts'),import('/src/render/vehicles.ts'),import('/node_modules/.vite/deps/three.js')]);
        const vehicles=level0.boxes.filter(box=>box.surface==='car'||box.surface==='van');
        const ground=vehicles.every(box=>{
          const model=buildVehicle(box);model.updateMatrixWorld(true);
          const bounds=new THREE.Box3().setFromObject(model);
          return Math.abs(bounds.min.y-(box.position.y-box.size.y/2))<0.015;
        });
        const street=vehicles.filter(box=>box.position.y-box.size.y/2>4);
        const road=street.filter(box=>box.position.z>36);
        const lane=road.every(box=>box.size.x>box.size.z && box.position.z-box.size.z/2>=36.5 && box.position.z+box.size.z/2<=45.4);
        const crossing=road.every(box=>box.position.x+box.size.x/2<-1.2 || box.position.x-box.size.x/2>7.4);
        const bays=street.filter(box=>box.position.z<36).every(box=>{
          const left=box.position.x-box.size.x/2,right=box.position.x+box.size.x/2;
          return (left>=-23 && right<=-18)||(left>=17 && right<=22);
        });
        return {ground,lane,crossing,bays,count:vehicles.length};
      })()`);
      if (!result.ground || !result.lane || !result.crossing || !result.bays) throw new Error('Vehicle check failed: '+JSON.stringify(result));
      console.log('PASS: tire contact, lane alignment, clear crossing and parking bays '+JSON.stringify(result));
    }
    if (process.argv.includes('--camera-ui')) {
      await evaluate("window.__siegeReview.show('settings')"); await delay(500);
      await send('Input.dispatchMouseEvent', { type:'mouseMoved',x:825,y:238 });
      await send('Input.dispatchMouseEvent', { type:'mousePressed',x:825,y:238,button:'left',clickCount:1 });
      await send('Input.dispatchMouseEvent', { type:'mouseReleased',x:825,y:238,button:'left',clickCount:1 });
      let selected;
      for (let i = 0; i < 60; i++) {
        await delay(250);
        selected = await evaluate("JSON.parse(localStorage.getItem('zombiesiege.settings') || '{}').cameraStyle");
        if (selected === 'bodycam') break;
      }
      if(selected!=='bodycam') throw new Error('Bodycam option did not save through the Settings UI');
      await capture('settings-bodycam');
      const originalTimeOrigin = await evaluate('performance.timeOrigin');
      await send('Page.reload');
      let ready = false;
      for (let i = 0; i < 60; i++) {
        await delay(250);
        if (await evaluate(`Boolean(window.__siegeReview) && performance.timeOrigin !== ${originalTimeOrigin}`)) { ready = true; break; }
      }
      if (!ready) throw new Error('Review API did not reload for the persistence check');
      const persisted=await evaluate('window.__siegeReview.inspect().cameraStyle');
      if(persisted!=='bodycam') throw new Error('Bodycam option did not survive reload');
      console.log('PASS: bodycam option selection and persistence through page reload');
    }
    fs.writeFileSync(path.join(output, 'browser-errors.json'), JSON.stringify(errors, null, 2));
    console.log(`Captured browser views. Runtime errors: ${errors.length}`);
    if (errors.length) process.exitCode = 1;
    await send('Browser.close');
  } finally {
    ws?.close();
    browser.kill();
    if (browser.pid) spawnSync('taskkill', ['/PID', String(browser.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
