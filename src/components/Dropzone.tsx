import { useCallback, useRef, useState } from 'react';
import { ACCEPTED_VIDEO_EXTENSIONS } from '../constants';

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function Dropzone({ onFile, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div
      className={`dropzone${dragging ? ' dropzone--active' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) pick(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={[...ACCEPTED_VIDEO_EXTENSIONS, 'video/*'].join(',')}
        hidden
        onChange={(e) => pick(e.target.files)}
      />
      <div className="dropzone__icon" aria-hidden>🎞️</div>
      <p className="dropzone__title">Drop a video here, or click to choose</p>
      <p className="dropzone__hint">
        Up to ~1 minute works best. .mp4, .mov, or .webm.
        <br />
        Everything happens in your browser — your video never leaves your device.
      </p>
    </div>
  );
}
