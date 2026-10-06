/**
 * LiveOscillator.jsx — Telemetri Gelombang & Heartbeat Real-Time JARVIS
 *
 * Menampilkan animasi sinyal oscilloscope kontinu di bawah angka telemetri
 * yang berdenyut seakan sedang menerima paket data sensor secara live.
 */
import React from 'react';

export default function LiveOscillator({
  label = 'TELEMETRY LINK',
  frequency = '915MHz',
  color = 'var(--taku-cyan, #22E4D0)',
  style = {},
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        marginTop: '6px',
        userSelect: 'none',
        ...style,
      }}
      aria-hidden="true"
    >
      {/* Waveform SVG */}
      <div style={{ position: 'relative', width: '100%', height: '16px', overflow: 'hidden' }}>
        <svg
          viewBox="0 0 160 16"
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          {/* Static background grid line */}
          <line x1="0" y1="8" x2="160" y2="8" stroke={color} strokeOpacity="0.15" strokeWidth="1" strokeDasharray="2 3" />
          
          {/* Animated Sine / Oscilloscope Pulse */}
          <path
            d="M 0 8 Q 15 2, 30 8 T 60 8 T 90 2 T 105 14 T 120 8 T 160 8"
            fill="none"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="60 12"
            style={{
              animation: 'jarvis-wave-pulse 2.2s ease-in-out infinite',
            }}
          />
        </svg>
      </div>

      {/* Mini Telemetry Status Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '9px',
          fontFamily: "'JetBrains Mono', 'Consolas', monospace",
          color: 'var(--color-text-muted, #64748B)',
          letterSpacing: '0.04em',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span className="jarvis-ping-dot" />
          <span style={{ color: color, fontWeight: 700 }}>{label}</span>
        </span>
        <span style={{ opacity: 0.75 }}>{frequency}</span>
      </div>
    </div>
  );
}
