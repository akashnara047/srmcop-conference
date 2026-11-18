/**
 * SRMCOP Conference Email Service (SRMCON 2027)
 * Google Apps Script Web App Reference & Update Script
 *
 * Required Script Property (Project Settings -> Script Properties):
 *   VERCEL_EMAIL_SECRET = <must match Vercel GOOGLE_APPS_SCRIPT_SECRET>
 *
 * Supported Actions:
 *   1. health
 *   2. registration_received      (Event 1 - Registration Done / Pending Payment Verification)
 *   3. registration_confirmation  (Event 2 - Registration Confirmed after Payment Verification + PDF)
 *   4. abstract_confirmation      (Event 3 - Abstract Submission Acknowledgement + PDF)
 *   5. abstract_acceptance        (Event 4 - Abstract Accepted)
 */

var SERVICE_NAME = 'SRMCOP Conference Email Service';
var EVENT_LOCK_PREFIX = 'SENT_EVENT_';

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: 'Missing JSON request body.' });
    }

    var payload = JSON.parse(e.postData.contents);
    var expectedSecret = PropertiesService.getScriptProperties().getProperty('VERCEL_EMAIL_SECRET');

    if (!expectedSecret) {
      return jsonResponse({ success: false, authenticated: false, error: 'Server secret not configured.' });
    }

    if (!payload || payload.token !== expectedSecret) {
      return jsonResponse({ success: false, authenticated: false, error: 'Unauthorized: invalid token.' });
    }

    var action = String(payload.action || '').trim();

    if (action === 'health') {
      return jsonResponse({
        success: true,
        service: SERVICE_NAME,
        remainingQuota: MailApp.getRemainingDailyQuota(),
      });
    }

    var supportedActions = {
      registration_received: true,
      registration_confirmation: true,
      abstract_confirmation: true,
      abstract_acceptance: true,
    };

    if (!supportedActions[action]) {
      return jsonResponse({ success: false, error: 'Unsupported action: ' + action });
    }

    var eventId = String(payload.eventId || '').trim();
    var recipient = String(payload.to || payload.recipient || payload.email || '').trim();
    var subject = String(payload.subject || '').trim();
    var htmlBody = String(payload.htmlBody || payload.html || '').trim();
    var textBody = String(payload.textBody || payload.body || '').trim();

    if (!eventId) {
      return jsonResponse({ success: false, error: 'Missing required eventId.' });
    }
    if (!recipient) {
      return jsonResponse({ success: false, error: 'Missing required recipient email address.' });
    }
    if (!subject) {
      return jsonResponse({ success: false, error: 'Missing required email subject.' });
    }

    // Lock + persistent + cache eventId duplicate protection
    var lock = LockService.getScriptLock();
    lock.waitLock(8000);
    try {
      var cache = CacheService.getScriptCache();
      var props = PropertiesService.getScriptProperties();
      var eventKey = EVENT_LOCK_PREFIX + eventId;

      if (cache.get(eventKey) || props.getProperty(eventKey)) {
        return jsonResponse({
          success: true,
          service: SERVICE_NAME,
          eventId: eventId,
          action: action,
          recipient: recipient,
          duplicate: true,
          alreadySent: true,
          sentAt: props.getProperty(eventKey) || new Date().toISOString(),
        });
      }

      var mailOptions = {
        name: 'SRMCON 2027 Secretariat',
      };

      if (htmlBody) {
        mailOptions.htmlBody = htmlBody;
      }

      // Decode optional Base64 PDF attachment(s)
      var blobs = [];
      var rawAttachments = [];
      if (Array.isArray(payload.attachments) && payload.attachments.length > 0) {
        rawAttachments = payload.attachments;
      } else if (payload.attachment && typeof payload.attachment === 'object') {
        rawAttachments = [payload.attachment];
      }

      for (var i = 0; i < rawAttachments.length; i++) {
        var att = rawAttachments[i];
        var b64 = String(att.base64 || att.content || att.data || '').trim();
        if (b64) {
          var bytes = Utilities.base64Decode(b64);
          var mimeType = String(att.mimeType || att.contentType || 'application/pdf');
          var filename = String(att.filename || att.name || 'SRMCON_2027_Document.pdf');
          blobs.push(Utilities.newBlob(bytes, mimeType, filename));
        }
      }

      if (blobs.length > 0) {
        mailOptions.attachments = blobs;
      }

      MailApp.sendEmail(
        recipient,
        subject,
        textBody || 'Please view this message in an HTML-capable email client.',
        mailOptions
      );

      var sentAt = new Date().toISOString();
      cache.put(eventKey, sentAt, 21600); // 6h fast cache
      props.setProperty(eventKey, sentAt); // Persistent idempotency guard

      return jsonResponse({
        success: true,
        service: SERVICE_NAME,
        eventId: eventId,
        action: action,
        recipient: recipient,
        sentAt: sentAt,
        duplicate: false,
        remainingQuota: MailApp.getRemainingDailyQuota(),
      });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err && err.message ? String(err.message) : 'Unexpected Apps Script error.',
    });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
