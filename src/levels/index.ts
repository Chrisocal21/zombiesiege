import { floor12 } from './floor12';
import { floor3 } from './floor3';
import { floor6 } from './floor6';
import { floor9 } from './floor9';
import { level0 } from './level0';
import { exec27 } from './exec27';
import { lobby1 } from './lobby1';
import { servers20 } from './servers20';
import { office41 } from './office41';
import { records34 } from './records34';
import { barricades } from './barricades';
import { garage } from './garage';
import { mainStreet } from './mainStreet';
import { market } from './market';
import { park } from './park';
import { lab } from './lab';
import { pharmacy } from './pharmacy';
import { roof } from './roof';
import { tunnel } from './tunnel';
import { vaultLevel } from './vault';
import { towerRoof } from './towerRoof';
import type { Level } from './types';

// The level for each elevator stop, by stop index, with the roof one past the last stop.
const FLOORS: Record<number, Level> = { 1: floor3, 2: floor6, 3: floor9, 4: floor12, 5: roof, 6: towerRoof, 7: office41, 8: records34, 9: exec27, 10: servers20, 11: lobby1, 12: garage, 13: tunnel, 14: pharmacy, 15: lab, 16: vaultLevel, 17: mainStreet, 18: market, 19: barricades, 20: park };

export function levelForFloor(floor: number): Level {
  return FLOORS[floor] ?? level0;
}
