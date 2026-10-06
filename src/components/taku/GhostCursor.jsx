/**
 * GhostCursor.jsx — Kursor Taku yang terbang ke elemen target saat Taku
 * menjelaskan. Posisi disimpan di variabel modul agar tidak "loncat" saat
 * Layout di-mount ulang karena pindah halaman.
 */
import React, { useEffect, useRef } from 'react';
import { useTakuState } from '../../services/takuStore';

let pos = {
  x: typeof window !== 'undefined' ? window.innerWidth - 70 : 0,
  y: typeof window !== 'undefined' ? window.innerHeight - 110 : 0,
};

export default function GhostCursor() {
  const { target, presenting, clickPulse } = useTakuState();
  const ref = useRef(null);
  const initialClick = useRef(clickPulse);

  useEffect(() => {
    if (!presenting) return undefined;
    let raf;
    const tick = () => {
      let tx = window.innerWidth - 70;
      let ty = window.innerHeight - 110; // pulang ke tombol Taku
      if (target) {
        const el = document.querySelector(target.selector);
        if (el) {
          const r = el.getBoundingClientRect();
          tx = r.left + r.width / 2;
          ty = r.top + r.height / 2;
        }
      }
      pos.x += (tx - pos.x) * 0.085;
      pos.y += (ty - pos.y) * 0.085;
      if (ref.current) ref.current.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [presenting, target]);

  return (
    <div
      ref={ref}
      className="taku-ghost"
      aria-hidden="true"
      style={{ opacity: presenting && target ? 1 : 0, transform: `translate(${pos.x}px, ${pos.y}px)` }}
    >
      <svg width="26" height="30" viewBox="0 0 26 30" fill="none">
        <path d="M3 2 L3 22 L8.5 17.5 L12.5 26 L16 24.5 L12 16.2 L19 15.8 Z" fill="#22E4D0" stroke="#04201B" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
      {clickPulse !== initialClick.current && <span key={clickPulse} className="ghost-ring" />}
    </div>
  );
}
