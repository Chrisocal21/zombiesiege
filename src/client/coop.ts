import type { InputMessage } from '../game/inputs';
import type { GameState } from '../game/state';
import type { Level } from '../levels/types';
import type { ServerMessage } from '../net/protocol';

export interface Snapshot {
  state: GameState;
  // When it arrived, in page time (milliseconds).
  arrived: number;
}

// The link to a co-op room. The server runs the game: this sends this player's input out and
// keeps the newest two states that came back.
export interface Coop {
  readonly room: string;
  // Which player this browser is, once the server has said; -1 until then.
  readonly playerId: number;
  readonly status: 'connecting' | 'joined' | 'full' | 'closed';
  latest(): Snapshot | null;
  before(): Snapshot | null;
  sendInput(input: InputMessage): void;
  // Asks the server to start the room's game again, from the garage (0) or on a floor.
  restart(floor: number): void;
  // Turning already sent that the newest state does not include yet.
  unappliedLook(): { yaw: number; pitch: number };
}

// The local server from `npm run server`, unless the build names another.
const SERVER = import.meta.env.VITE_COOP_SERVER ?? 'ws://127.0.0.1:8787';

export function joinRoom(room: string): Coop {
  const code = room.toUpperCase();
  const socket = new WebSocket(`${SERVER}/room/${encodeURIComponent(code)}`);
  let playerId = -1;
  let status: Coop['status'] = 'connecting';
  let level: Level | null = null;
  let latest: Snapshot | null = null;
  let before: Snapshot | null = null;
  let seq = 0;
  // Turning in each input sent, until the server says it has used it.
  let unapplied: { seq: number; yaw: number; pitch: number }[] = [];

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data) as ServerMessage;
    if (message.type === 'welcome') {
      playerId = message.playerId;
      status = 'joined';
    } else if (message.type === 'full') status = 'full';
    else if (message.type === 'snapshot') {
      if (message.level) level = message.level;
      if (!level) return;
      before = latest;
      latest = { state: { ...message.state, level }, arrived: performance.now() };
      unapplied = unapplied.filter((each) => each.seq > message.ack);
    }
  });
  socket.addEventListener('close', () => {
    if (status !== 'full') status = 'closed';
  });

  return {
    room: code,
    get playerId() { return playerId; },
    get status() { return status; },
    latest: () => latest,
    before: () => before,
    sendInput(input) {
      if (socket.readyState !== WebSocket.OPEN) return;
      seq++;
      const { playerId: _, ...sent } = input;
      socket.send(JSON.stringify({ type: 'input', seq, input: sent }));
      if (input.lookYaw || input.lookPitch) unapplied.push({ seq, yaw: input.lookYaw, pitch: input.lookPitch });
    },
    restart(floor) {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'restart', floor }));
    },
    unappliedLook() {
      let yaw = 0;
      let pitch = 0;
      for (const each of unapplied) {
        yaw += each.yaw;
        pitch += each.pitch;
      }
      return { yaw, pitch };
    },
  };
}
