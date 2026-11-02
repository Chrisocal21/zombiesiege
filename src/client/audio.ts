import { config } from '../config';
import type { GameState, Player } from '../game/state';
import { settings } from './settings';

// Every sound is made here from noise and oscillators, so there are no audio files to license.
// The game state is never touched: the audio watches it, the way the HUD does, and plays a sound
// when something it can see has just changed.

interface ZombieMemory {
  attackTick: number;
  groanIn: number;
}

export interface Audio {
  // Called every frame. `paused` is true behind the menus, when nothing should play.
  update(state: GameState, player: Player, paused: boolean, dt: number): void;
}

export function createAudio(): Audio {
  let context: AudioContext | null = null;
  let master: GainNode;
  let noise: AudioBuffer;

  // Browsers only allow sound after a click or key press.
  const wake = (): void => {
    if (!context) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      context = new Ctor();
      master = context.createGain();
      const compressor = context.createDynamicsCompressor();
      master.connect(compressor);
      compressor.connect(context.destination);
      noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (context.state === 'suspended') void context.resume();
  };
  window.addEventListener('pointerdown', wake);
  window.addEventListener('keydown', wake);

  // --- building blocks ---------------------------------------------------------------------

  // Where a sound goes: straight to the ears, or placed to the left or right.
  function output(pan: number, gain: number): AudioNode {
    const ctx = context!;
    const out = ctx.createGain();
    out.gain.value = gain;
    if (pan === 0) {
      out.connect(master);
    } else {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      out.connect(panner);
      panner.connect(master);
    }
    return out;
  }

  function burst(out: AudioNode, start: number, length: number, type: BiquadFilterType, from: number, to: number, peak: number, q = 0.7): void {
    const ctx = context!;
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + length);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    source.start(start, Math.random());
    source.stop(start + length + 0.05);
  }

  function tone(out: AudioNode, start: number, length: number, type: OscillatorType, from: number, to: number, peak: number, attack = 0.005): void {
    const ctx = context!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, to), start + length);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain);
    gain.connect(out);
    osc.start(start);
    osc.stop(start + length + 0.05);
  }

  // --- the sounds ---------------------------------------------------------------------------

  function shotgun(): void {
    const t = context!.currentTime;
    const out = output(0, 1);
    burst(out, t, 0.3, 'lowpass', 4200, 200, 1.2);
    burst(out, t, 0.08, 'highpass', 1800, 3000, 0.8);
    tone(out, t, 0.24, 'sine', 110, 28, 1.1);
    burst(out, t + 0.06, 0.7, 'lowpass', 700, 90, 0.25);
  }

  function shot(): void {
    const t = context!.currentTime;
    const out = output(0, 0.9);
    burst(out, t, 0.22, 'lowpass', 5200, 260, 1);
    burst(out, t, 0.05, 'highpass', 2500, 3500, 0.7);
    tone(out, t, 0.16, 'sine', 150, 38, 0.9);
    // The room answering back.
    burst(out, t + 0.04, 0.5, 'lowpass', 900, 120, 0.18);
  }

  function reloadOut(): void {
    const t = context!.currentTime;
    const out = output(0, 0.6);
    burst(out, t, 0.03, 'bandpass', 3200, 2200, 0.8, 4);
    tone(out, t, 0.04, 'square', 900, 400, 0.15);
    burst(out, t + 0.05, 0.12, 'bandpass', 700, 300, 0.4, 2);
  }

  function dryClick(): void {
    const t = context!.currentTime;
    const out = output(0, 0.5);
    burst(out, t, 0.03, 'bandpass', 3200, 2200, 0.8, 4);
    tone(out, t, 0.04, 'square', 700, 300, 0.15);
  }

  function purchase(): void {
    const t = context!.currentTime;
    const out = output(0, 0.5);
    tone(out, t, 0.25, 'sine', 1320, 1320, 0.3, 0.002);
    tone(out, t + 0.09, 0.4, 'sine', 1760, 1760, 0.3, 0.002);
    burst(out, t, 0.08, 'bandpass', 2400, 1800, 0.3, 3);
  }

  function reloadIn(): void {
    const t = context!.currentTime;
    const out = output(0, 0.6);
    burst(out, t, 0.06, 'bandpass', 1400, 900, 0.8, 3);
    tone(out, t, 0.06, 'square', 500, 220, 0.2);
    burst(out, t + 0.16, 0.05, 'bandpass', 2600, 1800, 0.7, 4);
    tone(out, t + 0.16, 0.05, 'square', 1100, 500, 0.15);
  }

  function impact(kill: boolean, head: boolean): void {
    const t = context!.currentTime;
    const out = output(0, 0.8);
    burst(out, t, 0.12, 'lowpass', 1400, 200, kill ? 0.9 : 0.6);
    tone(out, t, 0.1, 'sine', 120, 45, 0.7);
    if (head) {
      // A sharp crack and a high ring on top.
      burst(out, t, 0.05, 'highpass', 2800, 4200, 0.9);
      tone(out, t, 0.35, 'sine', 1900, 1500, 0.22, 0.002);
    }
    if (kill) burst(out, t + 0.05, 0.3, 'lowpass', 500, 90, 0.5);
  }

  function groan(pan: number, gain: number): void {
    const ctx = context!;
    const t = ctx.currentTime;
    const length = 0.9 + Math.random() * 0.7;
    const pitch = 62 + Math.random() * 38;
    const out = output(pan, gain);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitch * 1.25, t);
    osc.frequency.linearRampToValueAtTime(pitch, t + length * 0.4);
    osc.frequency.linearRampToValueAtTime(pitch * 0.7, t + length);
    // A wobble in the voice.
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 5 + Math.random() * 3;
    const wobbleDepth = ctx.createGain();
    wobbleDepth.gain.value = pitch * 0.06;
    wobble.connect(wobbleDepth);
    wobbleDepth.connect(osc.frequency);

    // The throat: a band that slides from "ooh" to "aah".
    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.Q.value = 3;
    formant.frequency.setValueAtTime(380, t);
    formant.frequency.linearRampToValueAtTime(720, t + length * 0.5);
    formant.frequency.linearRampToValueAtTime(420, t + length);
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, t);
    envelope.gain.exponentialRampToValueAtTime(0.9, t + 0.18);
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(formant);
    formant.connect(envelope);
    envelope.connect(out);
    osc.start(t);
    wobble.start(t);
    osc.stop(t + length + 0.05);
    wobble.stop(t + length + 0.05);
    // Breath over the top.
    burst(out, t, length, 'bandpass', 900, 500, 0.12, 1.5);
  }

  function swing(pan: number, gain: number): void {
    const t = context!.currentTime;
    burst(output(pan, gain), t, 0.25, 'bandpass', 500, 1500, 0.4, 1.2);
  }

  function hurt(): void {
    const t = context!.currentTime;
    const out = output(0, 0.9);
    tone(out, t, 0.25, 'sine', 90, 35, 0.9);
    burst(out, t, 0.18, 'lowpass', 1200, 150, 0.7);
  }

  function land(): void {
    const t = context!.currentTime;
    const out = output(0, 0.5);
    tone(out, t, 0.12, 'sine', 100, 40, 0.6);
    burst(out, t, 0.08, 'lowpass', 700, 150, 0.4);
  }

  function footstep(crouched: boolean): void {
    const t = context!.currentTime;
    const out = output((Math.random() - 0.5) * 0.2, crouched ? 0.12 : 0.25);
    burst(out, t, 0.07, 'lowpass', 600 + Math.random() * 250, 180, 0.7);
    tone(out, t, 0.06, 'sine', 90, 50, 0.4);
  }

  function gateClank(): void {
    const t = context!.currentTime;
    const out = output(0, 0.9);
    burst(out, t, 0.5, 'bandpass', 2200, 700, 0.5, 6);
    for (const [pitch, delay] of [[311, 0], [467, 0.02], [731, 0.05]]) tone(out, t + delay, 0.7, 'sine', pitch, pitch * 0.98, 0.12);
    tone(out, t + 0.1, 0.45, 'sine', 70, 38, 0.8);
    burst(out, t + 0.1, 0.9, 'lowpass', 400, 60, 0.4);
  }

  function pickup(): void {
    const t = context!.currentTime;
    const out = output(0, 0.5);
    burst(out, t, 0.2, 'bandpass', 1500, 600, 0.4, 1.5);
    tone(out, t + 0.05, 0.1, 'sine', 160, 80, 0.4);
  }

  function nailing(): void {
    const t = context!.currentTime;
    const out = output(0, 0.7);
    for (let i = 0; i < 3; i++) {
      const at = t + i * 0.13;
      tone(out, at, 0.1, 'sine', 180, 70, 0.8);
      burst(out, at, 0.06, 'bandpass', 1800, 900, 0.6, 3);
    }
  }

  function ding(): void {
    const t = context!.currentTime;
    const out = output(0, 0.55);
    tone(out, t, 1.4, 'sine', 1046, 1046, 0.4, 0.003);
    tone(out, t + 0.35, 1.8, 'sine', 784, 784, 0.4, 0.003);
    tone(out, t, 0.8, 'sine', 2092, 2092, 0.08, 0.003);
  }

  // The low hum of the elevator climbing, fading in and out.
  function rumble(seconds: number): void {
    const ctx = context!;
    const t = ctx.currentTime;
    const out = output(0, 0.7);
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 41;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 110;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.8);
    gain.gain.setValueAtTime(0.5, t + seconds - 1);
    gain.gain.linearRampToValueAtTime(0.0001, t + seconds);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + seconds + 0.05);
    burst(out, t, seconds, 'lowpass', 220, 180, 0.15);
  }

  // A few long notes under the action: high and rising when a wave starts, low when it is lost.
  function sting(low: boolean): void {
    const t = context!.currentTime;
    const out = output(0, 0.5);
    const notes = low ? [98, 116.5] : [196, 246.9, 293.7];
    notes.forEach((note, index) => tone(out, t + index * 0.12, 1.6, 'sawtooth', note, note, 0.12, 0.08));
  }

  function death(): void {
    const t = context!.currentTime;
    const out = output(0, 0.9);
    tone(out, t, 1.6, 'sawtooth', 110, 30, 0.35, 0.05);
    burst(out, t, 1.2, 'lowpass', 900, 60, 0.4);
  }

  // --- watching the game --------------------------------------------------------------------

  let seenTick = 0;
  let shotTick = -1;
  let reloading = false;
  let hurtTick = -1;
  let dryTick = -1;
  let buyTick = -1;
  let wasOnGround = true;
  let wasAlive = true;
  let stepClock = 0;
  let phase = '';
  let liftOpen = false;
  let lives = -1;
  let boardedCount = 0;
  let takenCount = 0;
  let gateClosed = false;
  const zombies = new Map<number, ZombieMemory>();

  // Where a sound at (x, z) sits relative to the player: left to right, and how loud.
  function place(player: Player, x: number, z: number): { pan: number; gain: number } {
    const dx = x - player.x;
    const dz = z - player.z;
    const distance = Math.hypot(dx, dz);
    const right = (dx * Math.cos(player.yaw) - dz * Math.sin(player.yaw)) / Math.max(distance, 0.001);
    return { pan: right * Math.min(1, distance / 2), gain: 1 / (1 + distance * 0.35) };
  }

  return {
    update(state, player, paused, dt) {
      if (!context || context.state !== 'running') return;
      master.gain.value = paused ? 0 : settings.volume;

      // A new game: take a fresh look instead of playing the difference.
      const fresh = state.tick < seenTick;
      seenTick = state.tick;
      const watching = !paused && !fresh && !state.frozen;

      const alive = player.health > 0;
      const boarded = state.doors.filter((door) => door.boarded).length;
      const taken = state.pickups.filter((pickup) => pickup.taken).length;
      if (watching) {
        if (player.lastShotTick !== shotTick && player.lastShotTick >= 0) {
          if (player.weapon === 'shotgun') shotgun(); else shot();
          if (player.lastShotZombie) impact(player.lastShotKill, player.lastShotHead);
        }
        if (player.lastDryTick !== dryTick && player.lastDryTick >= 0) dryClick();
        if (player.lastBuyTick !== buyTick && player.lastBuyTick >= 0) purchase();
        if (player.reloadLeft > 0 && !reloading) reloadOut();
        if (player.reloadLeft === 0 && reloading && alive) reloadIn();
        if (player.lastHurtTick !== hurtTick && player.lastHurtTick >= 0) hurt();
        if (player.onGround && !wasOnGround && player.vy < -4) land();
        if (!alive && wasAlive) death();
        if (state.waves.phase === 'active' && phase !== 'active') sting(false);
        if ((state.waves.phase === 'cleared' && phase !== 'cleared') || (state.waves.phase === 'won' && phase !== 'won')) sting(false);
        if (state.lift.open && !liftOpen) ding();
        if (state.waves.phase === 'ride' && phase !== 'ride') rumble(config.elevator.rideSeconds);
        if (state.gate.closed && !gateClosed && state.gate.closedTick >= 0) gateClank();
        if (boarded > boardedCount) nailing();
        if (taken > takenCount) pickup();
        if (state.lives < lives && state.lives < config.player.lives) sting(true);
      }
      shotTick = player.lastShotTick;
      reloading = player.reloadLeft > 0;
      hurtTick = player.lastHurtTick;
      dryTick = player.lastDryTick;
      buyTick = player.lastBuyTick;
      wasOnGround = player.onGround;
      wasAlive = alive;
      phase = state.waves.phase;
      liftOpen = state.lift.open;
      lives = state.lives;
      gateClosed = state.gate.closed;
      boardedCount = boarded;
      takenCount = taken;

      // Footsteps, slower when crouched.
      const speed = player.onGround && alive ? Math.hypot(player.vx, player.vz) : 0;
      if (watching && speed > 0.8 && !player.ladder && !player.mantle) {
        stepClock += dt * speed;
        if (stepClock > (player.crouch > 0.5 ? 1.6 : 2.4)) {
          stepClock = 0;
          footstep(player.crouch > 0.5);
        }
      } else {
        stepClock = 1.2;
      }

      // The living dead: swings, and the groaning.
      const present = new Set<number>();
      for (const zombie of state.zombies) {
        present.add(zombie.id);
        let memory = zombies.get(zombie.id);
        if (!memory) {
          memory = { attackTick: zombie.lastAttackTick, groanIn: Math.random() * 3 };
          zombies.set(zombie.id, memory);
        }
        if (watching && !zombie.dead) {
          const where = place(player, zombie.x, zombie.z);
          if (zombie.lastAttackTick !== memory.attackTick && zombie.lastAttackTick >= 0) swing(where.pan, 0.8 * where.gain);
          memory.groanIn -= dt;
          if (memory.groanIn <= 0) {
            memory.groanIn = 2.5 + Math.random() * 4;
            if (where.gain > 0.12) groan(where.pan, 0.55 * where.gain);
          }
        }
        memory.attackTick = zombie.lastAttackTick;
      }
      for (const id of zombies.keys()) if (!present.has(id)) zombies.delete(id);
    },
  };
}
