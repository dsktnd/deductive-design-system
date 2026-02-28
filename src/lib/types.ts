export interface ProjectMeta {
  id: string;
  name: string;
  theme: string;
  createdAt: string;
  updatedAt: string;
}

export enum ResearchDomain {
  Environment = "environment",
  Market = "market",
  Culture = "culture",
  Economy = "economy",
  Society = "society",
  Technology = "technology",
}

export type FindingType = 'fact' | 'implication' | 'risk' | 'opportunity';

export interface ResearchFinding {
  type: FindingType;
  text: string;
  starred?: boolean;
  excluded?: boolean;
}

export interface ResearchCondition {
  domain: ResearchDomain;
  notes: string;
  weight: number;
  tags: string[];
  findings?: ResearchFinding[];
  weightRationale?: string;
  relatedDomains?: ResearchDomain[];
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

// --- Architecture Config (12-axis structured description) ---

export interface ArchitectureConfig {
  meta: {
    concept_id: string;
    generated_at: string;
    confidence: number; // 0.0-1.0
  };
  boundary: {
    strategy: 'solid' | 'void' | 'layered' | 'ambiguous' | null;
    opacity: number | null;
    continuity: 'continuous' | 'fragmented' | 'dissolved' | 'punctured' | null;
    inside_outside: 'clear' | 'blurred' | 'inverted' | 'undefined' | null;
    tags: string[];
  };
  social_gradient: {
    type: 'abrupt' | 'gradual' | 'inverted' | 'flat' | null;
    public_depth: 'shallow' | 'medium' | 'deep' | null;
    transition_character: 'hard' | 'soft' | 'layered' | null;
    tags: string[];
  };
  spatial: {
    topology: 'centralized' | 'linear' | 'branching' | 'looping' | 'networked' | 'field' | null;
    hierarchy: {
      type: 'single-dominant' | 'distributed' | 'flat' | 'ambiguous' | null;
      transitions: 'abrupt' | 'gradual' | null;
    };
    threshold_quality: 'ceremonial' | 'functional' | 'spatial' | 'absent' | null;
    void_solid_ratio: number | null;
    tags: string[];
  };
  section: {
    vertical_organization: 'stacked' | 'continuous' | 'void-dominant' | 'hybrid' | null;
    dominant_profile: 'horizontal' | 'vertical' | 'diagonal' | 'complex' | null;
    floor_differentiation: 'uniform' | 'varied' | 'hierarchical' | null;
    tags: string[];
  };
  facade_interior_relationship: {
    type: 'congruent' | 'contrasting' | 'gradual' | null;
    surprise_factor: 'low' | 'medium' | 'high' | null;
    tags: string[];
  };
  tectonic: {
    system: 'frame' | 'wall-bearing' | 'shell' | 'tensile' | 'hybrid' | null;
    expression: 'revealed' | 'concealed' | 'ambiguous' | null;
    joint_logic: 'monolithic' | 'assembled' | 'woven' | 'stacked' | 'tensioned' | null;
    material_honesty: boolean | null;
    tags: string[];
  };
  material: {
    primary: string[];
    combination_logic: 'contrast' | 'harmony' | 'hierarchy' | 'neutral' | 'singular' | null;
    texture: 'smooth' | 'rough' | 'varied' | 'stratified' | null;
    weight_impression: 'light' | 'heavy' | 'ambiguous' | null;
    tags: string[];
  };
  color: {
    presence: 'achromatic' | 'monochromatic' | 'polychromatic' | null;
    strategy: 'integral' | 'applied' | 'structural' | 'absent' | null;
    temperature: 'warm' | 'cool' | 'neutral' | 'varied' | null;
    contrast: 'low' | 'medium' | 'high' | null;
    tags: string[];
  };
  ground: {
    relation: 'grounded' | 'floating' | 'buried' | 'elevated' | 'bridging' | null;
    footprint_logic: 'compact' | 'dispersed' | 'linear' | 'courtyard' | 'point' | null;
    topographic_response: 'following' | 'ignoring' | 'carving' | 'elevating' | null;
    tags: string[];
  };
  scale: {
    human_relation: 'intimate' | 'fitting' | 'extending' | 'overwhelming' | null;
    absolute_size: 'intimate' | 'small' | 'medium' | 'large' | 'monumental' | null;
    internal_variation: 'none' | 'moderate' | 'dramatic' | null;
    external_internal_contrast: 'none' | 'moderate' | 'dramatic' | null;
    compression_release: 'present' | 'absent' | null;
    tags: string[];
  };
  light: {
    source_strategy: 'top' | 'side' | 'corner' | 'diffuse' | 'artificial' | null;
    quality: 'uniform' | 'dramatic' | 'filtered' | 'dark' | 'variable' | null;
    temporal_change: 'considered' | 'incidental' | 'none' | null;
    directionality: 'directional' | 'omnidirectional' | 'gradient' | null;
    tags: string[];
  };
  movement: {
    path_topology: {
      type: 'linear' | 'branching' | 'looping' | 'radial' | 'field' | null;
    };
    revelation_mode: {
      approach: {
        type: 'immediate' | 'gradual' | 'hidden' | 'fragmented' | null;
      };
      interior: {
        type: 'staged' | 'continuous' | 'simultaneous' | null;
        stages_count: number | null;
      };
      climax: {
        present: boolean | null;
        character: 'abrupt' | 'swelling' | 'none' | null;
        location: 'approach' | 'interior-entry' | 'center' | 'terminus' | null;
      };
    };
    entry_character: {
      type: 'compressed' | 'direct' | 'oblique' | 'ceremonial' | 'gradual' | null;
    };
    destination: {
      type: 'singular' | 'multiple' | 'open-ended' | 'return' | null;
    };
    vertical_vector: {
      type: 'ascending' | 'descending' | 'flat' | 'complex' | null;
      magnitude: 'minimal' | 'moderate' | 'large' | null;
      intention: 'symbolic' | 'functional' | 'experiential' | 'incidental' | null;
      body_awareness: 'low' | 'medium' | 'high' | null;
    };
    guidance_level: {
      type: 'prescribed' | 'guided' | 'suggested' | 'free' | null;
    };
    tags: string[];
  };
}

// --- Concept types ---

export interface ArchitecturalConcept {
  id: string;
  title: string;           // e.g. "環境共生型"
  description: string;     // 1-2 sentence description
  relatedDomains: string[];
  architectureConfig?: ArchitectureConfig;
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

export interface DomainEvaluation {
  domain: ResearchDomain;
  domainJa: string;
  score: number;
  comment: string;
  strengths: string[];
  improvements: string[];
}

export interface EvaluationResult {
  id: string;
  evaluations: DomainEvaluation[];
  overallScore: number;
  overallComment: string;
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
