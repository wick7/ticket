"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Ticket } from "./TicketBoard";
import type { StatusColumn } from "./KanbanColumn";

const URGENCY_BADGE: Record<string, string> = {
  high:   "bg-red-950/80 text-red-400 border border-red-800/60",
  medium: "bg-yellow-950/60 text-yellow-500 border border-yellow-800/50",
  low:    "bg-zinc-800 text-zinc-500 border border-zinc-700",
};

const URGENCY_LABEL: Record<string, string> = {
  high: "High",
  medium: "Med",
  low: "Low",
};

const SOURCE_LABEL: Record<string, string> = {
  slack: "slack",
  outlook: "outlook",
  teams: "teams",
  gmail: "gmail",
  manual: "manual",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}


const URGENCIES = [
  { value: "high", label: "High", className: "bg-red-950/80 text-red-400 border border-red-800/60" },
  { value: "medium", label: "Med", className: "bg-yellow-950/60 text-yellow-500 border border-yellow-800/50" },
  { value: "low", label: "Low", className: "bg-zinc-800 text-zinc-500 border border-zinc-700" },
];

interface TicketCardProps {
  ticket: Ticket;
  onEdit: () => void;
  onStatusChange?: (id: string, status: string) => void;
  onUrgencyChange?: (id: string, urgency: string) => void;
  onTimeLogged?: (id: string, newTotal: number) => void;
  columns?: StatusColumn[];
  /** When true renders a static clone (drag overlay) — no sortable hooks */
  isOverlay?: boolean;
}

export function TicketCard({ ticket, onEdit, onStatusChange, onUrgencyChange, columns, isOverlay }: TicketCardProps) {
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showUrgencyPicker, setShowUrgencyPicker] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id, disabled: isOverlay });

  const style = isOverlay
    ? {}
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className={`bg-zinc-800/70 border rounded-xl p-3 cursor-pointer transition-all select-none ${
        isDragging
          ? "opacity-30 border-zinc-600"
          : isOverlay
          ? "border-orange-500/40 shadow-lg shadow-black/40 rotate-1 scale-105"
          : "border-zinc-700/60 hover:border-zinc-500/80 hover:bg-zinc-800"
      }`}
      onClick={onEdit}
    >
      {/* Top row */}
      <div className="flex items-center gap-1.5 mb-2">
        {/* Drag handle */}
        {!isOverlay && (
          <button
            className="text-zinc-700 hover:text-zinc-500 cursor-grab active:cursor-grabbing shrink-0 mr-0.5"
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
            aria-label="Drag"
          >
            <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
              <circle cx="2.5" cy="2.5" r="1.2" />
              <circle cx="7.5" cy="2.5" r="1.2" />
              <circle cx="2.5" cy="7" r="1.2" />
              <circle cx="7.5" cy="7" r="1.2" />
              <circle cx="2.5" cy="11.5" r="1.2" />
              <circle cx="7.5" cy="11.5" r="1.2" />
            </svg>
          </button>
        )}

        {ticket.ticketNumber && (
          <span className="text-[10px] text-zinc-500 font-mono shrink-0">
            {ticket.ticketNumber}
          </span>
        )}

        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowUrgencyPicker((v) => !v); }}
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded hover:opacity-80 transition-opacity ${URGENCY_BADGE[ticket.urgency] ?? URGENCY_BADGE.low}`}
          >
            {URGENCY_LABEL[ticket.urgency] ?? ticket.urgency}
          </button>
          {showUrgencyPicker && (
            <div
              className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 py-1 min-w-[100px]"
              onClick={(e) => e.stopPropagation()}
            >
              {URGENCIES.map((u) => (
                <button
                  key={u.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUrgencyChange?.(ticket.id, u.value);
                    setShowUrgencyPicker(false);
                  }}
                  className="w-full flex items-center px-3 py-1.5 hover:bg-zinc-700 transition-colors text-left"
                >
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${u.className} ${u.value === ticket.urgency ? "ring-1 ring-white/20" : ""}`}>
                    {u.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-[10px] text-zinc-500 bg-zinc-700/60 px-1.5 py-0.5 rounded">
          {SOURCE_LABEL[ticket.sourceService] ?? ticket.sourceService}
        </span>
      </div>

      {/* Title */}
      <p className="text-white text-sm font-medium line-clamp-2 mb-2.5 leading-snug">
        {ticket.title}
      </p>

      {/* Bottom row: status + time */}
      <div className="flex items-center justify-between">
        {columns && onStatusChange ? (
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowStatusPicker((v) => !v); }}
              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            >
              {(() => {
                const col = columns.find((c) => c.key === ticket.status);
                return (
                  <>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col?.color ?? "#71717a" }} />
                    <span className="text-xs text-zinc-400">{col?.name ?? ticket.status}</span>
                  </>
                );
              })()}
            </button>
            {showStatusPicker && (
              <div
                className="absolute bottom-full left-0 mb-1.5 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 py-1 min-w-[150px]"
                onClick={(e) => e.stopPropagation()}
              >
                {columns.map((col) => (
                  <button
                    key={col.key}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(ticket.id, col.key);
                      setShowStatusPicker(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-700 transition-colors text-left"
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                    <span className={`text-xs ${col.key === ticket.status ? "text-white font-semibold" : "text-zinc-400"}`}>
                      {col.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-2 h-2 rounded-full shrink-0 bg-zinc-500" />
            <span className="text-xs text-zinc-400 truncate">{ticket.status}</span>
          </div>
        )}
        <span className="text-[10px] text-zinc-600 shrink-0 ml-2">
          {timeAgo(ticket.createdAt)}
        </span>
      </div>
    </div>
  );
}
