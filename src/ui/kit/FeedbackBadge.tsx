import type { ReactNode } from "react";
import { Icon } from "../icons";
import "./feedbackBadge.css";

export function FeedbackBadge({ correct, children, label }: {
  correct: boolean;
  children?: ReactNode;
  label?: string;
}) {
  return <span className="kit-feedback" data-feedback={correct ? "right" : "retry"}>
    <Icon name={correct ? "check" : "restart"} size={16} strokeWidth={2.4} label={label} />
    {children}
  </span>;
}
