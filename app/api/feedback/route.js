import { CONFIG as C } from "@/lib/siteConfig";
import { istNow, postToSheet } from "@/lib/sheets";
import { normalizeIndianPhone, sendToTeleCRM } from "@/lib/telecrm";

// /client-feedback form (1–3 star ratings) → in parallel:
//  - TeleCRM (Lead Request Type "feedback") so the team can call the customer back
//  - Google Apps Script web app (google-apps-script/Code.gs) → "Aroha Feedback" tab — only if
//    GOOGLE_SHEETS_WEBHOOK_URL is set
// The customer sees success if at least one configured destination saved it.

const SOURCE = "Aroha Clinic Client Feedback";
const PAGE_NAME = "aroha-client-feedback";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = String(body.name || "").trim().slice(0, 100);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 150);
  const phone = normalizeIndianPhone(body.phone);
  const suggestions = String(body.suggestions || "").trim().slice(0, 2000);
  const ratingNum = Number(body.rating);
  const rating = Number.isInteger(ratingNum) && ratingNum >= 1 && ratingNum <= 5 ? ratingNum : "";
  const pageUrl = String(body.pageUrl || "").slice(0, 300);

  if (body.company) return Response.json({ success: true }); // honeypot: pretend success, store nothing
  if (!name) return Response.json({ error: "Please enter your full name." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!/^[6-9]\d{9}$/.test(phone)) {
    return Response.json({ error: "Please enter a valid 10-digit mobile number." }, { status: 400 });
  }
  if (!suggestions) return Response.json({ error: "Please share your suggestions." }, { status: 400 });

  const ratingLabel = rating ? `${rating}/5` : "Not given";
  const useSheet = Boolean(process.env.GOOGLE_SHEETS_WEBHOOK_URL);

  const [crm, sheet] = await Promise.allSettled([
    sendToTeleCRM({
      name,
      phone,
      email,
      message: `Client feedback (${ratingLabel}) for ${C.clinic.name}: ${suggestions}`,
      requestType: "feedback",
      pageName: PAGE_NAME,
      notes: [
        `Lead Source: ${SOURCE}`,
        `Live URL: ${pageUrl || "Not provided"}`,
        `Rating: ${ratingLabel}`,
        `Feedback: ${suggestions}`,
        `Email: ${email}`,
      ],
    }),
    useSheet
      ? postToSheet({
          action: "feedback",
          timestamp: istNow(),
          name,
          email,
          phone: `+91${phone}`,
          rating,
          suggestions,
          pageUrl,
        })
      : Promise.resolve(null),
  ]);

  if (crm.status === "rejected") console.error("[TeleCRM - Feedback]", crm.reason);
  if (sheet.status === "rejected") console.error("[Google Sheets - Feedback]", sheet.reason);

  const crmOk = crm.status === "fulfilled";
  const sheetOk = useSheet && sheet.status === "fulfilled";
  if (!crmOk && !sheetOk) {
    return Response.json({ error: "We couldn't submit that right now. Please try again in a moment." }, { status: 502 });
  }
  return Response.json({
    success: true,
    crm: crmOk ? "ok" : "failed",
    sheet: !useSheet ? "off" : sheetOk ? "ok" : "failed",
  });
}
