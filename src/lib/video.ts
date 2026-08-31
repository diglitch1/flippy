import { ACCEPTED_VIDEO_EXTENSIONS, ACCEPTED_VIDEO_TYPES } from '../constants';
import type { VideoInfo } from '../types';

/**
 * Quick pre-flight check on a chosen file. Returns an error message, or null if it looks
 * like a video we can try to decode. We stay permissive: the real test is whether the
 * browser can actually load metadata (handled by loadVideo).
 */
export function validateVideoFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const extOk = ACCEPTED_VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext));
  const typeOk = file.type ? ACCEPTED_VIDEO_TYPES.includes(file.type) || file.type.startsWith('video/') : false;
  if (!extOk && !typeOk) {
    return 'That doesn’t look like a video. Try an .mp4, .mov, or .webm file.';
  }
  return null;
}

/**
 * Load a video File into a hidden <video> element and read its intrinsic dimensions.
 * The returned element is seekable and ready for frame capture. Remember to call
 * releaseVideo() when finished to free the object URL.
 */
export function loadVideo(file: File): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement('video');
    el.preload = 'auto';
    el.muted = true;
    el.playsInline = true;
    el.crossOrigin = 'anonymous';

    const cleanupListeners = () => {
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('error', onError);
    };

    const onMeta = () => {
      const width = el.videoWidth;
      const height = el.videoHeight;
      if (!width || !height || !isFinite(el.duration) || el.duration <= 0) {
        cleanupListeners();
        URL.revokeObjectURL(url);
        reject(new Error('Could not read this video. The format may not be supported by your browser.'));
        return;
      }
      cleanupListeners();
      resolve({ el, url, duration: el.duration, width, height, aspect: width / height });
    };

    const onError = () => {
      cleanupListeners();
      URL.revokeObjectURL(url);
      reject(new Error('Your browser could not decode this video. Try an H.264 .mp4 or a .webm file.'));
    };

    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('error', onError);
    el.src = url;
  });
}

/** Free the object URL and detach the element. Safe to call more than once. */
export function releaseVideo(info: VideoInfo | null): void {
  if (!info) return;
  try {
    info.el.pause();
    info.el.removeAttribute('src');
    info.el.load();
  } catch {
    // ignore
  }
  URL.revokeObjectURL(info.url);
}
