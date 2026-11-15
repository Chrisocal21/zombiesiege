import { dropCase } from './objectives';
import { createPlayer, spawnPoint, type GameState, type Player } from './state';

// Players joining and leaving a co-op game while it runs.

// Someone joining a game already under way, at the spawn for where the game is: the street
// before the gate shuts, otherwise where players come back after going down.
export function addPlayer(state: GameState, id: number): Player {
  const inStreet = state.waves.phase === 'entry' && state.level.streetSpawns.length > 0;
  const yaw = inStreet ? 0 : state.level.spawnYaw ?? 0;
  const player = createPlayer(id, spawnPoint(inStreet ? state.level.streetSpawns : state.level.playerSpawns, id, yaw));
  player.yaw = yaw;
  // Out of the elevator into the dark, the light comes on by itself.
  player.flashlight = state.level.objective?.kind === 'breakers';
  state.players = [...state.players.filter((each) => each.id !== id), player].sort((a, b) => a.id - b.id);
  while (state.points.length <= id) state.points.push(0);
  return player;
}

// Stuck in the scenery: back to where this floor puts its players, standing, with nothing carried and
// off any ladder, ledge or cover. Downed or out players are left to the usual rules.
export function unstick(state: GameState, player: Player): void {
  if (player.out || player.health <= 0) return;
  const inStreet = state.waves.phase === 'entry' && state.level.streetSpawns.length > 0;
  const yaw = inStreet ? 0 : state.level.spawnYaw ?? 0;
  const at = spawnPoint(inStreet ? state.level.streetSpawns : state.level.playerSpawns, player.id, yaw);
  dropCase(state, player);
  Object.assign(player, { x: at.x, y: at.y, z: at.z, vx: 0, vy: 0, vz: 0, yaw, onGround: true, cover: false, ladder: null, mantle: null, revive: null });
}

// Someone leaving: whatever they carried drops where they stood, and their points stay on the board.
export function removePlayer(state: GameState, id: number): void {
  const player = state.players.find((each) => each.id === id);
  if (player) dropCase(state, player);
  state.players = state.players.filter((each) => each.id !== id);
}
