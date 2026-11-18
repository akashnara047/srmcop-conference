import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import process from 'node:process';

export const REQUEST_TIMEOUT_MS = 20000;

export interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId: string;
}

const FALLBACK_PUBLIC_FIREBASE_CONFIG: FirebaseAppletConfig = {
  projectId: 'gen-lang-client-0139223282',
  apiKey: 'AIzaSyCSDgYedovE6H_AwRMnZtOzUB6b0lS8d7U',
  firestoreDatabaseId: 'ai-studio-aipoweredinnovat-c4cbd29e-f0bf-43c3-b660-e5c2b8bf5afc',
};

let cachedFirebaseConfig: FirebaseAppletConfig | null = null;

export function getFirebaseAppletConfig(): FirebaseAppletConfig {
  if (cachedFirebaseConfig) {
    return cachedFirebaseConfig;
  }

  const envProjectId = (process.env.FIREBASE_PROJECT_ID || '').trim();
  const envApiKey = (process.env.FIREBASE_API_KEY || '').trim();
  const envDbId = (process.env.FIRESTORE_DATABASE_ID || '').trim();

  if (envProjectId && envApiKey && envDbId) {
    cachedFirebaseConfig = {
      projectId: envProjectId,
      apiKey: envApiKey,
      firestoreDatabaseId: envDbId,
    };
    return cachedFirebaseConfig;
  }

  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<FirebaseAppletConfig>;

    if (parsed.projectId && parsed.apiKey && parsed.firestoreDatabaseId) {
      cachedFirebaseConfig = {
        projectId: parsed.projectId,
        apiKey: parsed.apiKey,
        firestoreDatabaseId: parsed.firestoreDatabaseId,
      };
      return cachedFirebaseConfig;
    }
  } catch {
    // Fallback below if config file is omitted from serverless bundle
  }

  cachedFirebaseConfig = FALLBACK_PUBLIC_FIREBASE_CONFIG;
  return cachedFirebaseConfig;
}

export function getAllowedOrigins(req: IncomingMessage): Set<string> {
  const allowed = new Set<string>();

  const host = typeof req.headers.host === 'string' ? req.headers.host.trim() : '';
  if (host) {
    const isLocalHost =
      host.startsWith('localhost:') ||
      host.startsWith('127.0.0.1:') ||
      host === 'localhost' ||
      host === '127.0.0.1';
    allowed.add(`${isLocalHost ? 'http' : 'https'}://${host}`);
  }

  const envCandidates = [
    process.env.APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '',
    ...(process.env.ALLOWED_ORIGINS || '').split(','),
  ];

  for (const candidate of envCandidates) {
    const trimmed = (candidate || '').trim();
    if (!trimmed) continue;
    try {
      const parsed = new URL(trimmed);
      allowed.add(parsed.origin);
    } catch {
      // Ignore malformed optional origin entries
    }
  }

  return allowed;
}

export function applyRestrictedCors(req: IncomingMessage, res: ServerResponse): boolean {
  const requestOriginHeader =
    typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';

  if (!requestOriginHeader) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins(req);
  if (!allowedOrigins.has(requestOriginHeader)) {
    return false;
  }

  res.setHeader('Access-Control-Allow-Origin', requestOriginHeader);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return true;
}

export function sendJson(res: ServerResponse, statusCode: number, body: Record<string, unknown>): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

export function getAppsScriptConfig(): {
  ok: true;
  url: string;
  secret: string;
} | {
  ok: false;
  error: string;
} {
  const appsScriptUrl = (process.env.GOOGLE_APPS_SCRIPT_URL || '').trim();
  const appsScriptSecret = (process.env.GOOGLE_APPS_SCRIPT_SECRET || '').trim();

  if (!appsScriptUrl || !appsScriptSecret) {
    return {
      ok: false,
      error: 'Email service configuration is missing on the server.',
    };
  }

  try {
    const validatedUrl = new URL(appsScriptUrl);
    if (validatedUrl.protocol !== 'https:') {
      return {
        ok: false,
        error: 'Email service endpoint configuration is invalid.',
      };
    }
    return {
      ok: true,
      url: validatedUrl.toString(),
      secret: appsScriptSecret,
    };
  } catch {
    return {
      ok: false,
      error: 'Email service endpoint configuration is invalid.',
    };
  }
}

export function sanitizeErrorMessage(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : fallback;
  const trimmed = (raw || fallback).trim();
  if (!trimmed) return fallback;
  // Never echo secrets or overly long internal blobs
  const secret = (process.env.GOOGLE_APPS_SCRIPT_SECRET || '').trim();
  const url = (process.env.GOOGLE_APPS_SCRIPT_URL || '').trim();
  let safe = trimmed;
  if (secret && safe.includes(secret)) {
    safe = safe.split(secret).join('[REDACTED]');
  }
  if (url && safe.includes(url)) {
    safe = safe.split(url).join('[REDACTED_URL]');
  }
  return safe.slice(0, 400);
}
