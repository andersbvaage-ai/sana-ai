import dotenv from 'dotenv';
dotenv.config();

// ─── Helpers ──────────────────────────────────────────────────────────────────
const required = (key: string): string => {
  const val = process.env[key];
  if (!val) throw new Error(`Manglende påkrevd miljøvariabel: ${key}`);
  return val;
};
const optional = (key: string, fallback: string): string =>
  process.env[key] ?? fallback;

// ─── Config ───────────────────────────────────────────────────────────────────
export const config = {
  server: {
    port: parseInt(optional('PORT', '3000'), 10),
    nodeEnv: optional('NODE_ENV', 'development'),
  },

  // AWS Bedrock – Claude via Anthropic Messages API
  aws: {
    region: optional('AWS_REGION', 'eu-north-1'),
    // Model IDs: https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html
    modelId: optional('AWS_BEDROCK_MODEL_ID', 'anthropic.claude-sonnet-4-6'),
    maxTokens: parseInt(optional('AWS_BEDROCK_MAX_TOKENS', '1000'), 10),
  },

  // JWT-validering – I produksjon: peker mot kundens Azure AD JWKS-endepunkt
  jwt: {
    // I mock-modus brukes symmetrisk secret; i produksjon byttes til JWKS URL
    secret: process.env['NODE_ENV'] === 'production'
      ? required('JWT_SECRET')
      : optional('JWT_SECRET', 'mock-secret-minimum-32-chars-long!!'),
    issuer: optional('JWT_ISSUER', 'https://mock-epj.sana-ai.local'),
    audience: optional('JWT_AUDIENCE', 'sana-ai-integration'),
    // Settes til 'jwks' i produksjon for asymmetrisk validering
    mode: optional('JWT_MODE', 'symmetric') as 'symmetric' | 'jwks',
    jwksUri: optional('JWT_JWKS_URI', ''),
  },

  // Rate limiting (per bruker per time)
  rateLimit: {
    maxRequestsPerHour: parseInt(optional('RATE_LIMIT_MAX', '30'), 10),
    burstMax: parseInt(optional('RATE_LIMIT_BURST', '10'), 10),
  },

  // Kill-switch – disabler AI-modulen umiddelbart
  killSwitch: {
    enabled: optional('KILL_SWITCH_ENABLED', 'false') === 'true',
    adminToken: process.env['NODE_ENV'] === 'production'
      ? required('KILL_SWITCH_ADMIN_TOKEN')
      : optional('KILL_SWITCH_ADMIN_TOKEN', 'admin-token-change-in-prod'),
  },

  // Revisjonslogg
  audit: {
    // 'file' for MVP; 'azure-blob' i produksjon (Azure Immutable Blob Storage)
    backend: optional('AUDIT_BACKEND', 'file') as 'file' | 'azure-blob' | 'cloudwatch',
    filePath: optional('AUDIT_LOG_PATH', './audit.jsonl'),
    azureBlobConnectionString: optional('AUDIT_BLOB_CONN', ''),
    azureBlobContainer: optional('AUDIT_BLOB_CONTAINER', 'audit-logs'),
  },

  // Mock-modus – brukes når NODE_ENV !== 'production'
  mock: {
    enabled: optional('NODE_ENV', 'development') !== 'production',
    useRealAI: optional('MOCK_USE_REAL_AI', 'false') === 'true',
  },
};

export type Config = typeof config;
