/* =========================================================
   Speedway Empire 3D — geometria toru
   Owal: dwie proste i dwa łuki (półokręgi). Jazda w lewo
   (przeciwnie do ruchu wskazówek zegara, patrząc z góry).
   s — odległość od linii startu (środek prostej startowej), w metrach
   d — przesunięcie w bok od linii środkowej (+ na zewnątrz, − do krawężnika)
   Oś Y w górę, tor leży w płaszczyźnie XZ.
   ========================================================= */
'use strict';

const Track = {
  STRAIGHT: 72,   // długość prostej [m]
  R: 32,          // promień łuku po linii środkowej [m]
  HALF: 6,        // pół szerokości toru [m]
  L: 0,

  /** Geometria konkretnego stadionu (prosta i promień łuku) */
  set(straight, R) { this.STRAIGHT = straight; this.R = R; return this.init(); },

  init() {
    this.L = 2 * this.STRAIGHT + 2 * Math.PI * this.R; // ≈ 345 m
    this.B1 = this.STRAIGHT / 2;                        // początek 1. łuku
    this.B1E = this.B1 + Math.PI * this.R;              // koniec 1. łuku
    this.B2 = this.B1E + this.STRAIGHT;                 // początek 2. łuku
    this.B2E = this.B2 + Math.PI * this.R;              // koniec 2. łuku
    return this;
  },

  /** Punkt na linii środkowej: pozycja, styczna, czy łuk */
  frame(sRaw) {
    const S = this.STRAIGHT, R = this.R;
    let s = ((sRaw % this.L) + this.L) % this.L;
    if (s < this.B1) return { x: s, z: R, tx: 1, tz: 0, bend: 0 };
    if (s < this.B1E) {
      const f = (s - this.B1) / R;
      return { x: S / 2 + R * Math.sin(f), z: R * Math.cos(f), tx: Math.cos(f), tz: -Math.sin(f), bend: 1 };
    }
    if (s < this.B2) return { x: S / 2 - (s - this.B1E), z: -R, tx: -1, tz: 0, bend: 0 };
    if (s < this.B2E) {
      const f = Math.PI + (s - this.B2) / R;
      return { x: -S / 2 + R * Math.sin(f), z: R * Math.cos(f), tx: Math.cos(f), tz: -Math.sin(f), bend: 2 };
    }
    return { x: -S / 2 + (s - this.B2E), z: R, tx: 1, tz: 0, bend: 0 };
  },

  /** Pozycja w świecie dla (s, d); wektor na zewnątrz = (−tz, tx) */
  pos(s, d) {
    const f = this.frame(s);
    return { x: f.x - f.tz * d, z: f.z + f.tx * d, f };
  },

  inBend(s) { return this.frame(s).bend > 0; },

  /** Numer łuku (1–4) liczony od startu: 1., 2. łuk w każdym okrążeniu */
  bendIndex(s) {
    const lap = Math.floor(s / this.L);
    const b = this.frame(s).bend;
    return b ? lap * 2 + b : 0;
  },
};
Track.init();
