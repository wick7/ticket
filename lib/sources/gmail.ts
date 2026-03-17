import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";
import { refreshGmailToken } from "./gmail-auth";

interface GmailMessageRef {
  id: string;
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
}

interface GmailMessage {
  id: string;
  snippet?: string;
  payload?: {
    headers?: GmailHeader[];
    body?: { data?: string };
    parts?: GmailPart[];
  };
}

export interface FetchedMessage {
  id: string;
  text: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  timestamp: Date;
}

function getHeader(headers: GmailHeader[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

export async function fetchGmailMessages(userId: string): Promise<FetchedMessage[]> {
  const record = await prisma.oAuthToken.findUnique({
    where: { service_userId: { service: "gmail", userId } },
  });
  if (!record) return [];

  // Refresh token if expired or close to expiry
  let token = decrypt(record.token);
  if (record.expiresAt && record.expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
    if (record.refreshToken) {
      const refreshed = await refreshGmailToken(decrypt(record.refreshToken));
      if (refreshed) {
        token = refreshed.accessToken;
        await prisma.oAuthToken.update({
          where: { service_userId: { service: "gmail", userId } },
          data: {
            token: encrypt(refreshed.accessToken),
            refreshToken: refreshed.refreshToken ? encrypt(refreshed.refreshToken) : record.refreshToken,
            expiresAt: refreshed.expiresAt,
          },
        });
      }
    }
  }

  // Fetch unread messages
  const listUrl = new URL("https://www.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("q", "is:unread");
  listUrl.searchParams.set("maxResults", "20");

  const listRes = await fetch(listUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData = await listRes.json() as { messages?: GmailMessageRef[]; error?: { message: string } };

  if (listData.error) {
    console.error("Gmail list error:", listData.error.message);
    return [];
  }

  const messages: FetchedMessage[] = [];

  for (const ref of listData.messages ?? []) {
    const msgId = `gmail:${ref.id}`;

    const seen = await prisma.seenMessage.findUnique({
      where: { messageId_userId: { messageId: msgId, userId } },
    });
    if (seen) continue;

    const msgRes = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${ref.id}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const msg = await msgRes.json() as GmailMessage;

    const headers = msg.payload?.headers ?? [];
    const subject = getHeader(headers, "Subject") || "(no subject)";
    const fromRaw = getHeader(headers, "From");
    const dateRaw = getHeader(headers, "Date");

    // Parse sender name and email from "Name <email>" format
    const fromMatch = fromRaw.match(/^(.*?)\s*<(.+?)>$/);
    const senderName = fromMatch ? fromMatch[1].replace(/"/g, "").trim() || fromMatch[2] : fromRaw;
    const senderEmail = fromMatch ? fromMatch[2] : fromRaw;

    messages.push({
      id: msgId,
      text: msg.snippet ?? subject,
      senderName,
      senderEmail,
      subject,
      timestamp: dateRaw ? new Date(dateRaw) : new Date(),
    });
  }

  // Update last_fetched_at
  const metadata = record.metadata as object;
  await prisma.oAuthToken.update({
    where: { service_userId: { service: "gmail", userId } },
    data: { metadata: { ...metadata, last_fetched_at: new Date().toISOString() } },
  });

  return messages;
}
