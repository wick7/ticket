"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TicketCard } from "./TicketCard";
import type { Ticket } from "./TicketBoard";

export interface StatusColumn {
  id: string;
  name: string;
  color: string;
  key: string;
  order: number;
}

interface Props {
  column: StatusColumn;
  tickets: Ticket[];
  onEditTicket: (ticket: Ticket) => void;
  onAddTicket: () => void;
}

export function KanbanColumn({ column, tickets, onEditTicket, onAddTicket }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div className="flex flex-col flex-1 min-w-[240px] max-w-xs bg-zinc-900/40 rounded-xl border border-zinc-800/60">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-zinc-800/40">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: column.color }} />
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {column.name}
        </span>
        <span className="ml-auto text-xs font-semibold text-zinc-500 bg-zinc-800 rounded-full px-2 py-0.5">
          {tickets.length}
        </span>
      </div>

      {/* Drop zone + ticket list */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-2.5 space-y-2 min-h-[80px] transition-colors rounded-b-xl ${
          isOver ? "bg-zinc-800/30" : ""
        }`}
      >
        <SortableContext
          items={tickets.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onEdit={() => onEditTicket(ticket)}
            />
          ))}
        </SortableContext>
      </div>

      {/* Add ticket */}
      <div className="p-2">
        <button
          onClick={onAddTicket}
          className="w-full py-2 text-xs text-zinc-600 hover:text-zinc-400 border border-dashed border-zinc-800 hover:border-zinc-600 rounded-lg transition-colors"
        >
          + Add ticket
        </button>
      </div>
    </div>
  );
}
