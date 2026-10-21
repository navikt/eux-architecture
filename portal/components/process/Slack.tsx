import type { CSSProperties, ReactNode } from "react";

/** Inline code as Slack renders it. */
export function SlackCode({ children }: { children: ReactNode }) {
  return <code className="proc-slack__code">{children}</code>;
}

/** One message from an EUX app, styled like Slack. */
export function SlackMessage({ app, time, style, children }: { app: string; time: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className="proc-slack__msg" style={style}>
      <span className="proc-slack__avatar" aria-hidden>
        EUX
      </span>
      <div className="proc-slack__body">
        <div className="proc-slack__meta">
          <strong>{app}</strong>
          <span className="proc-slack__app">APP</span>
          <span className="arch-subtle">{time}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

/** A Slack mock: one or more `SlackMessage`s with a caption under them. */
export function SlackFigure({ caption, className, children }: { caption: ReactNode; className?: string; children: ReactNode }) {
  return (
    <figure className={className ? `proc-slack ${className}` : "proc-slack"}>
      {children}
      <figcaption className="arch-subtle">{caption}</figcaption>
    </figure>
  );
}
