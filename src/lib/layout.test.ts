import { describe, expect, it } from 'vitest';
import {
  computeLayout,
  fpsForFrameCount,
  recommendFrameCount,
  sampleTimestamps,
} from './layout';
import type { FlipbookOptions } from '../types';
import { MAX_CARD_HEIGHT_CM, MAX_FRAMES, MIN_FRAMES, OUTER_MARGIN_CM, PAPER_SIZES } from '../constants';

const baseOpts = (over: Partial<FlipbookOptions> = {}): FlipbookOptions => ({
  frameCount: 48,
  paper: 'letter',
  cardWidthCm: 6,
  gutterCm: 1.3,
  bindingSide: 'left',
  jpegQuality: 0.85,
  includeCover: false,
  title: '',
  credits: '',
  ...over,
});

describe('computeLayout', () => {
  it('lays out a landscape 16:9 clip with multiple cards per page', () => {
    const l = computeLayout(baseOpts(), 16 / 9);
    expect(l.cols).toBeGreaterThanOrEqual(2);
    expect(l.rows).toBeGreaterThanOrEqual(2);
    expect(l.cardsPerPage).toBe(l.cols * l.rows);
    expect(l.slots).toHaveLength(l.cardsPerPage);
  });

  it('derives page count from frame count and cards per page', () => {
    const l = computeLayout(baseOpts({ frameCount: 50 }), 16 / 9);
    expect(l.pageCount).toBe(Math.ceil(50 / l.cardsPerPage));
  });

  it('places the gutter on the bound (left) edge and the image to its right', () => {
    const l = computeLayout(baseOpts({ bindingSide: 'left', gutterCm: 1.3 }), 16 / 9);
    const s = l.slots[0];
    // Image starts a full gutter in from the card's left edge.
    expect(s.imgX - s.cardX).toBeCloseTo(1.3, 5);
    // Image right edge stays inside the card.
    expect(s.imgX + s.imgW).toBeLessThanOrEqual(s.cardX + s.cardW + 1e-9);
  });

  it('mirrors the gutter to the right edge for right binding', () => {
    const l = computeLayout(baseOpts({ bindingSide: 'right' }), 16 / 9);
    const s = l.slots[0];
    const rightGap = s.cardX + s.cardW - (s.imgX + s.imgW);
    expect(rightGap).toBeGreaterThan(1.0); // gutter + safe margin on the right
    expect(s.imgX - s.cardX).toBeCloseTo(0.25, 5); // only safe margin on the left
  });

  it('caps card height for very tall portrait clips (letterboxes instead of stretching)', () => {
    const l = computeLayout(baseOpts({ cardWidthCm: 10 }), 9 / 16);
    expect(l.imgH).toBeLessThanOrEqual(MAX_CARD_HEIGHT_CM + 1e-9);
    // Aspect ratio is preserved after the height cap.
    expect(l.imgW / l.imgH).toBeCloseTo(9 / 16, 3);
  });

  it('keeps every card inside the printable area', () => {
    const l = computeLayout(baseOpts(), 16 / 9);
    const last = l.slots[l.slots.length - 1];
    expect(last.cardX).toBeGreaterThanOrEqual(OUTER_MARGIN_CM - 1e-9);
    expect(last.cardX + l.cardW).toBeLessThanOrEqual(PAPER_SIZES.letter.wCm - OUTER_MARGIN_CM + 1e-9);
    expect(last.cardY + l.cardH).toBeLessThanOrEqual(PAPER_SIZES.letter.hCm - OUTER_MARGIN_CM + 1e-9);
  });

  it('produces a different grid for A4 vs Letter', () => {
    const letter = computeLayout(baseOpts(), 16 / 9);
    const a4 = computeLayout(baseOpts({ paper: 'a4' }), 16 / 9);
    // A4 is narrower and taller than Letter, so at least one grid dimension differs.
    expect(letter.cols !== a4.cols || letter.rows !== a4.rows).toBe(true);
  });
});

describe('recommendFrameCount', () => {
  it('scales with duration at the default fps', () => {
    expect(recommendFrameCount(4, 10)).toBe(40);
    expect(recommendFrameCount(2, 8)).toBe(16);
  });
  it('clamps to the sane frame bounds', () => {
    expect(recommendFrameCount(0.1, 10)).toBe(MIN_FRAMES);
    expect(recommendFrameCount(600, 20)).toBe(MAX_FRAMES);
  });
});

describe('fpsForFrameCount', () => {
  it('inverts frame count over duration', () => {
    expect(fpsForFrameCount(40, 4)).toBe(10);
  });
  it('is zero for a zero-length clip', () => {
    expect(fpsForFrameCount(40, 0)).toBe(0);
  });
});

describe('sampleTimestamps', () => {
  it('returns evenly spaced timestamps within the range', () => {
    const ts = sampleTimestamps(4, 0, 4);
    expect(ts).toHaveLength(4);
    expect(ts[0]).toBe(0);
    expect(ts[1]).toBeCloseTo(1, 5);
    expect(ts.every((t) => t >= 0 && t < 4 + 1e-9)).toBe(true);
  });
  it('handles a single frame', () => {
    expect(sampleTimestamps(1, 2, 5)).toEqual([2]);
  });
});
