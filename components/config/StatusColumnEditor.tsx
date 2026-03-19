"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface StatusColumn {
  id: string;
  name: string;
  color: string;
  key: string;
  order: number;
}

const PRESET_COLORS = [
  "#6b7280", "#3b82f6", "#ef4444", "#22c55e",
  "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

function SortableColumn({
  col,
  editingId,
  editName,
  editColor,
  deletingId,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEditName,
  onEditColor,
}: {
  col: StatusColumn;
  editingId: string | null;
  editName: string;
  editColor: string;
  deletingId: string | null;
  onStartEdit: (col: StatusColumn) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onEditName: (v: string) => void;
  onEditColor: (v: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: col.id, disabled: editingId !== null });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-zinc-800 rounded-lg px-3 py-2.5 group"
    >
      {editingId === col.id ? (
        <>
          <div className="flex gap-1 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onEditColor(c)}
                className={`w-4 h-4 rounded-full transition-transform ${editColor === c ? "scale-125 ring-1 ring-white/40" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <input
            value={editName}
            onChange={(e) => onEditName(e.target.value)}
            className="flex-1 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-sm text-white focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit(col.id);
              if (e.key === "Escape") onCancelEdit();
            }}
            autoFocus
          />
          <button onClick={() => onSaveEdit(col.id)} className="text-xs text-green-400 hover:text-green-300 font-medium">Save</button>
          <button onClick={onCancelEdit} className="text-xs text-zinc-500 hover:text-zinc-300">Cancel</button>
        </>
      ) : (
        <>
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing touch-none shrink-0"
            title="Drag to reorder"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="4" cy="3" r="1" />
              <circle cx="8" cy="3" r="1" />
              <circle cx="4" cy="6" r="1" />
              <circle cx="8" cy="6" r="1" />
              <circle cx="4" cy="9" r="1" />
              <circle cx="8" cy="9" r="1" />
            </svg>
          </button>
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
          <span className="text-sm text-zinc-200 flex-1">{col.name}</span>
          <span className="text-xs text-zinc-600 font-mono">{col.key}</span>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onStartEdit(col)}
              className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(col.id)}
              disabled={deletingId === col.id}
              className="text-zinc-600 hover:text-red-400 transition-colors text-xs"
            >
              ✕
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function StatusColumnEditor() {
  const [columns, setColumns] = useState<StatusColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    fetch("/api/config/status-columns")
      .then((r) => r.json())
      .then((data: StatusColumn[]) => {
        setColumns(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function startEdit(col: StatusColumn) {
    setEditingId(col.id);
    setEditName(col.name);
    setEditColor(col.color);
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/config/status-columns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, color: editColor }),
    });
    if (res.ok) {
      const updated = await res.json() as StatusColumn;
      setColumns((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError("");
    const res = await fetch(`/api/config/status-columns/${id}`, { method: "DELETE" });
    if (res.ok) {
      setColumns((prev) => prev.filter((c) => c.id !== id));
    } else {
      const data = await res.json() as { error?: string };
      setError(data.error ?? "Cannot delete");
    }
    setDeletingId(null);
  }

  async function handleAdd() {
    setError("");
    if (!newName.trim()) {
      setError("Name is required");
      return;
    }
    const res = await fetch("/api/config/status-columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    const data = await res.json() as StatusColumn & { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Failed to add");
      return;
    }
    setColumns((prev) => [...prev, data]);
    setNewName("");
    setNewColor("#6b7280");
    setShowAdd(false);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = columns.findIndex((c) => c.id === active.id);
    const newIndex = columns.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(columns, oldIndex, newIndex);
    setColumns(reordered);

    await fetch("/api/config/status-columns/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((c) => c.id) }),
    });
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-semibold">Status Columns</h2>
          <p className="text-zinc-500 text-sm mt-0.5">
            Configure board columns (max 4). Drag to reorder.
          </p>
        </div>
        {columns.length < 4 && (
          <button
            onClick={() => { setShowAdd(true); setError(""); }}
            className="px-3 py-1.5 text-xs bg-orange-500 hover:bg-orange-400 text-white rounded-lg font-semibold transition-colors shrink-0"
          >
            + Add Column
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading…</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {columns.map((col) => (
                <SortableColumn
                  key={col.id}
                  col={col}
                  editingId={editingId}
                  editName={editName}
                  editColor={editColor}
                  deletingId={deletingId}
                  onStartEdit={startEdit}
                  onSaveEdit={saveEdit}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={handleDelete}
                  onEditName={setEditName}
                  onEditColor={setEditColor}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {showAdd && (
        <div className="border border-zinc-700 rounded-lg p-4 space-y-3 bg-zinc-800/50">
          <p className="text-xs font-semibold text-zinc-300">New Column</p>
          <div className="flex gap-1 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-5 h-5 rounded-full transition-transform ${newColor === c ? "scale-125 ring-1 ring-white/50" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Review"
              className="w-full mt-1 bg-zinc-700 border border-zinc-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-orange-500/50 placeholder-zinc-600"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="px-3 py-1.5 text-xs bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setShowAdd(false); setError(""); }}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
