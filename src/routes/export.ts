import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { caseStore } from '../services/cases/caseStore';

export const exportRouter = Router();

const NAVY  = '#1B3A4B';
const GOLD  = '#B8935A';
const GRAY  = '#6B7280';
const LIGHT = '#F3F4F6';
const RED   = '#991B1B';
const AMBER = '#92400E';
const GREEN = '#1A5C3A';
const BLUE  = '#1E3A8A';

function critColor(level: string): string {
  return { Kritisk: RED, Høy: AMBER, Middels: BLUE, Lav: GREEN }[level] ?? BLUE;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('no-NO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

exportRouter.get('/:id/export', (req: Request, res: Response): void => {
  const c = caseStore.get(req.params.id);
  if (!c) {
    res.status(404).json({ error: 'Sak ikke funnet', code: 'NOT_FOUND' });
    return;
  }

  const safeName = c.filnavn.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9æøåÆØÅ\-_ ]/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="sana-ai-${safeName}.pdf"`);

  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
  doc.pipe(res);

  const pageW = doc.page.width;
  const margin = 50;
  const contentW = pageW - margin * 2;

  // ── Header ──────────────────────────────────────────────────────────────
  doc.rect(0, 0, pageW, 72).fill(NAVY);
  doc.fontSize(20).font('Helvetica-Bold').fillColor('white')
    .text('Sana', margin, 24, { continued: true })
    .fillColor(GOLD).text('AI');
  doc.fontSize(10).font('Helvetica').fillColor('rgba(255,255,255,0.6)')
    .text('Klagesak-analyse', margin, 48);
  doc.fillColor(NAVY);

  // ── Tittel ───────────────────────────────────────────────────────────────
  let y = 100;
  doc.fontSize(16).font('Helvetica-Bold').fillColor(NAVY)
    .text(c.filnavn, margin, y, { width: contentW });
  y = doc.y + 6;

  // Status-badge tekst
  const statusText = c.status === 'vurdert' ? '✓ Vurdert av lege' : '⏳ Til vurdering';
  const statusColor = c.status === 'vurdert' ? GREEN : AMBER;
  doc.fontSize(10).font('Helvetica').fillColor(statusColor).text(statusText, margin, y);
  y = doc.y + 4;

  // Metadata-rad
  doc.fontSize(9).fillColor(GRAY)
    .text(`Lastet opp: ${formatDate(c.lastOppTidspunkt)}`, margin, y, { continued: true })
    .text(`   |   Dokumenter: ${c.dokumenter.length}`, { continued: true })
    .text(`   |   Modell: ${c.modellId ?? 'claude-sonnet-4-6'}`);
  y = doc.y + 16;

  // Skillelinje
  doc.moveTo(margin, y).lineTo(pageW - margin, y).lineWidth(0.5).strokeColor(LIGHT).stroke();
  y += 16;

  // ── AI-analyse ──────────────────────────────────────────────────────────
  sectionHeader(doc, 'AI-analyse', margin, y, contentW, NAVY);
  y = doc.y + 10;

  // Sammendrag
  fieldLabel(doc, 'Sammendrag', margin, y);
  y = doc.y + 4;
  doc.fontSize(11).font('Helvetica').fillColor('#1F2937')
    .text(c.analyse.sammendrag, margin, y, { width: contentW, lineGap: 3 });
  y = doc.y + 12;

  // Standpunkt
  fieldLabel(doc, 'Standpunkt', margin, y);
  y = doc.y + 4;
  doc.fontSize(11).font('Helvetica-Bold').fillColor(NAVY)
    .text(c.analyse.standpunkt, margin, y, { continued: true });
  doc.font('Helvetica').fillColor(GRAY)
    .text(`  —  ${c.analyse.standpunktBegrunnelse}`, { width: contentW });
  y = doc.y + 12;

  // Kritikalitet + score side om side
  const colW = (contentW - 16) / 2;
  fieldLabel(doc, 'Kritikalitet', margin, y);
  fieldLabel(doc, 'Prioritetsscore', margin + colW + 16, y);
  y = doc.y + 4;
  doc.fontSize(12).font('Helvetica-Bold').fillColor(critColor(c.analyse.kritikalitet))
    .text(c.analyse.kritikalitet, margin, y);
  const score = c.analyse.prioritetScore ?? 0;
  doc.fillColor(critColor(c.analyse.kritikalitet))
    .text(`${score}%`, margin + colW + 16, y);
  y = doc.y + 12;

  // Estimert tid
  fieldLabel(doc, 'Estimert behandlingstid', margin, y);
  y = doc.y + 4;
  doc.fontSize(11).font('Helvetica').fillColor('#1F2937').text(c.analyse.estimertTid, margin, y);
  y = doc.y + 12;

  // Begrunnelse
  fieldLabel(doc, 'AI-begrunnelse', margin, y);
  y = doc.y + 4;
  doc.fontSize(11).font('Helvetica').fillColor('#1F2937')
    .text(c.analyse.begrunnelse, margin, y, { width: contentW, lineGap: 3 });
  y = doc.y + 12;

  // Hovedpunkter
  if (c.analyse.hovedpunkter?.length) {
    fieldLabel(doc, 'Hovedpunkter', margin, y);
    y = doc.y + 4;
    c.analyse.hovedpunkter.forEach(p => {
      doc.fontSize(11).font('Helvetica').fillColor(GOLD).text('•', margin, doc.y, { continued: true, width: 12 });
      doc.fillColor('#1F2937').text('  ' + p, { width: contentW - 16, lineGap: 2 });
    });
    y = doc.y + 12;
  }

  // ── Legevurdering ───────────────────────────────────────────────────────
  if (c.legeVurdering) {
    const lv = c.legeVurdering;
    doc.moveTo(margin, doc.y).lineTo(pageW - margin, doc.y).lineWidth(0.5).strokeColor(LIGHT).stroke();
    y = doc.y + 16;

    sectionHeader(doc, 'Legevurdering', margin, y, contentW, GREEN);
    y = doc.y + 10;

    fieldLabel(doc, 'Kritikalitet (lege)', margin, y);
    fieldLabel(doc, 'Estimert tid (lege)', margin + colW + 16, y);
    y = doc.y + 4;
    doc.fontSize(12).font('Helvetica-Bold').fillColor(critColor(lv.kritikalitet))
      .text(lv.kritikalitet, margin, y);
    doc.fillColor(NAVY).text(lv.estimertTid, margin + colW + 16, y);
    y = doc.y + 12;

    if (lv.notater) {
      fieldLabel(doc, 'Notater fra lege', margin, y);
      y = doc.y + 4;
      doc.fontSize(11).font('Helvetica').fillColor('#1F2937')
        .text(lv.notater, margin, y, { width: contentW, lineGap: 3 });
      y = doc.y + 12;
    }

    fieldLabel(doc, 'Vurdert tidspunkt', margin, y);
    y = doc.y + 4;
    doc.fontSize(11).font('Helvetica').fillColor(GRAY).text(formatDate(lv.vurdertTidspunkt), margin, y);
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    const footerY = doc.page.height - 40;
    doc.moveTo(margin, footerY - 8).lineTo(pageW - margin, footerY - 8).lineWidth(0.5).strokeColor(LIGHT).stroke();
    doc.fontSize(8).font('Helvetica').fillColor(GRAY)
      .text(`Generert av Sana AI · ${formatDate(new Date().toISOString())}`, margin, footerY, { continued: true, width: contentW - 100 })
      .text(`Side ${i + 1} av ${pageCount}`, { align: 'right', width: 100 });
    doc.fontSize(7).fillColor(LIGHT)
      .text('Dette dokumentet er generert av et AI-system og må gjennomgås av autorisert helsepersonell før bruk.', margin, footerY + 12, { width: contentW });
  }

  doc.end();
});

function sectionHeader(doc: PDFKit.PDFDocument, title: string, x: number, y: number, w: number, color: string): void {
  doc.rect(x, y, w, 26).fill(color);
  doc.fontSize(10).font('Helvetica-Bold').fillColor('white')
    .text(title.toUpperCase(), x + 10, y + 8, { width: w - 20, characterSpacing: 0.8 });
  doc.fillColor(NAVY);
}

function fieldLabel(doc: PDFKit.PDFDocument, label: string, x: number, y: number): void {
  doc.fontSize(8).font('Helvetica-Bold').fillColor(GRAY)
    .text(label.toUpperCase(), x, y, { characterSpacing: 0.5 });
}
