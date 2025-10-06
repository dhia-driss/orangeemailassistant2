import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { google } from "googleapis";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Use getToken to securely access the JWT from the request's cookies
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || !token.accessToken) {
      throw new Error("Not authenticated or access token is missing");
    }

    // Create an authenticated OAuth2 client
    const auth = new google.auth.OAuth2({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    });
    auth.setCredentials({
      access_token: token.accessToken as string,
      refresh_token: token.refreshToken as string | undefined,
    });

    const gmail = google.gmail({ version: "v1", auth });

    // Build Gmail search query from incoming filter params
    const url = new URL(req.url);
    const subject = url.searchParams.get("subject") || "";
    const contains = url.searchParams.get("contains") || "";
    const singleDate = url.searchParams.get("singleDate") || "";
    const dateStart = url.searchParams.get("dateStart") || "";
    const dateEnd = url.searchParams.get("dateEnd") || "";
    const senders = url.searchParams.get("senders") || ""; // comma separated
    const pageToken = url.searchParams.get("pageToken") || undefined;

    let qParts: string[] = ["-category:promotions -category:social"];
    if (subject) qParts.push(`subject:${subject}`);
    if (contains) qParts.push(contains);
    if (senders) {
      const list = senders.split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length > 0) {
        // Build OR query for senders
        const orParts = list.map((s) => `from:${s}`);
        qParts.push(`(${orParts.join(" OR ")})`);
      }
    }
    if (singleDate) {
      // Gmail uses after:YYYY/MM/DD before:YYYY/MM/DD
      const d = singleDate.replace(/-/g, "/");
      // before next day
      const next = new Date(singleDate);
      next.setDate(next.getDate() + 1);
      const before = `${next.getFullYear()}/${(next.getMonth()+1).toString().padStart(2,'0')}/${next.getDate().toString().padStart(2,'0')}`;
      qParts.push(`after:${d}`);
      qParts.push(`before:${before}`);
    } else if (dateStart || dateEnd) {
      if (dateStart) qParts.push(`after:${dateStart.replace(/-/g, "/")}`);
      if (dateEnd) {
        const d = new Date(dateEnd);
        d.setDate(d.getDate() + 1);
        qParts.push(`before:${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}`);
      }
    }

    const q = qParts.join(" ");

    const listOpts: any = {
      userId: "me",
      labelIds: ["INBOX"],
      maxResults: 20,
      q,
    };
    if (pageToken) listOpts.pageToken = pageToken;

    const response = await gmail.users.messages.list(listOpts);

    const messages = response.data.messages || [];
    if (messages.length === 0) {
      return NextResponse.json({ emails: [], nextPageToken: response.data.nextPageToken || null });
    }

    const batch = messages.map((message) => {
      return gmail.users.messages.get({
        userId: "me",
        id: message.id!,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "Date"],
      });
    });

    const results = await Promise.all(batch);

  const emails = results.map((res) => {
      const headers = res.data.payload?.headers || [];
      const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject";
      const from = headers.find((h) => h.name === "From")?.value || "Unknown Sender";
      const date = headers.find((h) => h.name === "Date")?.value || "";
      const hasAttachment = res.data.payload?.parts?.some(p => !!p.filename) || false;

      return {
        id: res.data.id,
        subject,
        sender: from.replace(/<.*>/, "").trim(),
        timestamp: new Date(date).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short' }),
        preview: res.data.snippet,
        hasAttachment: hasAttachment,
        isUnread: res.data.labelIds?.includes("UNREAD") || false,
        isStarred: res.data.labelIds?.includes("STARRED") || false,
        category: "Travail",
        content: ""
      };
    });

    return NextResponse.json({ emails, nextPageToken: response.data.nextPageToken || null });
  } catch (error) {
    const msg = (error as Error).message || String(error);
    console.error("Error fetching emails:", msg, error);
    // If Google's token refresh failed because the refresh token was expired or revoked
    // (invalid_grant), tell the client to re-authenticate (401).
    const errObj = error as any;
    const googleError = errObj?.response?.data || {};
    if (msg.includes("invalid_grant") || googleError?.error === "invalid_grant" || (googleError?.error_description && /expired|revoked/i.test(googleError.error_description))) {
        return NextResponse.json({ error: "Refresh token expired or revoked. Please re-authenticate.", details: msg }, { status: 401 });
    }
    if (msg.includes("Not authenticated")) {
        return NextResponse.json({ error: "Authentication failed. Please log in again.", details: msg }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch emails from Gmail API", details: msg },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const ids: string[] = body?.ids || [];
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No message ids provided" }, { status: 400 });
    }

    // Debug: log incoming delete request and token presence
    console.debug('[emails.delete] incoming body:', { ids });
    console.debug('[emails.delete] token present:', { hasAccess: !!token.accessToken, hasRefresh: !!token.refreshToken });

    const auth = new google.auth.OAuth2({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    });
    auth.setCredentials({ access_token: token.accessToken as string, refresh_token: token.refreshToken as string | undefined });
    const gmail = google.gmail({ version: "v1", auth });

    // Try a lightweight call to validate the credentials and get a clearer error if any
    try {
      const profile = await gmail.users.getProfile({ userId: 'me' });
      console.debug('[emails.delete] gmail profile fetched, emailAddress:', profile.data?.emailAddress);
    } catch (err) {
      console.error('[emails.delete] failed to fetch gmail profile (auth problem?)', err);
      throw err;
    }

    // Use batchDelete to remove messages
    await gmail.users.messages.batchDelete({ userId: "me", requestBody: { ids } });

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error) {
    const errObj: any = error;
    const msg = errObj?.message || String(error);
    const googleError = errObj?.response?.data || null;
    const stack = errObj?.stack || null;
    console.error("Error deleting emails:", msg, { googleError, stack, error: errObj });

    if (msg.includes("invalid_grant") || googleError?.error === "invalid_grant" || (googleError?.error_description && /expired|revoked/i.test(googleError.error_description))) {
      return NextResponse.json({ error: "Refresh token expired or revoked. Please re-authenticate.", details: msg, googleError }, { status: 401 });
    }

    return NextResponse.json({ error: "Failed to delete messages", details: msg, googleError, stack }, { status: 500 });
  }
}

