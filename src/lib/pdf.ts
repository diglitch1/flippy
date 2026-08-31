import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { OUTER_MARGIN_IN, PAPER_SIZES, PT_PER_IN } from '../constants';
import type { CardSlot, Frame, FlipbookOptions, Layout } from '../types';
import { computeLayout } from './layout';

const CUT_GUIDE = rgb(0.72, 0.72, 0.72);
const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.45, 0.45, 0.45);

const inToPt = (inches: number) => inches * PT_PER_IN;

/** Convert a top-left inch box to pdf-lib's bottom-left point coordinates. */
function box(pageHeightIn: number, xIn: number, topIn: number, wIn: number, hIn: number) {
  return {
    x: inToPt(xIn),
    y: inToPt(pageHeightIn - topIn - hIn),
    width: inToPt(wIn),
    height: inToPt(hIn),
  };
}

/** Thin light-gray rectangle around a card so it's easy to cut out by hand. */
function drawCutGuide(page: PDFPage, pageHeightIn: number, slot: CardSlot) {
  const b = box(pageHeightIn, slot.cardX, slot.cardY, slot.cardW, slot.cardH);
  page.drawRectangle({
    ...b,
    borderColor: CUT_GUIDE,
    borderWidth: 0.5,
  });
}

/** Small sequence number in the card's gutter so a dropped stack can be re-sorted. */
function drawNumber(
  page: PDFPage,
  pageHeightIn: number,
  slot: CardSlot,
  n: number,
  font: PDFFont,
) {
  const size = 7;
  // Place near the bound (gutter) edge, toward the bottom of the card.
  const xIn = slot.cardX + 0.06;
  const topIn = slot.cardY + slot.cardH - 0.14;
  const b = box(pageHeightIn, xIn, topIn, 0.5, 0.12);
  page.drawText(String(n), { x: b.x, y: b.y, size, font, color: MUTED });
}

/** Instructions + print-scale-check page shown first in the PDF. */
async function addInstructionsPage(
  doc: PDFDocument,
  opts: FlipbookOptions,
  layout: Layout,
  frameCount: number,
  paperWIn: number,
  paperHIn: number,
  bold: PDFFont,
  regular: PDFFont,
): Promise<void> {
  const page = doc.addPage([inToPt(paperWIn), inToPt(paperHIn)]);
  const leftIn = OUTER_MARGIN_IN + 0.1;
  let topIn = OUTER_MARGIN_IN + 0.2;

  const text = (s: string, size: number, font: PDFFont, color = INK, gapAfter = 0.28) => {
    const b = box(paperHIn, leftIn, topIn, paperWIn, size / PT_PER_IN);
    page.drawText(s, { x: b.x, y: b.y, size, font, color, maxWidth: inToPt(paperWIn - 2 * leftIn) });
    topIn += size / PT_PER_IN + gapAfter;
  };

  const title = opts.title.trim() || 'Your Flipbook';
  text(title, 22, bold, INK, 0.35);
  text(`${frameCount} cards  -  ${layout.pageCount} card page${layout.pageCount === 1 ? '' : 's'} to print & cut`, 11, regular, MUTED, 0.5);

  text('How to make it', 14, bold, INK, 0.25);
  const steps = [
    '1.  Print this PDF on cardstock (~80 lb / 216 gsm flips best).',
    '2.  Cut out every card along the light gray guide lines.',
    '3.  Stack the cards in order — number 1 on top.',
    `4.  Staple or clip the ${opts.bindingSide} (blank) edge to bind.`,
    '5.  Thumb through the free edge to watch it play.',
  ];
  steps.forEach((s) => text(s, 11, regular, INK, 0.16));
  topIn += 0.25;

  // Print-scale warning.
  text('IMPORTANT - print at Actual Size', 13, bold, rgb(0.7, 0.15, 0.15), 0.18);
  text('In the print dialog choose "Actual size" / 100% scale — NOT "Fit to page".', 11, regular, INK, 0.16);
  text(`Load ${opts.paper === 'a4' ? 'A4' : 'US Letter'} paper to match this document.`, 11, regular, INK, 0.4);

  // Reference ruler: a line exactly 1 inch long to verify scale.
  const rulerTopIn = topIn + 0.05;
  const rulerLeftIn = leftIn;
  const ry = inToPt(paperHIn - rulerTopIn);
  page.drawLine({
    start: { x: inToPt(rulerLeftIn), y: ry },
    end: { x: inToPt(rulerLeftIn + 1), y: ry },
    thickness: 1,
    color: INK,
  });
  // End ticks.
  for (const tx of [rulerLeftIn, rulerLeftIn + 1]) {
    page.drawLine({
      start: { x: inToPt(tx), y: ry },
      end: { x: inToPt(tx), y: ry + 6 },
      thickness: 1,
      color: INK,
    });
  }
  const lbl = box(paperHIn, rulerLeftIn + 1.12, rulerTopIn - 0.11, 4, 0.12);
  page.drawText('<- this line should measure exactly 1 inch when printed', {
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
  const { wIn: paperWIn, hIn: paperHIn } = PAPER_SIZES[opts.paper];
  const layout = computeLayout({ ...opts, frameCount: frames.length }, videoAspect);

  const doc = await PDFDocument.create();
  doc.setTitle(opts.title.trim() || 'Flipbook');
  doc.setCreator('Flipbook Maker');
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  await addInstructionsPage(doc, opts, layout, frames.length, paperWIn, paperHIn, bold, regular);

  const perPage = layout.cardsPerPage;
  for (let start = 0; start < frames.length; start += perPage) {
    const page = doc.addPage([inToPt(paperWIn), inToPt(paperHIn)]);
    const pageFrames = frames.slice(start, start + perPage);
    for (let i = 0; i < pageFrames.length; i++) {
      const frame = pageFrames[i];
      const slot = layout.slots[i];
      drawCutGuide(page, paperHIn, slot);
      const img = await doc.embedJpg(frame.jpeg);
      const b = box(paperHIn, slot.imgX, slot.imgY, slot.imgW, slot.imgH);
      page.drawImage(img, b);
      drawNumber(page, paperHIn, slot, frame.index, regular);
    }
  }

  return doc.save();
}
