import type { Pose, ServerMessage } from '../net/protocol';

// The link to a co-op room. For now each browser still runs its own game and only shares where
// its player stands; once the server runs the game, this carries inputs out and state back.
export interface Coop {
  readonly room: string;
  // Which player this browser is, once the server has said; -1 until then.
  readonly playerId: number;
  readonly status: 'connecting' | 'joined' | 'full' | 'closed';
  // Everyone else in the room, by player number.
  others(): ReadonlyMap<number, Pose>;
  sendPose(pose: Pose): void;
}

// The local server from `npm run server`, unless the build names another.
const SERVER = import.meta.env.VITE_COOP_SERVER ?? 'ws://127.0.0.1:8787';

export function joinRoom(room: string): Coop {
  const code = room.toUpperCase();
  const socket = new WebSocket(`${SERVER}/room/${encodeURIComponent(code)}`);
  const others = new Map<number, Pose>();
  let playerId = -1;
  let status: Coop['status'] = 'connecting';
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data) as ServerMessage;
    if (message.type === 'welcome') {
      playerId = message.playerId;
      status = 'joined';
    } else if (message.type === 'full') status = 'full';
    else if (message.type === 'pose') others.set(message.playerId, message.pose);
    else if (message.type === 'left') others.delete(message.playerId);
  });
  socket.addEventListener('close', () => {
    if (status !== 'full') status = 'closed';
    others.clear();
  });
  return {
    room: code,
    get playerId() { return playerId; },
    get status() { return status; },
    others: () => others,
    sendPose(pose) {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'pose', pose }));
    },
  };
}
