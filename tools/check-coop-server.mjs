import assert from 'node:assert/strict';

// Talks to the co-op server from `npm run server` the way browsers do: joining, sharing
// positions, a full room, a bad code, and leaving. The server must already be running.
const SERVER = process.env.COOP_SERVER ?? 'ws://127.0.0.1:8787';
const room = `T${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function connect(code = room) {
  const socket = new WebSocket(`${SERVER}/room/${code}`);
  const inbox = [];
  socket.addEventListener('message', (event) => inbox.push(JSON.parse(event.data)));
  const closed = new Promise((resolve) => socket.addEventListener('close', resolve));
  const opened = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve);
    socket.addEventListener('error', reject);
  });
  // Waits for the first message matching `test` that has not been taken yet.
  const next = async (test, label) => {
    for (let i = 0; i < 100; i++) {
      const index = inbox.findIndex(test);
      if (index >= 0) return inbox.splice(index, 1)[0];
      await delay(20);
    }
    throw new Error(`No message: ${label}`);
  };
  const pose = (x) => socket.send(JSON.stringify({ type: 'pose', pose: { floor: 0, x, y: 0, z: 3, yaw: 0.5 } }));
  return { socket, inbox, opened, closed, next, pose };
}

const a = connect();
await a.opened;
const welcomeA = await a.next((m) => m.type === 'welcome', 'welcome for A');
assert.equal(welcomeA.playerId, 0);
assert.equal(welcomeA.room, room);

a.pose(1);
await delay(100);
const b = connect(room.toLowerCase());
await b.opened;
assert.equal((await b.next((m) => m.type === 'welcome', 'welcome for B')).playerId, 1, 'codes ignore case');
// B is told where A already stands.
assert.equal((await b.next((m) => m.type === 'pose', 'A pose for B')).pose.x, 1);

b.pose(2);
const seen = await a.next((m) => m.type === 'pose', 'B pose for A');
assert.deepEqual(seen, { type: 'pose', playerId: 1, pose: { floor: 0, x: 2, y: 0, z: 3, yaw: 0.5 } });

// Junk is ignored, not passed on.
b.socket.send('not json');
b.socket.send(JSON.stringify({ type: 'pose', pose: { floor: 0, x: 'far', y: 0, z: 0, yaw: 0 } }));
await delay(150);
assert.equal(a.inbox.filter((m) => m.type === 'pose').length, 0, 'bad poses are dropped');

const c = connect();
const d = connect();
await Promise.all([c.opened, d.opened]);
await c.next((m) => m.type === 'welcome', 'welcome for C');
await d.next((m) => m.type === 'welcome', 'welcome for D');
const e = connect();
await e.opened;
await e.next((m) => m.type === 'full', 'fifth player told the room is full');
await e.closed;

// A leaving frees their seat, and the others are told.
a.socket.close();
assert.equal((await b.next((m) => m.type === 'left', 'B told A left')).playerId, 0);
const f = connect();
await f.opened;
assert.equal((await f.next((m) => m.type === 'welcome', 'welcome for F')).playerId, 0, 'the freed seat is reused');

const bad = connect('no!');
await assert.rejects(bad.opened, 'bad room codes are refused');

for (const player of [b, c, d, f]) player.socket.close();
console.log(`PASS: co-op server joins, shares positions, fills at 4, refuses bad codes, frees seats (room ${room})`);
