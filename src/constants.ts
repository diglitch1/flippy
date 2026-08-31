import type { PaperSize } from './types';

/** PDF points per centimeter (pdf-lib works in points; 1 cm = 72/2.54 pt). */
export const PT_PER_CM = 72 / 2.54;

/** Paper dimensions in centimeters (portrait). */
export const PAPER_SIZES: Record<PaperSize, { label: string; wCm: number; hCm: number }> = {
  letter: { label: 'US Letter (21.6 x 27.9 cm)', wCm: 21.59, hCm: 27.94 },
  a4: { label: 'A4 (21.0 x 29.7 cm)', wCm: 21.0, hCm: 29.7 },
};

// --- Card geometry (centimeters) ---
export const DEFAULT_CARD_WIDTH_CM = 6;
export const CARD_WIDTH_MIN_CM = 4;
export const CARD_WIDTH_MAX_CM = 10;

/** Blank bound-edge padding. ~1.3 cm suits staples; ~2 cm if gluing/clipping. */
export const DEFAULT_GUTTER_CM = 1.3;
export const GUTTER_MIN_CM = 1;
export const GUTTER_MAX_CM = 2.5;

/** Non-printable page margin kept inside the paper edge. */
export const OUTER_MARGIN_CM = 1.27;

/** Keep image content this far inside the cut line (hand-cutting slack). */
export const SAFE_MARGIN_CM = 0.25;

/** Cap card height so tall/portrait clips stay thumb-able; letterbox beyond this. */
export const MAX_CARD_HEIGHT_CM = 10;

/** Length of the print-scale reference ruler drawn on the instructions page. */
export const RULER_CM = 5;

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
  { maxFps: Infinity, label: 'Overkill', blurb: 'More pages and cost, little visible gain' },
];

export function smoothnessForFps(fps: number): SmoothnessTier {
  return SMOOTHNESS_TIERS.find((t) => fps <= t.maxFps) ?? SMOOTHNESS_TIERS[SMOOTHNESS_TIERS.length - 1];
}
