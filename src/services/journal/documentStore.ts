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
