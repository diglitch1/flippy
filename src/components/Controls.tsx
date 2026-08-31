import { useMemo } from 'react';
import {
  CARD_WIDTH_MAX_IN,
  CARD_WIDTH_MIN_IN,
  GUTTER_MAX_IN,
  GUTTER_MIN_IN,
  MAX_FRAMES,
  MIN_FRAMES,
  SMOOTHNESS_TIERS,
  SOFT_MAX_PAGES,
  smoothnessForFps,
} from '../constants';
import type { BindingSide, FlipbookOptions, PaperSize } from '../types';
import { computeLayout, fpsForFrameCount, recommendFrameCount } from '../lib/layout';

interface Trim {
  start: number;
  end: number;
}

interface Props {
  options: FlipbookOptions;
  onChange: (next: FlipbookOptions) => void;
  trim: Trim;
  onTrimChange: (next: Trim) => void;
  duration: number;
  aspect: number;
  busy: boolean;
  onGenerate: () => void;
}

export function Controls({ options, onChange, trim, onTrimChange, duration, aspect, busy, onGenerate }: Props) {
  const clipSeconds = Math.max(0.001, trim.end - trim.start);
  const set = <K extends keyof FlipbookOptions>(key: K, value: FlipbookOptions[K]) =>
    onChange({ ...options, [key]: value });

  const layout = useMemo(
    () => computeLayout({ ...options }, aspect),
    [options, aspect],
  );
  const effFps = fpsForFrameCount(options.frameCount, clipSeconds);
  const tier = smoothnessForFps(effFps);
  const manyPages = layout.pageCount > SOFT_MAX_PAGES;

  const maxFrames = Math.min(MAX_FRAMES, Math.max(MIN_FRAMES, Math.round(clipSeconds * 20)));

  return (
    <div className="controls">
      <div className="field">
        <label className="field__label">
          Frames <span className="field__value">{options.frameCount}</span>
          <button
            type="button"
            className="chip"
            onClick={() => set('frameCount', recommendFrameCount(clipSeconds))}
            disabled={busy}
          >
            Recommend
          </button>
        </label>
        <input
          type="range"
          min={MIN_FRAMES}
          max={maxFrames}
          value={Math.min(options.frameCount, maxFrames)}
          onChange={(e) => set('frameCount', Number(e.target.value))}
          disabled={busy}
        />
        <div className={`smoothness smoothness--${tier.label.toLowerCase()}`}>
          <strong>{tier.label}</strong> · {tier.blurb} · ~{effFps.toFixed(1)} fps
        </div>
        <ul className="smoothness__legend">
          {SMOOTHNESS_TIERS.filter((t) => isFinite(t.maxFps)).map((t) => (
            <li key={t.label}>
              <b>{t.label}</b> ≤{t.maxFps} fps
            </li>
          ))}
        </ul>
      </div>

      <div className="field">
        <label className="field__label">
          Trim <span className="field__value">{trim.start.toFixed(1)}s – {trim.end.toFixed(1)}s</span>
        </label>
        <div className="trim">
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={trim.start}
            onChange={(e) => onTrimChange({ ...trim, start: Math.min(Number(e.target.value), trim.end - 0.1) })}
            disabled={busy}
          />
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={trim.end}
            onChange={(e) => onTrimChange({ ...trim, end: Math.max(Number(e.target.value), trim.start + 0.1) })}
            disabled={busy}
          />
        </div>
      </div>

      <div className="field field--row">
        <div>
          <label className="field__label">Paper</label>
          <select value={options.paper} onChange={(e) => set('paper', e.target.value as PaperSize)} disabled={busy}>
            <option value="letter">US Letter</option>
            <option value="a4">A4</option>
          </select>
        </div>
        <div>
          <label className="field__label">Bind edge</label>
          <select
            value={options.bindingSide}
            onChange={(e) => set('bindingSide', e.target.value as BindingSide)}
            disabled={busy}
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label className="field__label">
          Card width <span className="field__value">{options.cardWidthIn.toFixed(2)} in</span>
        </label>
        <input
          type="range"
          min={CARD_WIDTH_MIN_IN}
          max={CARD_WIDTH_MAX_IN}
          step={0.05}
          value={options.cardWidthIn}
          onChange={(e) => set('cardWidthIn', Number(e.target.value))}
          disabled={busy}
        />
      </div>

      <div className="field">
        <label className="field__label">
          Binding gutter <span className="field__value">{options.gutterIn.toFixed(2)} in</span>
        </label>
        <input
          type="range"
          min={GUTTER_MIN_IN}
          max={GUTTER_MAX_IN}
          step={0.05}
          value={options.gutterIn}
          onChange={(e) => set('gutterIn', Number(e.target.value))}
          disabled={busy}
        />
        <p className="field__hint">0.5 in suits staples; 0.75 in if you glue or clip the spine.</p>
      </div>

      <div className="field">
        <label className="field__label">Title (optional)</label>
        <input
          type="text"
          value={options.title}
          placeholder="Shown on the first page"
          onChange={(e) => set('title', e.target.value)}
          disabled={busy}
          maxLength={60}
        />
      </div>

      <div className={`estimate${manyPages ? ' estimate--warn' : ''}`}>
        <strong>{layout.pageCount}</strong> page{layout.pageCount === 1 ? '' : 's'} to print ·{' '}
        <strong>{layout.cardsPerPage}</strong> cards per sheet
        {manyPages && <span className="estimate__note"> — that’s a lot of cutting; consider fewer frames.</span>}
      </div>

      <button type="button" className="btn btn--primary" onClick={onGenerate} disabled={busy}>
        {busy ? 'Working…' : 'Generate flipbook PDF'}
      </button>
    </div>
  );
}
