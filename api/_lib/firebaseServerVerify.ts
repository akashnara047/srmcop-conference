import crypto from 'node:crypto';
import { getFirebaseAppletConfig } from './emailConfig.ts';

export const AUTHORIZED_ADMIN_EMAILS = [
  'org.secy.cp@srmist.edu.in',
  'dean.pharmacy.ktr@srmist.edu.in',
  'akashnara047@gmail.com',
  'narayanj@srmist.edu.in',
] as const;

const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

interface CertCache {
  certs: Record<string, string>;
  expiresAtMs: number;
}

let certCache: CertCache | null = null;

export class AuthVerificationError extends Error {
  readonly statusCode: 401 | 403;

  constructor(statusCode: 401 | 403, message: string) {
    super(message);
    this.name = 'AuthVerificationError';
    this.statusCode = statusCode;
  }
}

export function clearGoogleCertCacheForTests(): void {
  certCache = null;
}

function decodeBase64Url(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = pad ? normalized + '='.repeat(4 - pad) : normalized;
  return Buffer.from(padded, 'base64');
}

async function getGoogleSecureTokenCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (certCache && certCache.expiresAtMs > now) {
    return certCache.certs;
  }

  const res = await fetch(GOOGLE_CERTS_URL, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Google verification certificates (HTTP ${res.status}).`);
  }

  const certs = (await res.json()) as Record<string, string>;
  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;

  certCache = {
    certs,
    expiresAtMs: now + Math.max(60, maxAgeSec) * 1000,
  };
  return certs;
}

export interface VerifiedAdminToken {
  uid: string;
  email: string;
}

export async function verifyFirebaseAdminBearerToken(
  authHeader: string | undefined
): Promise<VerifiedAdminToken> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthVerificationError(401, 'Missing admin authorization token.');
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    throw new AuthVerificationError(401, 'Missing admin authorization token.');
  }

  const segments = token.split('.');
  if (segments.length !== 3 || segments.some((seg) => !seg)) {
    throw new AuthVerificationError(401, 'Malformed Firebase ID token.');
  }

  const [headerB64, payloadB64, sigB64] = segments;
  let header: { alg?: string; kid?: string };
  let payload: {
    aud?: string;
    iss?: string;
    sub?: string;
    email?: string;
    iat?: number;
    exp?: number;
  };

  try {
    const parsedHeader = JSON.parse(decodeBase64Url(headerB64).toString('utf8'));
    const parsedPayload = JSON.parse(decodeBase64Url(payloadB64).toString('utf8'));
    if (
      !parsedHeader ||
      typeof parsedHeader !== 'object' ||
      Array.isArray(parsedHeader) ||
      !parsedPayload ||
      typeof parsedPayload !== 'object' ||
      Array.isArray(parsedPayload)
    ) {
      throw new Error('Invalid JWT JSON objects');
    }
    header = parsedHeader;
    payload = parsedPayload;
  } catch {
    throw new AuthVerificationError(401, 'Malformed Firebase ID token.');
  }

  if (header.alg !== 'RS256' || !header.kid || typeof header.kid !== 'string') {
    throw new AuthVerificationError(401, 'Unsupported Firebase ID token signature algorithm.');
  }

  const { projectId } = getFirebaseAppletConfig();
  const nowSec = Math.floor(Date.now() / 1000);

  if (payload.aud !== projectId) {
    throw new AuthVerificationError(401, 'Firebase ID token audience mismatch.');
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new AuthVerificationError(401, 'Firebase ID token issuer mismatch.');
  }
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new AuthVerificationError(401, 'Firebase ID token subject missing.');
  }
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    throw new AuthVerificationError(401, 'Firebase ID token has expired.');
  }
  if (typeof payload.iat === 'number' && payload.iat > nowSec + 300) {
    throw new AuthVerificationError(401, 'Firebase ID token issued-at timestamp is invalid.');
  }

  const certs = await getGoogleSecureTokenCerts();
  const certPem = certs[header.kid];
  if (!certPem) {
    throw new AuthVerificationError(401, 'Unable to match Firebase ID token signing key.');
  }

  let signatureValid = false;
  try {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    verifier.end();
    const signature = decodeBase64Url(sigB64);
    signatureValid = verifier.verify(certPem, signature);
  } catch {
    signatureValid = false;
  }

  if (!signatureValid) {
    throw new AuthVerificationError(401, 'Invalid Firebase ID token signature.');
  }

  const normalizedEmail = (payload.email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new AuthVerificationError(401, 'Authenticated account does not contain an email address.');
  }

  const isAllowlisted = (AUTHORIZED_ADMIN_EMAILS as readonly string[]).includes(normalizedEmail);
  if (!isAllowlisted) {
    // Also check /admins/{uid} document using the caller's own Bearer token
    let adminDoc: Record<string, unknown> | null = null;
    try {
      adminDoc = await getFirestoreDocument('admins', payload.sub, token);
    } catch (err) {
      if (err instanceof Error && err.message.includes('(HTTP 403)')) {
        adminDoc = null;
      } else {
        throw err;
      }
    }
    if (!adminDoc) {
      throw new AuthVerificationError(
        403,
        'Account is not authorized to perform administrative email actions.'
      );
    }
  }

  return {
    uid: payload.sub,
    email: normalizedEmail,
  };
}

interface FirestoreValue {
  nullValue?: null;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  stringValue?: string;
  bytesValue?: string;
  referenceValue?: string;
  mapValue?: { fields?: Record<string, FirestoreValue> };
  arrayValue?: { values?: FirestoreValue[] };
}

function decodeFirestoreValue(val: FirestoreValue): unknown {
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return val.doubleValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('stringValue' in val) return val.stringValue;
  if ('bytesValue' in val) return val.bytesValue;
  if ('referenceValue' in val) return val.referenceValue;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map((item) => decodeFirestoreValue(item));
  }
  if ('mapValue' in val) {
    const out: Record<string, unknown> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreValue(v);
    }
    return out;
  }
  return null;
}

export async function getFirestoreDocument(
  collectionName: string,
  documentId: string,
  bearerToken?: string
): Promise<Record<string, unknown> | null> {
  const { projectId, apiKey, firestoreDatabaseId } = getFirebaseAppletConfig();
  const encodedCollection = encodeURIComponent(collectionName);
  const encodedDocId = encodeURIComponent(documentId);

  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${encodeURIComponent(
    firestoreDatabaseId
  )}/documents/${encodedCollection}/${encodedDocId}?key=${encodeURIComponent(apiKey)}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  const res = await fetch(url, { method: 'GET', headers });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Firestore read failed for ${collectionName}/${documentId} (HTTP ${res.status}).`);
  }

  const raw = (await res.json()) as { fields?: Record<string, FirestoreValue> };
  const result: Record<string, unknown> = { id: documentId };
  if (raw.fields) {
    for (const [key, value] of Object.entries(raw.fields)) {
      result[key] = decodeFirestoreValue(value);
    }
  }
  return result;
}
