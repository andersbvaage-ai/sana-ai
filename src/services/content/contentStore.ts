import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const BUCKET = process.env['CASE_STORE_S3_BUCKET'];
const S3_KEY = 'content/landing.json';
const REGION = process.env['AWS_REGION'] ?? 'eu-north-1';
const s3 = BUCKET ? new S3Client({ region: REGION }) : null;

export interface LandingContent {
  headingFont: string;
  bodyFont: string;
  hero: {
    kicker: string;
    h1Line1: string;
    h1Line2: string;   // italic/gull
    h1Line3: string;
    sub: string;
  };
  problem: {
    heading: string;
    headingEm: string;
    body: string;
  };
  contact: {
    heading: string;
    headingEm: string;
  };
  cta: {
    heading: string;
    headingEm: string;
    sub: string;
  };
}

export const DEFAULT_CONTENT: LandingContent = {
  headingFont: 'Playfair Display',
  bodyFont: 'Inter',
  hero: {
    kicker: 'AI-assistert klagesaksbehandling',
    h1Line1: 'Medisinsk presisjon.',
    h1Line2: 'Juridisk sporbarhet.',
    h1Line3: 'På sekunder.',
    sub: 'Timer brukt per klagesak på hundrevis av sider. Sana AI gir leger et medisinsk standpunkt på sekunder — med full GDPR-compliance og uforanderlig revisjonslogg.',
  },
  problem: {
    heading: 'Klagesaksbehandling er',
    headingEm: 'tidkrevende og kompleks',
    body: 'En enkelt klagesak kan inneholde hundrevis av sider med journalnotater, epikriser, sakkyndige erklæringer og korrespondanse. Legen må lese, forstå og vurdere — ofte under tidspress, med sakskø.\n\nSana AI fjerner ikke legens ansvar. Det fjerner støyen mellom dokumentene og avgjørelsen.',
  },
  contact: {
    heading: 'Interessert i',
    headingEm: 'en demo?',
  },
  cta: {
    heading: 'Last opp din første',
    headingEm: 'klagesak i dag.',
    sub: 'Ingen installasjon. Ingen IT-prosjekt. Last opp et dokument og se AI-analysen på sekunder — med full GDPR-compliance fra første kall.',
  },
};

export const HEADING_FONTS: Record<string, string> = {
  'Playfair Display': 'Playfair+Display:ital,wght@0,700;0,800;1,700',
  'Cormorant Garamond': 'Cormorant+Garamond:ital,wght@0,600;0,700;1,600',
  'Lora': 'Lora:ital,wght@0,600;0,700;1,600',
  'Libre Baskerville': 'Libre+Baskerville:ital,wght@0,700;1,700',
};

export const BODY_FONTS: Record<string, string> = {
  'Inter': 'Inter:wght@400;500;600;700',
  'DM Sans': 'DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700',
  'IBM Plex Sans': 'IBM+Plex+Sans:wght@400;500;600;700',
  'Nunito Sans': 'Nunito+Sans:wght@400;500;600;700',
};

let cache: LandingContent | null = null;

export async function getContent(): Promise<LandingContent> {
  if (cache) return cache;
  if (s3 && BUCKET) {
    try {
      const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: S3_KEY }));
      const body = await res.Body!.transformToString('utf-8');
      cache = { ...DEFAULT_CONTENT, ...JSON.parse(body) };
      return cache!;
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== 'NoSuchKey') {
        console.error('[contentStore] Feil ved lasting fra S3:', err);
      }
    }
  }
  cache = { ...DEFAULT_CONTENT };
  return cache;
}

export async function saveContent(patch: Partial<LandingContent>): Promise<LandingContent> {
  const current = await getContent();
  const updated: LandingContent = {
    ...current,
    ...patch,
    hero:    { ...current.hero,    ...(patch.hero    ?? {}) },
    problem: { ...current.problem, ...(patch.problem ?? {}) },
    contact: { ...current.contact, ...(patch.contact ?? {}) },
    cta:     { ...current.cta,     ...(patch.cta     ?? {}) },
  };
  cache = updated;
  if (s3 && BUCKET) {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: S3_KEY,
      Body: JSON.stringify(updated, null, 2),
      ContentType: 'application/json',
    }));
  }
  return updated;
}
