/**
 * Leses av dev-ruten som en subprocess (ESM-bro for pdfjs-dist).
 * Mottar PDF som base64 på stdin, returnerer tekst som JSON på stdout.
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', async () => {
  try {
    const buffer = Buffer.from(input.trim(), 'base64');
    const uint8 = new Uint8Array(buffer);
    const pdfDoc = await getDocument({ data: uint8 }).promise;
    const pages = pdfDoc.numPages;
    const textParts = [];
    for (let i = 1; i <= pages; i++) {
      const page = await pdfDoc.getPage(i);
      const content = await page.getTextContent();
      textParts.push(content.items.map(item => item.str).join(' '));
    }
    process.stdout.write(JSON.stringify({ text: textParts.join('\n').trim(), pages }));
  } catch (e) {
    process.stderr.write(e.message);
    process.exit(1);
  }
});
