import type { IncomingMessage, ServerResponse } from 'node:http';
import process from 'node:process';

interface HealthResponseBody {
  success: boolean;
  service?: string;
  version?: string;
  attachmentSupported?: boolean;
  defaultCcEmail?: string;
  remainingQuota?: number;
  error?: string;
}

const REQUEST_TIMEOUT_MS = 15000;

function getAllowedOrigins(req: IncomingMessage): Set<string> {
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

function sendJson(res: ServerResponse, statusCode: number, body: HealthResponseBody): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function extractQuotaNumber(payload: Record<string, unknown>): number | null {
  const raw =
    payload.remainingQuota ?? payload.quota ?? payload.dailyRemainingQuota ?? payload.remaining_quota;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw.trim());
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
}

function isAppsScriptAuthFailure(payload: Record<string, unknown>, statusCode: number): boolean {
  if (statusCode === 401 || statusCode === 403) return true;
  if (payload.authenticated === false || payload.authorized === false) return true;
  const errText = String(payload.error || payload.message || '').toLowerCase();
  return (
    errText.includes('unauthorized') ||
    errText.includes('unauthorised') ||
    errText.includes('invalid token') ||
    errText.includes('invalid secret') ||
    errText.includes('authentication') ||
    errText.includes('forbidden')
  );
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Restrict CORS strictly to same-origin / configured deployment origins (no wildcard '*')
  const requestOriginHeader =
    typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';

  if (requestOriginHeader) {
    const allowedOrigins = getAllowedOrigins(req);
    if (!allowedOrigins.has(requestOriginHeader)) {
      sendJson(res, 403, {
        success: false,
        error: 'Origin not allowed.',
      });
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', requestOriginHeader);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  // Handle CORS preflight cleanly
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, {
      success: false,
      error: 'Method Not Allowed. Only POST requests are accepted.',
    });
    return;
  }

  // Read required server-side environment variables (never expose to client or logs)
  const appsScriptUrl = (process.env.GOOGLE_APPS_SCRIPT_URL || '').trim();
  const appsScriptSecret = (process.env.GOOGLE_APPS_SCRIPT_SECRET || '').trim();

  if (!appsScriptUrl || !appsScriptSecret) {
    console.error('[api/email/health] Missing required server email environment configuration.');
    sendJson(res, 500, {
      success: false,
      error: 'Email service configuration is missing on the server.',
    });
    return;
  }

  let validatedUrl: URL;
  try {
    validatedUrl = new URL(appsScriptUrl);
    if (validatedUrl.protocol !== 'https:') {
      throw new Error('Unsupported protocol');
    }
  } catch {
    console.error('[api/email/health] Invalid email service endpoint URL format.');
    sendJson(res, 500, {
      success: false,
      error: 'Email service endpoint configuration is invalid.',
    });
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    // Strictly send only the "health" action — this endpoint must never trigger email delivery
    const upstreamResponse = await fetch(validatedUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        token: appsScriptSecret,
        action: 'health',
      }),
      redirect: 'follow',
      signal: controller.signal,
    });

    const rawText = await upstreamResponse.text();

    let parsedPayload: Record<string, unknown>;
    try {
      const json = JSON.parse(rawText);
      if (!json || typeof json !== 'object' || Array.isArray(json)) {
        throw new Error('Unexpected JSON shape');
      }
      parsedPayload = json as Record<string, unknown>;
    } catch {
      console.error(
        `[api/email/health] Non-JSON response from Apps Script (HTTP ${upstreamResponse.status}).`
      );
      sendJson(res, 502, {
        success: false,
        error: 'Received an invalid response from the Google Apps Script email service.',
      });
      return;
    }

    if (isAppsScriptAuthFailure(parsedPayload, upstreamResponse.status)) {
      console.error('[api/email/health] Upstream authentication failed.');
      sendJson(res, 401, {
        success: false,
        error: 'Authentication failed with the Google Apps Script email service.',
      });
      return;
    }

    if (!upstreamResponse.ok) {
      console.error(`[api/email/health] Upstream HTTP error ${upstreamResponse.status}.`);
      sendJson(res, 502, {
        success: false,
        error: `Google Apps Script email service returned HTTP ${upstreamResponse.status}.`,
      });
      return;
    }

    if (parsedPayload.success !== true) {
      const upstreamError =
        typeof parsedPayload.error === 'string' && parsedPayload.error.trim()
          ? parsedPayload.error.trim()
          : 'Google Apps Script email service reported an unhealthy status.';
      sendJson(res, 502, {
        success: false,
        error: upstreamError,
      });
      return;
    }

    const remainingQuota = extractQuotaNumber(parsedPayload);
    if (remainingQuota === null) {
      console.error('[api/email/health] Apps Script response omitted a valid remainingQuota.');
      sendJson(res, 502, {
        success: false,
        error: 'Email service response did not include a valid remaining daily quota.',
      });
      return;
    }

    const serviceName =
      typeof parsedPayload.service === 'string' && parsedPayload.service.trim()
        ? parsedPayload.service.trim()
        : 'SRMCOP Conference Email Service';

    const scriptVersion =
      typeof parsedPayload.version === 'string' && parsedPayload.version.trim()
        ? parsedPayload.version.trim()
        : undefined;

    const attachmentSupported =
      typeof parsedPayload.attachmentSupported === 'boolean'
        ? parsedPayload.attachmentSupported
        : undefined;

    const defaultCcEmail =
      typeof parsedPayload.defaultCcEmail === 'string' && parsedPayload.defaultCcEmail.trim()
        ? parsedPayload.defaultCcEmail.trim()
        : undefined;

    sendJson(res, 200, {
      success: true,
      service: serviceName,
      ...(scriptVersion ? { version: scriptVersion } : {}),
      ...(attachmentSupported !== undefined ? { attachmentSupported } : {}),
      ...(defaultCcEmail ? { defaultCcEmail } : {}),
      remainingQuota,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[api/email/health] Request to Google Apps Script timed out.');
      sendJson(res, 504, {
        success: false,
        error: 'Request to Google Apps Script email service timed out.',
      });
      return;
    }

    console.error('[api/email/health] Network error communicating with Google Apps Script.');
    sendJson(res, 503, {
      success: false,
      error: 'Google Apps Script email service is currently unavailable.',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
