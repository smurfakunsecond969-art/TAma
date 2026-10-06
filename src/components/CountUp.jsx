import React, { useState, useEffect, useRef } from 'react';

/**
 * CountUp Component
 * Animates a numeric value from `from` (default 0) to `to` over `duration` ms.
 * Supports cubic easing, optional viewport triggering via IntersectionObserver,
 * and custom formatting (prefix, suffix, decimals).
 */
export default function CountUp({
  to,
  from = 0,
  duration = 900,
  prefix = '',
  suffix = '',
  decimals = 0,
  triggerOnView = false,
  fallback = '--',
  className = '',
  style = {},
}) {
  const [val, setVal] = useState(typeof to === 'number' && !isNaN(to) ? from : fallback);
  const elementRef = useRef(null);
  const [hasStarted, setHasStarted] = useState(!triggerOnView);

  useEffect(() => {
    if (!triggerOnView) {
      setHasStarted(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [triggerOnView]);

  useEffect(() => {
    if (!hasStarted) return;
    if (to === null || to === undefined || isNaN(to)) {
      setVal(fallback);
      return;
    }

    const target = Number(to);
    const startVal = Number(from);
    let startTimestamp = null;
    let animFrameId = null;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(1, elapsed / duration);
      // Cubic ease-out: 1 - (1 - t)^3
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (target - startVal) * easeProgress;

      if (decimals > 0) {
        setVal(current.toFixed(decimals));
      } else {
        setVal(Math.round(current));
      }

      if (progress < 1) {
        animFrameId = requestAnimationFrame(step);
      } else {
        setVal(decimals > 0 ? target.toFixed(decimals) : target);
      }
    };

    animFrameId = requestAnimationFrame(step);
    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [to, from, duration, decimals, hasStarted, fallback]);

  if (to === null || to === undefined || isNaN(to)) {
    return <span ref={elementRef} className={className} style={style}>{fallback}</span>;
  }

  return (
    <span ref={elementRef} className={className} style={style}>
      {prefix}{val}{suffix}
    </span>
  );
}
