"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import React from "react";
import type { ResearchCondition, GeneratedDesign } from "./types";

interface AppState {
  conditions: ResearchCondition[];
  generatedDesigns: GeneratedDesign[];
  filteredDesigns: GeneratedDesign[];
  addCondition: (condition: ResearchCondition) => void;
  removeCondition: (index: number) => void;
  updateConditions: (conditions: ResearchCondition[]) => void;
  setGeneratedDesigns: (designs: GeneratedDesign[]) => void;
  setFilteredDesigns: (designs: GeneratedDesign[]) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [conditions, setConditions] = useState<ResearchCondition[]>([]);
  const [generatedDesigns, setGeneratedDesigns] = useState<GeneratedDesign[]>(
    []
  );
  const [filteredDesigns, setFilteredDesigns] = useState<GeneratedDesign[]>([]);

  const addCondition = useCallback((condition: ResearchCondition) => {
    setConditions((prev) => [...prev, condition]);
  }, []);

  const removeCondition = useCallback((index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateConditions = useCallback((newConditions: ResearchCondition[]) => {
    setConditions(newConditions);
  }, []);

  return React.createElement(
    AppContext.Provider,
    {
      value: {
        conditions,
        generatedDesigns,
        filteredDesigns,
        addCondition,
        removeCondition,
        updateConditions,
        setGeneratedDesigns,
        setFilteredDesigns,
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
