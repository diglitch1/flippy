import { useCallback, useEffect, useRef, useState } from 'react';
import { Dropzone } from './components/Dropzone';
import { Controls } from './components/Controls';
import { ProgressBar } from './components/ProgressBar';
import { PreviewGrid } from './components/PreviewGrid';
import { Instructions } from './components/Instructions';
import {
  DEFAULT_CARD_WIDTH_CM,
  DEFAULT_GUTTER_CM,
  DEFAULT_JPEG_QUALITY,
  LONG_CLIP_WARN_SECONDS,
} from './constants';
import type { FlipbookOptions, VideoInfo } from './types';
import { loadVideo, releaseVideo, validateVideoFile } from './lib/video';
import { computeLayout, recommendFrameCount, sampleTimestamps } from './lib/layout';
import { buildSequence, captureWidthForCm, extractFrames } from './lib/frames';
import { buildFlipbookPdf } from './lib/pdf';

type Stage = 'idle' | 'loaded' | 'generating' | 'done';

function defaultOptions(duration: number): FlipbookOptions {
  return {
    frameCount: recommendFrameCount(duration),
    paper: 'a4',
    cardWidthCm: DEFAULT_CARD_WIDTH_CM,
    gutterCm: DEFAULT_GUTTER_CM,
    bindingSide: 'left',
    jpegQuality: DEFAULT_JPEG_QUALITY,
    includeCover: false,
    title: '',
    credits: '',
    grayscale: false,
    boomerang: false,
  };
}

export default function App() {
  const [stage, setStage] = useState<Stage>('idle');
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [options, setOptions] = useState<FlipbookOptions>(() => defaultOptions(1));
  const [trim, setTrim] = useState({ start: 0, end: 1 });
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const objectUrls = useRef<string[]>([]);
  const revokeAll = useCallback(() => {
    objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrls.current = [];
    setPreviewUrls([]);
    setPdfUrl(null);
  }, []);

  useEffect(() => () => revokeAll(), [revokeAll]);

  const onFile = useCallback(async (file: File) => {
    setError(null);
    const invalid = validateVideoFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    try {
      const info = await loadVideo(file);
      setVideo((prev) => {
        releaseVideo(prev);
        return info;
      });
      setOptions(defaultOptions(info.duration));
      setTrim({ start: 0, end: info.duration });
      setStage('loaded');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load that video.');
    }
  }, []);

  const generate = useCallback(async () => {
    if (!video) return;
    setError(null);
    setStage('generating');
    setProgress({ done: 0, total: options.frameCount });
    revokeAll();
    try {
      const layout = computeLayout({ ...options }, video.aspect);
      const maxWidthPx = captureWidthForCm(layout.imgW);
      const timestamps = sampleTimestamps(options.frameCount, trim.start, trim.end);
      const captured = await extractFrames(video, timestamps, {
        maxWidthPx,
        quality: options.jpegQuality,
        grayscale: options.grayscale,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      const frames = buildSequence(captured, options.boomerang);

      const urls = frames.map((f) =>
        URL.createObjectURL(new Blob([f.jpeg as BlobPart], { type: 'image/jpeg' })),
      );
      const pdfBytes = await buildFlipbookPdf(frames, options, video.aspect);
      const url = URL.createObjectURL(new Blob([pdfBytes as BlobPart], { type: 'application/pdf' }));

      objectUrls.current = [...urls, url];
      setPreviewUrls(urls);
      setPdfUrl(url);
      setStage('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong while generating.');
      setStage('loaded');
    }
  }, [video, options, trim, revokeAll]);

  const reset = useCallback(() => {
    revokeAll();
    setVideo((prev) => {
      releaseVideo(prev);
      return null;
    });
    setStage('idle');
    setError(null);
  }, [revokeAll]);

  const longClip = video && video.duration > LONG_CLIP_WARN_SECONDS;
  const downloadName = `${(options.title.trim() || 'flipbook').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}.pdf`;

  return (
    <main className="app">
      <header className="app__header">
        <h1>Flippy</h1>
        <p className="app__tagline">
          Turn a short video into a printable, thumb-flip flipbook, all in your browser.
        </p>
      </header>

      {error && <div className="alert alert--error">{error}</div>}

      {stage === 'idle' && <Dropzone onFile={onFile} />}

      {video && stage !== 'idle' && (
        <section className="workspace">
          <div className="workspace__video">
            <VideoThumb info={video} trim={trim} />
            <button type="button" className="btn btn--ghost" onClick={reset}>
              Choose a different video
            </button>
          </div>

          <div className="workspace__panel">
            {longClip && (
              <div className="alert alert--warn">
                This clip is {video.duration.toFixed(0)}s. Long clips make many pages; trim it below
                for a tidier flipbook.
              </div>
            )}

            {(stage === 'loaded' || stage === 'generating') && (
              <Controls
                options={options}
                onChange={setOptions}
                trim={trim}
                onTrimChange={setTrim}
                duration={video.duration}
                aspect={video.aspect}
                busy={stage === 'generating'}
                onGenerate={generate}
              />
            )}

            {stage === 'generating' && (
              <ProgressBar done={progress.done} total={progress.total} />
            )}

            {stage === 'done' && pdfUrl && (
              <div className="result">
                <a className="btn btn--primary" href={pdfUrl} download={downloadName}>
                  ⬇ Download {downloadName}
                </a>
                <button type="button" className="btn btn--ghost" onClick={() => setStage('loaded')}>
                  Tweak settings
                </button>
                <Instructions bindingSide={options.bindingSide} />
              </div>
            )}
          </div>
        </section>
      )}

      {stage === 'done' && previewUrls.length > 0 && (
        <section className="app__preview">
          <h2>Your frames</h2>
          <PreviewGrid urls={previewUrls} />
        </section>
      )}

      <footer className="app__footer">
        <p>100% in-browser. Your video is never uploaded.</p>
      </footer>
    </main>
  );
}

function VideoThumb({ info, trim }: { info: VideoInfo; trim: { start: number; end: number } }) {
  const ref = useRef<HTMLVideoElement>(null);
  // Mount a lightweight <video> pointing at the same object URL for a visual preview.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.src = info.url;
    el.currentTime = trim.start;
  }, [info.url, trim.start]);
  return (
    <video
      ref={ref}
      className="video-thumb"
      muted
      playsInline
      controls
      preload="metadata"
      width={info.width}
      height={info.height}
    />
  );
}
