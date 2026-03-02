"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  ResearchCondition,
  GeneratedDesign,
  GeneratedImage,
  ResearchJob,
  GenerateJob,
  ProcessLog,
  ArchitecturalConcept,
  EvaluationResult,
  ProjectMeta,
} from "./types";
import { idbGet, idbSet, idbDelete } from "./storage";

// --- Constants ---

const PROJECTS_INDEX_KEY = "deductive-design-projects";
const STATE_KEY_PREFIX = "deductive-design-state";
const CURRENT_PROJECT_KEY = "deductive-design-current-project";
const LEGACY_STORAGE_KEY = "deductive-design-state";
const DEFAULT_PROJECT_ID = "default";

function stateKeyFor(projectId: string) {
  return `${STATE_KEY_PREFIX}-${projectId}`;
}

function generateId(): string {
  return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// --- Project index helpers (localStorage) ---

function loadProjectIndex(): ProjectMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROJECTS_INDEX_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveProjectIndex(projects: ProjectMeta[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(projects));
  } catch { /* ignore */ }
}

function loadCurrentProjectId(): string {
  if (typeof window === "undefined") return DEFAULT_PROJECT_ID;
  return localStorage.getItem(CURRENT_PROJECT_KEY) ?? DEFAULT_PROJECT_ID;
}

function saveCurrentProjectId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CURRENT_PROJECT_KEY, id);
}

// --- Migration ---

async function migrateIfNeeded() {
  if (typeof window === "undefined") return;
  const index = loadProjectIndex();
  if (index.length > 0) return;

  const now = new Date().toISOString();
  const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);

  const defaultMeta: ProjectMeta = {
    id: DEFAULT_PROJECT_ID,
    name: "Default",
    theme: "",
    createdAt: now,
    updatedAt: now,
  };

  if (legacyRaw) {
    try {
      const parsed = JSON.parse(legacyRaw);
      if (parsed.researchTheme) defaultMeta.theme = parsed.researchTheme;
      await idbSet(stateKeyFor(DEFAULT_PROJECT_ID), { ...defaultPersistedState(), ...parsed });
    } catch { /* ignore */ }
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  saveProjectIndex([defaultMeta]);
  saveCurrentProjectId(DEFAULT_PROJECT_ID);
}

// --- Persisted state shape ---

interface RefinedConcept {
  title: string;
  description: string;
}

export interface AtmosphereState {
  presets: string[];
  custom: string;
}

interface PersistedState {
  conditions: ResearchCondition[];
  researchTheme: string;
  generatedDesigns: GeneratedDesign[];
  filteredDesigns: GeneratedDesign[];
  researchJobs: ResearchJob[];
  generateJobs: GenerateJob[];
  generateImages: GeneratedImage[];
  selectedConcepts: ArchitecturalConcept[];
  refinedConcept: RefinedConcept | null;
  sceneConstraint: string;
  detailImages: Record<string, GeneratedImage>;
  evaluationResults: EvaluationResult[];
  atmosphere: AtmosphereState;
}

function defaultPersistedState(): PersistedState {
  return {
    conditions: [],
    researchTheme: "",
    generatedDesigns: [],
    filteredDesigns: [],
    researchJobs: [],
    generateJobs: [],
    generateImages: [],
    selectedConcepts: [],
    refinedConcept: null,
    sceneConstraint: "",
    detailImages: {},
    evaluationResults: [],
    atmosphere: { presets: [], custom: "" },
  };
}

async function loadProjectState(projectId: string): Promise<PersistedState> {
  if (typeof window === "undefined") return defaultPersistedState();
  try {
    const data = await idbGet<PersistedState>(stateKeyFor(projectId));
    if (data) return { ...defaultPersistedState(), ...data };
    const raw = localStorage.getItem(stateKeyFor(projectId));
    if (raw) {
      const parsed = JSON.parse(raw);
      const state = { ...defaultPersistedState(), ...parsed };
      await idbSet(stateKeyFor(projectId), state);
      localStorage.removeItem(stateKeyFor(projectId));
      return state;
    }
  } catch { /* ignore */ }
  return defaultPersistedState();
}

// --- Debounced save ---

let saveQueued = false;
let pendingSave: { projectId: string; state: PersistedState } | null = null;

function saveProjectState(projectId: string, state: PersistedState) {
  if (typeof window === "undefined") return;
  pendingSave = { projectId, state };
  if (!saveQueued) {
    saveQueued = true;
    requestAnimationFrame(() => {
      saveQueued = false;
      if (pendingSave) {
        idbSet(stateKeyFor(pendingSave.projectId), pendingSave.state);
        pendingSave = null;
      }
    });
  }
}

// --- Zustand store ---

interface AppState extends PersistedState {
  // Meta
  initialized: boolean;
  currentProjectId: string;
  projects: ProjectMeta[];

  // Research actions
  addCondition: (condition: ResearchCondition) => void;
  removeCondition: (index: number) => void;
  updateConditions: (conditions: ResearchCondition[]) => void;
  setResearchTheme: (theme: string) => void;
  researchJobs: ResearchJob[];
  addResearchJob: (job: ResearchJob) => void;
  loadResearchJob: (jobId: string) => void;
  selectedConcepts: ArchitecturalConcept[];
  setSelectedConcepts: (concepts: ArchitecturalConcept[]) => void;

  // Generation actions
  setGeneratedDesigns: (designs: GeneratedDesign[]) => void;
  addGenerateJob: (job: GenerateJob) => void;
  addGenerateImage: (image: GeneratedImage) => void;
  clearGenerateImages: () => void;
  setSceneConstraint: (constraint: string) => void;
  setAtmosphere: (atmosphere: AtmosphereState) => void;

  // Evaluation actions
  setFilteredDesigns: (designs: GeneratedDesign[]) => void;
  setDetailImages: (images: Record<string, GeneratedImage>) => void;
  addEvaluationResult: (result: EvaluationResult) => void;
  refinedConcept: RefinedConcept | null;
  setRefinedConcept: (concept: RefinedConcept | null) => void;

  // Export
  exportProcessLog: () => ProcessLog;

  // Project management
  createProject: (name: string, theme: string) => void;
  switchProject: (id: string) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  exportProject: (id: string) => Promise<string>;
  importProject: (json: string) => void;

  // Internal
  _initialize: () => Promise<void>;
}

function collectPersisted(state: AppState): PersistedState {
  return {
    conditions: state.conditions,
    researchTheme: state.researchTheme,
    generatedDesigns: state.generatedDesigns,
    filteredDesigns: state.filteredDesigns,
    researchJobs: state.researchJobs,
    generateJobs: state.generateJobs,
    generateImages: state.generateImages,
    selectedConcepts: state.selectedConcepts,
    refinedConcept: state.refinedConcept,
    sceneConstraint: state.sceneConstraint,
    detailImages: state.detailImages,
    evaluationResults: state.evaluationResults,
    atmosphere: state.atmosphere,
  };
}

export const useStore = create<AppState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      ...defaultPersistedState(),
      initialized: false,
      currentProjectId: DEFAULT_PROJECT_ID,
      projects: [],

      // --- Research actions ---

      addCondition: (condition) =>
        set((s) => { s.conditions.push(condition); }),

      removeCondition: (index) =>
        set((s) => { s.conditions.splice(index, 1); }),

      updateConditions: (conditions) =>
        set((s) => { s.conditions = conditions; }),

      setResearchTheme: (theme) =>
        set((s) => { s.researchTheme = theme; }),

      addResearchJob: (job) =>
        set((s) => { s.researchJobs.push(job); }),

      loadResearchJob: (jobId) => {
        const job = get().researchJobs.find((j) => j.id === jobId);
        if (job) {
          set((s) => { s.conditions = job.conditions; });
        }
      },

      setSelectedConcepts: (concepts) =>
        set((s) => { s.selectedConcepts = concepts; }),

      // --- Generation actions ---

      setGeneratedDesigns: (designs) =>
        set((s) => { s.generatedDesigns = designs; }),

      addGenerateJob: (job) =>
        set((s) => { s.generateJobs.push(job); }),

      addGenerateImage: (image) =>
        set((s) => { s.generateImages.push(image); }),

      clearGenerateImages: () =>
        set((s) => { s.generateImages = []; }),

      setSceneConstraint: (constraint) =>
        set((s) => { s.sceneConstraint = constraint; }),

      setAtmosphere: (atmosphere) =>
        set((s) => { s.atmosphere = atmosphere; }),

      // --- Evaluation actions ---

      setFilteredDesigns: (designs) =>
        set((s) => { s.filteredDesigns = designs; }),

      setDetailImages: (images) =>
        set((s) => { s.detailImages = images; }),

      addEvaluationResult: (result) =>
        set((s) => { s.evaluationResults.push(result); }),

      setRefinedConcept: (concept) =>
        set((s) => { s.refinedConcept = concept; }),

      // --- Export ---

      exportProcessLog: (): ProcessLog => {
        const s = get();
        return {
          projectId: s.currentProjectId,
          createdAt: s.researchJobs[0]?.timestamp ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          researchJobs: s.researchJobs,
          generateJobs: s.generateJobs,
          generatedDesigns: s.generatedDesigns,
          filteredDesigns: s.filteredDesigns,
        };
      },

      // --- Project management ---

      createProject: (name, theme) => {
        const s = get();
        saveProjectState(s.currentProjectId, collectPersisted(s));

        const now = new Date().toISOString();
        const newId = generateId();
        const newMeta: ProjectMeta = { id: newId, name, theme, createdAt: now, updatedAt: now };
        const newState = { ...defaultPersistedState(), researchTheme: theme };
        saveProjectState(newId, newState);
        saveCurrentProjectId(newId);

        set((d) => {
          d.projects.push(newMeta);
          saveProjectIndex(d.projects);
          Object.assign(d, newState);
          d.currentProjectId = newId;
        });
      },

      switchProject: (id) => {
        const s = get();
        if (id === s.currentProjectId) return;
        saveProjectState(s.currentProjectId, collectPersisted(s));

        loadProjectState(id).then((state) => {
          saveCurrentProjectId(id);
          set((d) => {
            Object.assign(d, state);
            d.currentProjectId = id;
          });
        });
      },

      deleteProject: (id) => {
        const idx = loadProjectIndex();
        if (idx.length <= 1) return;

        const updated = idx.filter((p) => p.id !== id);
        saveProjectIndex(updated);
        idbDelete(stateKeyFor(id));
        try { localStorage.removeItem(stateKeyFor(id)); } catch { /* ignore */ }

        const s = get();
        if (id === s.currentProjectId) {
          const next = updated[0];
          loadProjectState(next.id).then((state) => {
            saveCurrentProjectId(next.id);
            set((d) => {
              d.projects = updated;
              Object.assign(d, state);
              d.currentProjectId = next.id;
            });
          });
        } else {
          set((d) => { d.projects = updated; });
        }
      },

      duplicateProject: (id) => {
        const s = get();
        if (id === s.currentProjectId) {
          saveProjectState(s.currentProjectId, collectPersisted(s));
        }

        const source = s.projects.find((p) => p.id === id);
        if (!source) return;

        const now = new Date().toISOString();
        const newId = generateId();
        const newMeta: ProjectMeta = {
          id: newId,
          name: `${source.name} (copy)`,
          theme: source.theme,
          createdAt: now,
          updatedAt: now,
        };

        loadProjectState(id).then((sourceState) => {
          saveProjectState(newId, sourceState);
        });

        set((d) => {
          d.projects.push(newMeta);
          saveProjectIndex(d.projects);
        });
      },

      renameProject: (id, name) =>
        set((d) => {
          const p = d.projects.find((p) => p.id === id);
          if (p) {
            p.name = name;
            p.updatedAt = new Date().toISOString();
          }
          saveProjectIndex(d.projects);
        }),

      exportProject: async (id): Promise<string> => {
        const s = get();
        if (id === s.currentProjectId) {
          saveProjectState(s.currentProjectId, collectPersisted(s));
        }
        const meta = s.projects.find((p) => p.id === id);
        const state = await loadProjectState(id);
        return JSON.stringify({ meta, state }, null, 2);
      },

      importProject: (json) => {
        const data = JSON.parse(json);
        const now = new Date().toISOString();
        const newId = generateId();

        const meta: ProjectMeta = {
          id: newId,
          name: data.meta?.name ?? "Imported",
          theme: data.meta?.theme ?? "",
          createdAt: now,
          updatedAt: now,
        };

        const state: PersistedState = { ...defaultPersistedState(), ...(data.state ?? data) };
        saveProjectState(newId, state);
        saveCurrentProjectId(newId);

        set((d) => {
          d.projects.push(meta);
          saveProjectIndex(d.projects);
          Object.assign(d, state);
          d.currentProjectId = newId;
        });
      },

      // --- Initialization ---

      _initialize: async () => {
        if (get().initialized) return;
        await migrateIfNeeded();

        const projectList = loadProjectIndex();
        for (const p of projectList) {
          const lsKey = stateKeyFor(p.id);
          try {
            const raw = localStorage.getItem(lsKey);
            if (raw) {
              const parsed = JSON.parse(raw);
              await idbSet(lsKey, { ...defaultPersistedState(), ...parsed });
              localStorage.removeItem(lsKey);
            }
          } catch { /* ignore */ }
        }

        const projId = loadCurrentProjectId();
        const state = await loadProjectState(projId);

        set((d) => {
          d.currentProjectId = projId;
          d.projects = projectList;
          Object.assign(d, state);
          d.initialized = true;
        });
      },
    }))
  )
);

// --- Auto-persist: subscribe to persisted state changes ---

if (typeof window !== "undefined") {
  // Persist on every state change (debounced via saveProjectState)
  const PERSISTED_KEYS: (keyof PersistedState)[] = [
    "conditions", "researchTheme", "generatedDesigns", "filteredDesigns",
    "researchJobs", "generateJobs", "generateImages", "selectedConcepts",
    "refinedConcept", "sceneConstraint", "detailImages", "evaluationResults",
    "atmosphere",
  ];

  useStore.subscribe(
    (state) => PERSISTED_KEYS.map((k) => state[k]),
    () => {
      const s = useStore.getState();
      if (!s.initialized) return;
      saveProjectState(s.currentProjectId, collectPersisted(s));
      // Update project's updatedAt timestamp
      const proj = s.projects.find((p) => p.id === s.currentProjectId);
      if (proj) {
        const now = new Date().toISOString();
        const updated = s.projects.map((p) =>
          p.id === s.currentProjectId ? { ...p, updatedAt: now } : p
        );
        saveProjectIndex(updated);
        useStore.setState({ projects: updated });
      }
    },
    { equalityFn: (a, b) => a.every((v, i) => v === b[i]) }
  );
}

// --- Compatibility: useAppState hook ---
// Returns the full store. Consumers that import useAppState continue to work.
// For optimal re-renders, consumers should migrate to:
//   const conditions = useStore((s) => s.conditions);

export function useAppState() {
  return useStore();
}

// --- StoreInitializer component (replaces AppProvider) ---

export function StoreInitializer({ children }: { children: React.ReactNode }) {
  const initialized = useStore((s) => s.initialized);
  const initialize = useStore((s) => s._initialize);

  // Trigger initialization on mount
  if (typeof window !== "undefined" && !initialized) {
    initialize();
  }

  return children as React.ReactElement;
}

// Keep AppProvider as alias for backward compatibility
export const AppProvider = StoreInitializer;
