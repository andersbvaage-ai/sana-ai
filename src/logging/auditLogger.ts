/**
 * F5-1 og F5-2: Revisjonslogg.
 *
 * MVP-backend: skriver til lokal JSONL-fil (én JSON-objekt per linje).
 * Produksjons-backend: Azure Immutable Blob Storage (WORM – Write Once Read Many).
 *
 * Logginnholdet følger F5-1:
 *   bruker-ID, rolle, pasient-pseudonym (IKKE fnr), EPJ-notat-ID,
 *   tidspunkt, utfall, modell-ID, tokens, skrubbede felt.
 *
 * Loggen inneholder ALDRI journalinnhold (F5-2 / SK-15).
 */

import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { AuditLogEntry, CaseAuditLogEntry } from '../config/types';

// ─── Skriver til JSONL-fil (MVP) ──────────────────────────────────────────────
function writeToFile(entry: AuditLogEntry): void {
  const logPath = path.resolve(config.audit.filePath);
  const line = JSON.stringify(entry) + '\n';

  // appendFileSync er atomisk nok for MVP; i produksjon erstattes med Blob append
  fs.appendFileSync(logPath, line, 'utf8');
}

// ─── Skriver til Azure Immutable Blob Storage (produksjon) ───────────────────
async function writeToAzureBlob(entry: AuditLogEntry): Promise<void> {
  /**
   * Azure Blob Storage med Immutable (WORM) policy sikrer at logger ikke
   * kan slettes eller modifiseres etter skriving (F5-2, SK-14).
   *
   * Bruker @azure/storage-blob SDK i produksjon.
   * Container må ha "time-based retention policy" konfigurert i Azure-portalen.
   */
  const { BlobServiceClient } = await import('@azure/storage-blob');

  const blobServiceClient = BlobServiceClient.fromConnectionString(
    config.audit.azureBlobConnectionString
  );
  const containerClient = blobServiceClient.getContainerClient(
    config.audit.azureBlobContainer
  );

  // Filnavn: YYYY-MM/DD/correlationId.json
  const date = new Date(entry.requestTimestamp);
  const blobName = [
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    String(date.getDate()).padStart(2, '0'),
    `${entry.correlationId}.json`,
  ].join('/');

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const content = JSON.stringify(entry, null, 2);

  await blockBlobClient.upload(content, Buffer.byteLength(content), {
    blobHTTPHeaders: { blobContentType: 'application/json' },
  });
}

// ─── Hoved-API ────────────────────────────────────────────────────────────────
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  // Sikkerhetskontroll: logginnholdet skal ALDRI inneholde journaltekst
  // Dette er en siste forsvarslinje – journalteksten skal aldri nå hit
  const entryStr = JSON.stringify(entry);
  if (entryStr.length > 5000) {
    // Logg-oppføringen er uvanlig stor – noe er galt
    console.error(
      '[AUDIT] ADVARSEL: Loggoppføring er uvanlig stor, mulig datalekkasje',
      { correlationId: entry.correlationId, size: entryStr.length }
    );
  }

  try {
    if (config.audit.backend === 'azure-blob') {
      await writeToAzureBlob(entry);
    } else if (config.audit.backend === 'cloudwatch') {
      process.stdout.write('[AUDIT] ' + JSON.stringify(entry) + '\n');
    } else {
      writeToFile(entry);
    }
  } catch (err) {
    console.error('[AUDIT] Feil ved skriving av revisjonslogg:', err);
  }
}

/** Audit-logging for klagesaker */
export async function writeCaseAuditLog(entry: CaseAuditLogEntry): Promise<void> {
  const entryStr = JSON.stringify(entry);
  if (entryStr.length > 5000) {
    console.error('[AUDIT] ADVARSEL: Klagesak-loggoppføring er uvanlig stor', {
      caseId: entry.caseId, size: entryStr.length,
    });
  }
  try {
    if (config.audit.backend === 'azure-blob') {
      await writeCaseToAzureBlob(entry);
    } else if (config.audit.backend === 'cloudwatch') {
      process.stdout.write('[AUDIT] ' + JSON.stringify(entry) + '\n');
    } else {
      writeCaseToFile(entry);
    }
  } catch (err) {
    console.error('[AUDIT] Feil ved skriving av klagesak-revisjonslogg:', err);
  }
}

function writeCaseToFile(entry: CaseAuditLogEntry): void {
  const logPath = path.resolve(config.audit.filePath.replace('.jsonl', '-cases.jsonl'));
  fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
}

async function writeCaseToAzureBlob(entry: CaseAuditLogEntry): Promise<void> {
  const { BlobServiceClient } = await import('@azure/storage-blob');
  const blobServiceClient = BlobServiceClient.fromConnectionString(config.audit.azureBlobConnectionString);
  const containerClient = blobServiceClient.getContainerClient(config.audit.azureBlobContainer);
  const date = new Date(entry.requestTimestamp);
  const blobName = [
    `cases/${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    String(date.getDate()).padStart(2, '0'),
    `${entry.caseId}_${entry.type}.json`,
  ].join('/');
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const content = JSON.stringify(entry, null, 2);
  await blockBlobClient.upload(content, Buffer.byteLength(content), {
    blobHTTPHeaders: { blobContentType: 'application/json' },
  });
}

/** Hjelpefunksjon for å lage en feil-loggoppføring */
export function makeErrorEntry(
  correlationId: string,
  userId: string,
  patientId: string,
  noteId: string,
  errorCode: string
): AuditLogEntry {
  const now = new Date().toISOString();
  return {
    correlationId,
    userId,
    role: 'annet',
    patientPseudonym: patientId,
    noteId,
    requestTimestamp: now,
    responseTimestamp: now,
    outcome: 'feil',
    modelId: 'N/A',
    tokensInput: 0,
    tokensOutput: 0,
    scrubbedFields: [],
    errorCode,
  };
}
