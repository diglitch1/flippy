# Flipbook Maker 🎞️

Turn a short video into a **print-at-home flipbook** — a PDF of small numbered cards you
print, cut out, stack, and staple into a book you can thumb through to replay the clip.

Everything runs **in your browser**. Your video is never uploaded — frames are captured
locally with the browser's own video decoder and the PDF is built client-side. That makes it
free to host, private by design, and free of upload limits.

## How it works

1. Drop in a video (`.mp4`, `.mov`, or `.webm` — up to ~1 minute works best).
2. Pick how many frames you want. A **smoothness** readout tells you whether the flip will
   look choppy or fluid, and a live estimate shows how many pages you'll print.
3. Generate. You get a PDF with an instructions page (including a 1-inch ruler to verify
   print scale) followed by pages of numbered cards with cut guides.
4. Print at **Actual Size / 100%** on cardstock, cut along the guides, stack in order, and
   staple the blank (gutter) edge.

### Print tips (baked into the PDF)

- Print at **100% / Actual Size** — never "Fit to page", or the cards won't measure right.
- Load the paper size you selected (US Letter or A4).
- **~80 lb cover / 216 gsm cardstock** flips best. A stapler handles ~20–25 cards; for more,
  use padding glue, a binder clip, or screw posts (and a slightly wider gutter).

## Tech

- **Vite + React + TypeScript**, static build — deploys to any static host.
- Frame capture: native `<video>` seeking → `<canvas>` → JPEG (no ffmpeg, no server).
- PDF: [`pdf-lib`](https://pdf-lib.js.org/).

## Develop

```bash
npm install
npm run dev      # start the dev server
npm test         # run unit tests (layout + PDF pipeline)
npm run build    # type-check + production build to dist/
```

## Deploy

Any static host works (the build output is plain files, and no special cross-origin headers
are required):

- **Netlify** — `netlify.toml` sets build `npm run build`, publish `dist`.
- **Vercel** — `vercel.json` sets the build command and output directory.
- **GitHub Pages** — publish the `dist/` folder; the app uses relative asset paths so it
  works from a project subpath.

## Notes & limits

- Frame capture uses the browser's decoder, so exotic codecs (e.g. some HEVC `.mov` files)
  may not decode everywhere. H.264 `.mp4` and `.webm` are the safe bets.
- Very long or 4K clips can strain a browser tab; trim the clip and keep the frame count
  reasonable.
- You are responsible for having the rights to any video you turn into a flipbook.

## Roadmap

Imposition (more cards per sheet), FPS/slow-mo presets, black & white for cheap printing,
reverse/boomerang, and saved settings are planned as client-side follow-ups.
