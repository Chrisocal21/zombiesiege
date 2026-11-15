import { bindings, keyLabel } from '../client/bindings';
import { charging, inArea, lastStep } from '../game/objectives';
import { flowOf, type GameState, type Player } from '../game/state';
import { actOf, isDescent, onFoot, ROOF } from '../game/tower';

// What the way on is called: a gate in the prologue, a lift after.
const exit = (state: GameState) => (state.level.exitGate ? 'the gate' : 'the elevator');

// The words the HUD uses for the floor's objective.

export interface Brief {
  title: string;
  detail: string;
  // Seconds left on a charge or the helicopter's way in, and the full time.
  timer?: number;
  total?: number;
}

// How far along the objective is, for a line under the wave's own heading. Null when it is
// nothing that is done bit by bit.
export function objectiveProgress(state: GameState): string | null {
  const objective = state.level.objective;
  if (!objective || state.objective.done) return null;
  if (objective.kind === 'breakers') return `Breakers ${state.objective.thrown.filter((tick) => tick >= 0).length} of ${objective.panels.length}`;
  if (objective.kind === 'carry') return `${objective.label}s ${state.objective.items.filter((item) => item.delivered).length} of ${objective.items.length}`;
  return null;
}

// What to do once the waves are cleared, while holding out, and while waiting to board.
export function objectiveBrief(state: GameState, player: Player): Brief | null {
  const objective = state.level.objective;
  const phase = state.waves.phase;
  if (!objective) return null;
  if (phase === 'evac' && objective.kind === 'signal') {
    const distance = Math.hypot(objective.pad.x - player.x, objective.pad.z - player.z);
    const flares = objective.style === 'flares';
    return { title: flares ? 'Get to the air ambulance' : 'Get to the helicopter', detail: distance > objective.padRadius ? `${Math.round(distance)} m to the ${flares ? 'smoke' : 'helipad'}` : 'Everyone aboard to lift off' };
  }
  if (phase === 'hold' && (objective.kind === 'charge' || objective.kind === 'signal')) {
    const left = objective.seconds - state.objective.charge;
    if (objective.kind === 'signal') return { title: 'Hold out for the helicopter', detail: 'Lights on. It is on its way', timer: left, total: objective.seconds };
    const inside = state.players.some((each) => each.health > 0 && inArea(each, objective.room));
    if (onFoot(state.floor)) return { title: `Hold ${objective.roomName.toLowerCase()}`, detail: inside ? 'The van is warming. Cover the survivors' : 'Get back to the forecourt', timer: left, total: objective.seconds };
    return {
      title: `Hold ${objective.roomName.toLowerCase()}`,
      detail: charging(state) ? (inArea(player, objective.room) ? 'Charging. Stay in the room' : 'Charging while someone holds the room') : inside ? 'Charging' : 'Charging paused. Get back in the room',
      timer: left,
      total: objective.seconds,
    };
  }
  // The boss is fought through the waves, so its words show whatever the phase.
  if (objective.kind === 'contain') return containBrief(state);
  if (phase !== 'search') return null;
  switch (objective.kind) {
    case 'keycard': {
      const shut = state.locks.filter((lock) => !lock.open).length;
      return { title: `Find the ${objective.label.toLowerCase()}`, detail: onFoot(state.floor) ? 'Search the street' : shut > 0 ? 'Locked doors open for points' : 'Check the offices' };
    }
    case 'breakers':
      // A step before the last says what the breakers are for; the last one powers the way on.
      return { title: `Throw the ${objective.label.toLowerCase()}`, detail: `${objectiveProgress(state) ?? ''}   ·   ${!lastStep(state) ? objective.part : onFoot(state.floor) ? 'The barrier is down' : state.level.exitGate ? 'The gate has no power' : 'The elevator has no power'}` };
    case 'charge':
      return onFoot(state.floor)
        ? { title: 'Start the delivery van', detail: 'They will come while it warms up' }
        : { title: `Start the charger in ${objective.roomName.toLowerCase()}`, detail: 'They will come while it charges' };
    case 'carry':
      return player.carrying >= 0
        ? { title: `Load the ${objective.label.toLowerCase()} at ${exit(state)}`, detail: `${keyLabel(bindings.fire)} puts it down and brings the gun up` }
        : { title: `Bring the ${objective.label.toLowerCase()}s to ${exit(state)}`, detail: objectiveProgress(state) ?? '' };
    case 'signal':
      return objective.style === 'flares'
        ? { title: 'Throw the signal flares', detail: 'The flare box is on the groundskeeper\'s shed' }
        : { title: 'Switch on the helipad lights', detail: 'The light box is on the east parapet' };
  }
}

// Beating the boss back into the vault.
function containBrief(state: GameState): Brief {
  const name = state.level.boss?.name ?? 'it';
  if (state.boss && state.boss.retreatTick >= 0) return { title: `${name} is falling back`, detail: 'Into the vault. Let it go' };
  return { title: `Drive ${name} back into the vault`, detail: 'It cannot be killed. Hurt it enough and it breaks' };
}

// What pressing use does at an objective.
export function objectivePrompt(state: GameState, kind: string): string | null {
  const objective = state.level.objective;
  switch (kind) {
    case 'objective': return `Take the ${objective?.label.toLowerCase() ?? 'item'}`;
    case 'breaker': return 'Throw the breaker';
    case 'device': return objective?.kind === 'signal' ? (objective.style === 'flares' ? 'Throw the signal flares' : 'Switch on the helipad lights') : onFoot(state.floor) ? 'Start the delivery van' : 'Start the charger';
    case 'case': return `Pick up the ${objective?.label.toLowerCase() ?? 'case'}`;
    case 'deliver': return `Load the ${objective?.label.toLowerCase() ?? 'case'}`;
    default: return null;
  }
}

// The cleared banner's line under the title.
export function clearedDetail(state: GameState): string {
  const objective = state.level.objective;
  if (state.objective.done || !objective) return `${state.level.exitGate ? 'The gate is' : 'The elevator is'} opening`;
  switch (objective.kind) {
    case 'keycard': return `Find the ${objective.label.toLowerCase()} to wake the elevator`;
    case 'breakers': return `Throw the ${objective.label.toLowerCase()} to power ${exit(state)}`;
    case 'charge': return `Start the charger in ${objective.roomName.toLowerCase()}`;
    case 'carry': return `Bring the ${objective.label.toLowerCase()}s to ${exit(state)}`;
    case 'signal': return objective.style === 'flares' ? 'Throw the signal flares' : 'Switch on the helipad lights';
    case 'contain': return `Drive ${state.level.boss?.name ?? 'it'} back into the vault`;
  }
}

// The line under the floor's name on arriving: what kind of floor this is.
export function arrivalDetail(state: GameState): string {
  const flow = flowOf(state.level);
  if (flow.kind === 'sweep') return state.waves.alarms > 0 ? 'They heard you. More are on the way' : 'They have not heard you yet. Keep it that way';
  if (flow.kind === 'run') return 'Do not stop. They are coming up behind';
  if (state.level.name === 'Last Refuge') return 'The generators are down. Close what gaps you can before they come';
  return state.level.objective?.kind === 'breakers' ? 'The power is out. Cage the doors before they come' : 'Cage the doors before they come';
}

// The banner when the objective is done: which part of the helipad it won.
export function partBanner(state: GameState): { eyebrow: string; title: string; detail: string } | null {
  const objective = state.level.objective;
  if (!objective) return null;
  if (objective.kind === 'signal') {
    return objective.style === 'flares'
      ? { eyebrow: 'DAYBREAK', title: 'AIR AMBULANCE DOWN', detail: 'Everyone into the smoke' }
      : { eyebrow: 'THE ROOF', title: 'HELICOPTER DOWN', detail: 'Everyone onto the helipad' };
  }
  if (onFoot(state.floor)) {
    return { eyebrow: 'THE ROAD IN', title: objective.part.toUpperCase(), detail: 'The gate opens once the street is clear' };
  }
  if (isDescent(state.floor)) {
    const gate = state.level.exitGate;
    const detail = flowOf(state.level).kind === 'siege' && state.waves.phase !== 'search' ? 'The freight lift opens once the floor is clear' : gate ? 'The gate opens when the job is done. Keep moving' : 'The freight lift is open. Get to it';
    return { eyebrow: actOf(state.floor) === 9 ? 'FAULT LINES' : actOf(state.floor) === 8 ? 'BLACKWATER' : actOf(state.floor) === 7 ? 'DEAD AIR' : actOf(state.floor) === 6 ? 'BROKEN ROADS' : actOf(state.floor) === 5 ? 'LAST REFUGE' : actOf(state.floor) === 4 ? 'DAYBREAK' : actOf(state.floor) === 3 ? 'THE VAULT' : 'THE DESCENT', title: objective.part.toUpperCase(), detail };
  }
  return {
    eyebrow: `HELIPAD PART ${state.floor} OF ${ROOF - 1}`,
    title: objective.part.toUpperCase(),
    detail: objective.kind === 'charge' || state.waves.phase !== 'search' ? 'The elevator opens once the floor is clear' : 'The elevator is opening',
  };
}
