"use client";

import type { Ticket } from "./TicketBoard";

interface Filters {
  company: string;
  status: string;
  urgency: string;
  sourceService: string;
}

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  tickets: Ticket[];
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "not_needed", label: "Not Needed" },
  { value: "completed", label: "Completed" },
];

const URGENCY_OPTIONS = [
  { value: "", label: "All urgencies" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All sources" },
  { value: "slack", label: "Slack" },
  { value: "outlook", label: "Outlook" },
  { value: "teams", label: "Teams" },
  { value: "manual", label: "Manual" },
];

export function FilterBar({ filters, onChange, tickets }: Props) {
  // Extract unique companies from current tickets
  const companies = Array.from(new Set(tickets.map((t) => t.company))).sort();

  const hasActiveFilter =
    filters.company || filters.status || filters.urgency || filters.sourceService;

  function set(key: keyof Filters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  const selectClass =
    "bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer";

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <select
        value={filters.company}
        onChange={(e) => set("company", e.target.value)}
        className={selectClass}
      >
        <option value="">All clients</option>
        {companies.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(e) => set("status", e.target.value)}
        className={selectClass}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={filters.urgency}
        onChange={(e) => set("urgency", e.target.value)}
        className={selectClass}
      >
        {URGENCY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={filters.sourceService}
        onChange={(e) => set("sourceService", e.target.value)}
        className={selectClass}
      >
        {SOURCE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {hasActiveFilter && (
        <button
          onClick={() =>
            onChange({ company: "", status: "", urgency: "", sourceService: "" })
          }
          className="text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-zinc-800"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
