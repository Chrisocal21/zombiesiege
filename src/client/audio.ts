import { config } from '../config';
import type { GameState, Player } from '../game/state';
import { charging } from '../game/objectives';
import { helicopterPose } from '../render/helicopterPath';
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
  // Menu sounds, which play while the game itself is silent.
  ui(kind: 'move' | 'select' | 'back' | 'start'): void;
}

export function createAudio(): Audio {
  let context: AudioContext | null = null;
  let master: GainNode;
  let noise: AudioBuffer;
  // Menu sounds skip the master volume, which is turned down behind the menus.
  let uiBus: GainNode;

  // Browsers only allow sound after a click or key press.
  const wake = (): void => {
    if (!context) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      context = new Ctor();
      master = context.createGain();
      const compressor = context.createDynamicsCompressor();
      master.connect(compressor);
      uiBus = context.createGain();
      uiBus.connect(compressor);
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

  // A short synthetic room: decaying noise, fed from a send so gunfire has a tail outdoors never gives.
  let room: ConvolverNode | null = null;
  function reverb(): AudioNode {
    const ctx = context!;
    if (!room) {
      const length = Math.floor(ctx.sampleRate * 1.1);
      const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const data = impulse.getChannelData(c);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2);
      }
      room = ctx.createConvolver();
      room.buffer = impulse;
      const wet = ctx.createGain();
      wet.gain.value = 0.35;
      room.connect(wet);
      wet.connect(master);
    }
    return room;
  }

  // A gunshot is rendered sample by sample, because what makes it read as a gun is a transient
  // that starts at full strength in the first millisecond, which a ramped envelope cannot give.
  const shotBuffers = new Map<number, AudioBuffer>();
  function shotBuffer(size: number): AudioBuffer {
    const ctx = context!;
    const cached = shotBuffers.get(size);
    if (cached) return cached;
    const rate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, Math.floor(rate * 0.9 * size), rate);
    const data = buffer.getChannelData(0);
    let mid = 0;
    let rumble = 0;
    let phase = 0;
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / rate;
      const white = Math.random() * 2 - 1;
      // The crack: raw noise, gone in a few milliseconds.
      const crack = white * Math.exp(-t / (0.005 * size)) * 1.3;
      // The blast: noise with the top rolled off, lasting a few tens of milliseconds.
      mid += (white - mid) * 0.35;
      const blast = mid * Math.exp(-t / (0.03 * size)) * 1.5;
      // The boom: a low note that falls away, and a rumble under it.
      phase += (2 * Math.PI * (45 / size + 110 * Math.exp(-t / 0.03)) ) / rate;
      const boom = Math.sin(phase) * Math.exp(-t / (0.07 * size)) * 1.1;
      rumble += (white - rumble) * 0.04;
      const low = rumble * Math.exp(-t / (0.2 * size)) * 3;
      const x = Math.tanh((crack + blast + boom + low) * 1.8);
      data[i] = x;
      peak = Math.max(peak, Math.abs(x));
    }
    for (let i = 0; i < data.length; i++) data[i] = (data[i] / peak) * 0.95;
    shotBuffers.set(size, buffer);
    return buffer;
  }

  function bang(out: AudioNode, t: number, size: number): void {
    const ctx = context!;
    const source = ctx.createBufferSource();
    source.buffer = shotBuffer(size);
    // Every shot a touch different, so a run of them does not machine-gun.
    source.playbackRate.value = 0.95 + Math.random() * 0.1;
    const dry = ctx.createGain();
    dry.gain.value = 1;
    const send = ctx.createGain();
    send.gain.value = 0.7;
    source.connect(dry);
    dry.connect(out);
    source.connect(send);
    send.connect(reverb());
    source.start(t);
  }

  function shotgun(): void {
    bang(output(0, 1), context!.currentTime, 1.6);
  }

  function shot(): void {
    bang(output(0, 0.95), context!.currentTime, 1);
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

  // A heavy breaker going in: a clunk, and the hum of the circuit coming back.
  function breakerThrow(): void {
    const t = context!.currentTime;
    const out = output(0, 0.9);
    tone(out, t, 0.18, 'square', 90, 45, 0.35, 0.002);
    burst(out, t, 0.12, 'bandpass', 2600, 900, 0.6, 4);
    burst(out, t + 0.02, 0.4, 'lowpass', 600, 80, 0.4);
    tone(out, t + 0.15, 1.6, 'sawtooth', 50, 50, 0.08, 0.4);
    tone(out, t + 0.15, 1.6, 'sine', 100, 100, 0.12, 0.4);
  }

  // A big switch thrown and a machine spinning up.
  function powerUp(): void {
    const t = context!.currentTime;
    const out = output(0, 0.8);
    burst(out, t, 0.1, 'bandpass', 2000, 800, 0.5, 3);
    tone(out, t + 0.05, 1.8, 'sawtooth', 60, 240, 0.08, 0.3);
    tone(out, t + 0.05, 1.8, 'sine', 120, 480, 0.12, 0.3);
  }

  function setDown(): void {
    const t = context!.currentTime;
    const out = output(0, 0.7);
    tone(out, t, 0.14, 'sine', 120, 60, 0.6);
    burst(out, t, 0.12, 'lowpass', 1400, 200, 0.4);
  }

  // Sounds that run on their own and are only turned up and down: the charger's hum, the wind on
  // the roof, and the helicopter. Made the first time they are needed.
  interface Loops { hum: OscillatorNode; humGain: GainNode; wind: GainNode; rotor: GainNode; rotorPan: StereoPannerNode; chop: OscillatorNode; whine: OscillatorNode }
  let loops: Loops | null = null;
  function startLoops(): Loops {
    const ctx = context!;
    const noiseLoop = (): AudioBufferSourceNode => {
      const source = ctx.createBufferSource();
      source.buffer = noise;
      source.loop = true;
      source.start();
      return source;
    };
    const hum = ctx.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 55;
    const humFilter = ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 500;
    const humGain = ctx.createGain();
    humGain.gain.value = 0;
    hum.connect(humFilter).connect(humGain).connect(master);
    hum.start();

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 380;
    const wind = ctx.createGain();
    wind.gain.value = 0;
    noiseLoop().connect(windFilter).connect(wind).connect(master);

    // The rotor: low noise whose loudness throbs with each blade going past, and the turbine's whine.
    const rotorFilter = ctx.createBiquadFilter();
    rotorFilter.type = 'lowpass';
    rotorFilter.frequency.value = 520;
    const throb = ctx.createGain();
    throb.gain.value = 0.55;
    const chop = ctx.createOscillator();
    chop.frequency.value = 17;
    const depth = ctx.createGain();
    depth.gain.value = 0.45;
    chop.connect(depth).connect(throb.gain);
    chop.start();
    const rotor = ctx.createGain();
    rotor.gain.value = 0;
    const rotorPan = ctx.createStereoPanner();
    noiseLoop().connect(rotorFilter).connect(throb).connect(rotor);
    const whine = ctx.createOscillator();
    whine.type = 'sawtooth';
    whine.frequency.value = 880;
    const whineFilter = ctx.createBiquadFilter();
    whineFilter.type = 'bandpass';
    whineFilter.frequency.value = 1800;
    whineFilter.Q.value = 3;
    const whineGain = ctx.createGain();
    whineGain.gain.value = 0.03;
    whine.connect(whineFilter).connect(whineGain).connect(rotor);
    whine.start();
    rotor.connect(rotorPan).connect(master);
    return { hum, humGain, wind, rotor, rotorPan, chop, whine };
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
  let meleeTick = -1;
  let meleeHitTick = -1;
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
  let objectiveDone = true;
  let thrownCount = 0;
  let deliveredCount = 0;
  let carrying = -1;
  let startedTick = -1;
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
    ui(kind) {
      // The first key press of the session can arrive here before the audio has woken.
      wake();
      if (!context) return;
      uiBus.gain.value = settings.volume;
      const t = context.currentTime;
      const out = output(0, 1);
      out.disconnect();
      out.connect(uiBus);
      if (kind === 'move') {
        tone(out, t, 0.045, 'sine', 2100, 1700, 0.1, 0.002);
        burst(out, t, 0.02, 'highpass', 5000, 7000, 0.04);
      } else if (kind === 'select') {
        tone(out, t, 0.09, 'triangle', 620, 600, 0.2, 0.003);
        tone(out, t + 0.06, 0.18, 'triangle', 930, 920, 0.18, 0.003);
        burst(out, t, 0.22, 'lowpass', 1400, 140, 0.12);
      } else if (kind === 'back') {
        tone(out, t, 0.12, 'triangle', 720, 430, 0.18, 0.003);
      } else {
        // A deep hit as the title gives way to the menu.
        tone(out, t, 1.6, 'sine', 62, 28, 0.9, 0.006);
        tone(out, t, 0.7, 'sawtooth', 96, 48, 0.06, 0.01);
        burst(out, t, 1.8, 'lowpass', 1600, 50, 0.4);
        burst(out, t + 0.02, 0.05, 'highpass', 2500, 5000, 0.15);
      }
    },
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
      const thrown = state.objective.thrown.filter((tick) => tick >= 0).length;
      const delivered = state.objective.items.filter((item) => item.delivered).length;
      if (watching) {
        if (player.lastMeleeTick !== meleeTick && player.lastMeleeTick >= 0) {
          const t = context.currentTime, heavy = player.weapon === 'bat';
          const out = output(0, .55);
          burst(out, t, heavy ? .25 : .16, 'bandpass', heavy ? 1100 : 2600, heavy ? 170 : 550, .6);
        }
        if (player.lastMeleeHitTick !== meleeHitTick && player.lastMeleeHitTick >= 0) {
          if (player.lastMeleeContact === 'zombie') {
            impact(player.lastMeleeKill, false);
            tone(output(0,.55),context.currentTime,.12,'triangle',player.weapon==='bat'?110:190,40,.65);
          } else if (player.lastMeleeContact === 'wall') {
            burst(output(0,.45),context.currentTime,.11,'bandpass',1800,280,.65);
          }
        }
        if (player.lastShotTick !== shotTick && player.lastShotTick >= 0) {
          if (player.weapon === 'shotgun') shotgun(); else shot();
          if (player.lastShotZombie) impact(player.lastShotKill, player.lastShotHead);
        }
        if (player.lastDryTick !== dryTick && player.lastDryTick >= 0) dryClick();
        if (player.lastBuyTick !== buyTick && player.lastBuyTick >= 0) purchase();
        if (player.reloadLeft > 0 && !reloading) reloadOut();
        if (player.reloadLeft === 0 && reloading && alive && player.meleeLeft === 0) reloadIn();
        if (player.lastHurtTick !== hurtTick && player.lastHurtTick >= 0) hurt();
        if (player.onGround && !wasOnGround && player.vy < -4) land();
        if (!alive && wasAlive) death();
        if (state.waves.phase === 'active' && phase !== 'active') sting(false);
        if ((state.waves.phase === 'cleared' && phase !== 'cleared') || (state.waves.phase === 'won' && phase !== 'won')) sting(false);
        if (state.lift.open && !liftOpen) ding();
        if (state.waves.phase === 'ride' && phase !== 'ride') rumble(state.waves.timer);
        if (state.gate.closed && !gateClosed && state.gate.closedTick >= 0) gateClank();
        if (boarded > boardedCount) nailing();
        if (taken > takenCount) pickup();
        if (state.objective.done && !objectiveDone && state.objective.doneTick >= 0) {
          if (state.level.objective?.kind === 'keycard') pickup();
          else sting(false);
        }
        if (thrown > thrownCount) breakerThrow();
        if (state.objective.startedTick !== startedTick && state.objective.startedTick >= 0) powerUp();
        if (player.carrying >= 0 && carrying < 0) pickup();
        if (player.carrying < 0 && carrying >= 0 && delivered === deliveredCount) setDown();
        if (delivered > deliveredCount) nailing();
        if (state.lives < lives && state.lives < config.player.lives) sting(true);
      }
      thrownCount = thrown;
      deliveredCount = delivered;
      carrying = player.carrying;
      startedTick = state.objective.startedTick;

      // The charger hums, rising as it fills; the roof has wind; the helicopter is heard before it is seen.
      const objective = state.level.objective;
      const humming = objective?.kind === 'charge' && state.waves.phase === 'hold' && charging(state);
      const roof = state.level.theme === 'roof';
      const heli = helicopterPose(state);
      if (humming || roof || loops) {
        loops ??= startLoops();
        const t = context.currentTime;
        const progress = objective?.kind === 'charge' ? state.objective.charge / objective.seconds : 0;
        loops.hum.frequency.setTargetAtTime(55 + 55 * progress, t, 0.3);
        loops.humGain.gain.setTargetAtTime(humming && !paused ? 0.05 : 0, t, 0.2);
        loops.wind.gain.setTargetAtTime(roof && !paused ? 0.07 + 0.03 * Math.sin(t * 0.3) : 0, t, 0.5);
        const near = heli.visible ? heli.near : 0;
        loops.rotor.gain.setTargetAtTime(paused ? 0 : 0.9 * near * near, t, 0.3);
        if (heli.visible) {
          const where = place(player, heli.x, heli.z);
          loops.rotorPan.pan.setTargetAtTime(Math.max(-1, Math.min(1, where.pan)) * 0.7, t, 0.2);
        }
      }
      shotTick = player.lastShotTick;
      meleeTick = player.lastMeleeTick;
      meleeHitTick = player.lastMeleeHitTick;
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
      objectiveDone = state.objective.done;

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
