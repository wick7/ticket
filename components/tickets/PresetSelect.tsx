"use client";

import { useState } from "react";

interface Props {
  value: string;
  presets: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const NEW_SENTINEL = "__create_new__";

export function PresetSelect({ value, presets, onChange, placeholder = "Select or create...", className = "" }: Props) {
  // If the current value isn't in presets (and is non-empty), we're in free-text mode
  const isCustom = value !== "" && !presets.includes(value);
  const [freeText, setFreeText] = useState(isCustom);

  const inputClass = `w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 ${className}`;

  if (freeText) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type a name..."
          className={`flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500`}
        />
        <button
          type="button"
          onClick={() => { setFreeText(false); onChange(""); }}
          className="px-2 text-zinc-400 hover:text-white bg-zinc-800 border border-zinc-700 rounded-lg transition-colors text-sm"
          title="Back to list"
        >
          ←
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === NEW_SENTINEL) {
          setFreeText(true);
          onChange("");
        } else {
          onChange(e.target.value);
        }
      }}
      className={inputClass}
    >
      <option value="" className="bg-zinc-900">{placeholder}</option>
      {presets.map((p) => (
        <option key={p} value={p} className="bg-zinc-900">{p}</option>
      ))}
      <option value={NEW_SENTINEL} className="bg-zinc-900 text-blue-400">+ Create new</option>
    </select>
  );
}
