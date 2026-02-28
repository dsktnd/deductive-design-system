import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let body: {
    concept: { id: string; title: string; description: string; relatedDomains: string[] };
    conditions: { domain: string; weight: number; notes: string; tags?: string[] }[];
    theme: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { concept, conditions, theme } = body;

  if (!concept?.title || !concept?.description) {
    return NextResponse.json(
      { error: "concept with title and description is required" },
      { status: 400 }
    );
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const conditionSummary = (conditions ?? [])
    .filter((c) => c.weight > 0.2)
    .sort((a, b) => b.weight - a.weight)
    .map((c) => `- ${c.domain} (weight: ${c.weight}): ${c.notes}`)
    .join("\n");

  const prompt = `You are an architectural design analyst. Given an architectural concept and its research context, translate it into a structured 12-axis architectural configuration.

## Project Theme
${theme || "Architectural design project"}

## Architectural Concept
Title: "${concept.title}"
Description: ${concept.description}
Related domains: ${concept.relatedDomains.join(", ")}

## Research Conditions
${conditionSummary || "No specific conditions."}

## Task
Translate this concept into a structured ArchitectureConfig with 12 axes. Each axis describes a specific architectural quality. Fill in values that can be confidently inferred from the concept. Use null for axes that cannot be determined.

The 12 axes are:

1. **boundary** - How inside and outside are separated
   - strategy: 'solid' | 'void' | 'layered' | 'ambiguous' | null
   - opacity: 0.0 (transparent) to 1.0 (opaque) | null
   - continuity: 'continuous' | 'fragmented' | 'dissolved' | 'punctured' | null
   - inside_outside: 'clear' | 'blurred' | 'inverted' | 'undefined' | null
   - tags: string[]

2. **social_gradient** - Public to private transition
   - type: 'abrupt' | 'gradual' | 'inverted' | 'flat' | null
   - public_depth: 'shallow' | 'medium' | 'deep' | null
   - transition_character: 'hard' | 'soft' | 'layered' | null
   - tags: string[]

3. **spatial** - How space is organized
   - topology: 'centralized' | 'linear' | 'branching' | 'looping' | 'networked' | 'field' | null
   - hierarchy: { type: 'single-dominant' | 'distributed' | 'flat' | 'ambiguous' | null, transitions: 'abrupt' | 'gradual' | null }
   - threshold_quality: 'ceremonial' | 'functional' | 'spatial' | 'absent' | null
   - void_solid_ratio: 0.0 (all solid) to 1.0 (all void) | null
   - tags: string[]

4. **section** - Vertical spatial composition
   - vertical_organization: 'stacked' | 'continuous' | 'void-dominant' | 'hybrid' | null
   - dominant_profile: 'horizontal' | 'vertical' | 'diagonal' | 'complex' | null
   - floor_differentiation: 'uniform' | 'varied' | 'hierarchical' | null
   - tags: string[]

5. **facade_interior_relationship** - Exterior vs interior relationship
   - type: 'congruent' | 'contrasting' | 'gradual' | null
   - surprise_factor: 'low' | 'medium' | 'high' | null
   - tags: string[]

6. **tectonic** - Structural logic
   - system: 'frame' | 'wall-bearing' | 'shell' | 'tensile' | 'hybrid' | null
   - expression: 'revealed' | 'concealed' | 'ambiguous' | null
   - joint_logic: 'monolithic' | 'assembled' | 'woven' | 'stacked' | 'tensioned' | null
   - material_honesty: boolean | null
   - tags: string[]

7. **material** - Material identity
   - primary: string[] (e.g. ['concrete', 'glass', 'timber'])
   - combination_logic: 'contrast' | 'harmony' | 'hierarchy' | 'neutral' | 'singular' | null
   - texture: 'smooth' | 'rough' | 'varied' | 'stratified' | null
   - weight_impression: 'light' | 'heavy' | 'ambiguous' | null
   - tags: string[]

8. **color** - Color identity
   - presence: 'achromatic' | 'monochromatic' | 'polychromatic' | null
   - strategy: 'integral' | 'applied' | 'structural' | 'absent' | null
   - temperature: 'warm' | 'cool' | 'neutral' | 'varied' | null
   - contrast: 'low' | 'medium' | 'high' | null
   - tags: string[]

9. **ground** - Relationship to the earth
   - relation: 'grounded' | 'floating' | 'buried' | 'elevated' | 'bridging' | null
   - footprint_logic: 'compact' | 'dispersed' | 'linear' | 'courtyard' | 'point' | null
   - topographic_response: 'following' | 'ignoring' | 'carving' | 'elevating' | null
   - tags: string[]

10. **scale** - Human body relationship
    - human_relation: 'intimate' | 'fitting' | 'extending' | 'overwhelming' | null
    - absolute_size: 'intimate' | 'small' | 'medium' | 'large' | 'monumental' | null
    - internal_variation: 'none' | 'moderate' | 'dramatic' | null
    - external_internal_contrast: 'none' | 'moderate' | 'dramatic' | null
    - compression_release: 'present' | 'absent' | null
    - tags: string[]

11. **light** - Light strategy
    - source_strategy: 'top' | 'side' | 'corner' | 'diffuse' | 'artificial' | null
    - quality: 'uniform' | 'dramatic' | 'filtered' | 'dark' | 'variable' | null
    - temporal_change: 'considered' | 'incidental' | 'none' | null
    - directionality: 'directional' | 'omnidirectional' | 'gradient' | null
    - tags: string[]

12. **movement** - How people move through space
    - path_topology: { type: 'linear' | 'branching' | 'looping' | 'radial' | 'field' | null }
    - revelation_mode: { approach: { type: 'immediate' | 'gradual' | 'hidden' | 'fragmented' | null }, interior: { type: 'staged' | 'continuous' | 'simultaneous' | null, stages_count: number | null }, climax: { present: boolean | null, character: 'abrupt' | 'swelling' | 'none' | null, location: 'approach' | 'interior-entry' | 'center' | 'terminus' | null } }
    - entry_character: { type: 'compressed' | 'direct' | 'oblique' | 'ceremonial' | 'gradual' | null }
    - destination: { type: 'singular' | 'multiple' | 'open-ended' | 'return' | null }
    - vertical_vector: { type: 'ascending' | 'descending' | 'flat' | 'complex' | null, magnitude: 'minimal' | 'moderate' | 'large' | null, intention: 'symbolic' | 'functional' | 'experiential' | 'incidental' | null, body_awareness: 'low' | 'medium' | 'high' | null }
    - guidance_level: { type: 'prescribed' | 'guided' | 'suggested' | 'free' | null }
    - tags: string[]

Also include a meta object:
- concept_id: "${concept.id}"
- generated_at: current ISO8601 timestamp
- confidence: 0.0-1.0 representing how much of the config could be confidently filled (ratio of non-null fields)

Respond in JSON format with a single "config" key containing the full ArchitectureConfig object.
Respond ONLY with valid JSON, no markdown fences.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({ config: parsed.config });
  } catch (error) {
    console.error("Architecture config generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
