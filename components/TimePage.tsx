"use client";

import { useState, useEffect, useCallback } from "react";
import type { Ticket } from "./tickets/TicketBoard";
import { TicketEditModal } from "./tickets/TicketEditModal";
import { formatMinutes } from "./tickets/TicketEditModal";
import { MoveTimeModal } from "./tickets/MoveTimeModal";

interface TimeEntry {
  id: string;
  minutes: number;
  date: string;
  ticket: Ticket;
}

interface DayTicket {
  ticket: Ticket;
  totalMinutes: number;
}

interface Filters {
  company: string;
  status: string;
  urgency: string;
  sourceService: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CHIP_LIMIT = 3;

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Aggregate all TimeEntry objects for a given day into one entry per ticket. */
function groupByTicket(entries: TimeEntry[], dateStr: string): DayTicket[] {
  const map = new Map<string, DayTicket>();
  for (const entry of entries) {
    if (new Date(entry.date).toISOString().slice(0, 10) !== dateStr) continue;
    const existing = map.get(entry.ticket.id);
    if (existing) {
      existing.totalMinutes += entry.minutes;
    } else {
      map.set(entry.ticket.id, { ticket: entry.ticket, totalMinutes: entry.minutes });
    }
  }
  return Array.from(map.values());
}

export function TimePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [filters, setFilters] = useState<Filters>({ company: "", status: "", urgency: "", sourceService: "" });
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [seeMoreDay, setSeeMoreDay] = useState<{ label: string; tickets: DayTicket[]; dateStr: string } | null>(null);
  const [movingTime, setMovingTime] = useState<{ ticketId: string; ticketNumber: string; ticketTitle: string; fromDate: string; totalMinutes: number; ticket: Ticket } | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    if (filters.company) params.set("company", filters.company);
    if (filters.status) params.set("status", filters.status);
    if (filters.urgency) params.set("urgency", filters.urgency);
    if (filters.sourceService) params.set("sourceService", filters.sourceService);
    const res = await fetch(`/api/time-entries?${params}`);
    const data = await res.json() as TimeEntry[];
    setEntries(data);
    setLoading(false);
  }, [year, month, filters]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const days = getCalendarDays(year, month);
  const uniqueCompanies = [...new Set(entries.map((e) => e.ticket.company))].sort();

  const filterSelect = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: { value: string; label: string }[]
  ) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
    >
      <option value="">{label}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Time</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Track time spent across tickets by day.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5">
          <button onClick={prevMonth} className="text-zinc-400 hover:text-white transition-colors px-1">‹</button>
          <span className="text-white text-xs font-medium w-28 text-center">{MONTHS[month - 1]} {year}</span>
          <button onClick={nextMonth} className="text-zinc-400 hover:text-white transition-colors px-1">›</button>
        </div>

        <div className="w-px h-5 bg-zinc-700" />

        {filterSelect("All companies", filters.company, (v) => setFilters((f) => ({ ...f, company: v })),
          uniqueCompanies.map((c) => ({ value: c, label: c })))}
        {filterSelect("All statuses", filters.status, (v) => setFilters((f) => ({ ...f, status: v })), [
          { value: "todo", label: "To Do" },
          { value: "in_progress", label: "In Progress" },
          { value: "blocked", label: "Blocked" },
          { value: "not_needed", label: "Not Needed" },
          { value: "completed", label: "Completed" },
        ])}
        {filterSelect("All urgencies", filters.urgency, (v) => setFilters((f) => ({ ...f, urgency: v })), [
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
        ])}
        {filterSelect("All sources", filters.sourceService, (v) => setFilters((f) => ({ ...f, sourceService: v })), [
          { value: "slack", label: "Slack" },
          { value: "outlook", label: "Outlook" },
          { value: "teams", label: "Teams" },
          { value: "manual", label: "Manual" },
        ])}
      </div>

      {/* Calendar */}
      {loading ? (
        <div className="text-zinc-500 text-sm py-12 text-center">Loading...</div>
      ) : (
        <div className="border border-zinc-800 rounded-xl overflow-hidden">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 bg-zinc-800/60 border-b border-zinc-800">
            {DOW.map((d) => (
              <div key={d} className="py-2 text-center text-xs text-zinc-500 font-medium">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-zinc-800">
            {days.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} className="min-h-[110px] bg-zinc-900/20" />;
              }

              const dateStr = toDateString(year, month, day);
              const dayTickets = groupByTicket(entries, dateStr);
              const isToday = dateStr === toDateString(now.getFullYear(), now.getMonth() + 1, now.getDate());
              const visible = dayTickets.slice(0, CHIP_LIMIT);
              const overflow = dayTickets.length - CHIP_LIMIT;

              return (
                <div key={day} className="min-h-[110px] p-2 bg-zinc-900">
                  <div className={`text-xs font-medium mb-1.5 w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday ? "bg-blue-600 text-white" : "text-zinc-500"
                  }`}>
                    {day}
                  </div>

                  {dayTickets.length > 0 && (
                    <div className="space-y-0.5">
                      {visible.map(({ ticket, totalMinutes }) => (
                        <button
                          key={ticket.id}
                          onClick={() => setMovingTime({ ticketId: ticket.id, ticketNumber: ticket.ticketNumber, ticketTitle: ticket.title, fromDate: dateStr, totalMinutes, ticket })}
                          className="w-full text-left flex items-center justify-between gap-1 px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                        >
                          <span className="text-xs text-zinc-300 font-mono truncate">
                            {ticket.ticketNumber || ticket.company || "Ticket"}
                          </span>
                          <span className="text-xs text-blue-400 font-medium shrink-0">
                            {formatMinutes(totalMinutes)}
                          </span>
                        </button>
                      ))}

                      {overflow > 0 && (
                        <button
                          onClick={() => setSeeMoreDay({
                            label: new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }),
                            tickets: dayTickets,
                            dateStr,
                          })}
                          className="w-full text-left px-1.5 py-0.5 rounded bg-zinc-800/60 hover:bg-zinc-700 transition-colors text-xs text-zinc-500 hover:text-zinc-300"
                        >
                          +{overflow} more
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* "See more" modal */}
      {seeMoreDay && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSeeMoreDay(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h3 className="text-white font-semibold text-sm">{seeMoreDay.label}</h3>
              <button onClick={() => setSeeMoreDay(null)} className="text-zinc-400 hover:text-white transition-colors">✕</button>
            </div>
            <ul className="divide-y divide-zinc-800 max-h-80 overflow-y-auto">
              {seeMoreDay.tickets.map(({ ticket, totalMinutes }) => (
                <li key={ticket.id}>
                  <button
                    onClick={() => { setMovingTime({ ticketId: ticket.id, ticketNumber: ticket.ticketNumber, ticketTitle: ticket.title, fromDate: seeMoreDay.dateStr, totalMinutes, ticket }); setSeeMoreDay(null); }}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-zinc-800 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <span className="text-xs text-zinc-400 font-mono block">
                        {ticket.ticketNumber || ticket.company || "Ticket"}
                      </span>
                      <span className="text-sm text-white truncate block">{ticket.title}</span>
                    </div>
                    <span className="text-sm text-blue-400 font-semibold shrink-0 ml-4">
                      {formatMinutes(totalMinutes)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Move time modal */}
      {movingTime && (
        <MoveTimeModal
          ticketId={movingTime.ticketId}
          ticketNumber={movingTime.ticketNumber}
          ticketTitle={movingTime.ticketTitle}
          fromDate={movingTime.fromDate}
          totalMinutes={movingTime.totalMinutes}
          onMoved={() => { setMovingTime(null); fetchEntries(); }}
          onViewTicket={() => { setSelectedTicket(movingTime.ticket); setMovingTime(null); }}
          onClose={() => setMovingTime(null)}
        />
      )}

      {/* Ticket view modal */}
      {selectedTicket && (
        <TicketEditModal
          ticket={selectedTicket}
          onSave={async (updated) => {
            await fetch(`/api/tickets/${updated.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updated),
            });
            setSelectedTicket(null);
            fetchEntries();
          }}
          onDelete={async (id) => {
            await fetch(`/api/tickets/${id}`, { method: "DELETE" });
            setSelectedTicket(null);
            fetchEntries();
          }}
          onClose={() => setSelectedTicket(null)}
          onTimeLogged={(id, newTotal) => {
            setEntries((prev) =>
              prev.map((e) => e.ticket.id === id ? { ...e, ticket: { ...e.ticket, trackedMinutes: newTotal } } : e)
            );
          }}
        />
      )}
    </div>
  );
}
