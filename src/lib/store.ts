"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import React from "react";
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

// --- Project index helpers ---

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

// --- Migration: move legacy single-project data into the new structure ---

async function migrateIfNeeded() {
  if (typeof window === "undefined") return;
  const index = loadProjectIndex();
  if (index.length > 0) return; // already migrated

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
      // Save to IndexedDB instead of localStorage
      await idbSet(stateKeyFor(DEFAULT_PROJECT_ID), { ...defaultState(), ...parsed });
    } catch { /* ignore */ }
    // Clean up legacy localStorage entry
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  saveProjectIndex([defaultMeta]);
  saveCurrentProjectId(DEFAULT_PROJECT_ID);
}

// --- Persisted state ---

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

function defaultState(): PersistedState {
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
  if (typeof window === "undefined") return defaultState();
  try {
    const data = await idbGet<PersistedState>(stateKeyFor(projectId));
    if (data) return { ...defaultState(), ...data };
    // Fallback: try localStorage (migration from old storage)
    const raw = localStorage.getItem(stateKeyFor(projectId));
    if (raw) {
      const parsed = JSON.parse(raw);
      const state = { ...defaultState(), ...parsed };
      // Migrate to IndexedDB and remove from localStorage
      await idbSet(stateKeyFor(projectId), state);
      localStorage.removeItem(stateKeyFor(projectId));
      return state;
    }
  } catch { /* ignore */ }
  return defaultState();
}

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

// --- Context ---

interface AppState {
  // Conditions
  conditions: ResearchCondition[];
  researchTheme: string;
  addCondition: (condition: ResearchCondition) => void;
  removeCondition: (index: number) => void;
  updateConditions: (conditions: ResearchCondition[]) => void;
  setResearchTheme: (theme: string) => void;

  // Generated designs (for filter/distill)
  generatedDesigns: GeneratedDesign[];
  setGeneratedDesigns: (designs: GeneratedDesign[]) => void;
  filteredDesigns: GeneratedDesign[];
  setFilteredDesigns: (designs: GeneratedDesign[]) => void;

  // Research jobs
  researchJobs: ResearchJob[];
  addResearchJob: (job: ResearchJob) => void;
  loadResearchJob: (jobId: string) => void;

  // Generate jobs
  generateJobs: GenerateJob[];
  addGenerateJob: (job: GenerateJob) => void;

  // Generate images (persisted across navigation)
  generateImages: GeneratedImage[];
  addGenerateImage: (image: GeneratedImage) => void;
  clearGenerateImages: () => void;

  // Concepts
  selectedConcepts: ArchitecturalConcept[];
  setSelectedConcepts: (concepts: ArchitecturalConcept[]) => void;

  // Refined concept
  refinedConcept: RefinedConcept | null;
  setRefinedConcept: (concept: RefinedConcept | null) => void;

  // Scene constraint (shared between Generate and Filter)
  sceneConstraint: string;
  setSceneConstraint: (constraint: string) => void;

  // Detail images (from Filter, used by Distill)
  detailImages: Record<string, GeneratedImage>;
  setDetailImages: (images: Record<string, GeneratedImage>) => void;

  // Evaluation results (from Distill)
  evaluationResults: EvaluationResult[];
  addEvaluationResult: (result: EvaluationResult) => void;

  // Atmosphere
  atmosphere: AtmosphereState;
  setAtmosphere: (atmosphere: AtmosphereState) => void;

  // Export
  exportProcessLog: () => ProcessLog;

  // Project management
  currentProjectId: string;
  projects: ProjectMeta[];
  createProject: (name: string, theme: string) => void;
  switchProject: (id: string) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  exportProject: (id: string) => Promise<string>;
  importProject: (json: string) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(DEFAULT_PROJECT_ID);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [conditions, setConditions] = useState<ResearchCondition[]>([]);
  const [researchTheme, setResearchTheme] = useState("");
  const [generatedDesigns, setGeneratedDesigns] = useState<GeneratedDesign[]>([]);
  const [filteredDesigns, setFilteredDesigns] = useState<GeneratedDesign[]>([]);
  const [researchJobs, setResearchJobs] = useState<ResearchJob[]>([]);
  const [generateJobs, setGenerateJobs] = useState<GenerateJob[]>([]);
  const [generateImages, setGenerateImages] = useState<GeneratedImage[]>([]);
  const [selectedConcepts, setSelectedConcepts] = useState<ArchitecturalConcept[]>([]);
  const [refinedConcept, setRefinedConcept] = useState<RefinedConcept | null>(null);
  const [sceneConstraint, setSceneConstraint] = useState("");
  const [detailImages, setDetailImages] = useState<Record<string, GeneratedImage>>({});
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([]);
  const [atmosphere, setAtmosphere] = useState<AtmosphereState>({ presets: [], custom: "" });

  const applyState = useCallback((state: PersistedState) => {
    setConditions(state.conditions);
    setResearchTheme(state.researchTheme);
    setGeneratedDesigns(state.generatedDesigns);
    setFilteredDesigns(state.filteredDesigns);
    setResearchJobs(state.researchJobs);
    setGenerateJobs(state.generateJobs);
    setGenerateImages(state.generateImages);
    setSelectedConcepts(state.selectedConcepts);
    setRefinedConcept(state.refinedConcept);
    setSceneConstraint(state.sceneConstraint);
    setDetailImages(state.detailImages);
    setEvaluationResults(state.evaluationResults);
    setAtmosphere(state.atmosphere);
  }, []);

  const collectState = useCallback((): PersistedState => ({
    conditions,
    researchTheme,
    generatedDesigns,
    filteredDesigns,
    researchJobs,
    generateJobs,
    generateImages,
    selectedConcepts,
    refinedConcept,
    sceneConstraint,
    detailImages,
    evaluationResults,
    atmosphere,
  }), [conditions, researchTheme, generatedDesigns, filteredDesigns, researchJobs, generateJobs, generateImages, selectedConcepts, refinedConcept, sceneConstraint, detailImages, evaluationResults, atmosphere]);

  // Load from IndexedDB on mount (with migration)
  useEffect(() => {
    (async () => {
      await migrateIfNeeded();
      // Also migrate any remaining localStorage project states to IndexedDB
      const projId = loadCurrentProjectId();
      const projectList = loadProjectIndex();
      for (const p of projectList) {
        const lsKey = stateKeyFor(p.id);
        const raw = localStorage.getItem(lsKey);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            await idbSet(lsKey, { ...defaultState(), ...parsed });
            localStorage.removeItem(lsKey);
          } catch { /* ignore */ }
        }
      }
      setCurrentProjectId(projId);
      setProjects(projectList);
      const state = await loadProjectState(projId);
      applyState(state);
      setInitialized(true);
    })();
  }, [applyState]);

  // Persist to localStorage on every change
  useEffect(() => {
    if (!initialized) return;
    saveProjectState(currentProjectId, collectState());
    setProjects((prev) => {
      const updated = prev.map((p) =>
        p.id === currentProjectId ? { ...p, updatedAt: new Date().toISOString() } : p
      );
      saveProjectIndex(updated);
      return updated;
    });
  }, [initialized, currentProjectId, collectState]);

  // --- Existing actions ---

  const addCondition = useCallback((condition: ResearchCondition) => {
    setConditions((prev) => [...prev, condition]);
  }, []);

  const removeCondition = useCallback((index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateConditions = useCallback((newConditions: ResearchCondition[]) => {
    setConditions(newConditions);
  }, []);

  const addResearchJob = useCallback((job: ResearchJob) => {
    setResearchJobs((prev) => [...prev, job]);
  }, []);

  const loadResearchJob = useCallback((jobId: string) => {
    setResearchJobs((prev) => {
      const job = prev.find((j) => j.id === jobId);
      if (job) {
        setConditions(job.conditions);
      }
      return prev;
    });
  }, []);

  const addGenerateJob = useCallback((job: GenerateJob) => {
    setGenerateJobs((prev) => [...prev, job]);
  }, []);

  const addGenerateImage = useCallback((image: GeneratedImage) => {
    setGenerateImages((prev) => [...prev, image]);
  }, []);

  const clearGenerateImages = useCallback(() => {
    setGenerateImages([]);
  }, []);

  const addEvaluationResult = useCallback((result: EvaluationResult) => {
    setEvaluationResults((prev) => [...prev, result]);
  }, []);

  const exportProcessLog = useCallback((): ProcessLog => {
    return {
      projectId: currentProjectId,
      createdAt: researchJobs[0]?.timestamp ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      researchJobs,
      generateJobs,
      generatedDesigns,
      filteredDesigns,
    };
  }, [currentProjectId, researchJobs, generateJobs, generatedDesigns, filteredDesigns]);

  // --- Project management actions ---

  const createProject = useCallback((name: string, theme: string) => {
    saveProjectState(currentProjectId, collectState());

    const now = new Date().toISOString();
    const newId = generateId();
    const newMeta: ProjectMeta = { id: newId, name, theme, createdAt: now, updatedAt: now };

    setProjects((prev) => {
      const updated = [...prev, newMeta];
      saveProjectIndex(updated);
      return updated;
    });

    const newState = { ...defaultState(), researchTheme: theme };
    saveProjectState(newId, newState);
    applyState(newState);
    setCurrentProjectId(newId);
    saveCurrentProjectId(newId);
  }, [currentProjectId, collectState, applyState]);

  const switchProject = useCallback((id: string) => {
    if (id === currentProjectId) return;
    saveProjectState(currentProjectId, collectState());
    loadProjectState(id).then((state) => {
      applyState(state);
      setCurrentProjectId(id);
      saveCurrentProjectId(id);
    });
  }, [currentProjectId, collectState, applyState]);

  const deleteProject = useCallback((id: string) => {
    const idx = loadProjectIndex();
    if (idx.length <= 1) return;

    const updated = idx.filter((p) => p.id !== id);
    saveProjectIndex(updated);
    setProjects(updated);
    idbDelete(stateKeyFor(id));
    // Also clean up any leftover localStorage entry
    localStorage.removeItem(stateKeyFor(id));

    if (id === currentProjectId) {
      const next = updated[0];
      loadProjectState(next.id).then((state) => {
        applyState(state);
        setCurrentProjectId(next.id);
        saveCurrentProjectId(next.id);
      });
    }
  }, [currentProjectId, applyState]);

  const duplicateProject = useCallback((id: string) => {
    if (id === currentProjectId) {
      saveProjectState(currentProjectId, collectState());
    }

    const idx = loadProjectIndex();
    const source = idx.find((p) => p.id === id);
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

    setProjects((prev) => {
      const updated = [...prev, newMeta];
      saveProjectIndex(updated);
      return updated;
    });
  }, [currentProjectId, collectState]);

  const renameProject = useCallback((id: string, name: string) => {
    setProjects((prev) => {
      const updated = prev.map((p) =>
        p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p
      );
      saveProjectIndex(updated);
      return updated;
    });
  }, []);

  const exportProject = useCallback(async (id: string): Promise<string> => {
    if (id === currentProjectId) {
      saveProjectState(currentProjectId, collectState());
    }
    const idx = loadProjectIndex();
    const meta = idx.find((p) => p.id === id);
    const state = await loadProjectState(id);
    return JSON.stringify({ meta, state }, null, 2);
  }, [currentProjectId, collectState]);

  const importProject = useCallback((json: string) => {
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

    const state: PersistedState = { ...defaultState(), ...(data.state ?? data) };
    saveProjectState(newId, state);

    setProjects((prev) => {
      const updated = [...prev, meta];
      saveProjectIndex(updated);
      return updated;
    });

    applyState(state);
    setCurrentProjectId(newId);
    saveCurrentProjectId(newId);
  }, [applyState]);

  return React.createElement(
    AppContext.Provider,
    {
      value: {
        conditions,
        researchTheme,
        addCondition,
        removeCondition,
        updateConditions,
        setResearchTheme,
        generatedDesigns,
        setGeneratedDesigns,
        filteredDesigns,
        setFilteredDesigns,
        researchJobs,
        addResearchJob,
        loadResearchJob,
        generateJobs,
        addGenerateJob,
        generateImages,
        addGenerateImage,
        clearGenerateImages,
        selectedConcepts,
        setSelectedConcepts,
        refinedConcept,
        setRefinedConcept,
        sceneConstraint,
        setSceneConstraint,
        detailImages,
        setDetailImages,
        evaluationResults,
        addEvaluationResult,
        atmosphere,
        setAtmosphere,
        exportProcessLog,
        currentProjectId,
        projects,
        createProject,
        switchProject,
        deleteProject,
        duplicateProject,
        renameProject,
        exportProject,
        importProject,
      },
    },
    children
  );
}

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppState must be used within an AppProvider");
  }
  return context;
}
