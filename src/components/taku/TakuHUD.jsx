/**
 * TakuHUD.jsx — Lapisan HUD global (di-mount di Layout):
 * latar grid + scan, ticker status, vignette, spotlight + bracket target,
 * banner bab, subtitle per kata, konfirmasi ya/tidak, kontrol presentasi,
 * boot sequence, dan shortcut keyboard.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useTakuState, getTakuState } from '../../services/takuStore';
import { answerConfirm, stopScenes, skipScene, togglePause } from '../../services/takuDirector';
import { startPresentation } from '../../services/takuScripts';
import { CoreSvg } from './TakuCore';
import GhostCursor from './GhostCursor';

function Spotlight({ target }) {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const pad = 10;
    const tick = () => {
      const el = ref.current;
      const node = target ? document.querySelector(target.selector) : null;
      if (el) {
        if (node) {
          const r = node.getBoundingClientRect();
          el.style.opacity = 1;
          el.style.left = `${r.left - pad}px`;
          el.style.top = `${r.top - pad}px`;
          el.style.width = `${r.width + pad * 2}px`;
          el.style.height = `${r.height + pad * 2}px`;
        } else {
          el.style.opacity = 0;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return (
    <div ref={ref} className="taku-spot" aria-hidden="true" style={{ opacity: 0 }}>
      <i className="tb tl" /><i className="tb tr" /><i className="tb bl" /><i className="tb br" />
      {target?.label && <span className="tl-label">{target.label}</span>}
    </div>
  );
}

function Subtitle({ subtitle }) {
  const { text, start, end } = subtitle;
  const safeEnd = Math.max(end, start);
  return (
    <div className="taku-subtitle" role="status" aria-live="polite">
      <span className="sub-tag">TAKU // NARASI</span>
      <span className="sub-done">{text.slice(0, start)}</span>
      <span className="sub-now">{text.slice(start, safeEnd)}</span>
      <span>{text.slice(safeEnd)}</span>
    </div>
  );
}

export default function TakuHUD() {
  const tk = useTakuState();

  // Shortcut keyboard
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;
      const s = getTakuState();

      if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        if (!s.presenting) startPresentation();
        return;
      }
      if (!s.presenting) return;
      if (e.key === 'Escape') { stopScenes(); return; }
      if (typing) return;
      if (s.confirm && (e.key === 'y' || e.key === 'Y')) { answerConfirm(true); return; }
      if (s.confirm && (e.key === 'n' || e.key === 'N')) { answerConfirm(false); return; }
      if (e.key === ' ') { e.preventDefault(); togglePause(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); skipScene(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const active = tk.presenting || tk.phase === 'speaking';

  return (
    <>
      {/* Latar idle — Murni animasi grid holografik & laser scanline halus */}
      <div className="taku-hud-bg" aria-hidden="true">
        <div className="taku-hud-grid" />
        <div className="taku-hud-scan" />
      </div>

      <div className={`taku-vignette ${active ? 'on' : ''}`} aria-hidden="true" />

      {tk.presenting && tk.target && <Spotlight target={tk.target} />}
      {tk.presenting && tk.chapter && (
        <div key={tk.chapter} className="taku-chapter" aria-hidden="true">{`// ${tk.chapter}`}</div>
      )}
      {tk.presenting && tk.subtitle && <Subtitle subtitle={tk.subtitle} />}

      {tk.confirm && (
        <div className="taku-confirm">
          <button type="button" onClick={() => answerConfirm(true)}>YA, SIRAM [Y]</button>
          <button type="button" className="no" onClick={() => answerConfirm(false)}>NANTI [N]</button>
        </div>
      )}

      {tk.presenting && (
        <div className="taku-controls">
          <span className="rec" />
          <span>TAKU {tk.sceneIndex}/{tk.sceneTotal}</span>
          <button type="button" onClick={togglePause}>{tk.paused ? '▶ LANJUT' : '⏸ JEDA'}</button>
          <button type="button" onClick={skipScene}>⏭ LEWATI</button>
          <button type="button" onClick={stopScenes}>⏹ STOP</button>
        </div>
      )}

      <GhostCursor />

      {tk.booting && (
        <div className="taku-boot" role="status">
          <div className="boot-core"><CoreSvg /></div>
          <div className="boot-lines">
            <div>&gt; INITIALIZING TAKU AI ...</div>
            <div>&gt; SENSOR LINK ........ OK</div>
            <div>&gt; GARDEN DATA ........ SYNCED</div>
            <div>&gt; SYSTEM NOMINAL — WELCOME</div>
          </div>
        </div>
      )}
    </>
  );
}
