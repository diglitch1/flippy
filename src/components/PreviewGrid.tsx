interface Props {
  urls: string[];
  max?: number;
}

export function PreviewGrid({ urls, max = 48 }: Props) {
  const shown = urls.slice(0, max);
  return (
    <div className="preview">
      <div className="preview__grid">
        {shown.map((url, i) => (
          <figure key={i} className="preview__cell">
            <img src={url} alt={`Frame ${i + 1}`} loading="lazy" />
            <figcaption>{i + 1}</figcaption>
          </figure>
        ))}
      </div>
      {urls.length > shown.length && (
        <p className="preview__more">+ {urls.length - shown.length} more in the PDF</p>
      )}
    </div>
  );
}
