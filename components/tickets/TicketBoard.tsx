"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { TicketCard } from "./TicketCard";
import { KanbanColumn, type StatusColumn } from "./KanbanColumn";
import { TicketEditModal } from "./TicketEditModal";
import { ManualInputModal } from "./ManualInputModal";
import { CreateTicketModal } from "./CreateTicketModal";

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
  urgency: string;
  sourceService: string;
  search: string;
}

interface TicketBoardProps {
  savedFilter?: Partial<Omit<Filters, "search"> & { status: string }>;
  title?: string;
  boardId?: string;
}

const URGENCY_OPTIONS = [
  { value: "", label: "Urgency" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "Source" },
  { value: "slack", label: "Slack" },
  { value: "outlook", label: "Outlook" },
  { value: "teams", label: "Teams" },
  { value: "gmail", label: "Gmail" },
  { value: "manual", label: "Manual" },
];

export function TicketBoard({ savedFilter, title = "Board", boardId }: TicketBoardProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [columns, setColumns] = useState<StatusColumn[]>([]);
  const [filters, setFilters] = useState<Filters>({
    company: savedFilter?.company ?? "",
    urgency: savedFilter?.urgency ?? "",
    sourceService: savedFilter?.sourceService ?? "",
    search: "",
  });
  const [activeStatusTab, setActiveStatusTab] = useState<string>("all");
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<string | null>(null);
  // company filter pills from unique companies in tickets
  const [companies, setCompanies] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchTickets = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.company) params.set("company", filters.company);
    if (filters.urgency) params.set("urgency", filters.urgency);
    if (filters.sourceService) params.set("sourceService", filters.sourceService);
    if (boardId) params.set("boardId", boardId);

    const res = await fetch(`/api/tickets?${params.toString()}`);
    const data = (await res.json()) as Ticket[];
    setTickets(data);
    setCompanies(Array.from(new Set(data.map((t) => t.company))).sort());
    setLoading(false);
  }, [filters.company, filters.urgency, filters.sourceService, boardId]);

  const fetchColumns = useCallback(async () => {
    const res = await fetch("/api/config/status-columns");
    if (res.ok) {
      const data = (await res.json()) as StatusColumn[];
      setColumns(data);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    fetchColumns();
  }, [fetchColumns]);

  // Apply search + status tab filter client-side
  const visibleTickets = useMemo(() => {
    let list = tickets;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.company.toLowerCase().includes(q) ||
          t.requester.toLowerCase().includes(q) ||
          t.ticketNumber.toLowerCase().includes(q)
      );
    }
    if (activeStatusTab !== "all") {
      list = list.filter((t) => t.status === activeStatusTab);
    }
    return list;
  }, [tickets, filters.search, activeStatusTab]);

  // Group by status column key
  const ticketsByStatus = useMemo(() => {
    const map: Record<string, Ticket[]> = {};
    columns.forEach((c) => {
      map[c.key] = [];
    });
    visibleTickets.forEach((t) => {
      if (map[t.status] !== undefined) {
        map[t.status].push(t);
      } else {
        const firstKey = columns[0]?.key ?? "todo";
        (map[firstKey] ??= []).push(t);
      }
    });
    return map;
  }, [visibleTickets, columns]);

  async function handleIngest() {
    setIngesting(true);
    setIngestResult(null);
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      const data = (await res.json()) as {
        results: Array<{ source: string; ticketsCreated: number; fetched: number; error?: string }>;
      };
      const total = data.results.reduce((sum, r) => sum + r.ticketsCreated, 0);
      setIngestResult(total > 0 ? `+${total} ticket${total !== 1 ? "s" : ""}` : "No new tickets");
      if (total > 0) fetchTickets();
    } finally {
      setIngesting(false);
      setTimeout(() => setIngestResult(null), 5000);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const ticket = tickets.find((t) => t.id === event.active.id);
    setActiveTicket(ticket ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const draggedTicket = tickets.find((t) => t.id === active.id);
    if (!draggedTicket) return;

    // Determine target column key
    const overColumn = columns.find((c) => c.key === over.id);
    const overTicket = tickets.find((t) => t.id === over.id);
    const targetStatus = overColumn?.key ?? overTicket?.status;

    if (targetStatus && targetStatus !== draggedTicket.status) {
      // Optimistically update status for visual feedback
      setTickets((prev) =>
        prev.map((t) => (t.id === draggedTicket.id ? { ...t, status: targetStatus } : t))
      );
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) return;

    const draggedTicket = tickets.find((t) => t.id === active.id);
    if (!draggedTicket) return;

    const overColumn = columns.find((c) => c.key === over.id);
    const overTicket = tickets.find((t) => t.id === over.id);
    const targetStatus = overColumn?.key ?? overTicket?.status ?? draggedTicket.status;

    if (targetStatus !== draggedTicket.status) {
      // Persist status change
      await fetch(`/api/tickets/${draggedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      // State already updated in onDragOver
      return;
    }

    // Same column reorder
    if (overTicket && overTicket.status === draggedTicket.status) {
      const colTickets = ticketsByStatus[draggedTicket.status] ?? [];
      const oldIdx = colTickets.findIndex((t) => t.id === active.id);
      const newIdx = colTickets.findIndex((t) => t.id === over.id);
      if (oldIdx !== newIdx) {
        const reordered = arrayMove(colTickets, oldIdx, newIdx);
        const otherTickets = tickets.filter((t) => t.status !== draggedTicket.status);
        setTickets([...otherTickets, ...reordered]);

        await fetch("/api/tickets/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: reordered.map((t) => t.id) }),
        });
      }
    }
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  async function handleTicketUpdate(updated: Ticket) {
    await fetch(`/api/tickets/${updated.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
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

  const filterSelectClass =
    "bg-zinc-800/80 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-orange-500/50 appearance-none cursor-pointer hover:border-zinc-600 transition-colors";

  // ── MOBILE VIEW (< lg): grouped list by status ──────────────────────────────
  const MobileView = () => (
    <div className="flex flex-col min-h-0">
      {loading ? (
        <div className="py-16 text-center text-zinc-500 text-sm">Loading…</div>
      ) : (
        columns.map((col) => {
          const colTickets = ticketsByStatus[col.key] ?? [];
          if (activeStatusTab !== "all" && activeStatusTab !== col.key) return null;
          return (
            <div key={col.key} className="mb-4">
              <div className="flex items-center gap-2 px-4 py-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {col.name}
                </span>
                <span className="text-xs text-zinc-600 ml-1">{colTickets.length}</span>
              </div>
              <div className="px-3 space-y-2">
                {colTickets.length === 0 ? (
                  <p className="text-xs text-zinc-700 px-1">No tickets</p>
                ) : (
                  colTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => setEditingTicket(ticket)}
                      className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl p-3 cursor-pointer hover:border-zinc-600 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {ticket.ticketNumber && (
                          <span className="text-[10px] text-zinc-500 font-mono">{ticket.ticketNumber}</span>
                        )}
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          ticket.urgency === "high"
                            ? "bg-red-950/80 text-red-400 border border-red-800/60"
                            : ticket.urgency === "medium"
                            ? "bg-yellow-950/60 text-yellow-500 border border-yellow-800/50"
                            : "bg-zinc-700 text-zinc-400"
                        }`}>
                          {ticket.urgency === "high" ? "High" : ticket.urgency === "medium" ? "Med" : "Low"}
                        </span>
                        <span className="text-[10px] text-zinc-500 bg-zinc-700/60 px-1.5 py-0.5 rounded">
                          {ticket.sourceService}
                        </span>
                      </div>
                      <p className="text-white text-sm font-medium line-clamp-2 mb-2">{ticket.title}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">{ticket.company}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800/60 bg-zinc-950/50 shrink-0 flex-wrap">
        <div className="flex items-center gap-2 mr-2">
          <h1 className="text-base font-bold text-white">{title}</h1>
          <span className="text-xs text-zinc-500 bg-zinc-800 rounded-full px-2 py-0.5">
            {tickets.length} tickets
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {/* Company filter */}
          <select
            value={filters.company}
            onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value }))}
            className={filterSelectClass}
          >
            <option value="">Company</option>
            {companies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={filters.urgency}
            onChange={(e) => setFilters((f) => ({ ...f, urgency: e.target.value }))}
            className={filterSelectClass}
          >
            {URGENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={filters.sourceService}
            onChange={(e) => setFilters((f) => ({ ...f, sourceService: e.target.value }))}
            className={filterSelectClass}
          >
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search tickets…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {ingestResult && (
            <span className="text-xs text-zinc-400">{ingestResult}</span>
          )}
          <button
            onClick={handleIngest}
            disabled={ingesting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-zinc-600 disabled:opacity-50 transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {ingesting ? "Syncing…" : "Ingest"}
          </button>
          <button
            onClick={() => setShowCreateTicket(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5.5" y1="1" x2="5.5" y2="10" />
              <line x1="1" y1="5.5" x2="10" y2="5.5" />
            </svg>
            New Ticket
          </button>
          <button
            onClick={() => setShowManualInput(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-orange-500 hover:bg-orange-400 rounded-lg font-semibold transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
              <path d="M12 8v4l3 3" />
            </svg>
            + AI Ticket
          </button>
        </div>
      </div>

      {/* ── Status tabs ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-5 py-2 border-b border-zinc-800/40 shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveStatusTab("all")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeStatusTab === "all"
              ? "bg-zinc-800 text-white"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
          }`}
        >
          All
          <span className={`text-[10px] font-semibold ${activeStatusTab === "all" ? "text-zinc-300" : "text-zinc-600"}`}>
            {tickets.length}
          </span>
        </button>
        {columns.map((col) => {
          const count = tickets.filter((t) => t.status === col.key).length;
          return (
            <button
              key={col.key}
              onClick={() => setActiveStatusTab(activeStatusTab === col.key ? "all" : col.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeStatusTab === col.key
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: col.color }}
              />
              {col.name}
              <span className={`text-[10px] font-semibold ${activeStatusTab === col.key ? "text-zinc-300" : "text-zinc-600"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Board area ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="py-16 text-center text-zinc-500 text-sm">Loading tickets…</div>
        ) : (
          <>
            {/* Desktop: kanban columns */}
            <div className="hidden lg:flex gap-4 h-full items-start">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                {columns.map((col) => (
                  <KanbanColumn
                    key={col.key}
                    column={col}
                    tickets={ticketsByStatus[col.key] ?? []}
                    onEditTicket={setEditingTicket}
                    onAddTicket={() => setShowCreateTicket(true)}
                  />
                ))}

                <DragOverlay>
                  {activeTicket ? (
                    <TicketCard
                      ticket={activeTicket}
                      onEdit={() => {}}
                      isOverlay
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>

            {/* Mobile: grouped list */}
            <div className="lg:hidden">
              <MobileView />
            </div>
          </>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {editingTicket && (
        <TicketEditModal
          ticket={editingTicket}
          onSave={handleTicketUpdate}
          onDelete={handleTicketDelete}
          onClose={() => setEditingTicket(null)}
          onTimeLogged={handleTimeLogged}
          currentBoardId={boardId}
          onBoardChanged={(ticketId, newBoardId) => {
            // If viewing a named board and the ticket was moved away, remove it from this view
            if (boardId && newBoardId !== boardId) {
              setTickets((prev) => prev.filter((t) => t.id !== ticketId));
            }
            setEditingTicket(null);
          }}
        />
      )}
      {showCreateTicket && (
        <CreateTicketModal
          onClose={() => setShowCreateTicket(false)}
          boardId={boardId}
          onCreated={(ticket) => {
            setTickets((prev) => [ticket, ...prev]);
            setShowCreateTicket(false);
          }}
        />
      )}
      {showManualInput && (
        <ManualInputModal
          onClose={() => setShowManualInput(false)}
          onTicketsCreated={(t) => {
            setTickets((prev) => [...t, ...prev]);
            setShowManualInput(false);
          }}
          onNotTicketable={() => setShowManualInput(false)}
        />
      )}

      {/* Mobile FAB */}
      <button
        onClick={() => setShowCreateTicket(true)}
        className="lg:hidden fixed bottom-6 right-6 w-12 h-12 bg-orange-500 hover:bg-orange-400 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 transition-colors z-10"
        aria-label="New ticket"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="2.5">
          <line x1="9" y1="2" x2="9" y2="16" />
          <line x1="2" y1="9" x2="16" y2="9" />
        </svg>
      </button>
    </div>
  );
}
