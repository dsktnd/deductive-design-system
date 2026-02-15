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
} from "./types";

const STORAGE_KEY = "deductive-design-state";

interface RefinedConcept {
  title: string;
  description: string;
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
}

function loadState(): PersistedState {
  if (typeof window === "undefined") {
    return defaultState();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultState(), ...parsed };
    }
  } catch {
    // ignore
  }
  return defaultState();
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
  };
}

function saveState(state: PersistedState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

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

  // Export
  exportProcessLog: () => ProcessLog;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
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

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadState();
    setConditions(saved.conditions);
    setResearchTheme(saved.researchTheme);
    setGeneratedDesigns(saved.generatedDesigns);
    setFilteredDesigns(saved.filteredDesigns);
    setResearchJobs(saved.researchJobs);
    setGenerateJobs(saved.generateJobs);
    setGenerateImages(saved.generateImages);
    setSelectedConcepts(saved.selectedConcepts);
    setRefinedConcept(saved.refinedConcept);
    setSceneConstraint(saved.sceneConstraint);
    setInitialized(true);
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    if (!initialized) return;
    saveState({
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
    });
  }, [initialized, conditions, researchTheme, generatedDesigns, filteredDesigns, researchJobs, generateJobs, generateImages, selectedConcepts, refinedConcept, sceneConstraint]);

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

  const exportProcessLog = useCallback((): ProcessLog => {
    return {
      projectId: `project-${Date.now()}`,
      createdAt: researchJobs[0]?.timestamp ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      researchJobs,
      generateJobs,
      generatedDesigns,
      filteredDesigns,
    };
  }, [researchJobs, generateJobs, generatedDesigns, filteredDesigns]);

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
        exportProcessLog,
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
