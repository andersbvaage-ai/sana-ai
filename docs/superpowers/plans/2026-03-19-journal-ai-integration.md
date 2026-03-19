# Journal AI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge Journal AI's document analysis functionality (PDF/DOCX/ZIP parsing, Norwegian PII scrubbing, SSE streaming analysis, key fact extraction) into Sana AI as a self-contained `/api/journal/*` module.

**Architecture:** New route `src/routes/journal.ts` handles all journal endpoints. Shared services (`norwegianScrubber`, `documentParser`, `documentStore`, `factExtractor`) are added under `src/services/`. The existing `bedrockClient.ts` is extended with a streaming function. All AI calls go through Bedrock eu-north-1.

**Tech Stack:** TypeScript, Express, multer, pdf-parse, mammoth, adm-zip, Jest, AWS Bedrock (Sonnet for chat, Haiku for facts), SSE

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/services/scrubbing/norwegianScrubber.ts` | Norwegian PII regex scrubbing |
| Rename | `src/services/scrubbing/inputScrubber.ts` → `legacyScrubber.ts` | Keep existing case routes working |
| Create | `src/services/documents/documentParser.ts` | PDF/DOCX/ZIP text extraction |
| Create | `src/services/journal/journalPrompt.ts` | System prompt + score extraction |
| Create | `src/services/journal/documentStore.ts` | In-memory session store (Map keyed by userId) |
| Create | `src/services/journal/factExtractor.ts` | Key fact extraction via Haiku |
| Modify | `src/services/ai/bedrockClient.ts` | Add `invokeModelStream()` + optional modelId to `invokeModel()` |
| Create | `src/routes/journal.ts` | All /api/journal/* endpoints |
| Modify | `src/app.ts` | Wire up journalRouter |
| Create | `public/journal.html` | Frontend page |
| Create | `public/journal.js` | Frontend logic |
| Create | `tests/norwegianScrubber.test.ts` | Scrubber unit tests |
| Create | `tests/documentParser.test.ts` | Parser unit tests |
| Create | `tests/factExtractor.test.ts` | Fact extractor unit tests |
| Create | `tests/journal.integration.test.ts` | Route integration tests |

---

## Task 1: Install adm-zip and verify Haiku availability

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install adm-zip**

```bash
cd C:\Users\ander\Dropbox\Business\Claude\sana-ai-integration
npm install adm-zip
npm install --save-dev @types/adm-zip
```

Expected: `package.json` updated, `node_modules/adm-zip` present.

- [ ] **Step 2: Verify Haiku model ID in AWS Bedrock console**

Open AWS Bedrock console → eu-north-1 → Model access. Confirm `anthropic.claude-haiku-4-5-20251001` is available. If NOT available, use `anthropic.claude-sonnet-4-6` for both chat and facts (update Task 7 accordingly).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add adm-zip for ZIP document parsing"
```

---

## Task 2: Norwegian PII Scrubber

**Files:**
- Create: `src/services/scrubbing/norwegianScrubber.ts`
- Create: `tests/norwegianScrubber.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/norwegianScrubber.test.ts`:

```typescript
import { scrubNorwegianPII } from '../src/services/scrubbing/norwegianScrubber';

describe('scrubNorwegianPII', () => {
  it('replaces Norwegian personal numbers', () => {
    const result = scrubNorwegianPII('Pasient fnr: 12057812345');
    expect(result).not.toContain('12057812345');
    expect(result).toContain('[FØDSELSNUMMER]');
  });

  it('replaces phone numbers', () => {
    const result = scrubNorwegianPII('Tlf: 91234567');
    expect(result).toContain('[TELEFON]');
  });

  it('replaces email addresses', () => {
    const result = scrubNorwegianPII('Kontakt: test@example.com');
    expect(result).toContain('[EPOST]');
  });

  it('replaces dates', () => {
    const result = scrubNorwegianPII('Dato: 15.06.2021');
    expect(result).toContain('[DATO]');
  });

  it('replaces postal codes with city', () => {
    const result = scrubNorwegianPII('Adresse: 0182 Oslo');
    expect(result).toContain('[POSTNR BY]');
  });

  it('replaces D-numbers', () => {
    const result = scrubNorwegianPII('D-nummer: 41057812345');
    expect(result).toContain('[D-NUMMER]');
  });

  it('returns unchanged text when no PII found', () => {
    const clean = 'Pasienten klager over hodepine og kvalme.';
    expect(scrubNorwegianPII(clean)).toBe(clean);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/norwegianScrubber.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../src/services/scrubbing/norwegianScrubber'`

- [ ] **Step 3: Implement scrubber**

Create `src/services/scrubbing/norwegianScrubber.ts`:

```typescript
const PII_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b\d{2}[01]\d[2-9]\d{7}\b/g, replacement: '[FØDSELSNUMMER]' },
  { pattern: /\b[4-7]\d{10}\b/g, replacement: '[D-NUMMER]' },
  { pattern: /(\+47[\s-]?)?[49]\d{7}\b/g, replacement: '[TELEFON]' },
  { pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, replacement: '[EPOST]' },
  { pattern: /\b\d{2}[./]\d{2}[./]\d{4}\b/g, replacement: '[DATO]' },
  { pattern: /\b\d{4}\s+[A-ZÆØÅ][A-Za-zÆØÅæøå]+/g, replacement: '[POSTNR BY]' },
];

export function scrubNorwegianPII(text: string): string {
  return PII_RULES.reduce((t, rule) => t.replace(rule.pattern, rule.replacement), text);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/norwegianScrubber.test.ts --no-coverage
```

Expected: 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/scrubbing/norwegianScrubber.ts tests/norwegianScrubber.test.ts
git commit -m "feat: add Norwegian PII scrubber for journal module"
```

---

## Task 3: Document Parser (PDF / DOCX / ZIP)

**Files:**
- Create: `src/services/documents/documentParser.ts`
- Create: `tests/documentParser.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/documentParser.test.ts`:

```typescript
import { parseBuffer, ParsedDocument } from '../src/services/documents/documentParser';
import { readFileSync } from 'fs';
import { join } from 'path';

// These tests use fixtures. Create minimal test files if they don't exist.
// For now, test the interface contract with mocked buffers.

describe('parseBuffer', () => {
  it('throws on unsupported file type', async () => {
    const buf = Buffer.from('hello');
    await expect(parseBuffer(buf, 'file.xyz')).rejects.toThrow('Unsupported');
  });

  it('returns ParsedDocument shape for pdf', async () => {
    // Minimal valid 1-page PDF
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage();
    const bytes = await pdfDoc.save();
    const buf = Buffer.from(bytes);
    const result = await parseBuffer(buf, 'test.pdf');
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('pages');
    expect(typeof result.text).toBe('string');
    expect(typeof result.pages).toBe('number');
  });
});

describe('isMandateFilename', () => {
  it('detects mandat in filename', () => {
    const { isMandateFilename } = require('../src/services/documents/documentParser');
    expect(isMandateFilename('oppdrag_2024.pdf')).toBe(true);
    expect(isMandateFilename('MANDAT_01.pdf')).toBe(true);
    expect(isMandateFilename('journal.pdf')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx jest tests/documentParser.test.ts --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement document parser**

Create `src/services/documents/documentParser.ts`:

```typescript
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

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc'];

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

  // .docx / .doc
  const result = await mammoth.extractRawText({ buffer });
  const lines = result.value.split('\n').filter(l => l.trim()).length;
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
```

- [ ] **Step 4: Run tests**

```bash
npx jest tests/documentParser.test.ts --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/documents/documentParser.ts tests/documentParser.test.ts
git commit -m "feat: add document parser for PDF/DOCX/ZIP"
```

---

## Task 4: Journal Prompt and Score Extraction

**Files:**
- Create: `src/services/journal/journalPrompt.ts`

No TDD needed — pure string functions. Verify manually.

- [ ] **Step 1: Create journal prompt module**

Create `src/services/journal/journalPrompt.ts`:

```typescript
export interface JournalScores {
  svindelrisiko: number;
  kompleksitet: number;
  informasjonsgrunnlag: number;
}

export function buildJournalSystemPrompt(documentBlock: string): string {
  return `Du er en ekspert AI-assistent for norsk forsikringsbransje, spesialisert i:
- Medisinsk dokumentasjon og pasientjournaler (ICD-10, ICPC-2)
- Norsk forsikringsrett (FAL, Skadeerstatningsloven, NAV-regelverk)
- Identifisering av svindelmønstre i forsikringssaker
- Vurdering av varig medisinsk invaliditet (VMI) og arbeidsuførhet

DOKUMENTTYPER:
- **MANDAT**: Oppdragsbrev fra forsikringsselskapet. Styrende for analysen — svar alltid direkte og nummert på mandatets spørsmål.
- **PASIENTJOURNAL**: Behandlingshistorikk, konsultasjonsnotater, diagnosekoder.
- **NAV-MAPPE**: Vedtak, ytelseshistorikk, AAP-perioder, uføresøknader.
- **LEGEERKLÆRING**: Spesialistuttalelser, epikrise.

NORSKE INVALIDITETSTABELLER:
**1. Invaliditetstabellen 1997** (Sosial- og helsedepartementet):
- Nakkeslengskade WAD I/II: 3–15 % VMI
- Nakkeskade WAD III: 15–30 % VMI
- ACL: 5–15 % VMI | Menisk: 3–8 % | Skulder rotator: 8–25 %
- Rygg lumbalt: 3–35 % | PTSD: 15–40 %

**2. Barnetabellen**: For skader før 16 år. Typisk 10–30 % høyere enn 1997-tabellen.

**3. NPE Pasientskade-tabellen**: For pasientskader (feildiagnose, kirurgiske komplikasjoner).

VMI-vurdering skal alltid oppgi: Diagnose → tabell → prosentsats → begrunnelse.

INSTRUKSJONER:
- Svar alltid på norsk, faglig og strukturert
- Hold svarene korte: maks 3 bullet-punkter, én linje Konklusjon
- Henvis til konkrete funn, unngå lange sitater
- Svar KUN på spørsmål relevante for dokumentene og forsikringssaken

Start ALLTID med denne JSON-linjen på en separat første linje:
SCORES:{"svindelrisiko": X, "kompleksitet": Y, "informasjonsgrunnlag": Z}
(Heltall 0–100: svindelrisiko=mistanke, kompleksitet=sakskompleksitet, informasjonsgrunnlag=dokumentkvalitet)

TILGJENGELIGE DOKUMENTER (PII-anonymisert):
${documentBlock}`;
}

export function extractScores(text: string): JournalScores | null {
  const match = text.match(/SCORES:\s*(\{[^}]+\})/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[1]);
    const clamp = (v: unknown) => Math.min(100, Math.max(0, parseInt(String(v)) || 0));
    return {
      svindelrisiko: clamp(obj.svindelrisiko),
      kompleksitet: clamp(obj.kompleksitet),
      informasjonsgrunnlag: clamp(obj.informasjonsgrunnlag),
    };
  } catch {
    return null;
  }
}

export function stripScoresPrefix(text: string): string {
  return text.replace(/^SCORES:\{[^}]+\}\s*\n?/, '').replace(/\nSCORES:\{[^}]+\}\s*$/, '').trim();
}
```

- [ ] **Step 2: Verify module compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/journal/journalPrompt.ts
git commit -m "feat: add journal system prompt and score extraction"
```

---

## Task 5: Document Store (In-Memory Session)

**Files:**
- Create: `src/services/journal/documentStore.ts`

- [ ] **Step 1: Create document store**

Create `src/services/journal/documentStore.ts`:

```typescript
import { ParsedDocument } from '../documents/documentParser';

export interface JournalSession {
  userId: string;
  documents: {
    journal?: ParsedDocument;
    nav?: ParsedDocument;
    legeerklæring?: ParsedDocument;
    mandat?: ParsedDocument;
    samlet?: ParsedDocument & { isZip?: boolean; zipFiles?: string[] };
  };
  conversation: Array<{ role: 'user' | 'assistant'; content: string }>;
  scores: { svindelrisiko: number; kompleksitet: number; informasjonsgrunnlag: number };
  createdAt: Date;
}

const store = new Map<string, JournalSession>();

export function getSession(userId: string): JournalSession | undefined {
  return store.get(userId);
}

export function setSession(userId: string, session: JournalSession): void {
  store.set(userId, session);
}

export function resetSession(userId: string): void {
  store.delete(userId);
}

export function createEmptySession(userId: string): JournalSession {
  return {
    userId,
    documents: {},
    conversation: [],
    scores: { svindelrisiko: 0, kompleksitet: 0, informasjonsgrunnlag: 0 },
    createdAt: new Date(),
  };
}

export function buildDocumentBlock(session: JournalSession): string {
  const { documents: d } = session;
  if (d.samlet) {
    const zipInfo = d.samlet.isZip
      ? `ZIP-arkiv med filer: ${d.samlet.zipFiles?.join(', ')}. Bruk filnavnene til å identifisere dokumenttyper.`
      : 'Én samlet PDF.';
    return `\n\n## SAMLET DOKUMENT (${d.samlet.filename}, ${d.samlet.pages} sider)\n${zipInfo}\n\n${d.samlet.text}`;
  }
  let block = '';
  if (d.mandat) block += `\n\n## MANDAT (${d.mandat.filename}, ${d.mandat.pages} sider)\n${d.mandat.text.substring(0, 20000)}`;
  if (d.journal) block += `\n\n## PASIENTJOURNAL (${d.journal.filename}, ${d.journal.pages} sider)\n${d.journal.text.substring(0, 80000)}`;
  if (d.nav) block += `\n\n## NAV-MAPPE (${d.nav.filename}, ${d.nav.pages} sider)\n${d.nav.text.substring(0, 80000)}`;
  if (d.legeerklæring) block += `\n\n## LEGEERKLÆRING (${d.legeerklæring.filename}, ${d.legeerklæring.pages} sider)\n${d.legeerklæring.text.substring(0, 40000)}`;
  return block;
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/journal/documentStore.ts
git commit -m "feat: add in-memory document store for journal sessions"
```

---

## Task 6: Extend bedrockClient + Fact Extractor

**Files:**
- Modify: `src/services/ai/bedrockClient.ts`
- Create: `src/services/journal/factExtractor.ts`
- Create: `tests/factExtractor.test.ts`

- [ ] **Step 1: Add invokeModelStream and modelId override to bedrockClient**

Read `src/services/ai/bedrockClient.ts` first, then apply these two changes:

**Change 1 — update `invokeModel` signature and model lookup (replace existing function):**

```typescript
export async function invokeModel(
  systemPrompt: string,
  userMessage: string,
  requestId: string,
  maxTokens?: number,
  modelId?: string
): Promise<{ text: string; inputTokens: number; outputTokens: number; modelId: string }> {
  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens ?? config.aws.maxTokens,
    temperature: 0.1,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  };

  const command = new InvokeModelCommand({
    modelId: modelId ?? config.aws.modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(body),
  });

  const response = await bedrockClient.send(command);
  const result = JSON.parse(
    new TextDecoder().decode(response.body)
  ) as BedrockClaudeResponse;

  if (!result.content?.[0]?.text || result.stop_reason === 'error') {
    throw new AIClientError('AI_NO_RESPONSE', 'AI-modellen returnerte ingen respons');
  }

  return {
    text: result.content[0].text,
    inputTokens: result.usage.input_tokens,
    outputTokens: result.usage.output_tokens,
    modelId: result.model ?? (modelId ?? config.aws.modelId),
  };
}
```

**Change 2 — add `invokeModelStream` after `invokeModel` (new function):**

First add the import at the top of the file alongside the existing import:
```typescript
import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
```

Then add the function:
```typescript
export async function* invokeModelStream(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  requestId: string,
  maxTokens = 8192
): AsyncGenerator<string> {
  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages.slice(-20),
  };

  const command = new InvokeModelWithResponseStreamCommand({
    modelId: config.aws.modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(body),
  });

  const response = await bedrockClient.send(command);
  for await (const event of response.body!) {
    if (event.chunk?.bytes) {
      const json = JSON.parse(new TextDecoder().decode(event.chunk.bytes)) as {
        type: string;
        delta?: { type: string; text?: string };
      };
      if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta' && json.delta.text) {
        yield json.delta.text;
      }
    }
  }
}
```

- [ ] **Step 2: Write failing tests for factExtractor**

Create `tests/factExtractor.test.ts`:

```typescript
import { extractFacts } from '../src/services/journal/factExtractor';
import { JournalSession, createEmptySession } from '../src/services/journal/documentStore';
import { ParsedDocument } from '../src/services/documents/documentParser';

// Mock invokeModel to avoid real AWS calls
jest.mock('../src/services/ai/bedrockClient', () => ({
  invokeModel: jest.fn().mockResolvedValue({
    text: '{"symptomDato":"15.06.2021","vmi":"10–15 % (1997-tabellen)","vmiKonfidensNiva":"Middels – diagnose dokumentert, mangler sakkyndig","uforegrad":"100 % sykemeldt"}',
    inputTokens: 100,
    outputTokens: 50,
    modelId: 'anthropic.claude-haiku-4-5-20251001',
  }),
}));

describe('extractFacts', () => {
  it('returns structured facts from document session', async () => {
    const session = createEmptySession('user-1');
    const doc: ParsedDocument = { text: 'Pasient ble skadet 15.06.2021', pages: 1, filename: 'journal.pdf' };
    session.documents.journal = doc;

    const facts = await extractFacts(session, 'req-1');
    expect(facts).toHaveProperty('symptomDato');
    expect(facts).toHaveProperty('vmi');
    expect(facts).toHaveProperty('uforegrad');
  });

  it('returns fallback on parse error', async () => {
    const { invokeModel } = require('../src/services/ai/bedrockClient');
    invokeModel.mockResolvedValueOnce({ text: 'not json', inputTokens: 0, outputTokens: 0, modelId: '' });

    const session = createEmptySession('user-2');
    const facts = await extractFacts(session, 'req-2');
    expect(facts.symptomDato).toBe('—');
  });
});
```

- [ ] **Step 3: Run to verify failure**

```bash
npx jest tests/factExtractor.test.ts --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement factExtractor**

Create `src/services/journal/factExtractor.ts`:

```typescript
import { invokeModel } from '../ai/bedrockClient';
import { JournalSession, buildDocumentBlock } from './documentStore';

const HAIKU_MODEL_ID = 'anthropic.claude-haiku-4-5-20251001';

export interface JournalFacts {
  symptomDato: string;
  vmi: string;
  vmiKonfidensNiva: string;
  uforegrad: string;
}

const FALLBACK: JournalFacts = {
  symptomDato: '—',
  vmi: '—',
  vmiKonfidensNiva: '—',
  uforegrad: '—',
};

export async function extractFacts(session: JournalSession, requestId: string): Promise<JournalFacts> {
  const docBlock = buildDocumentBlock(session);
  if (!docBlock.trim()) return FALLBACK;

  const systemPrompt = 'Du er en medisinsk dokumentanalysator. Svar KUN med ett JSON-objekt, ingen annen tekst.';
  const userMessage = `Les dokumentet og svar med KUN dette JSON-objektet:
{"symptomDato":"[første symptom/skade-dato, f.eks. '15.06.2021', eller 'Ikke funnet']",
"vmi":"[VMI-prosent og tabell, f.eks. '10–15 % (1997-tabellen)', eller 'Ikke vurdert']",
"vmiKonfidensNiva":"[ett av: 'Høy – spesialistuttalelse foreligger', 'Middels – diagnose dokumentert, mangler sakkyndig', 'Lav – mangler diagnose eller spesialistuttalelse']",
"uforegrad":"[uføregrad, f.eks. '100 % sykemeldt siden 2021', eller 'Ikke dokumentert']"}

DOKUMENT:
${docBlock.substring(0, 40000)}`;

  try {
    const result = await invokeModel(systemPrompt, userMessage, requestId, 256, HAIKU_MODEL_ID);
    const match = result.text.match(/\{[\s\S]*\}/);
    if (!match) return FALLBACK;
    return JSON.parse(match[0]) as JournalFacts;
  } catch {
    return FALLBACK;
  }
}
```

- [ ] **Step 5: Run tests**

```bash
npx jest tests/factExtractor.test.ts --no-coverage
```

Expected: 2 tests PASS.

- [ ] **Step 6: Verify full compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/services/ai/bedrockClient.ts src/services/journal/factExtractor.ts tests/factExtractor.test.ts
git commit -m "feat: add streaming support to bedrockClient and journal fact extractor"
```

---

## Task 7: Journal Route

**Files:**
- Create: `src/routes/journal.ts`
- Create: `tests/journal.integration.test.ts`

- [ ] **Step 1: Write integration tests**

Create `tests/journal.integration.test.ts`:

```typescript
import request from 'supertest';
import { createApp } from '../src/app';

// Mock auth middleware so tests don't need real JWT
jest.mock('../src/middleware/requireAuth', () => ({
  requireAuth: (_req: any, _res: any, next: any) => {
    _req.currentUser = { sub: 'test-user', name: 'Test', role: 'user' };
    next();
  },
}));

// Mock bedrockClient to avoid AWS calls
jest.mock('../src/services/ai/bedrockClient', () => ({
  invokeModel: jest.fn().mockResolvedValue({ text: '{"symptomDato":"—","vmi":"—","vmiKonfidensNiva":"—","uforegrad":"—"}', inputTokens: 0, outputTokens: 0, modelId: '' }),
  invokeModelStream: jest.fn().mockImplementation(async function*() { yield 'SCORES:{"svindelrisiko":10,"kompleksitet":20,"informasjonsgrunnlag":30}\nTest response'; }),
}));

const app = createApp();

describe('POST /api/journal/reset', () => {
  it('returns 200', async () => {
    const res = await request(app).post('/api/journal/reset');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('GET /api/journal/session-status', () => {
  it('returns session status', async () => {
    const res = await request(app).get('/api/journal/session-status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('harDokumenter');
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx jest tests/journal.integration.test.ts --no-coverage
```

Expected: FAIL — route not found (404).

- [ ] **Step 3: Implement journal route**

Create `src/routes/journal.ts`:

```typescript
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { parseBuffer, parseZip } from '../services/documents/documentParser';
import {
  getSession, setSession, resetSession, createEmptySession, buildDocumentBlock,
} from '../services/journal/documentStore';
import { buildJournalSystemPrompt, extractScores, stripScoresPrefix } from '../services/journal/journalPrompt';
import { extractFacts } from '../services/journal/factExtractor';
import { invokeModelStream } from '../services/ai/bedrockClient';

export const journalRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

function getUserId(req: Request): string {
  return req.currentUser?.sub ?? 'anonymous';
}

// ── Upload documents ────────────────────────────────────────────────────────
journalRouter.post(
  '/last-opp',
  upload.fields([
    { name: 'journal', maxCount: 1 },
    { name: 'nav', maxCount: 1 },
    { name: 'legeerklæring', maxCount: 1 },
    { name: 'mandat', maxCount: 1 },
    { name: 'samlet', maxCount: 1 },
    { name: 'zip', maxCount: 1 },
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(req);
    const files = req.files as Record<string, Express.Multer.File[]>;
    const session = createEmptySession(userId);

    try {
      if (files?.zip?.[0]) {
        const { documents, mandateDoc, combinedText } = await parseZip(
          files.zip[0].buffer,
          files.zip[0].originalname
        );
        session.documents.samlet = {
          text: combinedText,
          pages: documents.reduce((s, d) => s + d.pages, 0),
          filename: `${files.zip[0].originalname} (${documents.length} filer)`,
          isZip: true,
          zipFiles: documents.map(d => d.filename),
        };
        if (mandateDoc) session.documents.mandat = mandateDoc;
      } else if (files?.samlet?.[0]) {
        session.documents.samlet = await parseBuffer(files.samlet[0].buffer, files.samlet[0].originalname);
      } else {
        for (const field of ['journal', 'nav', 'legeerklæring', 'mandat'] as const) {
          if (files?.[field]?.[0]) {
            session.documents[field] = await parseBuffer(files[field][0].buffer, files[field][0].originalname);
          }
        }
      }

      const hasDocuments = Object.keys(session.documents).length > 0;
      if (!hasDocuments) {
        res.status(400).json({ error: 'Ingen gyldige filer mottatt', code: 'NO_DOCUMENTS' });
        return;
      }

      setSession(userId, session);
      res.status(201).json({ ok: true, harMandat: !!session.documents.mandat });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message, code: 'PARSE_ERROR' });
    }
  }
);

// ── SSE chat ────────────────────────────────────────────────────────────────
journalRouter.post('/chat', async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const { melding } = req.body as { melding?: string };

  if (!melding?.trim()) {
    res.status(400).json({ error: 'Melding mangler', code: 'INVALID_INPUT' });
    return;
  }

  const session = getSession(userId);
  if (!session || Object.keys(session.documents).length === 0) {
    res.status(400).json({ error: 'Ingen dokumenter lastet opp', code: 'NO_DOCUMENTS' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sse = (event: string, data: unknown) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  session.conversation.push({ role: 'user', content: melding });
  const systemPrompt = buildJournalSystemPrompt(buildDocumentBlock(session));

  try {
    let fullText = '';
    const requestId = uuidv4();

    for await (const token of invokeModelStream(systemPrompt, session.conversation, requestId)) {
      sse('token', { text: token });
      fullText += token;
    }

    const scores = extractScores(fullText);
    if (scores) {
      session.scores = scores;
      sse('scores', scores);
    }

    session.conversation.push({ role: 'assistant', content: stripScoresPrefix(fullText) });
    session.conversation = session.conversation.slice(-20);
    setSession(userId, session);

    sse('done', { ok: true });
  } catch (err) {
    sse('error', { message: (err as Error).message });
  }

  res.end();
});

// ── Key facts extraction ────────────────────────────────────────────────────
journalRouter.post('/fakta', async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const session = getSession(userId);
  if (!session) {
    res.status(400).json({ error: 'Ingen dokumenter lastet opp', code: 'NO_DOCUMENTS' });
    return;
  }
  const facts = await extractFacts(session, uuidv4());
  res.json(facts);
});

// ── Reset session ───────────────────────────────────────────────────────────
journalRouter.post('/reset', (req: Request, res: Response) => {
  resetSession(getUserId(req));
  res.json({ ok: true });
});

// ── Session status ──────────────────────────────────────────────────────────
journalRouter.get('/session-status', (req: Request, res: Response) => {
  const session = getSession(getUserId(req));
  const d = session?.documents ?? {};
  res.json({
    harDokumenter: !!session && Object.keys(d).length > 0,
    harMandat: !!d.mandat,
    antallMeldinger: Math.floor((session?.conversation.length ?? 0) / 2),
    scores: session?.scores ?? { svindelrisiko: 0, kompleksitet: 0, informasjonsgrunnlag: 0 },
  });
});
```

- [ ] **Step 4: Run integration tests**

```bash
npx jest tests/journal.integration.test.ts --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/journal.ts tests/journal.integration.test.ts
git commit -m "feat: add journal route with upload, chat, facts, reset, status endpoints"
```

---

## Task 8: Rename legacyScrubber

**Files:**
- Rename: `src/services/scrubbing/inputScrubber.ts` → `src/services/scrubbing/legacyScrubber.ts`
- Check all imports

- [ ] **Step 1: Rename the file**

```bash
mv "src/services/scrubbing/inputScrubber.ts" "src/services/scrubbing/legacyScrubber.ts"
```

- [ ] **Step 2: Update all imports**

Find all imports of `inputScrubber`:

```bash
grep -r "inputScrubber" src/ --include="*.ts" -l
```

For each file found, change `from '...inputScrubber'` to `from '...legacyScrubber'`.

- [ ] **Step 3: Verify no broken imports**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: rename inputScrubber to legacyScrubber"
```

---

## Task 9: Wire Up in app.ts

**Files:**
- Modify: `src/app.ts`

- [ ] **Step 1: Add journalRouter to app.ts**

Add import and route registration to `src/app.ts`:

```typescript
// Add import near other route imports:
import { journalRouter } from './routes/journal';

// Add route after casesRouter (line ~76):
app.use('/api/journal', requireAuth, journalRouter);
```

- [ ] **Step 2: Verify compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app.ts
git commit -m "feat: wire journal router into app"
```

---

## Task 10: Frontend (journal.html + journal.js)

**Files:**
- Create: `public/journal.html`
- Create: `public/journal.js`

Follow Sana AI design system: fjord navy `#1B3A4B`, gold `#B8935A`, cream `#FAF8F4`, Playfair Display for headings, Inter for body. No inline event handlers (CSP).

- [ ] **Step 1: Create journal.html**

Create `public/journal.html` with:
- Nav bar matching Sana AI style (link to cases.html)
- File upload section: drag-and-drop zone + individual file inputs (journal, nav, legeerklæring, mandat) + ZIP option
- Chat interface: message input, send button, conversation history
- Scores panel: svindelrisiko, kompleksitet, informasjonsgrunnlag as progress bars
- Facts panel: symptomDato, VMI, uføregrad (populated from `/api/journal/fakta`)
- All event listeners via `addEventListener` in journal.js (never inline)

- [ ] **Step 2: Create journal.js**

Implement in `public/journal.js`:
- `uploadDocuments()` — POST to `/api/journal/last-opp` with FormData
- `sendMessage(text)` — POST to `/api/journal/chat`, consume SSE stream, append tokens to UI
- `loadFacts()` — POST to `/api/journal/fakta`, populate facts panel
- `resetSession()` — POST to `/api/journal/reset`
- `loadStatus()` — GET `/api/journal/session-status` on page load

- [ ] **Step 3: Test manually in browser**

```bash
npm run dev
```

Navigate to `http://localhost:3000/journal.html`. Verify:
- File upload works (use a small test PDF)
- Chat sends and streams response
- Scores panel updates
- Facts panel populates after upload

- [ ] **Step 4: Run full test suite**

```bash
npx jest --no-coverage
npx tsc --noEmit
```

Expected: All green.

- [ ] **Step 5: Commit**

```bash
git add public/journal.html public/journal.js
git commit -m "feat: add journal analysis frontend page"
```

---

## Final Verification

- [ ] Run full test suite: `npx jest --no-coverage`
- [ ] TypeScript compile: `npx tsc --noEmit`
- [ ] Manual smoke test with a real PDF in dev mode
- [ ] Review `docs/superpowers/specs/2026-03-19-journal-ai-integration-design.md` — confirm all spec items are implemented
