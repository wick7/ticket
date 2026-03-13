"use client";

import { useState } from "react";
import { formatMinutes } from "./TicketEditModal";

interface Props {
  ticketId: string;
  ticketNumber: string;
  ticketTitle: string;
  fromDate: string;       // YYYY-MM-DD
  totalMinutes: number;   // total for this ticket on fromDate
  onMoved: () => void;    // refetch after move
  onViewTicket: () => void;
  onClose: () => void;
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

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function MoveTimeModal({
  ticketId, ticketNumber, ticketTitle, fromDate, totalMinutes,
  onMoved, onViewTicket, onClose,
}: Props) {
  const [toDate, setToDate] = useState(tomorrow());
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const parsed = parseTimeInput(amount);
  const remaining = parsed !== null ? Math.max(0, totalMinutes - parsed) : null;

  async function handleMove() {
    if (parsed === null) {
      setError("Use h or m — e.g. 1h, 30m, 1h 30m");
      return;
    }
    if (!toDate) {
      setError("Please select a target date");
      return;
    }
    if (toDate === fromDate) {
      setError("Target date must be different from the source date");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/time-entries/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, fromDate, toDate, minutes: parsed }),
    });
    setLoading(false);
    if (res.ok) {
      onMoved();
    } else {
      const data = await res.json() as { error?: string };
      setError(data.error ?? "Failed to move — please try again");
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 font-mono">{ticketNumber}</p>
            <h3 className="text-white font-semibold text-sm truncate">{ticketTitle}</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors shrink-0 ml-3">✕</button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Source info */}
          <div className="flex items-center justify-between text-xs bg-zinc-800 rounded-lg px-3 py-2">
            <span className="text-zinc-400">{formatDateLabel(fromDate)}</span>
            <span className="text-blue-400 font-semibold">{formatMinutes(totalMinutes)}</span>
          </div>

          {/* Target date */}
          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">Move to date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); if (error) setError(""); }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">Amount to move</label>
            <input
              autoFocus
              value={amount}
              onChange={(e) => { setAmount(e.target.value); if (error) setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleMove(); }}
              placeholder={`up to ${formatMinutes(totalMinutes)}`}
              className={`w-full bg-zinc-800 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors ${
                error ? "border-red-500 focus:border-red-500" : "border-zinc-700 focus:border-blue-500"
              }`}
            />
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>

          {/* Preview */}
          {parsed !== null && !error && (
            <div className="text-xs text-zinc-500 space-y-0.5">
              <div className="flex justify-between">
                <span>{formatDateLabel(fromDate)} (after)</span>
                <span className={remaining === 0 ? "text-zinc-600" : "text-zinc-300"}>
                  {remaining === 0 ? "removed" : formatMinutes(remaining!)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{formatDateLabel(toDate)} (new)</span>
                <span className="text-blue-400">{formatMinutes(parsed)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-4 gap-2">
          <button
            onClick={onViewTicket}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            View ticket →
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleMove}
              disabled={loading || !amount.trim() || !toDate}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {loading ? "Moving..." : "Move"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
