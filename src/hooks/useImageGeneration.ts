"use client";

import { useState, useCallback } from "react";

interface Condition {
  domain: string;
  weight: number;
  notes: string;
}

interface GeneratedImage {
  image: string;
  text: string | null;
}

interface UseImageGenerationReturn {
  generate: (prompt: string, conditions?: Condition[], style?: string, abstractionLevel?: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  images: GeneratedImage[];
  clearImages: () => void;
}

export function useImageGeneration(): UseImageGenerationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<GeneratedImage[]>([]);

  const generate = useCallback(
    async (prompt: string, conditions?: Condition[], style?: string, abstractionLevel?: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, conditions, style, abstractionLevel }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `Request failed (${response.status})`);
        }

        setImages((prev) => [...prev, { image: data.image, text: data.text }]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to generate image";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearImages = useCallback(() => {
    setImages([]);
    setError(null);
  }, []);

  return { generate, isLoading, error, images, clearImages };
}
