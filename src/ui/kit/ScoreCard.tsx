import type { ReactNode } from "react";
import { HL } from "../i18n";
import "./scoreCard.css";

interface ScoreCardProps {
  title: string;
  score: ReactNode;
  rows: { label: string; value: ReactNode }[];
  phrases: { label: string; count: number };
  again: { label: string; run(): void };
  done: { label: string; run(): void };
  children?: ReactNode;
}

export function ScoreCard({ title, score, rows, phrases, again, done, children }: ScoreCardProps) {
  return (
    <div className="mode-score" lang={HL}>
      <section className="mode-score-card" role="dialog" aria-labelledby="mode-score-title">
        <h2 id="mode-score-title">{title}</h2>
        <strong className="mode-score-line">{score}</strong>
        <dl>
          {rows.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          <div><dt>{phrases.label}</dt><dd>{phrases.count}</dd></div>
        </dl>
        {children}
        <div className="mode-score-actions">
          <button className="btn" onClick={again.run}>{again.label}</button>
          <button className="btn soft" onClick={done.run}>{done.label}</button>
        </div>
      </section>
    </div>
  );
}
