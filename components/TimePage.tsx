"use client";

import { useState, useEffect, useCallback } from "react";
import type { Ticket } from "./tickets/TicketBoard";
import { TicketEditModal } from "./tickets/TicketEditModal";
import { formatMinutes } from "./tickets/TicketEditModal";
import { TimeLogModal } from "./tickets/TimeLogModal";

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

function urgencyColor(urgency: string): string {
  if (urgency === "high") return "bg-red-500/20 text-red-400";
  if (urgency === "medium") return "bg-yellow-500/20 text-yellow-400";
  return "bg-zinc-700 text-zinc-400";
}

function chipBorderColor(ticket: { urgency: string; status: string }): string {
  if (ticket.status === "completed") return "border-l-green-500";
  if (ticket.urgency === "high") return "border-l-red-500";
  if (ticket.urgency === "medium") return "border-l-yellow-500";
  return "border-l-zinc-500";
}

function chipTextColor(ticket: { urgency: string; status: string }): string {
  if (ticket.status === "completed") return "text-green-400";
  if (ticket.urgency === "high") return "text-red-400";
  if (ticket.urgency === "medium") return "text-yellow-400";
  return "text-zinc-400";
}

export function TimePage() {
  const now = new Date();
  const todayStr = toDateString(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>(todayStr);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [seeMoreDay, setSeeMoreDay] = useState<{ label: string; tickets: DayTicket[]; dateStr: string } | null>(null);
  const [loggingTime, setLoggingTime] = useState<{ ticketId: string; currentMinutes: number; ticket: Ticket } | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    const res = await fetch(`/api/time-entries?${params}`);
    const data = await res.json() as TimeEntry[];
    setEntries(data);
    setLoading(false);
  }, [year, month]);

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

  // Right panel computed values
  const selectedDayTickets = groupByTicket(entries, selectedDay);
  const selectedDayMinutes = selectedDayTickets.reduce((s, d) => s + d.totalMinutes, 0);
  const selectedDate = new Date(selectedDay + "T12:00:00");
  const isSelectedToday = selectedDay === todayStr;
  const dayLabel = selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="flex h-full overflow-hidden">
      {/* LEFT: calendar area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 shrink-0">
          <h1 className="text-lg font-bold text-white">Calendar</h1>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">‹</button>
            <span className="text-white text-sm font-semibold w-28 text-center">{MONTHS[month - 1]} {year}</span>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">›</button>
            <button
              onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); setSelectedDay(todayStr); }}
              className="px-3 py-1.5 text-sm text-zinc-300 hover:text-white bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Today
            </button>
          </div>
        </div>

        {/* Calendar grid (full height) */}
        {loading ? (
          <div className="text-zinc-500 text-sm py-12 text-center">Loading...</div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 border-b border-zinc-800 shrink-0">
              {DOW.map((d) => (
                <div key={d} className="py-2 text-center text-xs text-zinc-500 font-medium uppercase tracking-wide">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-zinc-800 overflow-y-auto flex-1">
              {days.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} className="bg-zinc-900/20" />;
                }

                const dateStr = toDateString(year, month, day);
                const dayTickets = groupByTicket(entries, dateStr);
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDay;
                const visible = dayTickets.slice(0, CHIP_LIMIT);
                const overflow = dayTickets.length - CHIP_LIMIT;

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDay(dateStr)}
                    className={`min-h-[110px] p-2 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-zinc-800 ring-1 ring-inset ring-orange-500/40"
                        : "bg-zinc-900 hover:bg-zinc-800/50"
                    }`}
                  >
                    <div className={`text-xs font-medium mb-1.5 w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday ? "bg-orange-500 text-white" : "text-zinc-500"
                    }`}>
                      {day}
                    </div>

                    {dayTickets.length > 0 && (
                      <div className="space-y-1 mt-1">
                        {visible.map(({ ticket, totalMinutes }) => {
                          const isDone = ticket.status === "completed";
                          return (
                            <div
                              key={ticket.id}
                              className={`ml-1 flex items-center justify-between gap-1 pl-2 pr-1.5 py-0.5 rounded-sm bg-zinc-800/80 border-l-2 ${chipBorderColor(ticket)}`}
                            >
                              <span className={`text-[11px] font-mono truncate ${isDone ? "line-through text-zinc-500" : "text-zinc-300"}`}>
                                {ticket.ticketNumber || ticket.company || "Ticket"}
                              </span>
                              <span className={`text-[11px] font-semibold shrink-0 ${chipTextColor(ticket)}`}>
                                {isDone ? "Done" : formatMinutes(totalMinutes)}
                              </span>
                            </div>
                          );
                        })}

                        {overflow > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSeeMoreDay({
                              label: new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }),
                              tickets: dayTickets,
                              dateStr,
                            }); }}
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
      </div>

      {/* RIGHT: day detail panel */}
      <div className="w-80 shrink-0 border-l border-zinc-800 flex flex-col overflow-hidden bg-zinc-950">
        {/* Day header */}
        <div className="px-5 pt-5 pb-4 shrink-0">
          <p className="text-white text-lg font-bold">{dayLabel}</p>
          <p className="text-sm text-zinc-500 mt-0.5">
            {isSelectedToday ? "Today · " : ""}{selectedDayTickets.length} ticket{selectedDayTickets.length !== 1 ? "s" : ""} · {formatMinutes(selectedDayMinutes)} logged
          </p>
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-4">
          {/* TIME LOGGED card */}
          <div className="bg-zinc-900 rounded-xl overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">Time Logged</p>
              {selectedDayTickets.length === 0 && (
                <p className="text-xs text-zinc-600 pb-2">No time logged</p>
              )}
              {selectedDayTickets.map(({ ticket, totalMinutes }) => (
                <div key={ticket.id} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-zinc-300 truncate pr-3">
                    {ticket.ticketNumber} · {ticket.title}
                  </span>
                  <button
                    onClick={() => setLoggingTime({ ticketId: ticket.id, currentMinutes: ticket.trackedMinutes, ticket })}
                    className="text-sm font-bold text-white hover:text-orange-400 shrink-0 transition-colors tabular-nums"
                  >
                    {formatMinutes(totalMinutes)}
                  </button>
                </div>
              ))}
            </div>
            {selectedDayTickets.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 mt-1">
                <span className="text-sm font-bold text-white">Total</span>
                <span className="text-sm font-bold text-orange-400 tabular-nums">{formatMinutes(selectedDayMinutes)}</span>
              </div>
            )}
          </div>

          {/* TICKETS label */}
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-1">Tickets</p>

          {/* Ticket cards */}
          {selectedDayTickets.length === 0 && (
            <p className="text-xs text-zinc-600 px-1">No tickets for this day</p>
          )}
          {selectedDayTickets.map(({ ticket, totalMinutes }) => {
            const isDone = ticket.status === "completed";
            const borderColor = isDone ? "border-l-green-500" : ticket.urgency === "high" ? "border-l-red-500" : ticket.urgency === "medium" ? "border-l-yellow-500" : "border-l-zinc-500";
            const badgeStyle = isDone
              ? "border border-green-600 text-green-400"
              : ticket.urgency === "high"
              ? "border border-red-600 text-red-400"
              : ticket.urgency === "medium"
              ? "border border-yellow-600 text-yellow-400"
              : "border border-zinc-600 text-zinc-400";
            const badgeLabel = isDone ? "Done" : ticket.urgency === "high" ? "High" : ticket.urgency === "medium" ? "Med" : "Low";

            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`bg-zinc-900 rounded-xl border-l-4 ${borderColor} px-4 py-3 cursor-pointer hover:bg-zinc-800/70 transition-colors`}
              >
                <p className={`text-sm font-semibold leading-snug mb-2 ${isDone ? "line-through text-zinc-500" : "text-white"}`}>
                  {ticket.title}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${badgeStyle}`}>
                      {badgeLabel}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">{ticket.ticketNumber}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLoggingTime({ ticketId: ticket.id, currentMinutes: ticket.trackedMinutes, ticket }); }}
                    className="text-sm font-bold text-orange-400 hover:text-orange-300 shrink-0 transition-colors tabular-nums"
                  >
                    {formatMinutes(totalMinutes)}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
                    onClick={() => { setSelectedDay(seeMoreDay.dateStr); setSeeMoreDay(null); }}
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

      {/* Log time modal */}
      {loggingTime && (
        <TimeLogModal
          ticketId={loggingTime.ticketId}
          currentMinutes={loggingTime.currentMinutes}
          onLogged={(newTotal) => {
            setLoggingTime(null);
            fetchEntries();
          }}
          onViewTicket={() => { setSelectedTicket(loggingTime.ticket); setLoggingTime(null); }}
          onClose={() => setLoggingTime(null)}
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
