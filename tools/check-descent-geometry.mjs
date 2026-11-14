import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(s, c, next) {
  if (s.startsWith('.') && !extname(s)) { try { return next(`${s}.ts`, c); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return next(`${s}/index.ts`, c); } }
  return next(s, c); } });
const { office41 } = await import('../src/levels/office41.ts');
const { records34 } = await import('../src/levels/records34.ts');
const { exec27 } = await import('../src/levels/exec27.ts');
const { servers20 } = await import('../src/levels/servers20.ts');
const { garage } = await import('../src/levels/garage.ts');
const { towerRoof } = await import('../src/levels/towerRoof.ts');
const { tunnel } = await import('../src/levels/tunnel.ts');
const { pharmacy } = await import('../src/levels/pharmacy.ts');
const { lab } = await import('../src/levels/lab.ts');
const { vaultLevel } = await import('../src/levels/vault.ts');
const { mainStreet } = await import('../src/levels/mainStreet.ts');
const { market } = await import('../src/levels/market.ts');
const { barricades } = await import('../src/levels/barricades.ts');
const { park } = await import('../src/levels/park.ts');
const { lobby1 } = await import('../src/levels/lobby1.ts');
const { deadStop } = await import('../src/levels/deadStop.ts');
const { approach } = await import('../src/levels/approach.ts');
const { breakdown } = await import('../src/levels/breakdown.ts');
const { checkpoint } = await import('../src/levels/checkpoint.ts');
const { commercial } = await import('../src/levels/commercial.ts');
const { fittingFront } = await import('../src/game/objectives.ts');
let bad = 0;
const hit = (level, x, z, what) => {
  for (const b of level.boxes) {
    if (b.position.y - b.size.y / 2 > 1.2 || b.position.y + b.size.y / 2 < 0.2) continue;
    if (Math.abs(x - b.position.x) < b.size.x / 2 + 0.3 && Math.abs(z - b.position.z) < b.size.z / 2 + 0.3) { console.log(level.name, what, 'blocked at', x, z, 'by', b.surface, b.prop, b.position); bad++; return; }
  }
};
for (const level of [breakdown, deadStop, checkpoint, commercial, approach, office41, records34, exec27, servers20, lobby1, garage, towerRoof, tunnel, pharmacy, lab, vaultLevel, mainStreet, market, barricades, park]) {
  for (const p of level.playerSpawns) hit(level, p.x, p.z, 'spawn');
  const o = level.objective;
  if (o.kind === 'breakers') o.panels.forEach((p, i) => { const f = fittingFront(p); hit(level, f.x, f.z, `breaker ${i}`); });
  if (o.kind === 'keycard') hit(level, o.position.x, o.position.z + 1.2, 'keycard');
  if (o.kind === 'charge') { const f = fittingFront(o.device); hit(level, f.x, f.z, 'device'); }
  for (const s of level.stations) hit(level, s.position.x + s.normal.x * 0.9, s.position.z + s.normal.z * 0.9, 'station');
  for (const d of level.doors) hit(level, d.position.x + d.normal.x * 1.2, d.position.z + d.normal.z * 1.2, 'door');
  for (const l of level.locks) hit(level, l.position.x + l.normal.x * 1.2, l.position.z + l.normal.z * 1.2, 'lock');
  const e = level.elevator; hit(level, e.position.x + e.normal.x * 1.5, e.position.z + e.normal.z * 1.5, 'lift front');
}
console.log(bad ? 'problems: ' + bad : 'clear');
