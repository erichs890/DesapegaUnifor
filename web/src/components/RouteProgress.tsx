import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { prefersReducedMotion } from '../hooks/useReducedMotion';

/**
 * Barra fina no topo (estilo YouTube): varre a cada troca de rota,
 * comunicando que a navegação aconteceu mesmo quando a página monta rápido.
 */
export function RouteProgress() {
  const { pathname } = useLocation();
  const barRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const bar = barRef.current;
    if (!bar || prefersReducedMotion()) return;
    gsap.killTweensOf(bar);
    gsap.fromTo(
      bar,
      { scaleX: 0, autoAlpha: 1 },
      {
        scaleX: 1,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => gsap.to(bar, { autoAlpha: 0, duration: 0.2 }),
      }
    );
  }, [pathname]);

  return (
    <div
      ref={barRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))',
        transformOrigin: 'left',
        transform: 'scaleX(0)',
        opacity: 0,
        zIndex: 'var(--z-modal)' as unknown as number,
        pointerEvents: 'none',
      }}
    />
  );
}
