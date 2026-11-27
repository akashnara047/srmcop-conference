import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  applyRestrictedCors,
  getAppsScriptConfig,
  sendJson,
} from '../_lib/emailConfig.ts';

interface HealthResponseBody extends Record<string, unknown> {
  success: boolean;
  service?: string;
  version?: string;
  attachmentSupported?: boolean;
  presentationAllocationSupported?: boolean;
  supportedActions?: string[];
  defaultCcEmail?: string;
  remainingQuota?: number;
  telemetryComplete?: boolean;
  telemetryWarnings?: string[];
  error?: string;
}

const REQUEST_TIMEOUT_MS = 15000;
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

interface ParsedAppsScriptTelemetry {
  version?: string;
  attachmentSupported?: boolean;
  presentationAllocationSupported?: boolean;
  supportedActions?: string[];
  defaultCcEmail?: string;
  telemetryComplete: boolean;
  telemetryWarnings: string[];
}

export function extractValidatedHealthTelemetry(
  payload: Record<string, unknown>
): ParsedAppsScriptTelemetry {
  const telemetryWarnings: string[] = [];

  let version: string | undefined;
  if (typeof payload.version === 'string' && payload.version.trim().length > 0) {
    version = payload.version.trim();
  } else {
    telemetryWarnings.push(
      payload.version === undefined
        ? "Apps Script response omitted 'version' telemetry."
        : "Apps Script response returned an invalid 'version' value."
    );
  }

  let attachmentSupported: boolean | undefined;
  if (typeof payload.attachmentSupported === 'boolean') {
    attachmentSupported = payload.attachmentSupported;
  } else {
    telemetryWarnings.push(
      payload.attachmentSupported === undefined
        ? "Apps Script response omitted 'attachmentSupported' capability flag."
        : "Apps Script response returned a non-boolean 'attachmentSupported' value."
    );
  }

  let presentationAllocationSupported: boolean | undefined;
  if (typeof payload.presentationAllocationSupported === 'boolean') {
    presentationAllocationSupported = payload.presentationAllocationSupported;
  } else {
    telemetryWarnings.push(
      payload.presentationAllocationSupported === undefined
        ? "Apps Script response omitted 'presentationAllocationSupported' capability flag."
        : "Apps Script response returned a non-boolean 'presentationAllocationSupported' value."
    );
  }

  let supportedActions: string[] | undefined;
  if (
    Array.isArray(payload.supportedActions) &&
    payload.supportedActions.length > 0 &&
    payload.supportedActions.every(
      (item): item is string => typeof item === 'string' && item.trim().length > 0
    )
  ) {
    supportedActions = Array.from(
      new Set(payload.supportedActions.map((item) => item.trim()))
    );
  } else {
    telemetryWarnings.push(
      payload.supportedActions === undefined
        ? "Apps Script response omitted 'supportedActions' telemetry."
        : "Apps Script response returned an invalid 'supportedActions' list."
    );
  }

  let defaultCcEmail: string | undefined;
  if (
    typeof payload.defaultCcEmail === 'string' &&
    SIMPLE_EMAIL_REGEX.test(payload.defaultCcEmail.trim())
  ) {
    defaultCcEmail = payload.defaultCcEmail.trim();
  } else {
    telemetryWarnings.push(
      payload.defaultCcEmail === undefined
        ? "Apps Script response omitted 'defaultCcEmail' telemetry."
        : "Apps Script response returned an invalid 'defaultCcEmail' address."
    );
  }

  return {
    ...(version !== undefined ? { version } : {}),
    ...(attachmentSupported !== undefined ? { attachmentSupported } : {}),
    ...(presentationAllocationSupported !== undefined
      ? { presentationAllocationSupported }
      : {}),
    ...(supportedActions !== undefined ? { supportedActions } : {}),
    ...(defaultCcEmail !== undefined ? { defaultCcEmail } : {}),
    telemetryComplete: telemetryWarnings.length === 0,
    telemetryWarnings,
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Restrict CORS strictly to same-origin / configured deployment origins (no wildcard '*')
  if (!applyRestrictedCors(req, res)) {
    sendJson(res, 403, {
      success: false,
      error: 'Origin not allowed.',
    });
    return;
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

  const appsScriptConfig = getAppsScriptConfig();
  if (!appsScriptConfig.ok) {
    console.error('[api/email/health] Missing or invalid server email environment configuration.');
    sendJson(res, 500, {
      success: false,
      error: appsScriptConfig.error,
    });
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    // Strictly send only the "health" action — this endpoint must never trigger email delivery
    const upstreamResponse = await fetch(appsScriptConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        token: appsScriptConfig.secret,
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

    const telemetry = extractValidatedHealthTelemetry(parsedPayload);

    const responseBody: HealthResponseBody = {
      success: true,
      service: serviceName,
      ...(telemetry.version !== undefined ? { version: telemetry.version } : {}),
      ...(telemetry.attachmentSupported !== undefined
        ? { attachmentSupported: telemetry.attachmentSupported }
        : {}),
      ...(telemetry.presentationAllocationSupported !== undefined
        ? { presentationAllocationSupported: telemetry.presentationAllocationSupported }
        : {}),
      ...(telemetry.supportedActions !== undefined
        ? { supportedActions: telemetry.supportedActions }
        : {}),
      ...(telemetry.defaultCcEmail !== undefined
        ? { defaultCcEmail: telemetry.defaultCcEmail }
        : {}),
      remainingQuota,
      telemetryComplete: telemetry.telemetryComplete,
      ...(telemetry.telemetryWarnings.length > 0
        ? { telemetryWarnings: telemetry.telemetryWarnings }
        : {}),
    };

    sendJson(res, 200, responseBody);
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
