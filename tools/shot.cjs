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
      const timer = setTimeout(() => { pending.delete(key); reject(new Error(`Timed out: ${method}`)); }, method === 'Page.captureScreenshot' ? 90000 : 30000);
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
    const page = process.argv.find(arg => arg.startsWith('--page='))?.slice('--page='.length) ?? '/?review';
    await send('Page.navigate', { url: `http://127.0.0.1:3000${page}` });
    for (let i = 0; i < 120; i++) {
      const ready = await evaluate(`(() => {
        document.getElementById('launch-continue')?.click();
        return Boolean(window.__siegeReview || window.__grips?.ready || window.__models?.ready);
      })()`);
      if (ready) break;
      await delay(500);
    }
    if (await evaluate("Boolean(document.getElementById('launch-warning'))")) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
    }
    await delay(1500);
    if (process.argv.includes('--street-check')) {
      const result = await evaluate("import('/tools/check-street-buildings.js').then(module => module.checkStreetBuildings())");
      console.log('PASS: street frontage, road clearance and garage approach ' + JSON.stringify(result));
    }
    const viewsFile = process.argv.find(arg => arg.startsWith('--views='))?.slice(8);
    if (viewsFile) {
      let loaded = false;
      for (let i = 0; i < 120; i++) {
        if (await evaluate('window.__siegeReview.inspect().streetBuildingsReady')) { loaded = true; break; }
        await delay(500);
      }
      if (!loaded) throw new Error('Street building models did not finish loading');
      const views = JSON.parse(fs.readFileSync(viewsFile, 'utf8'));
      for (const [name, pose] of Object.entries(views)) {
        await evaluate(`window.__siegeReview.place(${JSON.stringify(pose)})`);
        await delay(2500);
        await capture(name);
        console.log(`Capture: ${name}`);
      }
    }
    if (process.argv.includes('--hands-check')) {
      const result = await evaluate("import('/tools/check-hand-viewmodel.js').then(module => module.checkHandViewmodel())");
      console.log('PASS: hand rig, weapon attachment, equip stability and reloads ' + JSON.stringify(result));
    }
    if (!process.argv.includes('--scenarios')) await capture(process.argv.find(arg => arg.startsWith('--name='))?.slice(7) ?? 'title');
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
    if (process.argv.includes('--melee-check')) {
      const result = await evaluate(`(async () => {
        const [THREE,{createViewmodel},{createGameState},{level0},weapons] = await Promise.all([
          import('/node_modules/.vite/deps/three.js'),import('/src/render/viewmodel.ts'),
          import('/src/game/state.ts'),import('/src/levels/level0.ts'),import('/src/game/weapons.ts')
        ]);
        const scene=new THREE.Scene(),model=createViewmodel(scene),player=createGameState(level0).players[0];
        const pose={x:0,y:0,z:0,yaw:0,pitch:0,roll:0};
        await new Promise(resolve=>setTimeout(resolve,2000));
        weapons.giveShotgun(player,0);
        let visible=true,finite=true,ammo=true,swing=true;
        for(const weapon of weapons.WEAPON_IDS) {
          player.meleeLeft=0;weapons.equipWeapon(player,weapon,0);
          for(let i=0;i<60;i++)model.update(player,pose,1/60);
          visible &&= scene.getObjectByName('Machete').visible===(weapon==='machete') &&
            scene.getObjectByName('Spiked baseball bat').visible===(weapon==='bat') &&
            scene.getObjectByName('Sawed-off shotgun').visible===(weapon==='shotgun') &&
            scene.getObjectByName('P9 pistol').visible===(weapon==='pistol') &&
            scene.getObjectByName('Pistol magazine').visible===(weapon==='pistol') &&
            scene.getObjectByName('Support hand anchor').visible===(weapon!=='machete');
          const before=[player.ammo,player.reserve,player.lastShotTick];
          const root=scene.getObjectByName('Weapon viewmodel'),rest=root.matrixWorld.clone();
          for(const phase of [.1,.3,.5,.8]) {
            player.meleeLeft=weapons.weaponStats(weapon).melee.seconds*(1-phase);
            model.update(player,pose,1/60);
            scene.traverse(object=>{finite &&= object.matrixWorld.elements.every(Number.isFinite)});
          }
          swing &&= !root.matrixWorld.equals(rest);
          ammo &&= JSON.stringify(before)===JSON.stringify([player.ammo,player.reserve,player.lastShotTick]);
        }
        let hands=0;scene.traverse(object=>{if(object.isSkinnedMesh)hands++});
        return {visible,finite,ammo,swing,singlePairOfHands:hands===2};
      })()`);
      if(!Object.values(result).every(Boolean))throw new Error('Melee model check failed: '+JSON.stringify(result));
      console.log('PASS: four-weapon visibility, hand grips, swing transforms and no fake shots '+JSON.stringify(result));
    }
    if (process.argv.includes('--shotgun-check')) {
      const results = await evaluate(`(async () => {
        const [THREE, {createViewmodel}, {createGameState}, {level0}] = await Promise.all([
          import('/node_modules/.vite/deps/three.js'), import('/src/render/viewmodel.ts'),
          import('/src/game/state.ts'), import('/src/levels/level0.ts')
        ]);
        const scene = new THREE.Scene(), model = createViewmodel(scene);
        const player = createGameState(level0).players[0];
        const pose = {x:0,y:0,z:0,yaw:0,pitch:0,roll:0};
        await new Promise(resolve => setTimeout(resolve, 2000));
        const settle = () => { for(let i=0;i<90;i++) model.update(player,pose,1/60); };
        const marker = new THREE.Vector3(), expected = new THREE.Vector3();
        const shotgun = scene.getObjectByName('Sawed-off shotgun');
        const action = scene.getObjectByName('Shotgun break action');
        const magazine = scene.getObjectByName('Pistol magazine');
        player.weapon='shotgun';player.ammo=2;settle();
        const held = shotgun.visible && !magazine.visible && action.rotation.x === 0;
        player.aiming=true;settle();
        const camera = new THREE.PerspectiveCamera(75,1.6,.02,10);
        const bead = scene.getObjectByName('Shotgun front bead').getWorldPosition(new THREE.Vector3()).project(camera);
        const aimed = Math.abs(bead.x)<.01 && Math.abs(bead.y)<.01;
        player.aiming=false;
        let reload=true, muzzle=true, arms=true;
        for(const ammo of [0,1]) for(const progress of [.14,.28,.44,.62,.84,.98]) {
          player.ammo=ammo;player.reloadLeft=2.3*(1-progress);settle();
          reload &&= (progress<.96 ? action.rotation.x<0 : action.rotation.x===0) && !magazine.visible;
          model.getMuzzle(marker);
          scene.getObjectByName('Shotgun muzzle').getWorldPosition(expected);
          muzzle &&= marker.distanceTo(expected)<1e-8 && marker.toArray().every(Number.isFinite);
          for(const name of ['Primary tactical sleeve and glove gauntlet','Support tactical sleeve and glove gauntlet']) {
            const arm=scene.getObjectByName(name), cloth=arm.children.find(child=>child.geometry?.type==='LatheGeometry');
            arms &&= cloth.scale.y*arm.parent.scale.x<=.340001 && arm.position.toArray().every(Number.isFinite);
          }
        }
        player.reloadLeft=0;player.ammo=2;settle();
        const closed=action.rotation.x===0;
        player.weapon='pistol';player.ammo=12;settle();
        const restored=!shotgun.visible && magazine.visible;
        let hands=0;scene.traverse(object=>{if(object.isSkinnedMesh)hands++});
        return {held,aimed,reload,muzzle,arms,closed,restored,singlePairOfHands:hands===2};
      })()`);
      if (!Object.values(results).every(Boolean)) throw new Error('Shotgun model check failed: '+JSON.stringify(results));
      console.log('PASS: shotgun stance, sights, reload stages, muzzle, arm length and pistol restoration '+JSON.stringify(results));
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
  } finally {
    ws?.close();
    browser.kill();
    if (browser.pid) spawnSync('taskkill', ['/PID', String(browser.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
