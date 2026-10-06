/**
 * TakuCore.jsx — Inti animasi Taku (ring berputar, halo, partikel orbit).
 * Murni SVG + CSS. Fase menentukan kecepatan & warna; `pulse` memberi denyut per kata.
 */
import React from 'react';

export function CoreSvg() {
  return (
    <svg viewBox="0 0 130 130" aria-hidden="true">
      {/* halo */}
      <circle className="tc-halo" cx="65" cy="65" r="50" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="6" />
      {/* tick ring */}
      <g className="tc-spin tc-c">
        <circle cx="65" cy="65" r="62" fill="none" stroke="currentColor" strokeOpacity=".55" strokeWidth="2" strokeDasharray="1 6" />
      </g>
      {/* arc ring A */}
      <g className="tc-spin tc-a">
        <circle cx="65" cy="65" r="57" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="70 30 12 40 28 20" strokeOpacity=".9" />
      </g>
      {/* arc ring B (berlawanan) */}
      <g className="tc-spin tc-b">
        <circle cx="65" cy="65" r="50" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="40 22 8 30" strokeOpacity=".7" />
      </g>
      {/* partikel orbit */}
      <g className="tc-spin tc-orbit">
        <circle cx="65" cy="4" r="2.6" fill="currentColor" />
      </g>
      <g className="tc-spin tc-orbit-2">
        <circle cx="65" cy="126" r="2" fill="currentColor" fillOpacity=".8" />
      </g>
    </svg>
  );
}

/**
 * @param {string} phase   idle | listening | processing | speaking
 * @param {number} pulse   counter yang naik tiap kata
 * @param {number} size    px
 */
export default function TakuCore({ phase = 'idle', pulse = 0, size = 130, style }) {
  const beat = phase === 'speaking' ? 1 + (pulse % 2) * 0.07 : 1;
  const offset = -(size - 78) / 2;
  return (
    <div
      className="taku-core"
      data-phase={phase}
      style={{ width: size, height: size, left: offset, top: offset, transform: `scale(${beat})`, ...style }}
    >
      <CoreSvg />
    </div>
  );
}
