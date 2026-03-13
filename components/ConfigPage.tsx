"use client";

import { useState, useEffect } from "react";
import { PresetListEditor } from "./config/PresetListEditor";

interface Preset { id: string; name: string }

export function ConfigPage() {
  const [companies, setCompanies] = useState<Preset[]>([]);
  const [categories, setCategories] = useState<Preset[]>([]);

  useEffect(() => {
    fetch("/api/config/companies").then((r) => r.json()).then(setCompanies).catch(() => {});
    fetch("/api/config/categories").then((r) => r.json()).then(setCategories).catch(() => {});
  }, []);

  async function addCompany(name: string) {
    const res = await fetch("/api/config/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json() as Preset;
    setCompanies((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function deleteCompany(id: string) {
    await fetch(`/api/config/companies/${id}`, { method: "DELETE" });
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  }

  async function addCategory(name: string) {
    const res = await fetch("/api/config/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json() as Preset;
    setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function deleteCategory(id: string) {
    await fetch(`/api/config/categories/${id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Configuration</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Manage predefined companies and categories for tickets.</p>
      </div>

      <PresetListEditor
        title="Companies"
        presets={companies}
        onAdd={addCompany}
        onDelete={deleteCompany}
      />

      <PresetListEditor
        title="Categories"
        presets={categories}
        onAdd={addCategory}
        onDelete={deleteCategory}
      />
    </div>
  );
}
