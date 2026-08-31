import { DEFAULT_JPEG_QUALITY, TARGET_DPI } from '../constants';
import type { Frame, VideoInfo } from '../types';

export interface ExtractOptions {
  /** Max pixel width of each captured frame (height follows aspect). No upscaling past native. */
  maxWidthPx: number;
  /** JPEG quality 0..1. */
  quality?: number;
  /** Capture in grayscale (cheaper to print). */
  grayscale?: boolean;
  /** Called after each frame with (completed, total). */
  onProgress?: (done: number, total: number) => void;
  /** Abort in-flight extraction. */
  signal?: AbortSignal;
}

/** Pixels of width needed to print an image `cm` wide at the target DPI. */
export function captureWidthForCm(cm: number): number {
  return Math.ceil((cm / 2.54) * TARGET_DPI);
}

interface VideoFrameCallbackHost {
  requestVideoFrameCallback?: (cb: () => void) => number;
}

/**
 * Seek the element to `time` and resolve once the frame is ready to be drawn.
 * Resolves on the `seeked` event (the decoded frame is then drawable). When available,
 * requestVideoFrameCallback is used as a best-effort accuracy boost, but bounded by a short
 * timeout so a detached/headless video (where rVFC may never fire) can't stall the loop.
 */
function seekTo(el: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let fallback: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      el.removeEventListener('seeked', onSeeked);
      el.removeEventListener('error', onError);
      if (fallback) clearTimeout(fallback);
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const onSeeked = () => {
      const host = el as HTMLVideoElement & VideoFrameCallbackHost;
      if (typeof host.requestVideoFrameCallback === 'function') {
        host.requestVideoFrameCallback(() => finish());
        // Don't wait forever on a frame that may never be presented (headless/detached).
        fallback = setTimeout(finish, 120);
      } else {
        finish();
      }
    };
    const onError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`Failed to seek to ${time.toFixed(2)}s`));
    };
    el.addEventListener('seeked', onSeeked);
    el.addEventListener('error', onError);
    // Clamp just inside the end so the final sample stays decodable.
    el.currentTime = Math.min(Math.max(0, time), Math.max(0, el.duration - 1e-3));
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not encode frame to JPEG'));
          return;
        }
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)), reject);
      },
      'image/jpeg',
      quality,
    );
  });
}

/**
 * Extract frames from the loaded video at the given timestamps by seeking and drawing each
 * frame to a canvas, encoded as JPEG. Runs entirely on the main thread against the browser's
 * native decoder, with no upload and no ffmpeg.
 */
export async function extractFrames(
  info: VideoInfo,
  timestamps: number[],
  opts: ExtractOptions,
): Promise<Frame[]> {
  const quality = opts.quality ?? DEFAULT_JPEG_QUALITY;
  const { el, width: nativeW, height: nativeH } = info;

  const captureW = Math.max(1, Math.min(nativeW, Math.round(opts.maxWidthPx)));
  const scale = captureW / nativeW;
  const captureH = Math.max(1, Math.round(nativeH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = captureW;
  canvas.height = captureH;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  if (opts.grayscale) ctx.filter = 'grayscale(1)';

  const frames: Frame[] = [];
  const total = timestamps.length;

  for (let i = 0; i < total; i++) {
    if (opts.signal?.aborted) throw new DOMException('Extraction aborted', 'AbortError');
    await seekTo(el, timestamps[i]);
    ctx.drawImage(el, 0, 0, captureW, captureH);
    const jpeg = await canvasToJpeg(canvas, quality);
    frames.push({ index: i + 1, time: timestamps[i], jpeg, width: captureW, height: captureH });
    opts.onProgress?.(i + 1, total);
  }

  return frames;
}

/**
 * Expand a frame list into the final card sequence. With boomerang on, the reversed middle
 * frames are appended so the flip plays forward then back for a seamless loop. Cards are
 * renumbered 1..n in play order.
 */
export function buildSequence(frames: Frame[], boomerang: boolean): Frame[] {
  const seq = boomerang ? [...frames, ...frames.slice(1, -1).reverse()] : frames;
  return seq.map((f, i) => ({ ...f, index: i + 1 }));
}
