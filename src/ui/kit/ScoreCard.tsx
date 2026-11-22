import type { CSSProperties, ReactNode } from "react";
import { Stars } from "../icons";
import "./scoreCard.css";

interface ScoreCardProps {
  title: string;
  score?: ReactNode;
  ratio?: number;
  rows: { label: string; value: ReactNode }[];
  phrases: { label: string; count: number };
  again: { label: string; subtitle?: string; run(): void };
  done: { label: string; run(): void };
  children?: ReactNode;
}

/** Keep the final value available to assistive technology throughout the visual count. */
export function ScoreNumber({ value }: { value: number }) {
  return <span className="mode-score-number" style={{ "--score-total": value } as CSSProperties}>
    <span>{value}</span><i aria-hidden="true" />
  </span>;
}

function ScoreStars({ ratio }: { ratio: number }) {
  const earned = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
  return <div className="mode-score-award" aria-hidden="true">
    <Stars n={earned} size={29} label={false} />
    {earned >= 2 && <svg className="mode-score-sparks" viewBox="0 0 180 40" fill="none" aria-hidden="true">
      <g>
        <path d="m30 6 1.6 4.4L36 12l-4.4 1.6L30 18l-1.6-4.4L24 12l4.4-1.6Z" fill="var(--gold)" />
        <path d="m14 21 5 2" stroke="var(--good)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="32" cy="30" r="2" fill="var(--warm)" />
      </g>
      <g>
        <path d="m155 20 1.5 4.5L161 26l-4.5 1.5L155 32l-1.5-4.5L149 26l4.5-1.5Z" fill="var(--good)" />
        <path d="m147 11 3-4" stroke="var(--warm)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="168" cy="16" r="2" fill="var(--gold)" />
      </g>
    </svg>}
  </div>;
}

export function ScoreCard({ title, score, ratio, rows, phrases, again, done, children }: ScoreCardProps) {
  return (
    <div className="mode-score" lang="lt">
      <section className="mode-score-card" role="dialog" aria-labelledby="mode-score-title">
        {ratio != null && Number.isFinite(ratio) && <ScoreStars ratio={ratio} />}
        <h2 id="mode-score-title">{title}</h2>
        {score != null && <strong className="mode-score-line">{score}</strong>}
        <dl>
          {rows.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          <div><dt>{phrases.label}</dt><dd>{phrases.count}</dd></div>
        </dl>
        {children}
        <div className="mode-score-actions">
          <button className="btn" onClick={again.run}>{again.label}
            {again.subtitle && <small className="mode-score-subtitle">{again.subtitle}</small>}
          </button>
          <button className="btn soft" onClick={done.run}>{done.label}</button>
        </div>
      </section>
    </div>
  );
}
