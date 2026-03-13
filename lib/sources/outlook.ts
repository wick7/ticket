import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";
import { refreshMicrosoftToken } from "./microsoft-auth";

interface GraphMessage {
  id: string;
  subject?: string;
  bodyPreview?: string;
  body?: { content?: string; contentType?: string };
  from?: { emailAddress?: { name?: string; address?: string } };
  receivedDateTime?: string;
  isDraft?: boolean;
}

interface GraphResponse {
  value?: GraphMessage[];
  error?: { message: string };
}

export interface FetchedMessage {
  id: string;
  text: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  timestamp: Date;
}

export async function fetchOutlookMessages(): Promise<FetchedMessage[]> {
  const record = await prisma.oAuthToken.findUnique({ where: { service: "outlook" } });
  if (!record) return [];

  // Refresh token if expired or close to expiry
  let token = decrypt(record.token);
  if (record.expiresAt && record.expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
    if (record.refreshToken) {
      const refreshed = await refreshMicrosoftToken(decrypt(record.refreshToken));
      if (refreshed) {
        token = refreshed.accessToken;
        await prisma.oAuthToken.update({
          where: { service: "outlook" },
          data: {
            token: encrypt(refreshed.accessToken),
            refreshToken: refreshed.refreshToken ? encrypt(refreshed.refreshToken) : record.refreshToken,
            expiresAt: refreshed.expiresAt,
          },
        });
      }
    }
  }

  const metadata = record.metadata as { last_fetched_at?: string | null };
  const since = metadata.last_fetched_at
    ? new Date(metadata.last_fetched_at).toISOString()
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // default: past 7 days

  const url = new URL("https://graph.microsoft.com/v1.0/me/messages");
  url.searchParams.set("$filter", `receivedDateTime gt ${since} and isDraft eq false`);
  url.searchParams.set("$select", "id,subject,bodyPreview,from,receivedDateTime,isDraft");
  url.searchParams.set("$top", "50");
  url.searchParams.set("$orderby", "receivedDateTime desc");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json() as GraphResponse;

  if (data.error) {
    console.error("Outlook fetch error:", data.error.message);
    return [];
  }

  const messages: FetchedMessage[] = [];

  for (const msg of data.value ?? []) {
    const msgId = `outlook:${msg.id}`;
    const seen = await prisma.seenMessage.findUnique({ where: { id: msgId } });
    if (seen) continue;

    messages.push({
      id: msgId,
      text: msg.bodyPreview ?? msg.subject ?? "",
      senderName: msg.from?.emailAddress?.name ?? "Unknown",
      senderEmail: msg.from?.emailAddress?.address ?? "",
      subject: msg.subject ?? "(no subject)",
      timestamp: new Date(msg.receivedDateTime ?? Date.now()),
    });
  }

  await prisma.oAuthToken.update({
    where: { service: "outlook" },
    data: { metadata: { ...metadata, last_fetched_at: new Date().toISOString() } },
  });

  return messages;
}
