import assert from 'node:assert/strict';

// Talks to the co-op server from `npm run server` the way browsers do. The server must already
// be running. It checks joining, the level arriving once, inputs moving a player, everyone
// getting the same game, restarting onto a floor, junk inputs, a full room, and leaving.
const SERVER = process.env.COOP_SERVER ?? 'ws://127.0.0.1:8787';
const room = `T${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const idle = { moveForward: 0, moveRight: 0, lookYaw: 0, lookPitch: 0, fire: false, reload: false, aim: false, lean: 0, crouch: false, jump: false, toggleCover: false, use: false, swap: false, toggleFreeze: false };

function connect(code = room) {
  const socket = new WebSocket(`${SERVER}/room/${code}`);
  const inbox = [];
  let latest = null;
  let seq = 0;
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'snapshot') latest = message;
    inbox.push(message);
  });
  const closed = new Promise((resolve) => socket.addEventListener('close', resolve));
  const opened = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve);
    socket.addEventListener('error', reject);
  });
  // Waits until `test` passes on some message not yet taken, and takes it.
  const next = async (test, label, tries = 150) => {
    for (let i = 0; i < tries; i++) {
      const index = inbox.findIndex(test);
      if (index >= 0) return inbox.splice(index, 1)[0];
      await delay(20);
    }
    throw new Error(`No message: ${label}`);
  };
  const input = (changes = {}) => socket.send(JSON.stringify({ type: 'input', seq: ++seq, input: { ...idle, ...changes } }));
  return { socket, inbox, opened, closed, next, input, latest: () => latest, seq: () => seq };
}
const me = (snapshot, id) => snapshot.state.players.find((player) => player.id === id);

const a = connect();
await a.opened;
assert.equal((await a.next((m) => m.type === 'welcome', 'welcome for A')).playerId, 0);
const first = await a.next((m) => m.type === 'snapshot', 'first snapshot');
assert.ok(first.level, 'the first snapshot carries the level');
assert.equal(first.state.level, undefined, 'the state itself leaves the level out');
assert.equal(first.state.players.length, 1);
const later = await a.next((m) => m.type === 'snapshot' && m.state.tick > first.state.tick, 'second snapshot');
assert.equal(later.level, undefined, 'the level is not sent again while it is unchanged');

// Holding forward walks player A toward the garage (yaw 0 faces -z), and the server says
// which input it used.
const startZ = me(later, 0).z;
for (let i = 0; i < 20; i++) {
  a.input({ moveForward: 1 });
  await delay(16);
}
a.input();
await delay(150);
assert.ok(me(a.latest(), 0).z < startZ - 0.5, `A walked forward (${startZ} to ${me(a.latest(), 0).z})`);
assert.equal(a.latest().ack, a.seq(), 'every input was used');

// A second player joins the same game, and both are sent the same state.
const b = connect(room.toLowerCase());
await b.opened;
assert.equal((await b.next((m) => m.type === 'welcome', 'welcome for B')).playerId, 1, 'codes ignore case');
assert.ok((await b.next((m) => m.type === 'snapshot', 'B first snapshot')).level, 'a newcomer is sent the level');
await delay(200);
const tick = b.latest().state.tick;
const fromA = await a.next((m) => m.type === 'snapshot' && m.state.tick === tick + 8, 'A snapshot at a set tick');
const fromB = await b.next((m) => m.type === 'snapshot' && m.state.tick === tick + 8, 'B snapshot at the same tick');
assert.deepEqual(fromA.state, fromB.state, 'both players are sent the same game');
assert.deepEqual(fromA.state.players.map((player) => player.id), [0, 1]);

// Restarting onto floor 6 (lift stop 2): prep starts and zombies rush the doors, for both.
a.socket.send(JSON.stringify({ type: 'restart', floor: 2 }));
const onFloor = await b.next((m) => m.type === 'snapshot' && m.level && m.state.floor === 2, 'B sent the new floor');
assert.equal(onFloor.state.players.length, 2, 'both players are on the new floor');
const crowd = await b.next((m) => m.type === 'snapshot' && m.state.zombies.length > 0, 'zombies on floor 6', 400);
const sameTick = await a.next((m) => m.type === 'snapshot' && m.state.tick === crowd.state.tick, 'A at the same tick');
assert.deepEqual(sameTick.state.zombies, crowd.state.zombies, 'both see the same zombies in the same places');

// Junk is ignored and moves nothing.
const beforeJunk = me(b.latest(), 1);
b.socket.send('not json');
b.socket.send(JSON.stringify({ type: 'input', seq: 99, input: { moveForward: 'fast' } }));
b.socket.send(JSON.stringify({ type: 'input', seq: 100, input: { ...idle, moveForward: 1e9, lookYaw: NaN } }));
b.socket.send(JSON.stringify({ type: 'input', seq: 101, input: idle }));
b.socket.send(JSON.stringify({ type: 'restart', floor: 42 }));
await delay(200);
const afterJunk = me(b.latest(), 1);
assert.equal(b.latest().state.floor, 2, 'a restart to a floor that does not exist is refused');
assert.ok(Number.isFinite(afterJunk.yaw), 'a bad turn amount is dropped');
assert.ok(Math.hypot(afterJunk.x - beforeJunk.x, afterJunk.z - beforeJunk.z) < 1, 'a huge move is clamped to one step of walking');

const c = connect();
const d = connect();
await Promise.all([c.opened, d.opened]);
await c.next((m) => m.type === 'welcome', 'welcome for C');
await d.next((m) => m.type === 'welcome', 'welcome for D');
const e = connect();
await e.opened;
await e.next((m) => m.type === 'full', 'fifth player told the room is full');
await e.closed;

// A leaving takes their player out of the game and frees the seat.
a.socket.close();
await b.next((m) => m.type === 'snapshot' && !m.state.players.some((player) => player.id === 0), 'A gone from the game');
const f = connect();
await f.opened;
assert.equal((await f.next((m) => m.type === 'welcome', 'welcome for F')).playerId, 0, 'the freed seat is reused');

const bad = connect('no!');
await assert.rejects(bad.opened, 'bad room codes are refused');

for (const player of [b, c, d, f]) player.socket.close();
console.log(`PASS: co-op server runs the game for everyone: inputs, shared state, floor restart with zombies, junk, full room, leaving (room ${room})`);
