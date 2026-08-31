/** Paper sizes we lay out for. */
export type PaperSize = 'letter' | 'a4';

/** Which edge of the card is bound/stapled. The gutter (blank padding) goes on this edge. */
export type BindingSide = 'left' | 'right' | 'top' | 'bottom';

/** Native dimensions of the source video, used to preserve aspect ratio on the card. */
export interface VideoInfo {
  el: HTMLVideoElement;
  /** Object URL backing the element; revoke when done. */
  url: string;
  duration: number;
  width: number;
  height: number;
  /** width / height */
  aspect: number;
}

/** A single sampled frame: the JPEG bytes plus the source timestamp it came from. */
export interface Frame {
  /** 1-based position in the flipbook. */
  index: number;
  /** Seconds into the (trimmed) clip. */
  time: number;
  jpeg: Uint8Array;
  width: number;
  height: number;
}

/** User-configurable options that drive frame sampling and PDF layout. */
export interface FlipbookOptions {
  /** How many cards/frames to produce. */
  frameCount: number;
  paper: PaperSize;
  /** Card width in centimeters (image width = cardWidth - gutter). */
  cardWidthCm: number;
  /** Blank binding/staple padding in centimeters, placed on the bound edge. */
  gutterCm: number;
  bindingSide: BindingSide;
  /** JPEG quality 0..1 for embedded frames. */
  jpegQuality: number;
  /** Optional cover card with title/credits printed first. */
  includeCover: boolean;
  title: string;
  credits: string;
}

/** Geometry for one card slot on a page, in centimeters (origin = top-left of page). */
export interface CardSlot {
  /** Outer card box (includes gutter). */
  cardX: number;
  cardY: number;
  cardW: number;
  cardH: number;
  /** Image box within the card (gutter excluded, biased to the free edge). */
  imgX: number;
  imgY: number;
  imgW: number;
  imgH: number;
}

/** Result of laying frames onto pages. */
export interface Layout {
  cols: number;
  rows: number;
  cardsPerPage: number;
  pageCount: number;
  cardW: number;
  cardH: number;
  imgW: number;
  imgH: number;
  /** Slot geometry for a full page, reused on every page (last page may use fewer). */
  slots: CardSlot[];
}
