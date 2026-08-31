import type { PaperSize } from './types';

/** PDF points per inch (pdf-lib works in points). */
export const PT_PER_IN = 72;

/** Paper dimensions in inches (portrait). */
export const PAPER_SIZES: Record<PaperSize, { label: string; wIn: number; hIn: number }> = {
  letter: { label: 'Letter (8.5 × 11 in)', wIn: 8.5, hIn: 11 },
  a4: { label: 'A4 (210 × 297 mm)', wIn: 595.28 / PT_PER_IN, hIn: 841.89 / PT_PER_IN },
};

// --- Card geometry (inches) ---
export const DEFAULT_CARD_WIDTH_IN = 2.5;
export const CARD_WIDTH_MIN_IN = 2;
export const CARD_WIDTH_MAX_IN = 4;

/** Blank bound-edge padding. 0.5in suits staples; 0.75in if gluing/clipping. */
export const DEFAULT_GUTTER_IN = 0.5;
export const GUTTER_MIN_IN = 0.4;
export const GUTTER_MAX_IN = 1;

/** Non-printable page margin kept inside the paper edge. */
export const OUTER_MARGIN_IN = 0.5;

/** Keep image content this far inside the cut line (hand-cutting slack). */
export const SAFE_MARGIN_IN = 0.1;

/** Cap card height so tall/portrait clips stay thumb-able; letterbox beyond this. */
export const MAX_CARD_HEIGHT_IN = 4;

// --- Cut aids ---
export const CROP_TICK_IN = 0.125;
export const CROP_LINE_IN = 0.01;

// --- Sampling / smoothness ---
export const DEFAULT_FPS = 10;
export const FPS_MIN = 2;
export const FPS_MAX = 20;

/** Absolute cap on frames so a long clip can't melt the tab or the printer. */
export const MAX_FRAMES = 300;
export const MIN_FRAMES = 4;

/** Soft warning threshold on total printed pages. */
export const SOFT_MAX_PAGES = 12;

// --- Frame image quality ---
export const TARGET_DPI = 300;
export const MIN_DPI = 150;
export const DEFAULT_JPEG_QUALITY = 0.85;

/** Clips longer than this trigger a (non-blocking) warning + trim suggestion. */
export const LONG_CLIP_WARN_SECONDS = 60;

/** Accepted upload types (browser-decodable containers). */
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
export const ACCEPTED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v'];

/** Smoothness tiers for the fps slider label + explainer. */
export interface SmoothnessTier {
  maxFps: number;
  label: string;
  blurb: string;
}
export const SMOOTHNESS_TIERS: SmoothnessTier[] = [
  { maxFps: 6, label: 'Sketchy', blurb: 'Jumpy, stop-motion feel' },
  { maxFps: 10, label: 'Decent', blurb: 'Reads as motion, slight strobe' },
  { maxFps: 15, label: 'Smooth', blurb: 'Fluid when you thumb it' },
  { maxFps: Infinity, label: 'Overkill', blurb: 'More pages & cost, little visible gain' },
];

export function smoothnessForFps(fps: number): SmoothnessTier {
  return SMOOTHNESS_TIERS.find((t) => fps <= t.maxFps) ?? SMOOTHNESS_TIERS[SMOOTHNESS_TIERS.length - 1];
}
