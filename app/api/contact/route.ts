import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

/**
 * POST /api/contact — public landing-page contact form. Unauthenticated by
 * design (visitors aren't logged in); see the exemption in auth.config.ts.
 * Sends the enquiry by email to the configured recipient via SMTP.
 */

const RECIPIENT = process.env.CONTACT_RECIPIENT_EMAIL || "gessien3@gmail.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ContactBody {
  firstName?: string;
  lastName?: string;
  workEmail?: string;
  orgType?: string;
  message?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactBody = await request.json();
    const firstName = (body.firstName || "").trim();
    const lastName = (body.lastName || "").trim();
    const workEmail = (body.workEmail || "").trim();
    const orgType = (body.orgType || "").trim();
    const message = (body.message || "").trim();

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "Please enter your first and last name." }, { status: 400 });
    }
    if (!workEmail || !EMAIL_RE.test(workEmail)) {
      return NextResponse.json({ error: "Please enter a valid work email." }, { status: 400 });
    }
    if (!message || message.length < 5) {
      return NextResponse.json({ error: "Please enter a short message." }, { status: 400 });
    }
    if (message.length > 5000) {
      return NextResponse.json({ error: "Message is too long." }, { status: 400 });
    }

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.error("[contact] SMTP is not configured (missing SMTP_HOST/SMTP_USER/SMTP_PASS)");
      return NextResponse.json(
        { error: "Email sending isn't configured yet. Please try again later." },
        { status: 503 },
      );
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT ? parseInt(SMTP_PORT, 10) : 587,
      secure: SMTP_PORT === "465",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const fullName = `${firstName} ${lastName}`;

    await transporter.sendMail({
      from: `"CareVault Website" <${SMTP_FROM || SMTP_USER}>`,
      to: RECIPIENT,
      replyTo: workEmail,
      subject: `New enquiry from ${fullName}${orgType ? ` (${orgType})` : ""}`,
      text: [
        `Name: ${fullName}`,
        `Email: ${workEmail}`,
        orgType ? `Organization type: ${orgType}` : null,
        "",
        message,
      ].filter(Boolean).join("\n"),
      html: `
        <div style="font-family: -apple-system, sans-serif; font-size: 15px; color: #0f172a;">
          <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(workEmail)}</p>
          ${orgType ? `<p><strong>Organization type:</strong> ${escapeHtml(orgType)}</p>` : ""}
          <p style="margin-top:16px; white-space: pre-wrap;">${escapeHtml(message)}</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error sending contact email:", error);
    return NextResponse.json({ error: "Failed to send your message. Please try again." }, { status: 500 });
  }
}
