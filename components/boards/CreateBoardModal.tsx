"use client";

import { useState } from "react";

interface SavedFilter {
  company?: string;
  status?: string;
  urgency?: string;
  sourceService?: string;
}

interface Props {
  onClose: () => void;
  onCreated: (board: { id: string; name: string; savedFilter: SavedFilter }) => void;
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "not_needed", label: "Not Needed" },
  { value: "completed", label: "Completed" },
];

const URGENCY_OPTIONS = [
  { value: "", label: "All urgencies" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All sources" },
  { value: "slack", label: "Slack" },
  { value: "outlook", label: "Outlook" },
  { value: "teams", label: "Teams" },
  { value: "manual", label: "Manual" },
];

export function CreateBoardModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState("");
  const [urgency, setUrgency] = useState("");
  const [sourceService, setSourceService] = useState("");
  const [saving, setSaving] = useState(false);

  const selectClass =
    "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500";

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);

    const savedFilter: SavedFilter = {};
    if (company.trim()) savedFilter.company = company.trim();
    if (status) savedFilter.status = status;
    if (urgency) savedFilter.urgency = urgency;
    if (sourceService) savedFilter.sourceService = sourceService;

    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), savedFilter }),
    });

    const board = await res.json() as { id: string; name: string; savedFilter: SavedFilter };
    setSaving(false);
    onCreated(board);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-white font-semibold">New Board</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">Board name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corp, High Priority, Blocked..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-zinc-600"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <p className="text-xs text-zinc-400 font-medium mb-3">
              Saved filter — this board will only show matching tickets
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Company</label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme Corp (leave blank for all)"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-zinc-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Urgency</label>
                  <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className={selectClass}>
                    {URGENCY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Source</label>
                  <select value={sourceService} onChange={(e) => setSourceService(e.target.value)} className={selectClass}>
                    {SOURCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {saving ? "Creating..." : "Create board"}
          </button>
        </div>
      </div>
    </div>
  );
}
