# Design: Journal AI Integration into Sana AI

**Date:** 2026-03-19
**Status:** Approved
**Author:** Anders Bvaage + Claude

---

## Goal

Merge Journal AI's document analysis functionality into Sana AI's codebase. Sana AI's frontend, infrastructure (AWS Bedrock, Elastic Beanstalk), and auth are used. Journal AI's document parsing, PII scrubbing, AI analysis logic, and domain-specific prompts are ported in.

---

## Architecture

Journal AI becomes a self-contained module within Sana AI — no new deployment, no separate service.

```
src/
  routes/
    journal.ts              — all Journal AI endpoints
  services/
    documents/
      documentParser.ts     — PDF/DOCX/ZIP parsing (pdf-parse, mammoth, adm-zip)
    scrubbing/
      norwegianScrubber.ts  — Norwegian PII regex scrubbing (replaces inputScrubber.ts)
      legacyScrubber.ts     — existing inputScrubber.ts moved here as backup
    journal/
      journalPrompt.ts      — system prompt: Norwegian insurance law, ICD-10, invalidity tables
      factExtractor.ts      — /api/fakta logic using Claude Haiku
public/
  journal.html              — new page using Sana AI design system
  journal.js                — frontend logic for document analysis
```

---

## Endpoints (journal.ts)

| Method | Path | Description |
|---|---|---|
| POST | /api/journal/last-opp | Upload documents (PDF, DOCX, DOC, ZIP) |
| POST | /api/journal/chat | SSE streaming analysis (Claude Sonnet via Bedrock) |
| POST | /api/journal/fakta | Auto-extract key facts (Claude Haiku via Bedrock) — receives userId, looks up stored document text |
| POST | /api/journal/reset | Reset session state |
| GET | /api/journal/session-status | Return document state and message count for current user |

---

## Document Types

| Type | Field | Max size |
|---|---|---|
| Pasientjournal | `journal` | 80 000 chars |
| NAV-mappe | `nav` | 80 000 chars |
| Legeerklæring | `legeerklæring` | 40 000 chars |
| Mandat/oppdragsbrev | `mandat` | 20 000 chars |
| Samlet PDF | `samlet` | 160 000 chars |
| ZIP (multiple files) | `zip` | 200 000 chars combined |

ZIP files: parse each PDF/DOCX entry separately, combine with file headers. Mandate detection by filename: matches filenames containing `mandat` or `oppdrag` (case-insensitive). Exact patterns are a domain decision owned by Morten — see TODO in `documentParser.ts`.

---

## AI Model Usage

| Task | Model | Reason |
|---|---|---|
| Chat/analysis | Claude Sonnet (Bedrock eu-north-1) | Full analysis quality — already verified available |
| Fact extraction (/api/fakta) | Claude Haiku (Bedrock) | Fast, low-cost, structured output |

Both via existing `bedrockClient.ts` — no new AI client.

**⚠️ Pre-implementation check:** Verify Claude Haiku availability in `eu-north-1` via AWS Bedrock console before implementing `factExtractor.ts`. If unavailable, fall back to Claude Sonnet for both tasks (higher cost but no cross-region inference needed).

---

## PII Scrubbing

`norwegianScrubber.ts` replaces `inputScrubber.ts` for journal module. Regex patterns:

- Norwegian personal numbers (11 digits)
- D-numbers
- Phone numbers (+47 / 8-digit)
- Email addresses
- Dates (dd.mm.yyyy, dd/mm/yyyy)
- Postal codes with city names

`legacyScrubber.ts` kept as backup for existing case routes.

---

## Domain Knowledge (journalPrompt.ts)

System prompt includes:

- Norwegian insurance law (FAL, Skadeerstatningsloven, NAV regulations)
- ICD-10 and ICPC-2 coding
- Three invalidity tables:
  - **Invaliditetstabellen 1997** — standard table for personal injury
  - **Barnetabellen** — for injuries sustained before age 16
  - **NPE Pasientskade-tabellen** — for patient injury compensation cases
- VMI assessment guidelines
- Disability vs. incapacity distinctions (FAL § 18-3)
- Score instructions: svindelrisiko, kompleksitet, informasjonsgrunnlag (0–100)

---

## Scoring

Every AI response includes a `SCORES:{...}` prefix that is parsed and emitted as a separate SSE event:

```json
{ "svindelrisiko": 0-100, "kompleksitet": 0-100, "informasjonsgrunnlag": 0-100 }
```

---

## Auth

Journal AI's `express-session` auth is dropped. Sana AI's existing JWT middleware (`requireAuth`) is used for all `/api/journal/*` routes.

---

## New Dependencies

```json
"adm-zip": "^0.5.10",
"mammoth": "^1.8.0",
"multer": "^1.4.5-lts.1",
"pdf-parse": "^1.1.1"
```

---

## Server-Side Document Storage

Since `express-session` is dropped, parsed document text is stored in an in-memory map keyed by JWT userId:

```ts
const documentStore = new Map<string, DocumentSession>();
```

This map is populated by `/api/journal/last-opp` and read by `/api/journal/chat`, `/api/journal/fakta`, and `/api/journal/session-status`. It is cleared by `/api/journal/reset`.

**Note:** In-memory storage means documents are lost on server restart. Acceptable for MVP — persistent storage (S3) can be added later.

`inputScrubber.ts` is renamed/moved to `legacyScrubber.ts` — it is not a new file, just relocated so existing case routes continue to work unchanged.

---

## What Is NOT Included

- Journal AI's `express-session` auth — replaced by Sana AI JWT
- Journal AI's `innlogging.html` — Sana AI's `login.html` used instead
- Journal AI's `brukere.json` user store — Sana AI's `USERS_JSON` env var used
- Demo mode — Sana AI always runs with Bedrock credentials

---

## Collaboration

- **Anders**: owns Sana AI infrastructure, AWS Bedrock, deploy pipeline
- **Morten**: owns journal analysis domain logic, document types, system prompt refinement
- Morten added as collaborator on `andersbvaage-ai/sana-ai` GitHub repo
