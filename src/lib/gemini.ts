import { GoogleGenerativeAI } from "@google/generative-ai";

export interface Condition {
  domain: string;
  weight: number;
  notes: string;
  tags?: string[];
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const imageModel = genAI.getGenerativeModel({
  model: "gemini-3-pro-image-preview",
  generationConfig: {
    responseModalities: ["TEXT", "IMAGE"],
  } as Parameters<typeof genAI.getGenerativeModel>[0]["generationConfig"],
});

export const ABSTRACTION_LEVELS = [
  {
    level: 1,
    label: "Material Board",
    ja: "マテリアルボード",
    description: "A mood board / material palette composition. Show material samples, textures, color swatches, and tactile references arranged in a collage layout. Include wood, stone, metal, fabric, and other material close-ups that convey the design direction. No architectural form — focus purely on material identity and atmosphere.",
  },
  {
    level: 2,
    label: "Concept Image",
    ja: "コンセプトイメージ",
    description: "An abstract, evocative concept image that captures the essence and atmosphere of the design direction. Use color, light, texture, and composition to express the mood and feeling. May include abstract forms, natural references, or artistic imagery. Not a building — but the emotional and sensory identity of the architecture.",
  },
  {
    level: 3,
    label: "Space",
    ja: "空間",
    description: "An interior or exterior spatial visualization showing the quality of space — light, scale, openness, enclosure, materiality, and human experience. Focus on how the space feels to inhabit. Show spatial depth, atmosphere, and the relationship between structure, light, and material. Perspective view at human eye level.",
  },
  {
    level: 4,
    label: "Architecture",
    ja: "建築",
    description: "A complete architectural visualization showing the building in its context. Include building form, facade detail, structural expression, material choices, landscape, and surrounding environment. Show the architecture as a whole — exterior view with enough detail to understand massing, proportion, fenestration, and design intent.",
  },
] as const;

export function buildArchitecturePrompt(
  prompt: string,
  conditions: Condition[],
  style?: string,
  abstractionLevel?: number
): string {
  const sorted = [...conditions].sort((a, b) => b.weight - a.weight);

  const conditionLines = sorted.map((c) => {
    const emphasis = c.weight >= 0.8 ? "CRITICAL" : c.weight >= 0.5 ? "Important" : "Consider";
    const tagsStr = c.tags && c.tags.length > 0 ? ` [Keywords: ${c.tags.join(", ")}]` : "";
    return `- [${emphasis}, weight: ${c.weight}] ${c.domain}: ${c.notes}${tagsStr}`;
  });

  const level = ABSTRACTION_LEVELS.find((l) => l.level === abstractionLevel) ?? ABSTRACTION_LEVELS[2];

  const parts = [
    `Generate an architectural image at the "${level.label}" abstraction level.`,
    "",
    `Abstraction instruction: ${level.description}`,
    "",
    `Design brief: ${prompt}`,
  ];

  if (style) {
    parts.push("", `Architectural style: ${style}`);
  }

  if (conditionLines.length > 0) {
    parts.push("", "Design conditions (ordered by priority):", ...conditionLines);
  }

  parts.push(
    "",
    `Requirements: The output MUST match the "${level.label}" abstraction level described above. ` +
      "Do not add more detail than specified for this level. " +
      "If a [SCENE CONSTRAINT] is provided, strictly maintain the same viewpoint, composition, lighting, atmosphere, and material palette. " +
      "Only the conceptual/design direction marked as [VARIABLE] should change between images."
  );

  return parts.join("\n");
}

// --- Architecture Config → Prompt Elements ---

import type { ArchitectureConfig } from "./types";

const AXIS_PROMPT_MAP: Record<string, Record<string, string>> = {
  "boundary.strategy": {
    solid: "massive thick walls, strong physical enclosure, fortress-like boundary",
    void: "transparent glass boundary, dissolved interior-exterior limit, open",
    layered: "multiple layered boundaries, transitional zones, permeable threshold",
    ambiguous: "blurred inside-outside relationship, ambiguous boundary condition",
  },
  "boundary.continuity": {
    continuous: "continuous unbroken building envelope",
    fragmented: "fragmented building envelope with gaps and openings",
    dissolved: "dissolved boundary, building merges with surroundings",
    punctured: "punctured wall surfaces with strategic openings",
  },
  "spatial.topology": {
    centralized: "centralized plan with dominant central space, radial organization",
    linear: "linear spatial sequence along a single axis, directional flow",
    branching: "branching layout with multiple spatial directions, diverging paths",
    looping: "looping circulation, spaces arranged in circular promenade",
    networked: "networked spaces, non-hierarchical equal arrangement",
    field: "open field plan, undifferentiated isotropic space",
  },
  "ground.relation": {
    grounded: "firmly rooted to ground, heavy base, anchored",
    floating: "elevated above ground, floating platform, pilotis",
    buried: "partially buried, sunken into earth, below grade",
    elevated: "raised high above ground level",
    bridging: "bridging over landscape or water, spanning element",
  },
  "ground.topographic_response": {
    following: "building follows and conforms to topography",
    ignoring: "building ignores topography, imposed on land",
    carving: "building carved into the earth, excavated",
    elevating: "building lifts above topography",
  },
  "light.source_strategy": {
    top: "zenithal light from above, top-lit interior, oculus or skylight",
    side: "horizontal window light, side-lit space, raking light",
    corner: "corner window light, diagonal illumination",
    diffuse: "diffuse soft light, no direct sunlight, even illumination",
    artificial: "artificial lighting only, controlled interior light",
  },
  "light.quality": {
    uniform: "even, uniform lighting throughout",
    dramatic: "dramatic chiaroscuro, strong light and shadow contrast",
    filtered: "soft filtered light, dappled, gentle",
    dark: "predominantly dark interior, cave-like, shadow-dominant",
    variable: "variable light mixing natural and artificial sources",
  },
  "movement.path_topology.type": {
    linear: "processional linear path, single axis circulation",
    branching: "branching circulation with choices and forks",
    looping: "looping promenade circulation returning to origin",
    radial: "radial circulation from center to periphery",
    field: "free open plan circulation, no prescribed path",
  },
  "movement.revelation_mode.approach.type": {
    immediate: "building fully visible from distance, immediate frontal presence",
    gradual: "building gradually revealed as one approaches",
    hidden: "building hidden until close proximity, sudden discovery",
    fragmented: "building fragmentarily revealed from multiple angles",
  },
  "movement.entry_character.type": {
    compressed: "compressed low entry threshold before expansion",
    direct: "direct frontal entry without transition",
    oblique: "oblique approach, entry from the side or back",
    ceremonial: "ceremonial entry with steps and formal approach",
    gradual: "gradual entry through layered thresholds",
  },
  "tectonic.system": {
    frame: "skeletal structural frame, column and beam construction",
    "wall-bearing": "load-bearing walls, mass wall structure",
    shell: "shell or dome structure, continuous surface",
    tensile: "tensile structure, suspended or tent-like",
    hybrid: "hybrid structural system combining multiple types",
  },
  "tectonic.expression": {
    revealed: "structure fully exposed and expressed",
    concealed: "structure hidden behind finishes",
    ambiguous: "structure ambiguously expressed",
  },
  "material.weight_impression": {
    light: "lightweight, delicate material impression",
    heavy: "heavy, massive, weighty material impression",
    ambiguous: "ambiguous weight, materials appear to float despite mass",
  },
  "material.texture": {
    smooth: "smooth polished material surfaces",
    rough: "rough raw material textures",
    varied: "varied material textures creating tactile richness",
    stratified: "stratified layered material expression",
  },
  "scale.human_relation": {
    intimate: "intimate human-scaled space, cozy, sheltering",
    fitting: "space proportioned to human body, comfortable scale",
    extending: "space slightly larger than human scale, generous",
    overwhelming: "monumental scale overwhelming human presence",
  },
  "scale.internal_variation": {
    none: "uniform consistent scale throughout",
    moderate: "moderate variation in spatial scale",
    dramatic: "dramatic contrast between compressed and expanded spaces",
  },
  "social_gradient.type": {
    abrupt: "abrupt transition from public to private",
    gradual: "gradual layered transition from public to private",
    inverted: "interior is public space, civic interior",
    flat: "uniformly public space throughout",
  },
  "color.presence": {
    achromatic: "achromatic, no color, monochrome gray palette",
    monochromatic: "monochromatic single-hue color scheme",
    polychromatic: "polychromatic multiple colors coexisting",
  },
  "color.temperature": {
    warm: "warm color palette, earthy tones, amber, ochre",
    cool: "cool color palette, gray, blue, stone",
    neutral: "neutral color palette, white, gray, natural",
    varied: "varied color temperature across different zones",
  },
  "section.dominant_profile": {
    horizontal: "horizontal dominant building profile, low and spreading",
    vertical: "vertical dominant building profile, tower-like",
    diagonal: "diagonal dominant profile, dynamic sloping forms",
    complex: "complex multi-directional building profile",
  },
  "facade_interior_relationship.type": {
    congruent: "exterior and interior share consistent architectural language",
    contrasting: "surprising contrast between exterior and interior experience",
    gradual: "gradual transition from exterior to interior character",
  },
};

export function configToPromptElements(config: ArchitectureConfig): string[] {
  const elements: string[] = [];

  const check = (path: string, value: string | null | undefined) => {
    if (!value) return;
    const map = AXIS_PROMPT_MAP[path];
    if (map && map[value]) elements.push(map[value]);
  };

  check("boundary.strategy", config.boundary?.strategy);
  check("boundary.continuity", config.boundary?.continuity);
  check("spatial.topology", config.spatial?.topology);
  check("ground.relation", config.ground?.relation);
  check("ground.topographic_response", config.ground?.topographic_response);
  check("light.source_strategy", config.light?.source_strategy);
  check("light.quality", config.light?.quality);
  check("movement.path_topology.type", config.movement?.path_topology?.type);
  check("movement.revelation_mode.approach.type", config.movement?.revelation_mode?.approach?.type);
  check("movement.entry_character.type", config.movement?.entry_character?.type);
  check("tectonic.system", config.tectonic?.system);
  check("tectonic.expression", config.tectonic?.expression);
  check("material.weight_impression", config.material?.weight_impression);
  check("material.texture", config.material?.texture);
  check("scale.human_relation", config.scale?.human_relation);
  check("scale.internal_variation", config.scale?.internal_variation);
  check("social_gradient.type", config.social_gradient?.type);
  check("color.presence", config.color?.presence);
  check("color.temperature", config.color?.temperature);
  check("section.dominant_profile", config.section?.dominant_profile);
  check("facade_interior_relationship.type", config.facade_interior_relationship?.type);

  if (config.material?.primary?.length > 0) {
    elements.push(config.material.primary.join(", ") + " materials");
  }

  const allTags = [
    ...(config.boundary?.tags ?? []),
    ...(config.spatial?.tags ?? []),
    ...(config.movement?.tags ?? []),
    ...(config.light?.tags ?? []),
    ...(config.tectonic?.tags ?? []),
    ...(config.ground?.tags ?? []),
    ...(config.scale?.tags ?? []),
    ...(config.material?.tags ?? []),
    ...(config.color?.tags ?? []),
  ];
  if (allTags.length > 0) {
    elements.push(...allTags);
  }

  return elements;
}

export interface ReferenceImage {
  base64: string;    // raw base64 (no data: prefix)
  mimeType: string;  // e.g. "image/png"
  label: string;     // e.g. "Concept Diagram" — used in prompt context
}

export async function generateArchitectureImage(
  prompt: string,
  conditions: Condition[] = [],
  style?: string,
  abstractionLevel?: number,
  referenceImages?: ReferenceImage[]
): Promise<{ text: string | null; imageBase64: string | null; mimeType: string | null }> {
  const fullPrompt = buildArchitecturePrompt(prompt, conditions, style, abstractionLevel);

  // Build multimodal content parts
  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

  if (referenceImages && referenceImages.length > 0) {
    // Add reference context
    parts.push({
      text: `The following ${referenceImages.length} reference image(s) represent earlier, more abstract stages of the same design project. Use them to maintain visual consistency in color palette, materials, spatial composition, and design language. The new image should feel like a natural, more detailed evolution of these references.\n\n`,
    });

    for (const ref of referenceImages) {
      parts.push({ text: `[Reference: ${ref.label}]\n` });
      parts.push({ inlineData: { data: ref.base64, mimeType: ref.mimeType } });
    }

    parts.push({ text: `\n---\nNow generate the following:\n\n${fullPrompt}` });
  } else {
    parts.push({ text: fullPrompt });
  }

  const result = await imageModel.generateContent(parts);
  const response = result.response;
  const candidates = response.candidates;

  if (!candidates || candidates.length === 0) {
    throw new Error("No response candidates returned from Gemini");
  }

  let text: string | null = null;
  let imageBase64: string | null = null;
  let mimeType: string | null = null;

  for (const part of candidates[0].content.parts) {
    if (part.text) {
      text = part.text;
    } else if (part.inlineData) {
      imageBase64 = part.inlineData.data;
      mimeType = part.inlineData.mimeType;
    }
  }

  return { text, imageBase64, mimeType };
}
