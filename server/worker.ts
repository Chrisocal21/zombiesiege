import { DurableObject } from 'cloudflare:workers';
import { MAX_PLAYERS, ROOM_CODE, type ClientMessage, type Pose, type ServerMessage } from '../src/net/protocol';

interface Env {
  ROOMS: DurableObjectNamespace<Room>;
}

// The front door: /room/CODE opens a WebSocket to that room's Durable Object. Every request with
// the same code reaches the same object, wherever in the world the players are.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const match = new URL(request.url).pathname.match(/^\/room\/([^/]+)$/);
    if (!match) return new Response('Zombie Siege co-op server', { status: 404 });
    const code = match[1].toUpperCase();
    if (!ROOM_CODE.test(code)) return new Response('Room codes are 4 to 8 letters or digits', { status: 400 });
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);
  },
};

interface Seat {
  socket: WebSocket;
  pose: Pose | null;
}

// One game room. For now it hands out player numbers and passes each player's position to the
// others; the next step runs the game itself in here.
export class Room extends DurableObject<Env> {
  private seats = new Map<number, Seat>();

  async fetch(request: Request): Promise<Response> {
    const code = new URL(request.url).pathname.split('/').pop()!.toUpperCase();
    const [client, socket] = Object.values(new WebSocketPair());
    socket.accept();
    let playerId = 0;
    while (this.seats.has(playerId)) playerId++;
    if (playerId >= MAX_PLAYERS) {
      send(socket, { type: 'full' });
      socket.close(4000, 'Room full');
      return new Response(null, { status: 101, webSocket: client });
    }
    const seat: Seat = { socket, pose: null };
    this.seats.set(playerId, seat);
    send(socket, { type: 'welcome', room: code, playerId });
    // The newcomer sees everyone already here straight away.
    for (const [id, other] of this.seats) {
      if (id !== playerId && other.pose) send(socket, { type: 'pose', playerId: id, pose: other.pose });
    }
    socket.addEventListener('message', (event) => {
      const pose = readPose(event.data);
      if (!pose) return;
      seat.pose = pose;
      this.broadcast({ type: 'pose', playerId, pose }, playerId);
    });
    const leave = () => {
      if (this.seats.get(playerId) !== seat) return;
      this.seats.delete(playerId);
      this.broadcast({ type: 'left', playerId }, playerId);
    };
    socket.addEventListener('close', leave);
    socket.addEventListener('error', leave);
    return new Response(null, { status: 101, webSocket: client });
  }

  private broadcast(message: ServerMessage, except: number): void {
    for (const [id, seat] of this.seats) if (id !== except) send(seat.socket, message);
  }
}

function send(socket: WebSocket, message: ServerMessage): void {
  try {
    socket.send(JSON.stringify(message));
  } catch {
    // A socket that is closing; its close event tidies up.
  }
}

// Anything a browser sends is checked before it is passed on.
function readPose(data: unknown): Pose | null {
  if (typeof data !== 'string' || data.length > 512) return null;
  let message: ClientMessage;
  try {
    message = JSON.parse(data);
  } catch {
    return null;
  }
  if (message?.type !== 'pose' || typeof message.pose !== 'object' || !message.pose) return null;
  const { floor, x, y, z, yaw } = message.pose;
  if (![floor, x, y, z, yaw].every((value) => typeof value === 'number' && Number.isFinite(value))) return null;
  return { floor, x, y, z, yaw };
}
