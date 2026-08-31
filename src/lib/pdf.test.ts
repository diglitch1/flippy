import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildFlipbookPdf } from './pdf';
import { computeLayout } from './layout';
import type { Frame, FlipbookOptions } from '../types';

// A tiny valid 32x24 red JPEG (produced by ffmpeg), base64-encoded.
const TINY_JPEG_B64 =
  '/9j/4AAQSkZJRgABAgAAAQABAAD//gAPTGF2YzYzLjEuMTAxAP/bAEMACAQEBAQEBQUFBQUFBgYGBgYGBgYGBgYGBgcHBwgICAcHBwYGBwcICAgICQkJCAgICAkJCgoKDAwLCw4ODhERFP/EAE0AAQEAAAAAAAAAAAAAAAAAAAAGAQEBAQAAAAAAAAAAAAAAAAAABgcQAQAAAAAAAAAAAAAAAAAAAAARAQAAAAAAAAAAAAAAAAAAAAD/wAARCAAYACADASIAAhEAAxEA/9oADAMBAAIRAxEAPwCLASbfwAAAAAH/2Q==';

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function makeFrames(n: number): Frame[] {
  const jpeg = b64ToBytes(TINY_JPEG_B64);
  return Array.from({ length: n }, (_, i) => ({
    index: i + 1,
    time: i * 0.1,
    jpeg,
    width: 32,
    height: 24,
  }));
}

const opts = (over: Partial<FlipbookOptions> = {}): FlipbookOptions => ({
  frameCount: 20,
  paper: 'letter',
  cardWidthCm: 6,
  gutterCm: 1.3,
  bindingSide: 'left',
  jpegQuality: 0.85,
  includeCover: false,
  title: 'Test Book',
  credits: '',
  grayscale: false,
  boomerang: false,
  ...over,
});

describe('buildFlipbookPdf', () => {
  it('emits a valid PDF byte stream', async () => {
    const bytes = await buildFlipbookPdf(makeFrames(5), opts(), 4 / 3);
    const header = String.fromCharCode(...bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it('produces instructions page + the expected number of card pages', async () => {
    const aspect = 16 / 9;
    const o = opts({ frameCount: 20 });
    const frames = makeFrames(20);
    const layout = computeLayout({ ...o, frameCount: frames.length }, aspect);
    const bytes = await buildFlipbookPdf(frames, o, aspect);

    // 1 instructions page + N card pages.
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBe(1 + layout.pageCount);
  });
});
