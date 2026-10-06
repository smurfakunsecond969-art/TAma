/**
 * JarvisReticle.jsx — Cincin Kalibrasi Holografik & Radar Sweep JARVIS
 *
 * Komponen SVG yang ditempatkan di sekeliling gauge/lingkaran (Skor Kebun,
 * Gauge Kelembaban, Radial Chart) yang berputar halus dan memancarkan
 * sapuan radar 360° secara terus menerus (idle animation).
 */
import React from 'react';

export default function JarvisReticle({
  size = 120,
  color = 'var(--taku-cyan, #22E4D0)',
  radar = true,
  style = {},
}) {
  const center = size / 2;
  const rOuter = center - 2;
  const rMiddle = center - 8;
  const rInner = center - 14;

  return (
    <div
      className="jarvis-reticle-container"
      style={{
        position: 'absolute',
        inset: `-${(size - 88) / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        pointerEvents: 'none',
        zIndex: 0,
        ...style,
      }}
      aria-hidden="true"
    >
      {/* Radar sweep light effect */}
      {radar && (
        <div
          style={{
            position: 'absolute',
            inset: `${center - rMiddle}px`,
            width: `${rMiddle * 2}px`,
            height: `${rMiddle * 2}px`,
            borderRadius: '50%',
            background: `conic-gradient(from 0deg, transparent 70%, rgba(34, 228, 208, 0.18) 100%)`,
            animation: 'jarvis-radar-sweep 8s linear infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
      >
        {/* Outer tick ring (putar searah jarum jam perlahan) */}
        <g
          style={{
            transformOrigin: `${center}px ${center}px`,
            animation: 'taku-ring-cw 36s linear infinite',
          }}
        >
          <circle
            cx={center}
            cy={center}
            r={rOuter}
            fill="none"
            stroke={color}
            strokeOpacity="0.4"
            strokeWidth="1.5"
            strokeDasharray="2 8"
          />
        </g>

        {/* Middle segmented calibration ring (putar berlawanan arah) */}
        <g
          style={{
            transformOrigin: `${center}px ${center}px`,
            animation: 'taku-ring-ccw 24s linear infinite',
          }}
        >
          <circle
            cx={center}
            cy={center}
            r={rMiddle}
            fill="none"
            stroke={color}
            strokeOpacity="0.35"
            strokeWidth="1"
            strokeDasharray="24 16 8 16"
          />
          {/* 4 cardinal points (0°, 90°, 180°, 270°) */}
          <circle cx={center} cy={center - rMiddle} r="1.8" fill={color} opacity="0.8" />
          <circle cx={center + rMiddle} cy={center} r="1.8" fill={color} opacity="0.8" />
          <circle cx={center} cy={center + rMiddle} r="1.8" fill={color} opacity="0.8" />
          <circle cx={center - rMiddle} cy={center} r="1.8" fill={color} opacity="0.8" />
        </g>

        {/* Inner subtle orbit halo */}
        <circle
          cx={center}
          cy={center}
          r={rInner}
          fill="none"
          stroke={color}
          strokeOpacity="0.15"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
