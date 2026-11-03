import { bindings, keyLabel } from '../client/bindings';
import { charging, inArea } from '../game/objectives';
import type { GameState, Player } from '../game/state';
import { ROOF } from '../game/tower';

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
  if (objective.kind === 'carry') return `Lamp cases ${state.objective.items.filter((item) => item.delivered).length} of ${objective.items.length}`;
  return null;
}

// What to do once the waves are cleared, while holding out, and while waiting to board.
export function objectiveBrief(state: GameState, player: Player): Brief | null {
  const objective = state.level.objective;
  const phase = state.waves.phase;
  if (!objective) return null;
  if (phase === 'evac' && objective.kind === 'signal') {
    const distance = Math.hypot(objective.pad.x - player.x, objective.pad.z - player.z);
    return { title: 'Get to the helicopter', detail: distance > objective.padRadius ? `${Math.round(distance)} m to the helipad` : 'Everyone aboard to lift off' };
  }
  if (phase === 'hold' && (objective.kind === 'charge' || objective.kind === 'signal')) {
    const left = objective.seconds - state.objective.charge;
    if (objective.kind === 'signal') return { title: 'Hold out for the helicopter', detail: 'Lights on. It is on its way', timer: left, total: objective.seconds };
    const inside = state.players.some((each) => each.health > 0 && inArea(each, objective.room));
    return {
      title: `Hold ${objective.roomName.toLowerCase()}`,
      detail: charging(state) ? (inArea(player, objective.room) ? 'Charging. Stay in the room' : 'Charging while someone holds the room') : inside ? 'Charging' : 'Charging paused. Get back in the room',
      timer: left,
      total: objective.seconds,
    };
  }
  if (phase !== 'search') return null;
  switch (objective.kind) {
    case 'keycard': {
      const shut = state.locks.filter((lock) => !lock.open).length;
      return { title: `Find the ${objective.label.toLowerCase()}`, detail: shut > 0 ? 'Locked doors open for points' : 'Check the offices' };
    }
    case 'breakers':
      return { title: 'Throw the breakers', detail: `${objectiveProgress(state) ?? ''}   ·   The elevator has no power` };
    case 'charge':
      return { title: `Start the charger in ${objective.roomName.toLowerCase()}`, detail: 'They will come while it charges' };
    case 'carry':
      return player.carrying >= 0
        ? { title: 'Load the case at the elevator', detail: `${keyLabel(bindings.fire)} puts it down and brings the gun up` }
        : { title: 'Bring the lamp cases to the elevator', detail: objectiveProgress(state) ?? '' };
    case 'signal':
      return { title: 'Switch on the helipad lights', detail: 'The light box is on the east parapet' };
  }
}

// What pressing use does at an objective.
export function objectivePrompt(state: GameState, kind: string): string | null {
  const objective = state.level.objective;
  switch (kind) {
    case 'objective': return `Take the ${objective?.label.toLowerCase() ?? 'item'}`;
    case 'breaker': return 'Throw the breaker';
    case 'device': return objective?.kind === 'signal' ? 'Switch on the helipad lights' : 'Start the charger';
    case 'case': return 'Pick up the lamp case';
    case 'deliver': return 'Load the lamp case';
    default: return null;
  }
}

// The cleared banner's line under the title.
export function clearedDetail(state: GameState): string {
  const objective = state.level.objective;
  if (state.objective.done || !objective) return 'The elevator is opening';
  switch (objective.kind) {
    case 'keycard': return 'Find the keycard to wake the elevator';
    case 'breakers': return 'Throw the breakers to power the elevator';
    case 'charge': return `Start the charger in ${objective.roomName.toLowerCase()}`;
    case 'carry': return 'Bring the lamp cases to the elevator';
    case 'signal': return 'Switch on the helipad lights';
  }
}

// The banner when the objective is done: which part of the helipad it won.
export function partBanner(state: GameState): { eyebrow: string; title: string; detail: string } | null {
  const objective = state.level.objective;
  if (!objective) return null;
  if (objective.kind === 'signal') return { eyebrow: 'THE ROOF', title: 'HELICOPTER DOWN', detail: 'Everyone onto the helipad' };
  return {
    eyebrow: `HELIPAD PART ${state.floor} OF ${ROOF - 1}`,
    title: objective.part.toUpperCase(),
    detail: objective.kind === 'charge' || state.waves.phase !== 'search' ? 'The elevator opens once the floor is clear' : 'The elevator is opening',
  };
}
