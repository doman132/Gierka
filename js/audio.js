/* =========================================================
   Speedway Empire 3D — dźwięk (Web Audio, bez plików)
   Silnik: jednocylindrowy 500 cm³ na metanolu — piłokształtne
   oscylatory z przesterem i filtrem, wysokość rośnie z prędkością,
   głośność maleje z odległością od kamery. Trybuny: szum
   filtrowany pasmowo, głośniejszy, gdy robi się gorąco;
   wiwaty po wygranym biegu. Dźwięk startuje po pierwszym
   kliknięciu (wymóg przeglądarek).
   ========================================================= */
'use strict';

const Sound = {
  ctx: null, on: true, master: null, engines: {}, crowdGain: null,

  unlock() {
    if (Sound.ctx || !window.AudioContext && !window.webkitAudioContext) return;
    try {
      const C = Sound.ctx = new (window.AudioContext || window.webkitAudioContext)();
      Sound.master = C.createGain(); Sound.master.gain.value = Sound.on ? 0.7 : 0; Sound.master.connect(C.destination);
      // szum do trybun i wiwatów
      const len = C.sampleRate * 2, buf = C.createBuffer(1, len, C.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      Sound.noise = buf;
      const src = C.createBufferSource(); src.buffer = buf; src.loop = true;
      const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.6;
      Sound.crowdGain = C.createGain(); Sound.crowdGain.gain.value = 0.05;
      src.connect(bp).connect(Sound.crowdGain).connect(Sound.master); src.start();
      // przester dla „chropowatego” brzmienia silnika
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 3.5); }
      Sound.curve = curve;
    } catch (e) { Sound.ctx = null; }
  },

  toggle() {
    Sound.on = !Sound.on;
    if (Sound.master) Sound.master.gain.setTargetAtTime(Sound.on ? 0.7 : 0, Sound.ctx.currentTime, 0.05);
    return Sound.on;
  },

  engine(id) {
    const C = Sound.ctx;
    const o1 = C.createOscillator(); o1.type = 'sawtooth';
    const o2 = C.createOscillator(); o2.type = 'square';
    const sh = C.createWaveShaper(); sh.curve = Sound.curve;
    const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 2;
    const g = C.createGain(); g.gain.value = 0;
    const g2 = C.createGain(); g2.gain.value = 0.35;
    o1.connect(sh); o2.connect(g2).connect(sh); sh.connect(lp).connect(g).connect(Sound.master);
    o1.start(); o2.start();
    return (Sound.engines[id] = { o1, o2, lp, g });
  },

  startRace(riders) {
    Sound.unlock();
    if (!Sound.ctx) return;
    Sound.stopRace();
    riders.forEach(x => Sound.engine(x.id));
  },

  stopRace() {
    Object.values(Sound.engines).forEach(e => { try { e.g.gain.setTargetAtTime(0, Sound.ctx.currentTime, 0.2); e.o1.stop(Sound.ctx.currentTime + 1); e.o2.stop(Sound.ctx.currentTime + 1); } catch (err) { /* już zatrzymany */ } });
    Sound.engines = {};
  },

  /** Co klatkę: obroty i głośność każdego silnika, szum trybun */
  update(st, camPos, excitement) {
    if (!Sound.ctx) return;
    const now = Sound.ctx.currentTime;
    st.riders.forEach(x => {
      const e = Sound.engines[x.id];
      if (!e) return;
      const p = Track.pos(x.s, x.d);
      const dist = Math.hypot(p.x - camPos.x, p.z - camPos.z, camPos.y);
      const running = x.status === 'race' || x.status === 'done';
      // na taśmie silniki „grzeją się” na wysokich obrotach
      const rev = !x.moving && running ? 0.55 + Math.sin(now * 9 + x.gate) * 0.08 : Math.min(1, x.v / 30);
      const f = 42 + rev * 105 + (x.acc > 3 ? 8 : 0);
      e.o1.frequency.setTargetAtTime(f, now, 0.05);
      e.o2.frequency.setTargetAtTime(f * 2.01, now, 0.05);
      e.lp.frequency.setTargetAtTime(600 + rev * 2400, now, 0.08);
      const vol = running && x.status !== 'done' ? 0.28 / (1 + dist / 12) : 0.02 / (1 + dist / 12);
      e.g.gain.setTargetAtTime(vol, now, 0.08);
    });
    Sound.crowdGain.gain.setTargetAtTime(0.04 + excitement * 0.1, now, 0.4);
  },

  /** Wiwaty: narastający i opadający szum trybun */
  cheer() {
    if (!Sound.ctx) return;
    const C = Sound.ctx, src = C.createBufferSource(); src.buffer = Sound.noise;
    const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1000; bp.Q.value = 0.4;
    const g = C.createGain(); const t = C.currentTime;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.4); g.gain.linearRampToValueAtTime(0, t + 3.5);
    src.connect(bp).connect(g).connect(Sound.master); src.start(); src.stop(t + 3.6);
  },

  /** Stuk taśmy startowej */
  tape() {
    if (!Sound.ctx) return;
    const C = Sound.ctx, o = C.createOscillator(), g = C.createGain(), t = C.currentTime;
    o.type = 'square'; o.frequency.value = 180;
    g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g).connect(Sound.master); o.start(); o.stop(t + 0.13);
  },
};
