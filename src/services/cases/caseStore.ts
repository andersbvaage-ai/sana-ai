import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Case } from '../../config/types';

const BUCKET = process.env['CASE_STORE_S3_BUCKET'];
const S3_KEY = 'cases.json';
const REGION = process.env['AWS_REGION'] ?? 'eu-north-1';

const s3 = BUCKET ? new S3Client({ region: REGION }) : null;

// ─── In-memory cache ──────────────────────────────────────────────────────────
const store = new Map<string, Case>();
let initialized = false;

async function loadFromS3(): Promise<void> {
  if (!s3 || !BUCKET) return;
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: S3_KEY }));
    const body = await res.Body!.transformToString('utf-8');
    const entries = JSON.parse(body) as [string, Case][];
    for (const [k, v] of entries) store.set(k, v);
  } catch (err: unknown) {
    if ((err as { name?: string }).name !== 'NoSuchKey') {
      console.error('[caseStore] Feil ved lasting fra S3:', err);
    }
    // NoSuchKey = tom bucket, starter tomt
  }
}

async function saveToS3(): Promise<void> {
  if (!s3 || !BUCKET) return;
  const body = JSON.stringify([...store.entries()], null, 2);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: S3_KEY,
    Body: body,
    ContentType: 'application/json',
  }));
}

function saveToFile(): void {
  if (BUCKET) return; // S3 er primær, fil brukes kun lokalt
  try {
    const { writeFileSync } = require('fs');
    const path = require('path');
    const storePath = path.resolve(process.env['CASE_STORE_PATH'] ?? './cases.json');
    writeFileSync(storePath, JSON.stringify([...store.entries()], null, 2), 'utf-8');
  } catch (err) {
    console.error('[caseStore] Feil ved lagring til disk:', err);
  }
}

// ─── Init: kalles fra server.ts ved oppstart ───────────────────────────────────
export async function initCaseStore(): Promise<void> {
  if (initialized) return;
  if (BUCKET) {
    await loadFromS3();
  } else {
    // Lokal fallback for dev
    try {
      const { readFileSync, existsSync } = require('fs');
      const path = require('path');
      const storePath = path.resolve(process.env['CASE_STORE_PATH'] ?? './cases.json');
      if (existsSync(storePath)) {
        const entries = JSON.parse(readFileSync(storePath, 'utf-8')) as [string, Case][];
        for (const [k, v] of entries) store.set(k, v);
      }
    } catch {
      console.warn('[caseStore] Kunne ikke laste cases.json – starter tomt');
    }
  }
  initialized = true;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export const caseStore = {
  async add(c: Case): Promise<void> {
    store.set(c.id, c);
    if (BUCKET) await saveToS3(); else saveToFile();
  },
  get(id: string): Case | undefined {
    return store.get(id);
  },
  list(): Case[] {
    return Array.from(store.values()).sort(
      (a, b) => new Date(b.lastOppTidspunkt).getTime() - new Date(a.lastOppTidspunkt).getTime()
    );
  },
  async update(id: string, patch: Partial<Case>): Promise<Case | undefined> {
    const existing = store.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    store.set(id, updated);
    if (BUCKET) await saveToS3(); else saveToFile();
    return updated;
  },
  async delete(id: string): Promise<boolean> {
    if (!store.has(id)) return false;
    store.delete(id);
    if (BUCKET) await saveToS3(); else saveToFile();
    return true;
  },
};
