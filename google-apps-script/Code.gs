/* ============================================================
   Aroha Clinic - Client Feedback - Google Apps Script

   Receives the /client-feedback form (customers who rated 1–3 stars on
   /review) and writes each submission to the "Aroha Feedback" tab.
   4–5 star ratings go straight to Google reviews and never reach here.

   SETUP
   -----
   1. Create (or open) the Aroha Clinic Google Sheet.
   2. Extensions → Apps Script → replace everything with this file → Save.
   3. Run authorize() once from the editor and accept the permissions.
   4. (Optional) Run setupSheets() to create the tab with headers now.
   5. Deploy → New deployment → type "Web app"
        Execute as: Me
        Who has access: Anyone
      Copy the /exec URL into GOOGLE_SHEETS_WEBHOOK_URL
      (.env.local and the hosting provider's environment variables).

   Updating an existing deployment (keeps the same /exec URL):
   Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy.

   PAYLOAD (app/api/feedback/route.js)
   -----------------------------------
     { action: "feedback", timestamp, name, email, phone, rating, suggestions, pageUrl }

   EMAIL ALERTS (optional)
   -----------------------
   Project Settings → Script Properties → add
     NOTIFY_EMAIL   e.g. team@yourclinic.com  (comma-separate several addresses)
   Every new feedback row is then emailed to that address. Leave it unset
   to disable alerts. Run testNotifyEmail() once to check it works.

   Rows are written by header name, not fixed column position, so you can
   add your own columns (e.g. "Called?", "Notes", "Resolved") safely.
   ============================================================ */

var BRAND_NAME = 'Aroha Clinic';
var FEEDBACK_TAB = 'Aroha Feedback';

var FEEDBACK_HEADERS = ['Timestamp', 'Name', 'Email', 'Phone', 'Rating', 'Suggestions', 'Page URL'];
var FEEDBACK_WIDTHS = [190, 200, 240, 160, 90, 420, 280];

// Aroha brand colours (logo terracotta / soft blush / light terracotta)
var HEADER_COLOR = '#AD5438';
var ROW_ALT_COLOR = '#FBF3EF';
var ROW_BORDER_COLOR = '#EBE1DB';
var LOW_RATING_COLOR = '#F7E4DC';

function authorize() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('Authorized: ' + ss.getName());
  // Touch MailApp so the email permission is granted too.
  Logger.log('Mail quota left today: ' + MailApp.getRemainingDailyQuota());
}

function doGet() {
  return _json({ status: BRAND_NAME + ' feedback API is live' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return _json({ error: 'Empty request body' });
    }

    var data = JSON.parse(e.postData.contents);
    var action = data.action || 'feedback';
    if (action !== 'feedback') {
      return _json({ error: 'Unknown action: ' + action });
    }

    lock.waitLock(20000);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ts = data.timestamp || _istNow();
    var row = appendFeedbackRow(getOrCreateFeedbackSheet(ss), data, ts);

    // Release before emailing so concurrent submissions aren't held up.
    lock.releaseLock();
    _notify(data, ts, ss);

    return _json({ success: true, tab: FEEDBACK_TAB, action: action, row: row });
  } catch (err) {
    return _json({ error: err.toString() });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FEEDBACK_TAB);
  if (!sheet) {
    createFeedbackSheet(ss);
    Logger.log('Created: ' + FEEDBACK_TAB);
  } else {
    _ensureHeaders(sheet, FEEDBACK_HEADERS);
    Logger.log('OK: ' + FEEDBACK_TAB);
  }
  Logger.log('setupSheets complete.');
}

/* ── Helpers ─────────────────────────────────────────────────── */

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function _istNow() {
  return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'd/M/yyyy, h:mm:ss a');
}

function _styleHeader(sheet, colCount) {
  sheet.getRange(1, 1, 1, colCount)
    .setBackground(HEADER_COLOR)
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 42);
}

function _styleRow(sheet, rowIndex, colCount) {
  var row = sheet.getRange(rowIndex, 1, 1, colCount);
  row.setBackground(rowIndex % 2 === 0 ? ROW_ALT_COLOR : '#ffffff')
    .setFontColor('#241c19')
    .setFontSize(10)
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('left');
  sheet.setRowHeight(rowIndex, 36);
  row.setBorder(false, false, true, false, false, false, ROW_BORDER_COLOR, SpreadsheetApp.BorderStyle.SOLID);
}

function _setWidths(sheet, widths) {
  widths.forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });
}

function _addFilter(sheet, colCount) {
  try {
    if (!sheet.getFilter()) sheet.getRange(1, 1, 1, colCount).createFilter();
  } catch (err) {
    Logger.log('Filter skipped on ' + sheet.getName() + ': ' + err);
  }
}

/** Header row, adding any default column an older tab is missing. */
function _ensureHeaders(sheet, defaultHeaders) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(defaultHeaders);
    _styleHeader(sheet, defaultHeaders.length);
    sheet.setFrozenRows(1);
    return defaultHeaders.slice();
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) {
    return String(h).trim();
  });

  var missing = defaultHeaders.filter(function (h) { return headers.indexOf(h) === -1; });
  if (missing.length) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    headers = headers.concat(missing);
    _styleHeader(sheet, headers.length);
    sheet.setColumnWidth(headers.length, 150);
  }
  return headers;
}

function _appendByHeaders(sheet, valueMap, defaultHeaders) {
  var headers = _ensureHeaders(sheet, defaultHeaders);

  var row = headers.map(function (h) {
    return Object.prototype.hasOwnProperty.call(valueMap, h) ? valueMap[h] : '';
  });

  var nextRow = sheet.getLastRow() + 1;
  // Kept as text, so Sheets doesn't turn +9198... into 9.19E+11.
  sheet.getRange(nextRow, 1, 1, headers.length).setNumberFormat('@').setValues([row]);
  _styleRow(sheet, nextRow, headers.length);

  return { row: nextRow, headers: headers };
}

function _centerColumns(sheet, headers, rowIndex, names) {
  names.forEach(function (name) {
    var idx = headers.indexOf(name);
    if (idx !== -1) sheet.getRange(rowIndex, idx + 1).setHorizontalAlignment('center');
  });
}

function _phone(raw) {
  var digits = String(raw || '').replace(/\D/g, '');
  return digits ? '+' + digits : '';
}

function _rating(raw) {
  var n = Number(raw);
  return n >= 1 && n <= 5 && Math.floor(n) === n ? n : 0;
}

/* ── Sheet setup ─────────────────────────────────────────────── */

function createFeedbackSheet(ss) {
  var sheet = ss.insertSheet(FEEDBACK_TAB);
  sheet.appendRow(FEEDBACK_HEADERS);
  _styleHeader(sheet, FEEDBACK_HEADERS.length);
  _setWidths(sheet, FEEDBACK_WIDTHS);
  sheet.setFrozenRows(1);
  _addFilter(sheet, FEEDBACK_HEADERS.length);
  return sheet;
}

function getOrCreateFeedbackSheet(ss) {
  return ss.getSheetByName(FEEDBACK_TAB) || createFeedbackSheet(ss);
}

/* ── Feedback row ────────────────────────────────────────────── */

function appendFeedbackRow(sheet, data, ts) {
  var rating = _rating(data.rating);
  var result = _appendByHeaders(sheet, {
    'Timestamp': ts,
    'Name': String(data.name || '').slice(0, 100),
    'Email': String(data.email || '').slice(0, 150),
    'Phone': _phone(data.phone),
    'Rating': rating ? rating + ' / 5' : '',
    'Suggestions': String(data.suggestions || '').slice(0, 2000),
    'Page URL': String(data.pageUrl || '').slice(0, 300)
  }, FEEDBACK_HEADERS);

  _centerColumns(sheet, result.headers, result.row, ['Phone', 'Rating']);

  // 1–2 stars: highlight the rating cell in blush so it stands out.
  var rIdx = result.headers.indexOf('Rating');
  if (rIdx !== -1 && rating && rating <= 2) {
    sheet.getRange(result.row, rIdx + 1).setBackground(LOW_RATING_COLOR).setFontWeight('bold');
  }

  // Long suggestions wrap instead of spilling over; the row grows to fit.
  var sIdx = result.headers.indexOf('Suggestions');
  if (sIdx !== -1) {
    sheet.getRange(result.row, sIdx + 1).setWrap(true);
    sheet.autoResizeRows(result.row, 1);
  }
  return result.row;
}

/* ── Email alert (optional, NOTIFY_EMAIL script property) ────── */

function _notify(data, ts, ss) {
  var to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
  if (!to) return;

  try {
    var rating = _rating(data.rating);
    var stars = rating ? Array(rating + 1).join('★') + Array(6 - rating).join('☆') + ' (' + rating + '/5)' : 'Not given';
    var rows = [
      ['Time', ts],
      ['Name', data.name || ''],
      ['Phone', _phone(data.phone)],
      ['Email', data.email || ''],
      ['Rating', stars],
      ['Suggestions', data.suggestions || '']
    ];

    var html =
      '<div style="font-family:Arial,sans-serif;max-width:560px">' +
      '<div style="background:' + HEADER_COLOR + ';color:#fff;padding:14px 18px;border-radius:8px 8px 0 0;font-weight:bold">' +
      'New client feedback — ' + BRAND_NAME + '</div>' +
      '<table style="width:100%;border-collapse:collapse;border:1px solid ' + ROW_BORDER_COLOR + '">' +
      rows.map(function (r, i) {
        return '<tr style="background:' + (i % 2 ? ROW_ALT_COLOR : '#fff') + '">' +
          '<td style="padding:10px 14px;font-weight:bold;width:120px;vertical-align:top">' + _esc(r[0]) + '</td>' +
          '<td style="padding:10px 14px;white-space:pre-wrap">' + _esc(r[1]) + '</td></tr>';
      }).join('') +
      '</table>' +
      '<p style="font-size:12px;color:#6b5f5a">Sheet: <a href="' + ss.getUrl() + '">' + _esc(ss.getName()) + '</a></p>' +
      '</div>';

    var mail = {
      to: to,
      subject: BRAND_NAME + ' feedback: ' + (rating ? rating + '/5' : 'no rating') + ' from ' + (data.name || 'a customer'),
      htmlBody: html,
      name: BRAND_NAME + ' Feedback'
    };
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email || ''))) mail.replyTo = data.email;
    MailApp.sendEmail(mail);
  } catch (err) {
    // An email failure must never lose the submission (the row is already saved).
    Logger.log('Notify failed: ' + err);
  }
}

function _esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/** Run from the editor to check the NOTIFY_EMAIL alert (does not write to the sheet). */
function testNotifyEmail() {
  _notify({
    name: 'Test Customer',
    email: 'test@example.com',
    phone: '+919999999999',
    rating: 2,
    suggestions: 'This is a test alert from the Aroha feedback script.'
  }, _istNow(), SpreadsheetApp.getActiveSpreadsheet());
  Logger.log('Test email sent (if NOTIFY_EMAIL is set).');
}
