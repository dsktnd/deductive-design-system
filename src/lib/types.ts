export enum ResearchDomain {
  Environment = "environment",
  Regulation = "regulation",
  Culture = "culture",
  Economy = "economy",
  Society = "society",
  Technology = "technology",
  Precedent = "precedent",
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

export interface GeneratedDesign {
  id: string;
  imageUrl: string;
  prompt: string;
  conditions: ResearchCondition[];
  scores: EvaluationScore;
  createdAt: Date;
}
