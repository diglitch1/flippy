import { useMemo } from 'react';
import {
  CARD_WIDTH_MAX_CM,
  CARD_WIDTH_MIN_CM,
  GUTTER_MAX_CM,
  GUTTER_MIN_CM,
  MAX_FRAMES,
  MIN_FRAMES,
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

  const layout = useMemo(() => computeLayout({ ...options }, aspect), [options, aspect]);
  const effFps = fpsForFrameCount(options.frameCount, clipSeconds);
  const tier = smoothnessForFps(effFps);
  const manyPages = layout.pageCount > SOFT_MAX_PAGES;

  const maxFrames = Math.min(MAX_FRAMES, Math.max(MIN_FRAMES, Math.round(clipSeconds * 20)));

  return (
    <div className="controls">
      {/* Frames / smoothness */}
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
        <p className="field__hint">
          How many still pictures are pulled from your clip, one per card. More frames means
          smoother motion, but more cards to print and cut.
        </p>
        <input
          type="range"
          min={MIN_FRAMES}
          max={maxFrames}
          value={Math.min(options.frameCount, maxFrames)}
          onChange={(e) => set('frameCount', Number(e.target.value))}
          disabled={busy}
        />
        <div className={`smoothness smoothness--${tier.label.toLowerCase()}`}>
          <strong>{tier.label}</strong> · {tier.blurb} · about {effFps.toFixed(1)} pictures per second
        </div>
        <ul className="smoothness__legend">
          <li>
            <b>Sketchy</b> (up to 6/s): jumpy, stop-motion look
          </li>
          <li>
            <b>Decent</b> (up to 10/s): clearly moving, slight flicker
          </li>
          <li>
            <b>Smooth</b> (12 to 15/s): fluid when you thumb it
          </li>
        </ul>
      </div>

      {/* Trim */}
      <div className="field">
        <label className="field__label">
          Trim <span className="field__value">{trim.start.toFixed(1)}s to {trim.end.toFixed(1)}s</span>
        </label>
        <p className="field__hint">Pick which part of the clip becomes the flipbook.</p>
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

      {/* Paper + bind edge */}
      <div className="field field--row">
        <div>
          <label className="field__label">Paper</label>
          <select value={options.paper} onChange={(e) => set('paper', e.target.value as PaperSize)} disabled={busy}>
            <option value="a4">A4</option>
            <option value="letter">US Letter</option>
          </select>
          <p className="field__hint">Match the paper in your printer.</p>
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
          <p className="field__hint">The edge you staple. You flip the opposite edge.</p>
        </div>
      </div>

      {/* Card width */}
      <div className="field">
        <label className="field__label">
          Card size <span className="field__value">{options.cardWidthCm.toFixed(1)} cm wide</span>
        </label>
        <p className="field__hint">
          How big each printed card is. Smaller cards fit more per page, so less paper and cutting.
        </p>
        <input
          type="range"
          min={CARD_WIDTH_MIN_CM}
          max={CARD_WIDTH_MAX_CM}
          step={0.1}
          value={options.cardWidthCm}
          onChange={(e) => set('cardWidthCm', Number(e.target.value))}
          disabled={busy}
        />
      </div>

      {/* Gutter */}
      <div className="field">
        <label className="field__label">
          Staple margin <span className="field__value">{options.gutterCm.toFixed(1)} cm</span>
        </label>
        <p className="field__hint">
          A blank strip along the bind edge so the staple does not cover the picture. About 1.3 cm
          is right for a stapler; use 2 cm or more if you glue or clip the spine.
        </p>
        <input
          type="range"
          min={GUTTER_MIN_CM}
          max={GUTTER_MAX_CM}
          step={0.1}
          value={options.gutterCm}
          onChange={(e) => set('gutterCm', Number(e.target.value))}
          disabled={busy}
        />
      </div>

      {/* Title */}
      <div className="field">
        <label className="field__label">Title (optional)</label>
        <p className="field__hint">Printed on the first page of the PDF.</p>
        <input
          type="text"
          value={options.title}
          placeholder="e.g. Grandpa's birthday"
          onChange={(e) => set('title', e.target.value)}
          disabled={busy}
          maxLength={60}
        />
      </div>

      <div className={`estimate${manyPages ? ' estimate--warn' : ''}`}>
        <strong>{layout.pageCount}</strong> page{layout.pageCount === 1 ? '' : 's'} to print ·{' '}
        <strong>{layout.cardsPerPage}</strong> cards per sheet
        {manyPages && <span className="estimate__note"> (that is a lot of cutting; consider fewer frames)</span>}
      </div>

      <button type="button" className="btn btn--primary" onClick={onGenerate} disabled={busy}>
        {busy ? 'Working...' : 'Generate flipbook PDF'}
      </button>
    </div>
  );
}
