/**
 * SRMCOP Conference Email Service (SRMCON 2027)
 * Google Apps Script Web App Code
 *
 * Required Script Property (Project Settings -> Script Properties):
 *   VERCEL_EMAIL_SECRET = <must match Vercel GOOGLE_APPS_SCRIPT_SECRET>
 *
 * Optional Script Property:
 *   EMAIL_CC_ADDRESS    = <defaults to org.secy.cp@srmist.edu.in>
 *
 * Supported Actions:
 *   1. health
 *   2. registration_received      (Event 1 - Registration Done / Pending Payment Verification; NO PDF)
 *   3. registration_confirmation  (Event 2 - Registration Confirmed after Payment Verification + PDF)
 *   4. abstract_confirmation      (Event 3 - Abstract Submission Acknowledgement + PDF)
 *   5. abstract_acceptance        (Event 4 - Abstract Accepted + PDF)
 */

var SERVICE_NAME = 'SRMCOP Conference Email Service';
var SCRIPT_VERSION = '2027.3-cc-pdf';
var DEFAULT_CC_EMAIL = 'org.secy.cp@srmist.edu.in';
var EVENT_LOCK_PREFIX = 'SENT_EVENT_';

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: 'Missing JSON request body.' });
    }

    var payload = JSON.parse(e.postData.contents);
    var expectedSecret = PropertiesService.getScriptProperties().getProperty('VERCEL_EMAIL_SECRET');

    if (!expectedSecret) {
      return jsonResponse({
        success: false,
        authenticated: false,
        error: 'Server secret not configured.',
      });
    }

    if (!payload || payload.token !== expectedSecret) {
      return jsonResponse({
        success: false,
        authenticated: false,
        error: 'Unauthorized: invalid token.',
      });
    }

    var action = String(payload.action || '').trim();

    if (action === 'health') {
      var activeCc = String(
        PropertiesService.getScriptProperties().getProperty('EMAIL_CC_ADDRESS') || DEFAULT_CC_EMAIL
      ).trim();
      return jsonResponse({
        success: true,
        service: SERVICE_NAME,
        version: SCRIPT_VERSION,
        attachmentSupported: true,
        defaultCcEmail: activeCc,
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

    var requiresAttachment =
      action === 'registration_confirmation' ||
      action === 'abstract_confirmation' ||
      action === 'abstract_acceptance';

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
          version: SCRIPT_VERSION,
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

      // Centralized Organising Secretary CC configuration (never sends duplicate email; avoids self-CC)
      var configuredScriptCc = String(props.getProperty('EMAIL_CC_ADDRESS') || '').trim();
      var candidateCc = configuredScriptCc || String(payload.cc || '').trim() || DEFAULT_CC_EMAIL;
      var ccParts = candidateCc ? candidateCc.split(',') : [];
      var filteredCc = [];
      for (var c = 0; c < ccParts.length; c++) {
        var trimmedCc = String(ccParts[c] || '').trim();
        if (trimmedCc && trimmedCc.toLowerCase() !== recipient.toLowerCase()) {
          filteredCc.push(trimmedCc);
        }
      }
      var ccRecipient = filteredCc.join(', ');
      if (ccRecipient) {
        mailOptions.cc = ccRecipient;
      }

      if (htmlBody) {
        mailOptions.htmlBody = htmlBody;
      }

      // Parse single attachment contract { filename, mimeType, base64 } (with array fallback)
      var rawAttachments = [];
      if (payload.attachment && typeof payload.attachment === 'object') {
        rawAttachments = [payload.attachment];
      } else if (Array.isArray(payload.attachments) && payload.attachments.length > 0) {
        rawAttachments = payload.attachments;
      }

      var attachmentReceived = rawAttachments.length > 0;
      var blobs = [];
      var attachmentFilenames = [];
      var totalAttachmentBytes = 0;

      if (action === 'registration_received') {
        // Event 1 must never include a PDF attachment
        rawAttachments = [];
        attachmentReceived = false;
      }

      for (var i = 0; i < rawAttachments.length; i++) {
        var att = rawAttachments[i];
        if (!att || typeof att !== 'object') {
          continue;
        }
        var b64 = String(att.base64 || att.content || att.data || '')
          .replace(/^data:application\/pdf;[^,]*,/, '')
          .replace(/\s+/g, '')
          .trim();

        var mimeType = String(att.mimeType || att.contentType || 'application/pdf').trim();
        var filename = String(att.filename || att.name || 'SRMCON_2027_Document.pdf').trim();

        Logger.log(
          '[SRMCON] Attachment received by Apps Script: action=' +
            action +
            ', eventId=' +
            eventId +
            ', filename=' +
            filename +
            ', mimeType=' +
            mimeType +
            ', base64Length=' +
            b64.length
        );

        if (!b64) {
          return jsonResponse({
            success: false,
            service: SERVICE_NAME,
            eventId: eventId,
            action: action,
            attachmentReceived: attachmentReceived,
            blobCreated: false,
            attachmentCount: 0,
            error: 'Attachment base64 payload was empty for ' + filename + '.',
          });
        }

        var bytes = Utilities.base64Decode(b64);
        if (!bytes || bytes.length < 5) {
          return jsonResponse({
            success: false,
            service: SERVICE_NAME,
            eventId: eventId,
            action: action,
            attachmentReceived: attachmentReceived,
            blobCreated: false,
            attachmentCount: 0,
            error: 'Decoded PDF attachment bytes were empty or invalid.',
          });
        }

        // Verify PDF magic header "%PDF-" (37, 80, 68, 70, 45)
        var isPdfHeader =
          (bytes[0] & 0xff) === 37 &&
          (bytes[1] & 0xff) === 80 &&
          (bytes[2] & 0xff) === 68 &&
          (bytes[3] & 0xff) === 70 &&
          (bytes[4] & 0xff) === 45;

        if (!isPdfHeader) {
          return jsonResponse({
            success: false,
            service: SERVICE_NAME,
            eventId: eventId,
            action: action,
            attachmentReceived: attachmentReceived,
            blobCreated: false,
            attachmentCount: 0,
            error: 'Decoded attachment does not start with a valid %PDF- header.',
          });
        }

        var pdfBlob = Utilities.newBlob(bytes, mimeType || 'application/pdf', filename);
        if (!pdfBlob || pdfBlob.getBytes().length === 0) {
          return jsonResponse({
            success: false,
            service: SERVICE_NAME,
            eventId: eventId,
            action: action,
            attachmentReceived: attachmentReceived,
            blobCreated: false,
            attachmentCount: 0,
            error: 'Failed to construct PDF Blob for MailApp.',
          });
        }

        blobs.push(pdfBlob);
        attachmentFilenames.push(filename);
        totalAttachmentBytes += pdfBlob.getBytes().length;

        Logger.log(
          '[SRMCON] Blob successfully created: filename=' +
            filename +
            ', mimeType=' +
            pdfBlob.getContentType() +
            ', bytes=' +
            pdfBlob.getBytes().length
        );
      }

      if (requiresAttachment && blobs.length === 0) {
        Logger.log(
          '[SRMCON] Aborting send: required PDF attachment missing for action=' +
            action +
            ', eventId=' +
            eventId
        );
        return jsonResponse({
          success: false,
          service: SERVICE_NAME,
          eventId: eventId,
          action: action,
          attachmentReceived: attachmentReceived,
          blobCreated: false,
          attachmentCount: 0,
          error: 'Required PDF attachment was not received or could not be processed for ' + action + '.',
        });
      }

      if (blobs.length > 0) {
        mailOptions.attachments = blobs;
      }

      Logger.log(
        '[SRMCON] Calling MailApp.sendEmail: eventId=' +
          eventId +
          ', action=' +
          action +
          ', cc=' +
          (ccRecipient || 'none') +
          ', attachmentCount=' +
          blobs.length +
          ', totalBytes=' +
          totalAttachmentBytes
      );

      MailApp.sendEmail(
        recipient,
        subject,
        textBody || 'Please view this message in an HTML-capable email client.',
        mailOptions
      );

      var sentAt = new Date().toISOString();
      cache.put(eventKey, sentAt, 21600); // 6h fast cache
      props.setProperty(eventKey, sentAt); // Persistent idempotency guard

      Logger.log(
        '[SRMCON] MailApp execution succeeded: eventId=' +
          eventId +
          ', cc=' +
          (ccRecipient || 'none') +
          ', attachmentCount=' +
          blobs.length
      );

      return jsonResponse({
        success: true,
        service: SERVICE_NAME,
        version: SCRIPT_VERSION,
        eventId: eventId,
        action: action,
        recipient: recipient,
        cc: ccRecipient || null,
        sentAt: sentAt,
        duplicate: false,
        attachmentReceived: attachmentReceived,
        blobCreated: blobs.length > 0,
        attachmentCount: blobs.length,
        attachmentFilenames: attachmentFilenames,
        attachmentBytes: totalAttachmentBytes,
        mailAppSent: true,
        remainingQuota: MailApp.getRemainingDailyQuota(),
      });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    Logger.log(
      '[SRMCON] Apps Script error: ' + (err && err.message ? String(err.message) : 'Unknown error')
    );
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
