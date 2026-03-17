import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

interface SlackChannel {
  id: string;
  name: string;
  is_member: boolean;
}

interface SlackMessage {
  ts: string;
  text: string;
  user?: string;
  bot_id?: string;
  subtype?: string;
}

interface SlackUser {
  real_name?: string;
  profile?: { real_name?: string; display_name?: string };
}

async function slackGet(path: string, token: string, params?: Record<string, string>) {
  const url = new URL(`https://slack.com/api/${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json() as Promise<{ ok: boolean; error?: string } & Record<string, unknown>>;
}

async function resolveUserName(userId: string, token: string): Promise<string> {
  const data = await slackGet("users.info", token, { user: userId }) as { ok: boolean; user?: SlackUser };
  if (!data.ok || !data.user) return userId;
  return (
    data.user.profile?.real_name ??
    data.user.profile?.display_name ??
    data.user.real_name ??
    userId
  );
}

export interface FetchedMessage {
  id: string;          // Slack message ts (unique per channel)
  text: string;
  senderName: string;
  channelName: string;
  teamName: string;
  timestamp: Date;
}

export async function fetchSlackMessages(userId: string): Promise<FetchedMessage[]> {
  const record = await prisma.oAuthToken.findUnique({
    where: { service_userId: { service: "slack", userId } },
  });
  if (!record) return [];

  const token = decrypt(record.token);
  const metadata = record.metadata as { teamName?: string; last_fetched_at?: string | null };
  const teamName = metadata.teamName ?? "Slack";
  const oldestTs = metadata.last_fetched_at
    ? (new Date(metadata.last_fetched_at).getTime() / 1000).toString()
    : undefined;

  // Get all channels the user is a member of
  const channelsData = await slackGet("conversations.list", token, {
    types: "public_channel,private_channel,im,mpim",
    limit: "200",
  }) as { ok: boolean; channels?: SlackChannel[]; error?: string };

  if (!channelsData.ok || !channelsData.channels) {
    console.error("Slack channels error:", channelsData.error);
    return [];
  }

  const memberChannels = channelsData.channels.filter((c) => c.is_member);
  const messages: FetchedMessage[] = [];
  const userCache: Record<string, string> = {};

  for (const channel of memberChannels) {
    const historyParams: Record<string, string> = { channel: channel.id, limit: "100" };
    if (oldestTs) historyParams.oldest = oldestTs;

    const history = await slackGet("conversations.history", token, historyParams) as {
      ok: boolean;
      messages?: SlackMessage[];
    };

    if (!history.ok || !history.messages) continue;

    for (const msg of history.messages) {
      // Skip bot messages, thread replies marked as subtypes, etc.
      if (msg.bot_id || msg.subtype || !msg.text?.trim()) continue;

      const msgId = `slack:${channel.id}:${msg.ts}`;

      // Skip if already seen
      const seen = await prisma.seenMessage.findUnique({
        where: { messageId_userId: { messageId: msgId, userId } },
      });
      if (seen) continue;

      // Resolve username
      if (msg.user && !userCache[msg.user]) {
        userCache[msg.user] = await resolveUserName(msg.user, token);
      }

      messages.push({
        id: msgId,
        text: msg.text,
        senderName: msg.user ? (userCache[msg.user] ?? msg.user) : "Unknown",
        channelName: channel.name ?? "DM",
        teamName,
        timestamp: new Date(parseFloat(msg.ts) * 1000),
      });
    }
  }

  // Update last_fetched_at
  await prisma.oAuthToken.update({
    where: { service_userId: { service: "slack", userId } },
    data: {
      metadata: { ...metadata, last_fetched_at: new Date().toISOString() },
    },
  });

  return messages;
}
