import { DurableObject } from 'cloudflare:workers';
import { config } from '../src/config';
import { heldPart, idleInput, mergeInputs, type InputMessage } from '../src/game/inputs';
import { addPlayer, removePlayer } from '../src/game/roster';
import { createGameState, type GameState } from '../src/game/state';
import { step } from '../src/game/update';
import { startOnFloor } from '../src/game/waves';
import type { Level } from '../src/levels/types';
import { level0 } from '../src/levels/level0';
import { MAX_PLAYERS, ROOM_CODE, SNAPSHOT_TICKS, readClientMessage, type ServerMessage } from '../src/net/protocol';

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
  // Inputs that arrived since the last tick, merged into one, and the newest one's number.
  pending: InputMessage | null;
  pendingSeq: number;
  // The keys still held from the last input, used on ticks no new input arrived for.
  held: InputMessage;
  // The newest input the game has used, sent back so the browser knows.
  ack: number;
  // Whether this player has the level as it is now.
  hasLevel: boolean;
}

const TICK_MS = 1000 / config.ticksPerSecond;
// The loop wakes this often and runs however many ticks are due.
const WAKE_MS = 1000 / 60;
// After a stall, the game skips ahead rather than racing to catch up.
const MAX_CATCH_UP_MS = 250;

// One game room. It runs the real game, the same code as solo, with an input from every seat
// each tick, and sends everyone the result.
export class Room extends DurableObject<Env> {
  private seats = new Map<number, Seat>();
  private game: GameState | null = null;
  private loop: ReturnType<typeof setInterval> | null = null;
  private lastTime = 0;
  private leftover = 0;
  // The level last sent, and how many boxes it had, to tell when it has changed.
  private sentLevel: Level | null = null;
  private sentBoxes = 0;

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
    const seat: Seat = { socket, pending: null, pendingSeq: 0, held: idleInput(playerId), ack: 0, hasLevel: false };
    this.seats.set(playerId, seat);
    const game = this.startGame();
    addPlayer(game, playerId);
    send(socket, { type: 'welcome', room: code, playerId });

    socket.addEventListener('message', (event) => {
      const message = readClientMessage(event.data, playerId);
      if (!message) return;
      if (message.type === 'restart') {
        this.restart(message.floor);
        return;
      }
      if (message.seq <= seat.pendingSeq) return;
      seat.pending = seat.pending ? mergeInputs(seat.pending, message.input) : message.input;
      seat.pendingSeq = message.seq;
    });
    const leave = () => {
      if (this.seats.get(playerId) !== seat) return;
      this.seats.delete(playerId);
      if (this.game) removePlayer(this.game, playerId);
      if (this.seats.size === 0) this.endGame();
    };
    socket.addEventListener('close', leave);
    socket.addEventListener('error', leave);
    return new Response(null, { status: 101, webSocket: client });
  }

  // The first player in starts a fresh game in the street outside the garage.
  private startGame(): GameState {
    if (this.game) return this.game;
    const game = createGameState(level0);
    game.players = [];
    game.points = [];
    this.game = game;
    this.lastTime = Date.now();
    this.leftover = 0;
    this.sentLevel = null;
    this.loop = setInterval(() => this.run(), WAKE_MS);
    return game;
  }

  // Anyone can start the game again, from the garage or on a floor; everyone in the room goes with it.
  private restart(floor: number): void {
    if (!this.game) return;
    const game = createGameState(level0);
    game.players = [];
    game.points = [];
    if (floor > 0) startOnFloor(game, floor);
    for (const [id, seat] of this.seats) {
      addPlayer(game, id);
      seat.pending = null;
      seat.held = idleInput(id);
    }
    this.game = game;
  }

  // The last player out ends the game; the next to join starts a new one.
  private endGame(): void {
    if (this.loop !== null) clearInterval(this.loop);
    this.loop = null;
    this.game = null;
  }

  private run(): void {
    const game = this.game;
    if (!game) return;
    const now = Date.now();
    this.leftover += Math.min(now - this.lastTime, MAX_CATCH_UP_MS);
    this.lastTime = now;
    while (this.leftover >= TICK_MS) {
      this.leftover -= TICK_MS;
      const inputs: InputMessage[] = [];
      for (const seat of this.seats.values()) {
        if (seat.pending) {
          inputs.push(seat.pending);
          seat.held = heldPart(seat.pending);
          seat.ack = seat.pendingSeq;
          seat.pending = null;
        } else inputs.push(seat.held);
      }
      step(game, inputs, 1 / config.ticksPerSecond);
      if (game.tick % SNAPSHOT_TICKS === 0) this.sendSnapshots(game);
    }
  }

  // Everyone gets the same state, with their own input count, and the level when it is new to them.
  private sendSnapshots(game: GameState): void {
    const { level, ...rest } = game;
    if (level !== this.sentLevel || level.boxes.length !== this.sentBoxes) {
      this.sentLevel = level;
      this.sentBoxes = level.boxes.length;
      for (const seat of this.seats.values()) seat.hasLevel = false;
    }
    const state = JSON.stringify(rest);
    let levelJson: string | null = null;
    for (const seat of this.seats.values()) {
      let text = `{"type":"snapshot","ack":${seat.ack},"state":${state}`;
      if (!seat.hasLevel) {
        levelJson ??= JSON.stringify(level);
        text += `,"level":${levelJson}`;
        seat.hasLevel = true;
      }
      sendText(seat.socket, `${text}}`);
    }
  }
}

function send(socket: WebSocket, message: ServerMessage): void {
  sendText(socket, JSON.stringify(message));
}

function sendText(socket: WebSocket, text: string): void {
  try {
    socket.send(text);
  } catch {
    // A socket that is closing; its close event tidies up.
  }
}
