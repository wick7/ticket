"use client";

import { useState, useEffect } from "react";
import type { Ticket } from "./TicketBoard";
import { PresetSelect } from "./PresetSelect";

interface Props {
  onClose: () => void;
  onTicketsCreated: (tickets: Ticket[]) => void;
  onNotTicketable: (reasoning: string) => void;
  boardId?: string;
}

export function ManualInputModal({ onClose, onTicketsCreated, onNotTicketable, boardId }: Props) {
  const [message, setMessage] = useState("");
  const [senderName, setSenderName] = useState("");
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "not_ticketable"; reasoning: string } | null>(null);
  const [presetCompanies, setPresetCompanies] = useState<string[]>([]);
  const [presetCategories, setPresetCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/config/companies").then((r) => r.json()).then((d: Array<{ name: string }>) => setPresetCompanies(d.map((x) => x.name))).catch(() => {});
    fetch("/api/config/categories").then((r) => r.json()).then((d: Array<{ name: string }>) => setPresetCategories(d.map((x) => x.name))).catch(() => {});
  }, []);

  async function handleSubmit() {
    if (!message.trim()) return;
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/manual-input", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, senderName, company, category, boardId }),
    });

    const data = await res.json() as
      | { ticketable: true; tickets: Ticket[] }
      | { ticketable: false; reasoning: string };

    setLoading(false);

    if (data.ticketable) {
      onTicketsCreated(data.tickets);
    } else {
      setResult({ type: "not_ticketable", reasoning: data.reasoning });
    }
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
          <h2 className="text-white font-semibold">Paste a message</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">
              Message <span className="text-zinc-500">(paste any message from Slack, Teams, email, etc.)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Paste the message here..."
              rows={6}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none placeholder-zinc-600"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">
              Sender <span className="text-zinc-600">(optional)</span>
            </label>
            <input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="e.g. Jane Smith"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-zinc-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1">
                Client <span className="text-zinc-600">(optional)</span>
              </label>
              <PresetSelect
                value={company}
                presets={presetCompanies}
                onChange={setCompany}
                placeholder="Select client..."
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

          {result && (
            <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg px-4 py-3">
              <p className="text-yellow-300 text-sm font-medium">Not a ticketable request</p>
              <p className="text-yellow-400/80 text-xs mt-1">{result.reasoning}</p>
              <button
                onClick={() => setResult(null)}
                className="text-xs text-zinc-400 hover:text-white mt-2 underline"
              >
                Create ticket anyway
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !message.trim()}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {loading ? "Analyzing..." : "Create ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}
