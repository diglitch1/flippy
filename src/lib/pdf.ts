import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { OUTER_MARGIN_CM, PAPER_SIZES, PT_PER_CM, RULER_CM } from '../constants';
import type { CardSlot, Frame, FlipbookOptions, Layout } from '../types';
import { computeLayout } from './layout';

const CUT_GUIDE = rgb(0.72, 0.72, 0.72);
const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.45, 0.45, 0.45);

const cmToPt = (cm: number) => cm * PT_PER_CM;

/** Convert a top-left cm box to pdf-lib's bottom-left point coordinates. */
function box(pageHeightCm: number, xCm: number, topCm: number, wCm: number, hCm: number) {
  return {
    x: cmToPt(xCm),
    y: cmToPt(pageHeightCm - topCm - hCm),
    width: cmToPt(wCm),
    height: cmToPt(hCm),
  };
}

/** Thin light-gray rectangle around a card so it's easy to cut out by hand. */
function drawCutGuide(page: PDFPage, pageHeightCm: number, slot: CardSlot) {
  const b = box(pageHeightCm, slot.cardX, slot.cardY, slot.cardW, slot.cardH);
  page.drawRectangle({
    ...b,
    borderColor: CUT_GUIDE,
    borderWidth: 0.5,
  });
}

/** Small sequence number in the card's gutter so a dropped stack can be re-sorted. */
function drawNumber(page: PDFPage, pageHeightCm: number, slot: CardSlot, n: number, font: PDFFont) {
  const size = 7;
  // Place near the bound (gutter) edge, toward the bottom of the card.
  const xCm = slot.cardX + 0.15;
  const topCm = slot.cardY + slot.cardH - 0.36;
  const b = box(pageHeightCm, xCm, topCm, 1.2, 0.3);
  page.drawText(String(n), { x: b.x, y: b.y, size, font, color: MUTED });
}

/** Instructions + print-scale-check page shown first in the PDF. */
function addInstructionsPage(
  doc: PDFDocument,
  opts: FlipbookOptions,
  layout: Layout,
  frameCount: number,
  paperWCm: number,
  paperHCm: number,
  bold: PDFFont,
  regular: PDFFont,
): void {
  const page = doc.addPage([cmToPt(paperWCm), cmToPt(paperHCm)]);
  const leftCm = OUTER_MARGIN_CM + 0.25;
  let topCm = OUTER_MARGIN_CM + 0.5;

  const text = (s: string, size: number, font: PDFFont, color = INK, gapAfterCm = 0.7) => {
    const b = box(paperHCm, leftCm, topCm, paperWCm, size / PT_PER_CM);
    page.drawText(s, { x: b.x, y: b.y, size, font, color, maxWidth: cmToPt(paperWCm - 2 * leftCm) });
    topCm += size / PT_PER_CM + gapAfterCm;
  };

  const title = opts.title.trim() || 'Your Flipbook';
  text(title, 22, bold, INK, 0.9);
  text(
    `${frameCount} cards, ${layout.pageCount} card page${layout.pageCount === 1 ? '' : 's'} to print and cut`,
    11,
    regular,
    MUTED,
    1.2,
  );

  text('How to make it', 14, bold, INK, 0.6);
  const steps = [
    '1.  Print this PDF on cardstock (about 216 gsm flips best).',
    '2.  Cut out every card along the light gray guide lines.',
    '3.  Stack the cards in order, with number 1 on top.',
    `4.  Staple or clip the ${opts.bindingSide} (blank) edge to bind.`,
    '5.  Thumb through the free edge to watch it play.',
  ];
  steps.forEach((s) => text(s, 11, regular, INK, 0.4));
  topCm += 0.6;

  // Print-scale warning.
  text('IMPORTANT: print at Actual Size', 13, bold, rgb(0.7, 0.15, 0.15), 0.45);
  text('In the print dialog choose "Actual size" / 100% scale, not "Fit to page".', 11, regular, INK, 0.4);
  text(`Load ${opts.paper === 'a4' ? 'A4' : 'US Letter'} paper to match this document.`, 11, regular, INK, 1.0);

  // Reference ruler: a line exactly RULER_CM long to verify print scale.
  const rulerTopCm = topCm + 0.1;
  const rulerLeftCm = leftCm;
  const ry = cmToPt(paperHCm - rulerTopCm);
  page.drawLine({
    start: { x: cmToPt(rulerLeftCm), y: ry },
    end: { x: cmToPt(rulerLeftCm + RULER_CM), y: ry },
    thickness: 1,
    color: INK,
  });
  // Centimeter ticks.
  for (let i = 0; i <= RULER_CM; i++) {
    page.drawLine({
      start: { x: cmToPt(rulerLeftCm + i), y: ry },
      end: { x: cmToPt(rulerLeftCm + i), y: ry + (i % RULER_CM === 0 ? 8 : 5) },
      thickness: 1,
      color: INK,
    });
  }
  const lbl = box(paperHCm, rulerLeftCm + RULER_CM + 0.3, rulerTopCm - 0.28, 10, 0.3);
  page.drawText(`this line should measure exactly ${RULER_CM} cm when printed`, {
    x: lbl.x,
    y: lbl.y,
    size: 9,
    font: regular,
    color: MUTED,
  });
}

/**
 * Build the full flipbook PDF: an instructions/scale page followed by pages of numbered
 * frame cards with cut guides. Returns the encoded PDF bytes.
 */
export async function buildFlipbookPdf(
  frames: Frame[],
  opts: FlipbookOptions,
  videoAspect: number,
): Promise<Uint8Array> {
  const { wCm: paperWCm, hCm: paperHCm } = PAPER_SIZES[opts.paper];
  const layout = computeLayout({ ...opts, frameCount: frames.length }, videoAspect);

  const doc = await PDFDocument.create();
  doc.setTitle(opts.title.trim() || 'Flipbook');
  doc.setCreator('Flippy');
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  addInstructionsPage(doc, opts, layout, frames.length, paperWCm, paperHCm, bold, regular);

  const perPage = layout.cardsPerPage;
  for (let start = 0; start < frames.length; start += perPage) {
    const page = doc.addPage([cmToPt(paperWCm), cmToPt(paperHCm)]);
    const pageFrames = frames.slice(start, start + perPage);
    for (let i = 0; i < pageFrames.length; i++) {
      const frame = pageFrames[i];
      const slot = layout.slots[i];
      drawCutGuide(page, paperHCm, slot);
      const img = await doc.embedJpg(frame.jpeg);
      const b = box(paperHCm, slot.imgX, slot.imgY, slot.imgW, slot.imgH);
      page.drawImage(img, b);
      drawNumber(page, paperHCm, slot, frame.index, regular);
    }
  }

  return doc.save();
}
