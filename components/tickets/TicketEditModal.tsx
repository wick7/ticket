"use client";

import { useState, useEffect } from "react";
import type { Ticket } from "./TicketBoard";
import { TimeLogModal } from "./TimeLogModal";
import { PresetSelect } from "./PresetSelect";

const STATUSES = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "not_needed", label: "Not Needed" },
  { value: "completed", label: "Completed" },
];

const URGENCIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const STATUS_STYLES: Record<string, string> = {
  todo: "bg-zinc-700 text-zinc-300",
  in_progress: "bg-blue-900/60 text-blue-300",
  blocked: "bg-red-900/60 text-red-300",
  not_needed: "bg-zinc-800 text-zinc-500",
  completed: "bg-green-900/60 text-green-300",
};

const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  not_needed: "Not Needed",
  completed: "Completed",
};

const URGENCY_STYLES: Record<string, string> = {
  low: "text-zinc-400",
  medium: "text-yellow-400",
  high: "text-red-400",
};

interface Board {
  id: string;
  name: string;
}

interface Props {
  ticket: Ticket;
  onSave: (ticket: Ticket) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onTimeLogged: (id: string, newTotal: number) => void;
  currentBoardId?: string;
  onBoardChanged?: (ticketId: string, newBoardId: string | null) => void;
}

/** Format total minutes as "Xh Ym", "Xh", or "Ym". */
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/** Render body text: bold **text** and line breaks. */
function BodyText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="text-sm text-zinc-300 leading-relaxed space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <div key={i}>
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={j} className="text-white font-semibold">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

interface TimeEntryData {
  id: string;
  minutes: number;
  date: string;
}

interface TimeLogSectionProps {
  entries: TimeEntryData[];
  totalMinutes: number;
  loading: boolean;
  onEntryDateChange: (id: string, newDate: string) => void;
  onEntryDeleted: (id: string, minutes: number) => void;
}

function TimeLogSection({ entries, totalMinutes, loading, onEntryDateChange, onEntryDeleted }: TimeLogSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function saveDate(id: string) {
    setSaving(true);
    const res = await fetch(`/api/time-entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: editDate }),
    });
    setSaving(false);
    if (res.ok) {
      onEntryDateChange(id, editDate + "T12:00:00.000Z");
      setEditingId(null);
    }
  }

  async function deleteEntry(id: string, minutes: number) {
    setDeletingId(id);
    await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
    setDeletingId(null);
    onEntryDeleted(id, minutes);
  }

  if (loading) return null;
  if (entries.length === 0) return (
    <div className="text-xs text-zinc-600 border border-zinc-800 rounded-lg px-3 py-2">No time logged yet</div>
  );

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-800/40">
        <span className="text-xs text-zinc-400 font-medium">Time Log</span>
        <span className="text-xs text-blue-400 font-semibold">{formatMinutes(totalMinutes)}</span>
      </div>
      <ul className="divide-y divide-zinc-800">
        {entries.map((entry) => {
          const dateStr = new Date(entry.date).toISOString().slice(0, 10);
          const displayDate = new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
          return (
            <li key={entry.id} className="px-3 py-2 flex items-center gap-2 group">
              {editingId === entry.id ? (
                <>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => saveDate(entry.id)}
                    disabled={saving}
                    className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                  >
                    {saving ? "..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs text-zinc-500 hover:text-white"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="text-xs text-zinc-400 flex-1">{displayDate}</span>
                  <span className="text-xs text-blue-400 font-medium">{formatMinutes(entry.minutes)}</span>
                  <button
                    onClick={() => { setEditingId(entry.id); setEditDate(dateStr); }}
                    className="text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-all text-xs"
                    title="Edit date"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.id, entry.minutes)}
                    disabled={deletingId === entry.id}
                    className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs disabled:opacity-50"
                    title="Delete entry"
                  >
                    ✕
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TicketEditModal({ ticket, onSave, onDelete, onClose, onTimeLogged, currentBoardId, onBoardChanged }: Props) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [form, setForm] = useState({ ...ticket });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showTimeLog, setShowTimeLog] = useState(false);
  const [presetCompanies, setPresetCompanies] = useState<string[]>([]);
  const [presetCategories, setPresetCategories] = useState<string[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryData[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>(currentBoardId ?? "");
  const [movingBoard, setMovingBoard] = useState(false);

  useEffect(() => {
    fetch("/api/config/companies").then((r) => r.json()).then((d: Array<{name: string}>) => setPresetCompanies(d.map((x) => x.name))).catch(() => {});
    fetch("/api/config/categories").then((r) => r.json()).then((d: Array<{name: string}>) => setPresetCategories(d.map((x) => x.name))).catch(() => {});
    fetch("/api/boards").then((r) => r.json()).then((d: Board[]) => setBoards(d)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingEntries(true);
    fetch(`/api/tickets/${ticket.id}/time-entries`)
      .then((r) => r.json())
      .then((d: TimeEntryData[]) => setTimeEntries(d))
      .catch(() => {})
      .finally(() => setLoadingEntries(false));
  }, [ticket.id]);

  async function handleSave() {
    setSaving(true);
    // Move board if changed
    if (selectedBoardId !== (currentBoardId ?? "")) {
      setMovingBoard(true);
      await fetch(`/api/tickets/${ticket.id}/move-board`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetBoardId: selectedBoardId || null }),
      });
      setMovingBoard(false);
      onBoardChanged?.(ticket.id, selectedBoardId || null);
    }
    await onSave(form);
    setSaving(false);
  }

  function set<K extends keyof Ticket>(key: K, value: Ticket[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            {mode === "edit" && (
              <button
                onClick={() => setMode("view")}
                className="text-zinc-400 hover:text-white transition-colors shrink-0 text-sm"
                title="Back to view"
              >
                ←
              </button>
            )}
            <h2 className="text-white font-semibold flex items-start gap-2">
              {mode === "view" && form.ticketNumber && (
                <span className="text-zinc-500 font-mono text-sm font-normal shrink-0 mt-0.5">
                  {form.ticketNumber}
                </span>
              )}
              {mode === "view" ? <span className="leading-snug">{form.title}</span> : "Edit Ticket"}
            </h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors shrink-0 ml-3">
            ✕
          </button>
        </div>

        {mode === "view" ? (
          <>
            {/* View body */}
            <div className="px-6 py-5 space-y-5 max-h-[72vh] overflow-y-auto">
              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[form.status] ?? STATUS_STYLES.todo}`}>
                  {STATUS_LABELS[form.status] ?? form.status}
                </span>
                <span className={`text-xs font-semibold uppercase ${URGENCY_STYLES[form.urgency] ?? "text-zinc-400"}`}>
                  {form.urgency}
                </span>
                <span className={`text-xs flex items-center gap-1 ${
                    form.trackedMinutes > 0 ? "text-blue-400" : "text-zinc-500"
                  }`}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {form.trackedMinutes > 0 ? formatMinutes(form.trackedMinutes) : "0"}
                </span>
                <span className="text-xs text-zinc-500 ml-auto">
                  {form.requester} · {form.company}
                </span>
              </div>

              {form.category && (
                <div className="text-xs text-zinc-400">
                  Category: <span className="text-zinc-200">{form.category}</span>
                </div>
              )}

              {/* Time Log */}
              <TimeLogSection
                entries={timeEntries}
                totalMinutes={form.trackedMinutes}
                loading={loadingEntries}
                onEntryDateChange={(id, newDate) => {
                  setTimeEntries((prev) =>
                    prev.map((e) => (e.id === id ? { ...e, date: newDate } : e))
                  );
                }}
                onEntryDeleted={(id, minutes) => {
                  setTimeEntries((prev) => prev.filter((e) => e.id !== id));
                  setForm((prev) => ({ ...prev, trackedMinutes: prev.trackedMinutes - minutes }));
                  onTimeLogged(ticket.id, form.trackedMinutes - minutes);
                }}
              />

              {/* Body */}
              <BodyText text={form.body} />

              {/* Footer meta */}
              <div className="text-xs text-zinc-600 pt-1 border-t border-zinc-800">
                Source: {form.sourceService} · Created {new Date(form.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* View footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
              >
                {confirmDelete ? (
                  <span className="flex items-center gap-2">
                    <span className="text-red-400">Are you sure?</span>
                    <span
                      onClick={() => onDelete(ticket.id)}
                      className="text-red-400 hover:text-red-300 font-medium cursor-pointer"
                    >
                      Delete
                    </span>
                    <span
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                      className="text-zinc-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </span>
                  </span>
                ) : "Delete ticket"}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTimeLog(true)}
                  className="px-4 py-2 text-sm text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors"
                >
                  Log time
                </button>
                <button
                  onClick={() => setMode("edit")}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Edit body */}
            <div className="px-6 py-4 space-y-4 max-h-[72vh] overflow-y-auto">
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  maxLength={255}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-zinc-600 mt-1 text-right">{form.title.length}/255</p>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Description</label>
                <textarea
                  value={form.body}
                  onChange={(e) => set("body", e.target.value)}
                  rows={6}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Requester</label>
                  <input
                    value={form.requester}
                    onChange={(e) => set("requester", e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Client</label>
                  <PresetSelect
                    value={form.company}
                    presets={presetCompanies}
                    onChange={(v) => set("company", v)}
                    placeholder="Select client..."
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Category</label>
                <PresetSelect
                  value={form.category ?? ""}
                  presets={presetCategories}
                  onChange={(v) => set("category", v)}
                  placeholder="Select category..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Urgency</label>
                  <select
                    value={form.urgency}
                    onChange={(e) => set("urgency", e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    {URGENCIES.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {boards.length > 0 && (
                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Board</label>
                  <select
                    value={selectedBoardId}
                    onChange={(e) => setSelectedBoardId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Default (no board)</option>
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="text-xs text-zinc-500 pt-1">
                Source: {form.sourceService} · Created {new Date(form.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Edit footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
              <div>
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400">Are you sure?</span>
                    <button
                      onClick={() => onDelete(ticket.id)}
                      className="text-xs text-red-400 hover:text-red-300 font-medium"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="text-xs text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    Delete ticket
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode("view")}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>

    {showTimeLog && (
      <TimeLogModal
        ticketId={ticket.id}
        currentMinutes={form.trackedMinutes}
        onLogged={(newTotal) => {
          setForm((prev) => ({ ...prev, trackedMinutes: newTotal }));
          onTimeLogged(ticket.id, newTotal);
          setShowTimeLog(false);
          // Refresh entries after logging
          fetch(`/api/tickets/${ticket.id}/time-entries`)
            .then((r) => r.json())
            .then((d: TimeEntryData[]) => setTimeEntries(d))
            .catch(() => {});
        }}
        onClose={() => setShowTimeLog(false)}
      />
    )}
    </>
  );
}
