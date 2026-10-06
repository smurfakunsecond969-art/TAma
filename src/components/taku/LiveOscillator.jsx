/**
 * LiveOscillator.jsx — Telemetri Gelombang & Heartbeat Real-Time JARVIS
 *
 * Menampilkan animasi sinyal oscilloscope kontinu di bawah angka telemetri
 * yang berdenyut seakan sedang menerima paket data sensor secara live.
 */
import React from 'react';

export default function LiveOscillator({
  color = '#00FF87',
  style = {},
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '6px',
        userSelect: 'none',
        ...style,
      }}
      aria-hidden="true"
    >
      <span className="jarvis-ping-dot" style={{ background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }} />

      {/* Waveform SVG */}
      <div style={{ position: 'relative', width: '100%', height: '14px', overflow: 'hidden' }}>
        <svg
          viewBox="0 0 160 14"
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          {/* Static background grid line */}
          <line x1="0" y1="7" x2="160" y2="7" stroke={color} strokeOpacity="0.15" strokeWidth="1" strokeDasharray="2 3" />
          
          {/* Animated Sine / Oscilloscope Pulse */}
          <path
            d="M 0 7 Q 15 1, 30 7 T 60 7 T 90 1 T 105 13 T 120 7 T 160 7"
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="60 12"
            style={{
              filter: `drop-shadow(0 0 4px ${color})`,
              animation: 'jarvis-wave-pulse 2.2s ease-in-out infinite',
            }}
          />
        </svg>
      </div>
    </div>
  );
}
