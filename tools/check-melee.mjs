import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';

// Vite resolves extensionless TypeScript imports; Node needs the extension for this check.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !extname(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch (error) {
        if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
        return nextResolve(`${specifier}/index.ts`, context);
      }
    }
    return nextResolve(specifier, context);
  },
});

const { config } = await import('../src/config.ts');
const { createGameState } = await import('../src/game/state.ts');
const { step } = await import('../src/game/update.ts');
const { equipWeapon, giveShotgun, owns, swapWeapon, weaponStats, WEAPON_IDS } = await import('../src/game/weapons.ts');
const { spawnZombie } = await import('../src/game/zombies.ts');
const { level0 } = await import('../src/levels/level0.ts');
const neutral = { playerId:0, moveForward:0, moveRight:0, lookYaw:0, lookPitch:0, fire:false,
  reload:false, aim:false, lean:0, crouch:false, jump:false, toggleCover:false, use:false, swap:false, toggleFreeze:false };
const dt = 1 / config.ticksPerSecond;
function fresh(weapon='pistol') {
  const state=createGameState(level0);state.frozen=true;state.level.boxes=[];
  const player=state.players[0];player.x=player.y=player.z=0;
  if(weapon==='shotgun') giveShotgun(player,0); else equipWeapon(player,weapon,0);
  player.cooldown=0;
  return {state,player};
}
function ticks(state,n,input={}) {for(let i=0;i<n;i++)step(state,[{...neutral,...input}],dt)}
function attack(state,input={melee:true}) {ticks(state,1,input);ticks(state,Math.ceil(1.1/dt));}

{
  const {state,player}=fresh();player.ammo=7;player.reserve=23;
  equipWeapon(player,'shotgun',0);assert.equal(player.weapon,'pistol','unowned gun cannot be selected');
  giveShotgun(player,0);player.ammo=1;player.reserve=9;
  equipWeapon(player,'machete',1);assert.equal(player.holsteredGun.weapon,'shotgun');
  equipWeapon(player,'bat',2);equipWeapon(player,'pistol',3);
  assert.equal(player.ammo,7);assert.equal(player.reserve,23);
  equipWeapon(player,'shotgun',4);assert.equal(player.ammo,1);assert.equal(player.reserve,9);
  const order=[];for(let i=0;i<4;i++){swapWeapon(player,state.tick);order.push(player.weapon)}
  assert.deepEqual(order,['machete','bat','pistol','shotgun']);
  swapWeapon(player,0,-1);assert.equal(player.weapon,'pistol');
  assert.ok(WEAPON_IDS.every(id=>owns(player,id)));
}

for(const weapon of WEAPON_IDS) {
  const {state,player}=fresh(weapon);spawnZombie(state,0,-1.05,null);
  const zombie=state.zombies[0], health=zombie.health, ammo=player.ammo, reserve=player.reserve;
  ticks(state,1,{melee:true});
  assert.equal(zombie.health,health,'damage waits for contact frame');
  ticks(state,Math.ceil(1.1/dt));
  assert.equal(zombie.health,health-weaponStats(weapon).melee.damage);
  assert.equal(player.ammo,ammo);assert.equal(player.reserve,reserve);assert.equal(player.lastShotTick,-1);
  assert.equal(player.lastMeleeContact,'zombie');
  assert.equal(state.points[0],zombie.dead?config.points.perKill:config.points.perHit);
  const after=zombie.health;ticks(state,120);assert.equal(zombie.health,after,'one hit per swing');
}

{
  const {state}=fresh('machete');
  for(const [x,z] of [[0,-1],[0,1],[1,0],[0,-5]])spawnZombie(state,x,z,null);
  const hp=state.zombies.map(z=>z.health);attack(state,{fire:true});
  assert.ok(state.zombies[0].health<hp[0]);
  assert.deepEqual(state.zombies.slice(1).map(z=>z.health),hp.slice(1),'behind, side and distant enemies are outside the swing');
}
{
  const {state,player}=fresh('machete');spawnZombie(state,0,-1,null);
  const hp=state.zombies[0].health;
  state.level.boxes.push({position:{x:0,y:1,z:-.5},size:{x:.8,y:2,z:.12},color:'#000',surface:'wall'});
  attack(state);assert.equal(state.zombies[0].health,hp,'melee cannot pass through a wall');
  assert.equal(state.points[0],0);assert.equal(player.lastMeleeContact,'wall');
}
{
  const {state,player}=fresh('machete');
  for(const [x,z] of [[-.2,-.9],[.2,-1.2],[0,-1.6]])spawnZombie(state,x,z,null);
  const hp=state.zombies[0].health;attack(state);
  assert.equal(state.zombies.filter(z=>z.health<hp).length,2,'machete cleaves only two nearby targets');
  player.pitch=1.45;const after=state.zombies.map(z=>z.health);attack(state);
  assert.deepEqual(state.zombies.map(z=>z.health),after,'looking above a target misses');
}
{
  const {state,player}=fresh();player.ammo=3;player.reserve=20;player.reloadLeft=1;
  attack(state);assert.equal(player.reloadLeft,0);assert.equal(player.ammo,3);assert.equal(player.reserve,20);
  ticks(state,1,{reload:true});ticks(state,Math.ceil(2/dt));
  assert.equal(player.ammo,12);assert.equal(player.reserve,11,'reload still works after an interrupted reload');
  player.ammo=player.reserve=0;attack(state);assert.equal(player.lastDryTick,-1,'empty gun can bash without a dry shot');
}
for(const weapon of ['machete','bat']) {
  const {state,player}=fresh(weapon);attack(state,{fire:true});
  assert.ok(player.lastMeleeTick>=0);assert.equal(player.lastShotTick,-1);
  ticks(state,1,{reload:true});assert.equal(player.reloadLeft,0);
}
for(const hz of [30,60,120]) {
  const {state,player}=fresh('pistol');spawnZombie(state,0,-1,null);
  const hp=state.zombies[0].health;
  step(state,[{...neutral,melee:true}],1/hz);
  for(let i=0;i<hz;i++)step(state,[neutral],1/hz);
  assert.equal(state.zombies[0].health,hp-weaponStats('pistol').melee.damage);
  assert.equal(player.meleeLeft,0);
}
{
  const {state,player}=fresh();
  // Weapon rules also refuse melee during a ledge climb.
  player.ladder=null;player.mantle={progress:0,fromX:0,fromY:0,fromZ:0,toX:0,toY:1,toZ:0};
  ticks(state,1,{melee:true});assert.equal(player.lastMeleeTick,-1);
}
{
  const storage=new Map();globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
  const {bindings,loadBindings,resetBindings}=await import('../src/client/bindings.ts');
  resetBindings();
  const saved={...bindings,light:'KeyB'};
  for(const action of ['melee','weapon1','weapon2','weapon3','weapon4'])delete saved[action];
  storage.set('zombiesiege.bindings',JSON.stringify(saved));loadBindings();
  assert.equal(bindings.light,'KeyB');assert.notEqual(bindings.melee,'KeyB');
  assert.equal(new Set(Object.values(bindings)).size,Object.keys(bindings).length,'new shortcuts preserve existing custom keys');
  resetBindings();
  const element={};globalThis.window=new EventTarget();globalThis.document=new EventTarget();document.pointerLockElement=element;
  const {createLocalInput}=await import('../src/client/localInput.ts');
  const input=createLocalInput(element);
  const event=(type,props={})=>{const event=new Event(type,{cancelable:true});for(const[key,value]of Object.entries(props))Object.defineProperty(event,key,{value});window.dispatchEvent(event)};
  event('keydown',{code:'Digit3',repeat:false});event('keyup',{code:'Digit3'});
  assert.equal(input.poll(0).selectWeapon,'machete');assert.equal(input.poll(0).selectWeapon,undefined);
  event('keydown',{code:'KeyB',repeat:false});event('keyup',{code:'KeyB'});
  assert.equal(input.poll(0).melee,true);assert.equal(input.poll(0).melee,false);
  event('wheel',{deltaY:-1,timeStamp:500});assert.equal(input.poll(0).swapDirection,-1);
  event('keydown',{code:'Digit4',repeat:false});event('keydown',{code:'KeyB',repeat:false});input.reset();
  assert.equal(input.poll(0).selectWeapon,undefined);assert.equal(input.poll(0).melee,false);
  document.pointerLockElement=null;event('keydown',{code:'Digit4',repeat:false});
  assert.equal(input.poll(0).selectWeapon,undefined,'unlocked keyboard input stays out of gameplay');
}
console.log('PASS: all-weapon melee, timing, reach/arc, walls, cleave, scoring, ammo, reload cancellation, inventory, controls and 30/60/120 Hz');

