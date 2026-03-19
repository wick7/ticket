"use client";

import { useState, useEffect } from "react";

interface Company {
  id: string;
  name: string;
}

interface ReportRow {
  ticketNumber: number;
  status: string;
  trackedMinutes: number;
  title: string;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function statusLabel(status: string): string {
  switch (status) {
    case "open": return "Open";
    case "in_progress": return "In Progress";
    case "completed": return "Completed";
    case "blocked": return "Blocked";
    default: return status;
  }
}

function statusClass(status: string): string {
  switch (status) {
    case "completed": return "bg-green-500/15 text-green-400 border border-green-500/30";
    case "in_progress": return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
    case "blocked": return "bg-red-500/15 text-red-400 border border-red-500/30";
    default: return "bg-zinc-700/50 text-zinc-400 border border-zinc-600/30";
  }
}

export function ReportPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [rows, setRows] = useState<ReportRow[]>([]);

  useEffect(() => {
    fetch("/api/config/companies")
      .then((r) => r.json())
      .then((data: Company[]) => setCompanies(data))
      .catch(() => {});

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    setEndDate(formatDate(today));
    setStartDate(formatDate(thirtyDaysAgo));
  }, []);

  async function handleGenerate() {
    if (!company) { setError("Please select a company."); return; }
    if (!startDate || !endDate) { setError("Please set both start and end dates."); return; }
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams({ company, startDate, endDate });
      const res = await fetch(`/api/report?${params}`);
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Failed to generate report.");
        return;
      }
      const data: ReportRow[] = await res.json();
      setRows(data);
      setShowModal(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const totalHours = rows.reduce((sum, r) => sum + r.trackedMinutes / 60, 0);

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <h1 className="text-white font-semibold text-lg">Report</h1>
      </div>

      {/* Controls */}
      <div className="flex-1 p-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Company</label>
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
            >
              <option value="">Select a company…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
          >
            {loading ? "Generating…" : "Generate Report"}
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-3xl flex flex-col max-h-[80vh] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
              <div>
                <h2 className="text-white font-semibold">{company}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {startDate} → {endDate} · {rows.length} ticket{rows.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-white transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1">
              {rows.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-10">
                  No tickets with time entries in this range.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-zinc-900">
                    <tr className="border-b border-zinc-800">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ticket #</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Hours</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.ticketNumber} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="px-5 py-3 text-zinc-300 font-mono">#{row.ticketNumber}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(row.status)}`}>
                            {statusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-zinc-300 font-mono">
                          {(row.trackedMinutes / 60).toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-zinc-300">{row.title}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800 shrink-0">
              <span className="text-xs text-zinc-500">{rows.length} ticket{rows.length !== 1 ? "s" : ""}</span>
              <span className="text-sm font-semibold text-orange-400">
                Total: {totalHours.toFixed(2)} hrs
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
