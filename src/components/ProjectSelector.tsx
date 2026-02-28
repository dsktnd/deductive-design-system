"use client";

import { useState, useRef, useEffect } from "react";
import { useAppState } from "@/lib/store";
import ProjectManager from "./ProjectManager";

export default function ProjectSelector() {
  const { projects, currentProjectId, switchProject, createProject } = useAppState();
  const [open, setOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const currentProject = projects.find((p) => p.id === currentProjectId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowNew(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createProject(newName.trim(), "");
    setNewName("");
    setShowNew(false);
    setOpen(false);
  };

  return (
    <>
      <div className="relative" ref={dropRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span className="max-w-[120px] truncate">{currentProject?.name ?? "Project"}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
            <div className="max-h-60 overflow-y-auto p-1">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    switchProject(p.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors ${
                    p.id === currentProjectId
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                  }`}
                >
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.id === currentProjectId && (
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-100" />
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-zinc-800 p-1">
              {showNew ? (
                <div className="flex items-center gap-1 px-2 py-1">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    placeholder="Project name..."
                    className="flex-1 rounded bg-zinc-800 px-2 py-1 text-sm text-zinc-200 placeholder-zinc-600 outline-none"
                  />
                  <button
                    onClick={handleCreate}
                    className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-600"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNew(true)}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New Project
                </button>
              )}
              <button
                onClick={() => {
                  setOpen(false);
                  setManagerOpen(true);
                }}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Manage Projects
              </button>
            </div>
          </div>
        )}
      </div>

      {managerOpen && <ProjectManager onClose={() => setManagerOpen(false)} />}
    </>
  );
}
