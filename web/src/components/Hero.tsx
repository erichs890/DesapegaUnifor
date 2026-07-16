import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import './Hero.css';

/**
 * Entrada orquestrada com gsap.timeline: badge → título (2 linhas com
 * clip) → subtítulo → CTAs → cartões flutuantes. Cada elemento entra
 * em sequência para construir hierarquia de leitura (F-pattern).
 * prefers-reduced-motion desativa tudo via gsap.matchMedia.
 */
export function Hero() {
  const scope = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.from('.hero-badge', { y: 16, autoAlpha: 0, duration: 0.5 })
          .from('.hero-title .line-inner', { yPercent: 110, duration: 0.8, stagger: 0.12 }, '-=0.25')
          .from('.hero-sub', { y: 20, autoAlpha: 0, duration: 0.6 }, '-=0.45')
          .from('.hero-ctas > *', { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.08 }, '-=0.35')
          .from('.hero-card', { y: 40, autoAlpha: 0, scale: 0.92, duration: 0.7, stagger: 0.1, ease: 'expo.out' }, '-=0.5');

        // Flutuação contínua e sutil dos cartões (profundidade, não distração)
        gsap.to('.hero-card--a', { y: -10, duration: 3.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
        gsap.to('.hero-card--b', { y: 10, duration: 3.8, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.4 });
      });

      // Parallax de ponteiro: os cartões acompanham o mouse em profundidades
      // diferentes (desktop com ponteiro fino; nunca com movimento reduzido)
      mm.add('(prefers-reduced-motion: no-preference) and (hover: hover) and (min-width: 1024px)', () => {
        const el = scope.current!;
        const moveA = { x: gsap.quickTo('.hero-card--a', 'x', { duration: 0.6, ease: 'power3.out' }), y: gsap.quickTo('.hero-card--a', 'yPercent', { duration: 0.6, ease: 'power3.out' }) };
        const moveB = { x: gsap.quickTo('.hero-card--b', 'x', { duration: 0.8, ease: 'power3.out' }), y: gsap.quickTo('.hero-card--b', 'yPercent', { duration: 0.8, ease: 'power3.out' }) };
        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const nx = (e.clientX - r.left) / r.width - 0.5;
          const ny = (e.clientY - r.top) / r.height - 0.5;
          moveA.x(nx * 22);
          moveA.y(ny * 6);
          moveB.x(nx * -16);
          moveB.y(ny * -5);
        };
        el.addEventListener('pointermove', onMove);
        return () => el.removeEventListener('pointermove', onMove);
      });

      // Fallback sem movimento: garante que nada fique invisível
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('.hero-badge, .hero-sub, .hero-ctas > *, .hero-card', { clearProps: 'all' });
      });
    }, scope);

    return () => ctx.revert();
  }, []);

  return (
    <section className="hero" ref={scope} aria-labelledby="hero-title">
      <div className="container hero-inner">
        <div className="hero-copy">
          <p className="hero-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 17a7 7 0 0 1 12-5M17 7a7 7 0 0 1-12 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M16 4l2.5 3.5L14.5 9M8 20l-2.5-3.5L9.5 15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Economia circular no campus
          </p>

          <h1 className="hero-title" id="hero-title">
            <span className="line"><span className="line-inner">O que você não usa,</span></span>
            <span className="line"><span className="line-inner text-gradient">move a jornada de alguém.</span></span>
          </h1>

          <p className="hero-sub">
            Doe ou venda livros, calculadoras, jalecos e móveis para quem está chegando na
            universidade. Menos desperdício, mais acesso — direto entre estudantes.
          </p>

          <div className="hero-ctas">
            <Link to="/anunciar" className="btn btn-primary">
              Anunciar um item
            </Link>
            <a href="#vitrine" className="btn btn-secondary">
              Explorar itens
            </a>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="hero-card hero-card--a">
            <span className="hero-card-emoji-swap">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M4 19V6a2 2 0 0 1 2-2h13v13H6.5A2.5 2.5 0 0 0 4 19.5V19z" stroke="var(--color-primary)" strokeWidth="2" strokeLinejoin="round" />
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H19v3H6.5A2.5 2.5 0 0 1 4 19.5z" stroke="var(--color-primary)" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </span>
            <strong>Cálculo Vol. 1</strong>
            <span className="hero-card-badge doacao">Doação</span>
          </div>
          <div className="hero-card hero-card--b">
            <span className="hero-card-emoji-swap">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="3" width="14" height="18" rx="2.5" stroke="var(--color-accent)" strokeWidth="2" />
                <path d="M8.5 7h7M8.5 11h2.5M13.5 11h2M8.5 14.5h2.5M13.5 14.5h2M8.5 18h2.5" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <strong>HP 50g</strong>
            <span className="hero-card-badge venda">R$ 180</span>
          </div>
          <div className="hero-blob" />
          <div className="hero-ring" />
        </div>
      </div>
    </section>
  );
}
