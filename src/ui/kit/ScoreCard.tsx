import { useRef, type ReactNode } from "react";
import { SAY_IT_UI } from "../../content/say-it";
import { Confetti } from "../Confetti";
import { Stars } from "../icons";
import { HL, L } from "../i18n";
import "./scoreCard.css";

interface ScoreCardProps {
  said?: number;
  title: string;
  score?: ReactNode;
  ratio?: number;
  rows: { label: string; value: ReactNode }[];
  phrases?: { label: string; count: number };
  children?: ReactNode;
  /** The learner won: a burst of confetti from the title. */
  celebrate?: boolean;
}

type ScoreAction = { label: string; run(): void };
type ScoreActions = { actions: ReactNode; again?: never; done?: never }
  | { actions?: undefined; again: ScoreAction; done: ScoreAction };
export function ScoreNumber({ value }: { value: number }) {
  return <span className="mode-score-number">{value}</span>;
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

export function ScoreCard({ title, score, ratio, rows, said = 0, phrases, actions, again, done, children, celebrate }: ScoreCardProps & ScoreActions) {
  const heading = useRef<HTMLHeadingElement>(null);
  return (
    <div className="mode-score" lang={HL}>
      <section className="mode-score-card" role="dialog" aria-labelledby="mode-score-title">
        {ratio != null && Number.isFinite(ratio) && <ScoreStars ratio={ratio} />}
        <h2 id="mode-score-title" ref={heading}>{title}</h2>
        {celebrate && <Confetti from={heading} />}
        {score != null && <strong className="mode-score-line">{score}</strong>}
        <dl>
          {rows.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          {said > 0 && <div><dt>{L(SAY_IT_UI.stat)}</dt><dd>{said}</dd></div>}
          {phrases && <div><dt>{phrases.label}</dt><dd>{phrases.count}</dd></div>}
        </dl>
        {children}
        <div className="mode-score-actions">
          {again && done ? <>
            <button className="btn" onClick={again.run}>{again.label}</button>
            <button className="btn soft" onClick={done.run}>{done.label}</button>
          </> : actions}
        </div>
      </section>
    </div>
  );
}
