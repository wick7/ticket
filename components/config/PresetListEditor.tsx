"use client";

import { useState } from "react";

interface Preset { id: string; name: string }

interface Props {
  title: string;
  presets: Preset[];
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function PresetListEditor({ title, presets, onAdd, onDelete }: Props) {
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!input.trim()) return;
    setAdding(true);
    await onAdd(input.trim());
    setInput("");
    setAdding(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
      <h2 className="text-white font-semibold">{title}</h2>

      {/* Add input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder={`Add ${title.toLowerCase()}...`}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-zinc-600"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !input.trim()}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          Add
        </button>
      </div>

      {/* List */}
      {presets.length === 0 ? (
        <p className="text-xs text-zinc-600">No {title.toLowerCase()} defined yet.</p>
      ) : (
        <ul className="space-y-1">
          {presets.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded-lg group">
              <span className="text-sm text-zinc-200">{p.name}</span>
              <button
                onClick={() => handleDelete(p.id)}
                disabled={deletingId === p.id}
                className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs"
                title="Remove"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
