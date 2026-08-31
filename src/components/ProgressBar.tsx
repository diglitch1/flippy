interface Props {
  done: number;
  total: number;
  label?: string;
}

export function ProgressBar({ done, total, label }: Props) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="progress">
      <div className="progress__track">
        <div className="progress__fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="progress__label">
        {label ?? 'Capturing frames'} — {done} / {total} ({pct}%)
      </p>
    </div>
  );
}
