// ─── Domenetyper ──────────────────────────────────────────────────────────────

/** JWT-payload fra EPJ-systemet (F0-2 i arbeidsdokumentet) */
export interface EPJTokenPayload {
  sub: string;           // bruker-ID (UUID)
  role: UserRole;        // klinisk rolle
  patient_id: string;    // pseudonymisert pasient-ID
  note_id: string;       // EPJ-notat-ID
  iss: string;           // utsteder (EPJ Identity Server URL)
  aud: string;           // mottaker (sana-ai-integration)
  iat: number;           // utstedelsestidspunkt (Unix timestamp)
  exp: number;           // utløpstidspunkt (Unix timestamp)
}

export type UserRole = 'lege' | 'sykepleier' | 'sekretær' | 'annet';

/** Validert forespørsel etter autentisering og autorisasjon */
export interface ValidatedRequest {
  userId: string;
  role: UserRole;
  patientId: string;
  noteId: string;
  clinicalText: string;
  context: ClinicalContext;
  desiredLength: SummaryLength;
  correlationId: string;  // for å matche forespørsel og svar (F4-1)
}

export type ClinicalContext =
  | 'poliklinikk'
  | 'innleggelse'
  | 'akutt'
  | 'laboratorium'
  | 'generell';

export type SummaryLength = '2-3_setninger' | '3-5_setninger' | 'utvidet';

/** AI-forespørsel som sendes til Azure AI Foundry (F1-4) */
export interface AIRequest {
  klinisk_tekst: string;
  formål: 'sammendrag';
  kontekst: ClinicalContext;
  ønsket_lengde: SummaryLength;
}

/** AI-respons etter validering */
export interface AIResponse {
  sammendrag: string;
  tokensBrukt: { input: number; output: number };
  modellId: string;
  responseTid: number;  // ms
}

/** Utfall av helsepersonells gjennomgang (F4-4) */
export type ReviewOutcome = 'godkjent_uendret' | 'redigert' | 'forkastet';

/** Revisjonsloggoppføring (F5-1) */
export interface AuditLogEntry {
  correlationId: string;
  userId: string;
  role: UserRole;
  patientPseudonym: string;   // IKKE fødselsnummer
  noteId: string;
  requestTimestamp: string;   // ISO 8601
  responseTimestamp: string;  // ISO 8601
  outcome: ReviewOutcome | 'feil';
  modelId: string;
  tokensInput: number;
  tokensOutput: number;
  scrubbedFields: string[];   // hvilke felt ble fjernet (ikke innholdet)
  errorCode?: string;
}

/** HTTP API-forespørsel (innkommende body) */
export interface SummarizeRequestBody {
  clinicalText: string;
  context?: ClinicalContext;
  desiredLength?: SummaryLength;
}

/** HTTP API-svar */
export interface SummarizeResponse {
  correlationId: string;
  summary: string;
  status: 'pending_review';   // alltid – aldri auto-lagret (F4-3)
  model: string;
  processingTimeMs: number;
  warning: string;            // påminnelse om gjennomgang
}

/** Feilsvar */
export interface ErrorResponse {
  error: string;
  code: string;
  correlationId?: string;
}

// ─── Klagesak-typer ───────────────────────────────────────────────────────────

export type CriticalityLevel = 'Lav' | 'Middels' | 'Høy' | 'Kritisk';
export type Standpunkt = 'Støttes' | 'Støttes delvis' | 'Avvises' | 'Uavklart';

export interface CaseAnalysis {
  sammendrag: string;
  kritikalitet: CriticalityLevel;
  estimertTid: string;
  hovedpunkter: string[];
  begrunnelse: string;
  standpunkt: Standpunkt;
  standpunktBegrunnelse: string;
  prioritetScore: number;    // 0–100
}

export interface CaseDocument {
  id: string;
  filnavn: string;
  filtype: 'pdf' | 'word';
  lastOppTidspunkt: string;
}

export interface DoctorAssessment {
  kritikalitet: CriticalityLevel;
  estimertTid: string;
  notater: string;
  vurdertTidspunkt: string;  // ISO 8601
}

export interface Case {
  id: string;
  tittel?: string;           // valgfritt navn legen gir saken
  filnavn: string;           // første dokuments navn (for listevisning)
  filtype: 'pdf' | 'word';
  dokumenter: CaseDocument[];
  lastOppTidspunkt: string;
  status: 'til_vurdering' | 'vurdert';
  analyse: CaseAnalysis;
  legeVurdering?: DoctorAssessment;
  tokensInput?: number;
  tokensOutput?: number;
  modellId?: string;
  scrubbedFields?: string[];
}

/** Revisjonsloggoppføring for klagesaker */
export interface CaseAuditLogEntry {
  type: 'case_upload' | 'case_assessment' | 'case_error' | 'case_delete';
  caseId: string;
  filnavn: string;
  filtype: 'pdf' | 'word';
  requestTimestamp: string;   // ISO 8601
  responseTimestamp: string;  // ISO 8601
  outcome: 'suksess' | 'feil';
  scrubbedFields: string[];   // PII-felt som ble fjernet fra sakstekst
  kritikalitet?: CriticalityLevel;
  errorCode?: string;
}
