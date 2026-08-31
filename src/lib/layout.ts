import {
  CARD_WIDTH_MAX_IN,
  CARD_WIDTH_MIN_IN,
  DEFAULT_FPS,
  GUTTER_MAX_IN,
  GUTTER_MIN_IN,
  MAX_CARD_HEIGHT_IN,
  MAX_FRAMES,
  MIN_FRAMES,
  OUTER_MARGIN_IN,
  PAPER_SIZES,
  SAFE_MARGIN_IN,
} from '../constants';
import type { BindingSide, CardSlot, FlipbookOptions, Layout } from '../types';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const isHorizontalBinding = (side: BindingSide) => side === 'left' || side === 'right';

/**
 * Width (inches) available for the image inside the requested outer card width.
 * On a horizontal bind the gutter eats into width; otherwise only safe margins do.
 */
function availableImageWidth(cardWidthIn: number, gutterIn: number, side: BindingSide): number {
  const freeWidth = isHorizontalBinding(side)
    ? cardWidthIn - gutterIn - SAFE_MARGIN_IN
    : cardWidthIn - 2 * SAFE_MARGIN_IN;
  return Math.max(0.1, freeWidth);
}

/**
 * Full flipbook layout for the given options and source video aspect ratio.
 * All geometry is in inches with origin at the page's top-left corner.
 */
export function computeLayout(opts: FlipbookOptions, videoAspect: number): Layout {
  const aspect = videoAspect > 0 ? videoAspect : 4 / 3;
  const { paper, bindingSide, gutterIn } = opts;
  const cardWidthIn = clamp(opts.cardWidthIn, CARD_WIDTH_MIN_IN, CARD_WIDTH_MAX_IN);
  const gutter = clamp(gutterIn, GUTTER_MIN_IN, GUTTER_MAX_IN);
  const horizontal = isHorizontalBinding(bindingSide);

  // 1. Image dimensions (preserve aspect, cap height).
  let imgW = availableImageWidth(cardWidthIn, gutter, bindingSide);
  let imgH = imgW / aspect;
  if (imgH > MAX_CARD_HEIGHT_IN) {
    const factor = MAX_CARD_HEIGHT_IN / imgH;
    imgW *= factor;
    imgH = MAX_CARD_HEIGHT_IN;
  }

  // 2. Outer card box = image + gutter on the bound edge + safe margins elsewhere.
  const cardW = horizontal ? imgW + gutter + SAFE_MARGIN_IN : imgW + 2 * SAFE_MARGIN_IN;
  const cardH = horizontal ? imgH + 2 * SAFE_MARGIN_IN : imgH + gutter + SAFE_MARGIN_IN;

  // 3. Grid that fits the printable area.
  const { wIn, hIn } = PAPER_SIZES[paper];
  const usableW = wIn - 2 * OUTER_MARGIN_IN;
  const usableH = hIn - 2 * OUTER_MARGIN_IN;
  const cols = Math.max(1, Math.floor(usableW / cardW));
  const rows = Math.max(1, Math.floor(usableH / cardH));
  const cardsPerPage = cols * rows;
  const pageCount = Math.max(1, Math.ceil(opts.frameCount / cardsPerPage));

  // 4. Slot geometry for a full page (image biased to the free edge).
  const slots: CardSlot[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cardX = OUTER_MARGIN_IN + c * cardW;
      const cardY = OUTER_MARGIN_IN + r * cardH;
      let imgX: number;
      let imgY: number;
      switch (bindingSide) {
        case 'left':
          imgX = cardX + gutter;
          imgY = cardY + (cardH - imgH) / 2;
          break;
        case 'right':
          imgX = cardX + SAFE_MARGIN_IN;
          imgY = cardY + (cardH - imgH) / 2;
          break;
        case 'top':
          imgX = cardX + (cardW - imgW) / 2;
          imgY = cardY + gutter;
          break;
        case 'bottom':
          imgX = cardX + (cardW - imgW) / 2;
          imgY = cardY + SAFE_MARGIN_IN;
          break;
      }
      slots.push({ cardX, cardY, cardW, cardH, imgX, imgY, imgW, imgH });
    }
  }

  return { cols, rows, cardsPerPage, pageCount, cardW, cardH, imgW, imgH, slots };
}

/** Suggested frame count for a clip length at a target capture fps, clamped to sane bounds. */
export function recommendFrameCount(durationSeconds: number, fps = DEFAULT_FPS): number {
  return clamp(Math.round(durationSeconds * fps), MIN_FRAMES, MAX_FRAMES);
}

/** Effective capture fps implied by a frame count over a clip length (for the smoothness label). */
export function fpsForFrameCount(frameCount: number, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0;
  return frameCount / durationSeconds;
}

/** Evenly spaced timestamps (seconds) across [start, end] for `count` frames. */
export function sampleTimestamps(count: number, start: number, end: number): number[] {
  const n = Math.max(1, Math.floor(count));
  if (n === 1) return [start];
  const span = Math.max(0, end - start);
  // Bias slightly inward so the very last frame isn't past the final decodable sample.
  const step = span / n;
  return Array.from({ length: n }, (_, i) => start + step * i);
}
