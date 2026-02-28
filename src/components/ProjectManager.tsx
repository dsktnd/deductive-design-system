"use client";

import { useState, useRef } from "react";
import { useAppState } from "@/lib/store";
import type { ProjectMeta } from "@/lib/types";

interface Props {
  onClose: () => void;
}

export default function ProjectManager({ onClose }: Props) {
  const {
    projects,
    currentProjectId,
    switchProject,
    deleteProject,
    duplicateProject,
    renameProject,
    exportProject,
    importProject,
  } = useAppState();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRename = (p: ProjectMeta) => {
    setEditingId(p.id);
    setEditName(p.name);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      renameProject(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const handleExport = async (id: string) => {
    const json = await exportProject(id);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const proj = projects.find((p) => p.id === id);
    a.href = url;
    a.download = `${proj?.name ?? "project"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importProject(reader.result as string);
      } catch {
        // ignore invalid JSON
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Projects</h2>
            <p className="text-xs text-zinc-500">Manage your design projects</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleImport}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              Import
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Project list */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {projects.map((p) => (
            <div
              key={p.id}
              className={`group flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                p.id === currentProjectId
                  ? "bg-zinc-800/60"
                  : "hover:bg-zinc-900"
              }`}
            >
              {/* Active indicator */}
              <div className="flex w-2 justify-center">
                {p.id === currentProjectId && (
                  <span className="h-2 w-2 rounded-full bg-zinc-100" />
                )}
              </div>

              {/* Name & meta */}
              <div className="flex-1 min-w-0">
                {editingId === p.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onBlur={commitRename}
                    className="w-full rounded bg-zinc-800 px-2 py-0.5 text-sm text-zinc-200 outline-none ring-1 ring-zinc-600"
                  />
                ) : (
                  <button
                    onClick={() => {
                      switchProject(p.id);
                    }}
                    className="block w-full text-left"
                  >
                    <span className="text-sm font-medium text-zinc-200 truncate block">{p.name}</span>
                    <span className="text-[10px] text-zinc-500">
                      {p.theme && <>{p.theme} &middot; </>}
                      created {formatDate(p.createdAt)} &middot; updated {formatDate(p.updatedAt)}
                    </span>
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startRename(p)}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                  title="Rename"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => duplicateProject(p.id)}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                  title="Duplicate"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                <button
                  onClick={() => handleExport(p.id)}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                  title="Export"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
                {projects.length > 1 && (
                  confirmDeleteId === p.id ? (
                    <button
                      onClick={() => {
                        deleteProject(p.id);
                        setConfirmDeleteId(null);
                      }}
                      onBlur={() => setConfirmDeleteId(null)}
                      className="rounded bg-red-900/50 px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-900"
                    >
                      confirm
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(p.id)}
                      className="rounded p-1 text-zinc-500 hover:bg-red-900/30 hover:text-red-400"
                      title="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
