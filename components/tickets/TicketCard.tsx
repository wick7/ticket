"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Ticket } from "./TicketBoard";
import { formatMinutes } from "./TicketEditModal";
import { TimeLogModal } from "./TimeLogModal";

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
  low: "text-zinc-500",
  medium: "text-yellow-500",
  high: "text-red-400",
};

const SOURCE_ICONS: Record<string, string> = {
  slack: "S",
  outlook: "O",
  teams: "T",
  manual: "M",
};

interface TicketCardProps {
  ticket: Ticket;
  onEdit: () => void;
  onStatusChange: (id: string, status: string) => void;
  onTimeLogged: (id: string, newTotal: number) => void;
}

export function TicketCard({ ticket, onEdit, onStatusChange, onTimeLogged }: TicketCardProps) {
  const [showTimeLog, setShowTimeLog] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const statuses = Object.keys(STATUS_LABELS);

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        onClick={onEdit}
        className="group bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors cursor-pointer"
      >
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          <button
            className="mt-1 text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing shrink-0 transition-colors"
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="4" cy="3" r="1.2" />
              <circle cx="10" cy="3" r="1.2" />
              <circle cx="4" cy="7" r="1.2" />
              <circle cx="10" cy="7" r="1.2" />
              <circle cx="4" cy="11" r="1.2" />
              <circle cx="10" cy="11" r="1.2" />
            </svg>
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                {ticket.ticketNumber && (
                  <span className="text-xs text-zinc-500 font-mono shrink-0 mt-0.5">
                    {ticket.ticketNumber}
                  </span>
                )}
                <span className="text-white font-medium text-sm line-clamp-2">
                  {ticket.title}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs font-bold uppercase ${URGENCY_STYLES[ticket.urgency] ?? "text-zinc-500"}`}
                  title={`${ticket.urgency} urgency`}
                >
                  {ticket.urgency}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium bg-zinc-800 text-zinc-400"
                  title={ticket.sourceService}
                >
                  {SOURCE_ICONS[ticket.sourceService] ?? ticket.sourceService[0]?.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-zinc-500 truncate">
                {ticket.requester} · {ticket.company}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <select
                value={ticket.status}
                onChange={(e) => onStatusChange(ticket.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer font-medium appearance-none ${
                  STATUS_STYLES[ticket.status] ?? STATUS_STYLES.todo
                }`}
              >
                {statuses.map((s) => (
                  <option key={s} value={s} className="bg-zinc-900 text-white">
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>

              {/* Time chip — always visible, clickable */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowTimeLog(true); }}
                className="text-xs flex items-center gap-1 text-zinc-500 hover:text-blue-400 transition-colors"
                title="Log time"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className={ticket.trackedMinutes > 0 ? "text-blue-400" : ""}>
                  {ticket.trackedMinutes > 0 ? formatMinutes(ticket.trackedMinutes) : "0"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showTimeLog && (
        <TimeLogModal
          ticketId={ticket.id}
          currentMinutes={ticket.trackedMinutes}
          onLogged={(newTotal) => {
            onTimeLogged(ticket.id, newTotal);
            setShowTimeLog(false);
          }}
          onClose={() => setShowTimeLog(false)}
        />
      )}
    </>
  );
}
