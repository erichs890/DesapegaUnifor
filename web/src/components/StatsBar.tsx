import { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';
import { getStats } from '../lib/api';
import type { Stats } from '../lib/types';
import { prefersReducedMotion } from '../hooks/useReducedMotion';
import './StatsBar.css';

interface StatDef {
  key: keyof Stats;
  label: string;
  suffix?: string;
}

const DEFS: StatDef[] = [
  { key: 'itens_anunciados', label: 'itens anunciados' },
  { key: 'doacoes', label: 'doações no campus' },
  { key: 'estudantes_ativos', label: 'estudantes ativos' },
  { key: 'co2_evitado_kg', label: 'de CO₂ evitado', suffix: ' kg' },
];

/**
 * Prova social com count-up (anime.js): os números sobem quando a faixa
 * entra no viewport — movimento a serviço do engajamento, uma única vez.
 */
export function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const played = useRef(false);

  useEffect(() => {
    getStats()
      .then((r) => setStats(r.stats))
      .catch(() => setStats(null));
  }, []);

  useEffect(() => {
    if (!stats || !ref.current) return;
    const section = ref.current;

    // Movimento reduzido: os valores finais já estão renderizados — nada a fazer.
    if (prefersReducedMotion()) return;

    const run = () => {
      if (played.current) return;
      played.current = true;
      const nodes = section.querySelectorAll<HTMLElement>('[data-count]');
      nodes.forEach((node) => {
        const target = Number(node.dataset.count);
        const suffix = node.dataset.suffix ?? '';
        const counter = { v: 0 };
        animate(counter, {
          v: target,
          duration: 1400,
          ease: 'outExpo',
          onUpdate: () => {
            node.textContent = `${Math.round(counter.v).toLocaleString('pt-BR')}${suffix}`;
          },
        });
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          run();
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [stats]);

  if (!stats) return null;

  return (
    <section className="stats" aria-label="Estatísticas da plataforma" ref={ref}>
      <div className="container stats-grid">
        {DEFS.map((def) => (
          <div key={def.key} className="stat">
            {/* Valor final renderizado de imediato (legível sem JS de animação);
                o count-up zera e anima apenas quando houver movimento permitido */}
            <strong data-count={stats[def.key]} data-suffix={def.suffix ?? ''}>
              {stats[def.key].toLocaleString('pt-BR')}
              {def.suffix ?? ''}
            </strong>
            <span>{def.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
