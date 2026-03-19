import { spawn } from 'child_process';
import path from 'path';
import mammoth from 'mammoth';

const PDF_PARSER = path.join(__dirname, '../pdf/parsePdf.mjs');

const PDF_PARSE_TIMEOUT_MS = 30_000;

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [PDF_PARSER], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('PDF-parsing tok for lang tid (timeout etter 30s)'));
    }, PDF_PARSE_TIMEOUT_MS);

    child.stdout.on('data', (d: Buffer) => { out += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { err += d.toString(); });
    child.on('close', (code: number) => {
      clearTimeout(timeout);
      if (code !== 0) return reject(new Error(err || 'PDF-parsing feilet'));
      try { resolve(JSON.parse(out).text); } catch { reject(new Error('Ugyldig respons fra PDF-parser')); }
    });

    child.stdin.write(buffer.toString('base64'));
    child.stdin.end();
  });
}

export async function extractTextFromWord(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}
