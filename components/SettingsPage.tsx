"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

interface SourceStatus {
  connected: boolean;
  teamName?: string | null;
  displayName?: string | null;
  lastFetchedAt?: string | null;
}

interface Status {
  slack: SourceStatus;
  outlook: SourceStatus;
  teams: SourceStatus;
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString();
}

function SourceCard({
  name,
  description,
  connectHref,
  status,
  service,
  note,
  onDisconnect,
}: {
  name: string;
  description: string;
  connectHref: string;
  status: SourceStatus | undefined;
  service: string;
  note?: string;
  onDisconnect: (service: string) => void;
}) {
  const connected = status?.connected ?? false;
  const subtitle = status?.teamName ?? status?.displayName ?? null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-white font-semibold">{name}</h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                connected
                  ? "bg-green-900/50 text-green-300"
                  : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {connected ? "Connected" : "Not connected"}
            </span>
          </div>
          {subtitle && <p className="text-zinc-400 text-sm mt-0.5">{subtitle}</p>}
          <p className="text-zinc-500 text-sm mt-1">{description}</p>
          {connected && (
            <p className="text-zinc-600 text-xs mt-1">
              Last synced: {formatTime(status?.lastFetchedAt)}
            </p>
          )}
          {note && (
            <p className="text-yellow-600/80 text-xs mt-2">{note}</p>
          )}
        </div>
        <div className="shrink-0">
          {connected ? (
            <button
              onClick={() => onDisconnect(service)}
              className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors border border-zinc-700"
            >
              Disconnect
            </button>
          ) : (
            <a
              href={connectHref}
              className="block px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-center"
            >
              Connect
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const searchParams = useSearchParams();

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/sources/status");
    const data = await res.json() as Status;
    setStatus(data);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleDisconnect(service: string) {
    await fetch("/api/sources/status", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service }),
    });
    fetchStatus();
  }

  const connected = searchParams.get("connected");
  const error = searchParams.get("error");

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-6">Settings</h1>

      {connected && (
        <div className="mb-4 bg-green-900/30 border border-green-700/50 rounded-lg px-4 py-3 text-green-300 text-sm">
          Successfully connected{" "}
          {connected === "microsoft" ? "Microsoft (Outlook + Teams)" : "Slack"}.
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3 text-red-300 text-sm">
          Connection failed: {error.replace(/_/g, " ")}. Check your .env.local credentials.
        </div>
      )}

      <div className="space-y-4">
        <SourceCard
          name="Slack"
          description="Reads channels and DMs you're a member of."
          connectHref="/api/sources/slack/connect"
          status={status?.slack}
          service="slack"
          onDisconnect={handleDisconnect}
        />

        <SourceCard
          name="Outlook"
          description="Reads your inbox via Microsoft Graph (Mail.Read — no IT consent required)."
          connectHref="/api/sources/microsoft/connect"
          status={status?.outlook}
          service="outlook"
          onDisconnect={handleDisconnect}
        />

        <SourceCard
          name="Microsoft Teams"
          description="Reads your DMs and group chats (Chat.Read — no IT consent required)."
          connectHref="/api/sources/microsoft/connect"
          status={status?.teams}
          service="teams"
          note="Outlook and Teams share one Microsoft login. Connecting either connects both."
          onDisconnect={handleDisconnect}
        />

        <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-5">
          <h2 className="text-white font-semibold">Manual Input</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Use the <strong className="text-white">Paste message</strong> button on the ticket board
            to submit any message manually — Teams channel messages, forwarded emails, or anything
            else. Claude will classify it and create a ticket if it&apos;s actionable.
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold">Setup Guide</h2>
          <div className="space-y-3 text-sm text-zinc-400">
            <div>
              <p className="text-zinc-200 font-medium mb-1">Slack</p>
              <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                <li>Go to api.slack.com/apps → Create New App → From scratch</li>
                <li>OAuth &amp; Permissions → Add redirect URI: <code className="text-zinc-300 bg-zinc-800 px-1 rounded text-xs">http://localhost:3000/api/sources/slack/callback</code></li>
                <li>Copy Client ID + Secret → paste into .env.local</li>
              </ol>
            </div>
            <div>
              <p className="text-zinc-200 font-medium mb-1">Microsoft (Outlook + Teams)</p>
              <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                <li>portal.azure.com → Azure Active Directory → App registrations → New</li>
                <li>Authentication → Add redirect URI: <code className="text-zinc-300 bg-zinc-800 px-1 rounded text-xs">http://localhost:3000/api/sources/microsoft/callback</code></li>
                <li>API permissions → Add: Mail.Read, Chat.Read, offline_access (all delegated)</li>
                <li>Certificates &amp; secrets → New client secret → Copy into .env.local</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
