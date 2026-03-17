"use client";

import { useState, useEffect } from "react";
import type { Ticket } from "./TicketBoard";
import { PresetSelect } from "./PresetSelect";

const URGENCIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

interface Props {
  onClose: () => void;
  onCreated: (ticket: Ticket) => void;
  boardId?: string;
}

export function CreateTicketModal({ onClose, onCreated, boardId }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [requester, setRequester] = useState("");
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [saving, setSaving] = useState(false);
  const [presetCompanies, setPresetCompanies] = useState<string[]>([]);
  const [presetCategories, setPresetCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/config/companies").then((r) => r.json()).then((d: Array<{ name: string }>) => setPresetCompanies(d.map((x) => x.name))).catch(() => {});
    fetch("/api/config/categories").then((r) => r.json()).then((d: Array<{ name: string }>) => setPresetCategories(d.map((x) => x.name))).catch(() => {});
  }, []);

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), body, requester, company, category, urgency, boardId }),
    });
    const ticket = await res.json() as Ticket;
    setSaving(false);
    onCreated(ticket);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-white font-semibold">Create Ticket</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleCreate(); }}
              placeholder="What needs to be done?"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-zinc-600"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">
              Description <span className="text-zinc-600">(optional)</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add more detail..."
              rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none placeholder-zinc-600"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">
              Requester <span className="text-zinc-600">(optional)</span>
            </label>
            <input
              value={requester}
              onChange={(e) => setRequester(e.target.value)}
              placeholder="e.g. Jane Smith"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-zinc-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1">
                Company <span className="text-zinc-600">(optional)</span>
              </label>
              <PresetSelect
                value={company}
                presets={presetCompanies}
                onChange={setCompany}
                placeholder="Select company..."
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1">
                Category <span className="text-zinc-600">(optional)</span>
              </label>
              <PresetSelect
                value={category}
                presets={presetCategories}
                onChange={setCategory}
                placeholder="Select category..."
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">Urgency</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {URGENCIES.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
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
            disabled={saving || !title.trim()}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {saving ? "Creating..." : "Create ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}
