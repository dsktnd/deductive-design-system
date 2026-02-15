export enum ResearchDomain {
  Environment = "environment",
  Market = "market",
  Culture = "culture",
  Economy = "economy",
  Society = "society",
  Technology = "technology",
}

export interface ResearchCondition {
  domain: ResearchDomain;
  notes: string;
  weight: number;
  tags: string[];
}

export interface EvaluationScore {
  performance: number;
  economy: number;
  context: number;
  experience: number;
  social: number;
  aesthetics: number;
}

export interface GeneratedImage {
  id: string;
  image: string;
  text: string | null;
  prompt: string;
  abstractionLevel: number;
  style: string;
  timestamp: string;
}

export interface GeneratedDesign {
  id: string;
  imageUrl: string;
  prompt: string;
  conditions: ResearchCondition[];
  scores: EvaluationScore;
  createdAt: Date;
  spectrumRatio?: number;  // 0-100
}

// --- Concept types ---

export interface ArchitecturalConcept {
  id: string;
  title: string;           // e.g. "環境共生型"
  description: string;     // 1-2 sentence description
  relatedDomains: string[];
}

// --- Job types ---

export interface ResearchJob {
  id: string;
  theme: string;
  conditions: ResearchCondition[];
  concepts?: ArchitecturalConcept[];
  timestamp: string;
}

export interface GenerateJob {
  id: string;
  researchJobId: string;
  basePrompt: string;
  style: string;
  abstractionLevel: number;
  conditions: ResearchCondition[];
  images: GeneratedImage[];
  timestamp: string;
}

export interface ProcessLog {
  projectId: string;
  createdAt: string;
  updatedAt: string;
  researchJobs: ResearchJob[];
  generateJobs: GenerateJob[];
  generatedDesigns: GeneratedDesign[];
  filteredDesigns: GeneratedDesign[];
}
