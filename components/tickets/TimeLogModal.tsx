"use client";

import { useState } from "react";
import { formatMinutes } from "./TicketEditModal";

interface Props {
  ticketId: string;
  currentMinutes: number;
  onLogged: (newTotal: number) => void;
  onClose: () => void;
  onViewTicket?: () => void;
}

function parseTimeInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const tokens = trimmed.split(/\s+/);
  let total = 0;
  let seenH = false;
  let seenM = false;
  for (const token of tokens) {
    const match = token.match(/^(\d+)(h|m)$/i);
    if (!match) return null;
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    if (unit === "h") {
      if (seenH) return null;
      seenH = true;
      total += value * 60;
    } else {
      if (seenM) return null;
      seenM = true;
      total += value;
    }
  }
  return total > 0 ? total : null;
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TimeLogModal({ ticketId, currentMinutes, onLogged, onClose, onViewTicket }: Props) {
  const [input, setInput] = useState("");
  const [date, setDate] = useState(todayString());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLog() {
    const parsed = parseTimeInput(input);
    if (parsed === null) {
      setError("Use h or m — e.g. 1h, 30m, 1h 30m");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, minutes: parsed, date }),
    });
    setLoading(false);
    if (res.ok) {
      onLogged(currentMinutes + parsed);
    } else {
      setError("Failed to save — please try again");
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-xs shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h3 className="text-white font-semibold text-sm">Log Time</h3>
            {currentMinutes > 0 && (
              <p className="text-xs text-zinc-500 mt-0.5">Total so far: {formatMinutes(currentMinutes)}</p>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <input
            autoFocus
            value={input}
            onChange={(e) => { setInput(e.target.value); if (error) setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleLog(); }}
            placeholder="e.g. 1h, 30m, 1h 30m"
            className={`w-full bg-zinc-800 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors ${
              error ? "border-red-500 focus:border-red-500" : "border-zinc-700 focus:border-blue-500"
            }`}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 pb-4">
          {onViewTicket && (
            <button onClick={onViewTicket} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors mr-auto">
              View ticket →
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 text-sm text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleLog}
            disabled={loading || !input.trim()}
            className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {loading ? "Saving..." : "Log"}
          </button>
        </div>
      </div>
    </div>
  );
}
