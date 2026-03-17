"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { TicketCard } from "./TicketCard";
import { TicketEditModal } from "./TicketEditModal";
import { ManualInputModal } from "./ManualInputModal";
import { CreateTicketModal } from "./CreateTicketModal";
import { FilterBar } from "./FilterBar";

export interface Ticket {
  id: string;
  title: string;
  body: string;
  requester: string;
  company: string;
  status: string;
  urgency: string;
  orderIndex: number;
  sourceService: string;
  trackedMinutes: number;
  category: string;
  ticketNumber: string;
  createdAt: string;
}

interface Filters {
  company: string;
  status: string;
  urgency: string;
  sourceService: string;
}

interface TicketBoardProps {
  savedFilter?: Partial<Filters>;
  title?: string;
  boardId?: string;
}

export function TicketBoard({ savedFilter, title = "All Tickets", boardId }: TicketBoardProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filters, setFilters] = useState<Filters>({
    company: savedFilter?.company ?? "",
    status: savedFilter?.status ?? "",
    urgency: savedFilter?.urgency ?? "",
    sourceService: savedFilter?.sourceService ?? "",
  });
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchTickets = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.company) params.set("company", filters.company);
    if (filters.status) params.set("status", filters.status);
    if (filters.urgency) params.set("urgency", filters.urgency);
    if (filters.sourceService) params.set("sourceService", filters.sourceService);
    if (boardId) params.set("boardId", boardId);

    const res = await fetch(`/api/tickets?${params.toString()}`);
    const data = await res.json() as Ticket[];
    setTickets(data);
    setLoading(false);
  }, [filters, boardId]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  async function handleIngest() {
    setIngesting(true);
    setIngestResult(null);
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      const data = await res.json() as {
        results: Array<{ source: string; ticketsCreated: number; fetched: number; error?: string }>;
      };
      const total = data.results.reduce((sum, r) => sum + r.ticketsCreated, 0);
      const summary = data.results
        .filter((r) => r.fetched > 0 || r.error)
        .map((r) => r.error ? `${r.source}: error` : `${r.source}: +${r.ticketsCreated}`)
        .join(", ");
      setIngestResult(
        total > 0
          ? `Created ${total} ticket${total !== 1 ? "s" : ""}${summary ? ` (${summary})` : ""}`
          : "No new tickets"
      );
      if (total > 0) fetchTickets();
    } finally {
      setIngesting(false);
      setTimeout(() => setIngestResult(null), 5000);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tickets.findIndex((t) => t.id === active.id);
    const newIndex = tickets.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(tickets, oldIndex, newIndex);
    setTickets(reordered);

    await fetch("/api/tickets/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((t) => t.id) }),
    });
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t))
    );
  }

  async function handleTicketUpdate(updated: Ticket) {
    await fetch(`/api/tickets/${updated.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    setTickets((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
    setEditingTicket(null);
  }

  async function handleTicketDelete(id: string) {
    await fetch(`/api/tickets/${id}`, { method: "DELETE" });
    setTickets((prev) => prev.filter((t) => t.id !== id));
    setEditingTicket(null);
  }

  function handleTimeLogged(id: string, newTotal: number) {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, trackedMinutes: newTotal } : t))
    );
  }


  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">{title}</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ingestResult && (
            <span className="text-xs text-zinc-400 mr-1">{ingestResult}</span>
          )}
          <button
            onClick={handleIngest}
            disabled={ingesting}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors border border-zinc-700"
          >
            {ingesting ? "Syncing..." : "Sync now"}
          </button>
          <button
            onClick={() => setShowCreateTicket(true)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition-colors border border-zinc-700"
          >
            + Create ticket
          </button>
          <button
            onClick={() => setShowManualInput(true)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition-colors border border-zinc-700"
          >
            + Paste message
          </button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onChange={setFilters} tickets={tickets} />

      {/* Ticket list */}
      {loading ? (
        <div className="text-zinc-500 text-sm py-12 text-center">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="text-zinc-500 text-sm py-12 text-center">
          No tickets yet. Connect a source in Settings or paste a message to get started.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tickets.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onEdit={() => setEditingTicket(ticket)}
                  onStatusChange={handleStatusChange}
                  onTimeLogged={handleTimeLogged}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Modals */}
      {editingTicket && (
        <TicketEditModal
          ticket={editingTicket}
          onSave={handleTicketUpdate}
          onDelete={handleTicketDelete}
          onClose={() => setEditingTicket(null)}
          onTimeLogged={handleTimeLogged}
        />
      )}
      {showCreateTicket && (
        <CreateTicketModal
          onClose={() => setShowCreateTicket(false)}
          onCreated={(ticket) => {
            setTickets((prev) => [ticket, ...prev]);
            setShowCreateTicket(false);
          }}
        />
      )}
      {showManualInput && (
        <ManualInputModal
          onClose={() => setShowManualInput(false)}
          onTicketsCreated={(tickets) => {
            setTickets((prev) => [...tickets, ...prev]);
            setShowManualInput(false);
          }}
          onNotTicketable={() => setShowManualInput(false)}
        />
      )}
    </div>
  );
}
