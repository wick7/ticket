"use client";

import { useState, useEffect, useCallback } from "react";
import { PresetListEditor } from "./config/PresetListEditor";
import { StatusColumnEditor } from "./config/StatusColumnEditor";

interface Preset { id: string; name: string }

interface BoardMember {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface BoardInfo {
  id: string;
  name: string;
  userId: string;
}

function BoardSharingPanel({ board, currentUserId }: { board: BoardInfo; currentUserId: string }) {
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [owner, setOwner] = useState<{ id: string; email: string; name: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    const res = await fetch(`/api/boards/${board.id}/invite`);
    if (res.ok) {
      const data = await res.json() as { owner: { id: string; email: string; name: string }; members: BoardMember[] };
      setOwner(data.owner);
      setMembers(data.members);
    }
  }, [board.id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const isOwner = board.userId === currentUserId;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    setLoading(true);

    const res = await fetch(`/api/boards/${board.id}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });

    if (res.ok) {
      setInviteSuccess(`Invited ${inviteEmail}`);
      setInviteEmail("");
      fetchMembers();
    } else {
      const data = await res.json() as { error?: string };
      setInviteError(data.error ?? "Failed to invite");
    }
    setLoading(false);
  }

  async function handleRemove(memberId: string) {
    await fetch(`/api/boards/${board.id}/members/${memberId}`, { method: "DELETE" });
    fetchMembers();
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-zinc-400">
        <span className="text-zinc-300 font-medium">Owner: </span>
        {owner?.name || owner?.email || "—"}
      </div>

      {members.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-zinc-500">Members</p>
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm">
              <span className="text-zinc-300">{m.name || m.email}</span>
              {isOwner && (
                <button
                  onClick={() => handleRemove(m.id)}
                  className="text-zinc-600 hover:text-red-400 text-xs transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner && (
        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email"
            placeholder="Invite by email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !inviteEmail}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded transition-colors"
          >
            Invite
          </button>
        </form>
      )}
      {inviteError && <p className="text-red-400 text-xs">{inviteError}</p>}
      {inviteSuccess && <p className="text-green-400 text-xs">{inviteSuccess}</p>}
    </div>
  );
}

export function ConfigPage({ currentUserId }: { currentUserId: string }) {
  const [companies, setCompanies] = useState<Preset[]>([]);
  const [categories, setCategories] = useState<Preset[]>([]);
  const [boards, setBoards] = useState<BoardInfo[]>([]);
  const [expandedBoard, setExpandedBoard] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config/companies").then((r) => r.json()).then(setCompanies).catch(() => {});
    fetch("/api/config/categories").then((r) => r.json()).then(setCategories).catch(() => {});
    fetch("/api/boards").then((r) => r.json()).then(setBoards).catch(() => {});
  }, []);

  async function addCompany(name: string) {
    const res = await fetch("/api/config/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json() as Preset;
    setCompanies((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function deleteCompany(id: string) {
    await fetch(`/api/config/companies/${id}`, { method: "DELETE" });
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  }

  async function addCategory(name: string) {
    const res = await fetch("/api/config/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json() as Preset;
    setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function deleteCategory(id: string) {
    await fetch(`/api/config/categories/${id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Configuration</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Manage predefined clients and categories for tickets.</p>
      </div>

      <StatusColumnEditor />

      <PresetListEditor
        title="Clients"
        presets={companies}
        onAdd={addCompany}
        onDelete={deleteCompany}
      />

      <PresetListEditor
        title="Categories"
        presets={categories}
        onAdd={addCategory}
        onDelete={deleteCategory}
      />

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
        <div>
          <h2 className="text-white font-semibold">Board Sharing</h2>
          <p className="text-zinc-500 text-sm mt-0.5">Invite collaborators to your boards by email.</p>
        </div>
        {boards.length === 0 ? (
          <p className="text-xs text-zinc-600">No boards yet. Create a board from the sidebar to enable sharing.</p>
        ) : (
          <div className="space-y-2">
            {boards.map((board) => (
              <div key={board.id} className="border border-zinc-800 rounded-lg p-3">
                <button
                  onClick={() => setExpandedBoard(expandedBoard === board.id ? null : board.id)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="text-zinc-200 text-sm font-medium">{board.name}</span>
                  <span className="text-zinc-600 text-xs">{expandedBoard === board.id ? "▲" : "▼"}</span>
                </button>
                {expandedBoard === board.id && (
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <BoardSharingPanel board={board} currentUserId={currentUserId} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
