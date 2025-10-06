import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { google, gmail_v1 } from "googleapis";
import { NextRequest } from "next/server";

// Helper to extract HTML or plain text body from the message parts
function getPart(parts?: gmail_v1.Schema$MessagePart[] | null, mimeType = "text/html"): string | null {
  if (!parts) return null;
  for (const part of parts) {
    if (part.mimeType === mimeType && part.body?.data) {
      return Buffer.from(part.body.data as string, "base64").toString();
    }
    if (part.parts) {
      const result = getPart(part.parts as gmail_v1.Schema$MessagePart[], mimeType);
      if (result) return result;
    }
  }
  return null;
}

// Helper to collect attachments
async function findAttachments(parts: gmail_v1.Schema$MessagePart[] | undefined, messageId: string, gmail: gmail_v1.Gmail) {
  const attachments: Array<{ filename?: string; mimeType?: string; size?: number; data?: string }> = [];
  if (!parts) return attachments;
  for (const part of parts) {
    if (part.filename && part.body?.attachmentId) {
      try {
        const a = await gmail.users.messages.attachments.get({ userId: "me", messageId, id: part.body.attachmentId });
        attachments.push({
          filename: part.filename,
          mimeType: (part.mimeType as string) || undefined,
          size: (a.data.size as number) || undefined,
          data: a.data.data as string,
        });
      } catch (e) {
        console.error("Error fetching attachment:", e);
      }
    }
    if (part.parts) {
      const nested = await findAttachments(part.parts as gmail_v1.Schema$MessagePart[], messageId, gmail);
      attachments.push(...nested);
    }
  }
  return attachments;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const messageId = params.id;
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.accessToken) {
      throw new Error("Not authenticated or access token is missing");
    }

    const auth = new google.auth.OAuth2({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    });
    auth.setCredentials({
      access_token: token.accessToken as string,
      refresh_token: token.refreshToken as string | undefined,
    });

    const gmail = google.gmail({ version: "v1", auth });

    const msg = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
    const payload = msg.data.payload;
    if (!payload) {
      return NextResponse.json({ id: messageId, body: "", attachments: [] });
    }

    // Prefer HTML, fall back to plain text
    let body = getPart(payload.parts as any, "text/html") || getPart(payload.parts as any, "text/plain") || "";
    if (!body && payload.body?.data) {
      body = Buffer.from(payload.body.data as string, "base64").toString();
    }

    const headers = payload.headers || [];
    const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject";
    const from = headers.find((h) => h.name === "From")?.value || "";
    const to = headers.find((h) => h.name === "To")?.value || "";

    const attachments = payload.parts ? await findAttachments(payload.parts as any, messageId, gmail) : [];

    return NextResponse.json({
      id: msg.data.id,
      subject,
      from,
      to,
      body,
      attachments,
    });
  } catch (error) {
    console.error("Error fetching email details:", error);
    const msg = (error as Error).message || String(error);
    if (msg.includes("Not authenticated")) {
      return NextResponse.json({ error: "Authentication failed. Please log in again.", details: msg }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch email details", details: msg }, { status: 500 });
  }
}

