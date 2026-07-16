import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './HowItWorks.css';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    title: 'Fotografe e anuncie',
    text: 'Em menos de 1 minuto: título, categoria e se é doação ou venda. Pronto.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 7l1.2-2h5.6L16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="12" cy="13.5" r="3.5" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    title: 'Combine a entrega',
    text: 'Vocês já estão no mesmo campus — combine o ponto de encontro entre aulas.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 21s-6.5-4.3-6.5-10a6.5 6.5 0 0 1 13 0c0 5.7-6.5 10-6.5 10z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    title: 'O ciclo continua',
    text: 'Um item ganha nova vida, alguém economiza e o campus desperdiça menos.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 17a7 7 0 0 1 12-5M17 7a7 7 0 0 1-12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 4l2.5 3.5L14.5 9M8 20l-2.5-3.5L9.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  const scope = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.how-step', {
          autoAlpha: 0,
          y: 36,
          duration: 0.6,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: { trigger: scope.current, start: 'top 75%', once: true },
        });
      });
    }, scope);
    return () => ctx.revert();
  }, []);

  return (
    <section className="how" ref={scope} aria-labelledby="how-title">
      <div className="container">
        <h2 id="how-title">Como funciona</h2>
        <div className="how-grid">
          {steps.map((step, i) => (
            <article className="how-step" key={step.title}>
              <span className="how-num" aria-hidden="true">
                {i + 1}
              </span>
              <span className="how-icon">{step.icon}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>

        <div className="how-cta">
          <p>Seu armário agradece. O campus também.</p>
          <Link to="/anunciar" className="btn btn-primary">
            Começar a desapegar
          </Link>
        </div>
      </div>
    </section>
  );
}
