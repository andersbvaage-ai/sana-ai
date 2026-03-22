import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import AdmZip from 'adm-zip';
import path from 'path';
import { scrubNorwegianPII } from '../scrubbing/norwegianScrubber';

export interface ParsedDocument {
  text: string;
  pages: number;
  filename: string;
}

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt'];

export function isMandateFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.includes('mandat') || lower.includes('oppdrag');
  // TODO: Morten to refine these patterns based on real-world filenames
}

export async function parseBuffer(buffer: Buffer, filename: string): Promise<ParsedDocument> {
  const ext = path.extname(filename).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  if (ext === '.pdf') {
    const result = await pdf(buffer);
    return {
      text: scrubNorwegianPII(result.text),
      pages: result.numpages,
      filename,
    };
  }

  // .txt
  if (ext === '.txt') {
    const text = buffer.toString('utf-8');
    const lines = text.split('\n').filter((l: string) => l.trim()).length;
    return {
      text: scrubNorwegianPII(text),
      pages: Math.max(1, Math.round(lines / 40)),
      filename,
    };
  }

  // .docx / .doc
  const result = await mammoth.extractRawText({ buffer });
  const lines = result.value.split('\n').filter((l: string) => l.trim()).length;
  return {
    text: scrubNorwegianPII(result.value),
    pages: Math.max(1, Math.round(lines / 40)),
    filename,
  };
}

export async function parseZip(buffer: Buffer, zipFilename: string): Promise<{
  documents: ParsedDocument[];
  mandateDoc: ParsedDocument | null;
  combinedText: string;
}> {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries()
    .filter(e => !e.isDirectory && SUPPORTED_EXTENSIONS.includes(path.extname(e.entryName).toLowerCase()))
    .sort((a, b) => a.entryName.localeCompare(b.entryName));

  if (entries.length === 0) {
    throw new Error('ZIP-filen inneholder ingen PDF- eller Word-filer');
  }

  const documents: ParsedDocument[] = [];
  let mandateDoc: ParsedDocument | null = null;

  for (const entry of entries) {
    try {
      const doc = await parseBuffer(entry.getData(), path.basename(entry.entryName));
      documents.push(doc);
      if (!mandateDoc && isMandateFilename(doc.filename)) {
        mandateDoc = doc;
      }
    } catch (e) {
      console.warn(`Could not parse ${entry.entryName}:`, (e as Error).message);
    }
  }

  const combinedText = documents
    .map(d => `\n\n=== FIL: ${d.filename} (${d.pages} sider) ===\n${d.text.substring(0, 60000)}`)
    .join('')
    .substring(0, 200000);

  return { documents, mandateDoc, combinedText };
}
