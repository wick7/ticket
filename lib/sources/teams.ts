import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";
import { refreshMicrosoftToken } from "./microsoft-auth";

interface GraphChat {
  id: string;
  chatType?: string;
  members?: Array<{ displayName?: string }>;
}

interface GraphChatMessage {
  id: string;
  body?: { content?: string; contentType?: string };
  from?: { user?: { displayName?: string } };
  createdDateTime?: string;
  messageType?: string;
  deletedDateTime?: string | null;
}

interface GraphResponse<T> {
  value?: T[];
  error?: { message: string };
}

export interface FetchedMessage {
  id: string;
  text: string;
  senderName: string;
  chatName: string;
  timestamp: Date;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function fetchTeamsMessages(): Promise<FetchedMessage[]> {
  const record = await prisma.oAuthToken.findUnique({ where: { service: "outlook" } });
  if (!record) return []; // Teams uses same Microsoft token

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

  const metadata = record.metadata as { teams_last_fetched_at?: string | null };
  const since = metadata.teams_last_fetched_at
    ? new Date(metadata.teams_last_fetched_at).toISOString()
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all chats (DMs and group chats)
  const chatsRes = await fetch(
    "https://graph.microsoft.com/v1.0/me/chats?$expand=members&$top=50",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const chatsData = await chatsRes.json() as GraphResponse<GraphChat>;

  if (chatsData.error) {
    console.error("Teams chats error:", chatsData.error.message);
    return [];
  }

  const messages: FetchedMessage[] = [];

  for (const chat of chatsData.value ?? []) {
    const chatName =
      chat.members
        ?.map((m) => m.displayName)
        .filter(Boolean)
        .join(", ") ?? "Chat";

    const msgsUrl = new URL(
      `https://graph.microsoft.com/v1.0/me/chats/${chat.id}/messages`
    );
    msgsUrl.searchParams.set("$top", "50");

    const msgsRes = await fetch(msgsUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const msgsData = await msgsRes.json() as GraphResponse<GraphChatMessage>;

    if (msgsData.error || !msgsData.value) continue;

    for (const msg of msgsData.value) {
      // Skip system messages, deleted messages, non-text
      if (
        msg.messageType !== "message" ||
        msg.deletedDateTime ||
        !msg.body?.content
      )
        continue;

      // Filter by since date
      if (msg.createdDateTime && new Date(msg.createdDateTime) < new Date(since))
        continue;

      const msgId = `teams:${chat.id}:${msg.id}`;
      const seen = await prisma.seenMessage.findUnique({ where: { id: msgId } });
      if (seen) continue;

      const text =
        msg.body.contentType === "html"
          ? stripHtml(msg.body.content)
          : msg.body.content;

      if (!text.trim()) continue;

      messages.push({
        id: msgId,
        text,
        senderName: msg.from?.user?.displayName ?? "Unknown",
        chatName,
        timestamp: new Date(msg.createdDateTime ?? Date.now()),
      });
    }
  }

  // Update Teams-specific last_fetched_at in the same record metadata
  await prisma.oAuthToken.update({
    where: { service: "outlook" },
    data: {
      metadata: {
        ...(record.metadata as object),
        teams_last_fetched_at: new Date().toISOString(),
      },
    },
  });

  return messages;
}
