# ArchitectureConfig 統合仕様書

## 概要

リサーチ結果から生成された **Concept A / B** を建築的な構造化データとして記述するための
`ArchitectureConfig` を detectivedesignSystem に統合する。

### 目的

1. **生成のコントロール**: Config の各軸をプロンプトに変換し、Gemini への生成指示を構造化する
2. **比較の基準**: Config A と Config B の差分が、スペクトラム上で「何が変化するか」を明示する
3. **再現性**: 同じ Config から同じ方向性の画像を繰り返し生成できる

---

## フローへの組み込み

```
【現在】
Research → ResearchCondition[] → Concept A / B → Generate

【変更後】
Research → ResearchCondition[] → Concept A / B
                                       ↓
                          ArchitectureConfig A / B   ← 追加
                                       ↓
                          Generate（config が prompt を構造化）
                                       ↓
                          Compare（config 間の差分でスペクトラムを制御）
```

---

## TypeScript 型定義

`src/lib/types.ts` に以下を追加する。

```typescript
// ArchitectureConfig: 建築を12軸で記述する構造化データ
export interface ArchitectureConfig {
  meta: {
    concept_id: string              // 紐付く ArchitecturalConcept の id
    generated_at: string            // ISO8601
    confidence: number              // 0.0-1.0: 記述の充足度
  }

  // 1. 境界: 内と外をどう分けるか
  boundary: {
    strategy: 'solid' | 'void' | 'layered' | 'ambiguous' | null
    opacity: number | null          // 0.0(透明) - 1.0(不透明)
    continuity: 'continuous' | 'fragmented' | 'dissolved' | 'punctured' | null
    inside_outside: 'clear' | 'blurred' | 'inverted' | 'undefined' | null
    tags: string[]
  }

  // 2. 公私の勾配: 公共から私的へどう移行するか
  social_gradient: {
    type: 'abrupt' | 'gradual' | 'inverted' | 'flat' | null
    public_depth: 'shallow' | 'medium' | 'deep' | null
    transition_character: 'hard' | 'soft' | 'layered' | null
    tags: string[]
  }

  // 3. 空間構造: 空間はどう組織されるか
  spatial: {
    topology: 'centralized' | 'linear' | 'branching' | 'looping' | 'networked' | 'field' | null
    hierarchy: {
      type: 'single-dominant' | 'distributed' | 'flat' | 'ambiguous' | null
      transitions: 'abrupt' | 'gradual' | null
    }
    threshold_quality: 'ceremonial' | 'functional' | 'spatial' | 'absent' | null
    void_solid_ratio: number | null // 0.0(全solid) - 1.0(全void)
    tags: string[]
  }

  // 4. 断面の性格: 垂直方向の空間構成
  section: {
    vertical_organization: 'stacked' | 'continuous' | 'void-dominant' | 'hybrid' | null
    dominant_profile: 'horizontal' | 'vertical' | 'diagonal' | 'complex' | null
    floor_differentiation: 'uniform' | 'varied' | 'hierarchical' | null
    tags: string[]
  }

  // 5. 外観と内部の関係
  facade_interior_relationship: {
    type: 'congruent' | 'contrasting' | 'gradual' | null
    surprise_factor: 'low' | 'medium' | 'high' | null
    tags: string[]
  }

  // 6. 構造論理: 何が・どのように支えるか
  tectonic: {
    system: 'frame' | 'wall-bearing' | 'shell' | 'tensile' | 'hybrid' | null
    expression: 'revealed' | 'concealed' | 'ambiguous' | null
    joint_logic: 'monolithic' | 'assembled' | 'woven' | 'stacked' | 'tensioned' | null
    material_honesty: boolean | null
    tags: string[]
  }

  // 7. 素材性
  material: {
    primary: string[]               // 例: ['concrete', 'glass', 'timber']
    combination_logic: 'contrast' | 'harmony' | 'hierarchy' | 'neutral' | 'singular' | null
    texture: 'smooth' | 'rough' | 'varied' | 'stratified' | null
    weight_impression: 'light' | 'heavy' | 'ambiguous' | null
    tags: string[]
  }

  // 8. 色彩
  color: {
    presence: 'achromatic' | 'monochromatic' | 'polychromatic' | null
    strategy: 'integral' | 'applied' | 'structural' | 'absent' | null
    temperature: 'warm' | 'cool' | 'neutral' | 'varied' | null
    contrast: 'low' | 'medium' | 'high' | null
    tags: string[]
  }

  // 9. 大地との関係
  ground: {
    relation: 'grounded' | 'floating' | 'buried' | 'elevated' | 'bridging' | null
    footprint_logic: 'compact' | 'dispersed' | 'linear' | 'courtyard' | 'point' | null
    topographic_response: 'following' | 'ignoring' | 'carving' | 'elevating' | null
    tags: string[]
  }

  // 10. スケール: 人体とどう関係するか
  scale: {
    human_relation: 'intimate' | 'fitting' | 'extending' | 'overwhelming' | null
    absolute_size: 'intimate' | 'small' | 'medium' | 'large' | 'monumental' | null
    internal_variation: 'none' | 'moderate' | 'dramatic' | null
    external_internal_contrast: 'none' | 'moderate' | 'dramatic' | null
    compression_release: 'present' | 'absent' | null
    tags: string[]
  }

  // 11. 光: どこから・どう入るか
  light: {
    source_strategy: 'top' | 'side' | 'corner' | 'diffuse' | 'artificial' | null
    quality: 'uniform' | 'dramatic' | 'filtered' | 'dark' | 'variable' | null
    temporal_change: 'considered' | 'incidental' | 'none' | null
    directionality: 'directional' | 'omnidirectional' | 'gradient' | null
    tags: string[]
  }

  // 12. 動線論理: 人はどう動くか
  movement: {
    path_topology: {
      type: 'linear' | 'branching' | 'looping' | 'radial' | 'field' | null
    }
    revelation_mode: {
      approach: {
        type: 'immediate' | 'gradual' | 'hidden' | 'fragmented' | null
      }
      interior: {
        type: 'staged' | 'continuous' | 'simultaneous' | null
        stages_count: number | null
      }
      climax: {
        present: boolean | null
        character: 'abrupt' | 'swelling' | 'none' | null
        location: 'approach' | 'interior-entry' | 'center' | 'terminus' | null
      }
    }
    entry_character: {
      type: 'compressed' | 'direct' | 'oblique' | 'ceremonial' | 'gradual' | null
    }
    destination: {
      type: 'singular' | 'multiple' | 'open-ended' | 'return' | null
    }
    vertical_vector: {
      type: 'ascending' | 'descending' | 'flat' | 'complex' | null
      magnitude: 'minimal' | 'moderate' | 'large' | null
      intention: 'symbolic' | 'functional' | 'experiential' | 'incidental' | null
      body_awareness: 'low' | 'medium' | 'high' | null
    }
    guidance_level: {
      type: 'prescribed' | 'guided' | 'suggested' | 'free' | null
    }
    tags: string[]
  }
}

// ArchitecturalConcept に architectureConfig を追加
// 既存の ArchitecturalConcept 型に以下のフィールドを追加する
// architectureConfig?: ArchitectureConfig
```

---

## 既存型の変更

```typescript
// 既存
export interface ArchitecturalConcept {
  id: string
  title: string
  description: string
  relatedDomains: string[]
}

// 変更後（architectureConfig を追加）
export interface ArchitecturalConcept {
  id: string
  title: string
  description: string
  relatedDomains: string[]
  architectureConfig?: ArchitectureConfig   // ← 追加
}
```

---

## 新規 API エンドポイント

### `POST /api/architecture/from-concept`

Concept の title / description / relatedDomains から
Gemini を使って ArchitectureConfig を自動生成する。

**Request**
```typescript
{
  concept: ArchitecturalConcept
  conditions: ResearchCondition[]   // リサーチ条件（文脈として渡す）
  theme: string
}
```

**Response**
```typescript
{
  config: ArchitectureConfig
}
```

**Gemini へのプロンプト方針**
- 建築的な翻訳として、concept の記述から各軸の値を推定させる
- 判断できない軸は null のままにさせる（無理に埋めない）
- JSON 形式で返させる
- 12軸の各フィールドの意味を system prompt に含める

---

## Config → プロンプト変換

`src/lib/gemini.ts` に `configToPromptElements()` を追加する。

```typescript
// Config の各軸を英語のプロンプト断片に変換するマッピング
const AXIS_PROMPT_MAP: Record<string, Record<string, string>> = {
  'boundary.strategy': {
    'solid':     'massive thick walls, strong physical enclosure, fortress-like boundary',
    'void':      'transparent glass boundary, dissolved interior-exterior limit, open',
    'layered':   'multiple layered boundaries, transitional zones, permeable threshold',
    'ambiguous': 'blurred inside-outside relationship, ambiguous boundary condition',
  },
  'spatial.topology': {
    'centralized': 'centralized plan with dominant central space, radial organization',
    'linear':      'linear spatial sequence along a single axis, directional flow',
    'branching':   'branching layout with multiple spatial directions, diverging paths',
    'looping':     'looping circulation, spaces arranged in circular promenade',
    'networked':   'networked spaces, non-hierarchical equal arrangement',
    'field':       'open field plan, undifferentiated isotropic space',
  },
  'ground.relation': {
    'grounded':  'firmly rooted to ground, heavy base, anchored',
    'floating':  'elevated above ground, floating platform, pilotis',
    'buried':    'partially buried, sunken into earth, below grade',
    'elevated':  'raised high above ground level',
    'bridging':  'bridging over landscape or water, spanning element',
  },
  'light.source_strategy': {
    'top':        'zenithal light from above, top-lit interior, oculus or skylight',
    'side':       'horizontal window light, side-lit space, raking light',
    'corner':     'corner window light, diagonal illumination',
    'diffuse':    'diffuse soft light, no direct sunlight, even illumination',
    'artificial': 'artificial lighting only, controlled interior light',
  },
  'light.quality': {
    'uniform':   'even, uniform lighting throughout',
    'dramatic':  'dramatic chiaroscuro, strong light and shadow contrast',
    'filtered':  'soft filtered light, dappled, gentle',
    'dark':      'predominantly dark interior, cave-like, shadow-dominant',
    'variable':  'variable light mixing natural and artificial sources',
  },
  'movement.path_topology.type': {
    'linear':    'processional linear path, single axis circulation',
    'branching': 'branching circulation with choices and forks',
    'looping':   'looping promenade circulation returning to origin',
    'radial':    'radial circulation from center to periphery',
    'field':     'free open plan circulation, no prescribed path',
  },
  'movement.revelation_mode.approach.type': {
    'immediate':  'building fully visible from distance, immediate frontal presence',
    'gradual':    'building gradually revealed as one approaches',
    'hidden':     'building hidden until close proximity, sudden discovery',
    'fragmented': 'building fragmentarily revealed from multiple angles',
  },
  'movement.entry_character.type': {
    'compressed': 'compressed low entry threshold before expansion',
    'direct':     'direct frontal entry without transition',
    'oblique':    'oblique approach, entry from the side or back',
    'ceremonial': 'ceremonial entry with steps and formal approach',
    'gradual':    'gradual entry through layered thresholds',
  },
  'tectonic.system': {
    'frame':        'skeletal structural frame, column and beam construction',
    'wall-bearing': 'load-bearing walls, mass wall structure',
    'shell':        'shell or dome structure, continuous surface',
    'tensile':      'tensile structure, suspended or tent-like',
    'hybrid':       'hybrid structural system combining multiple types',
  },
  'tectonic.expression': {
    'revealed':  'structure fully exposed and expressed',
    'concealed': 'structure hidden behind finishes',
    'ambiguous': 'structure ambiguously expressed',
  },
  'material.weight_impression': {
    'light':     'lightweight, delicate material impression',
    'heavy':     'heavy, massive, weighty material impression',
    'ambiguous': 'ambiguous weight, materials appear to float despite mass',
  },
  'scale.human_relation': {
    'intimate':     'intimate human-scaled space, cozy, sheltering',
    'fitting':      'space proportioned to human body, comfortable scale',
    'extending':    'space slightly larger than human scale, generous',
    'overwhelming': 'monumental scale overwhelming human presence',
  },
  'scale.internal_variation': {
    'none':     'uniform consistent scale throughout',
    'moderate': 'moderate variation in spatial scale',
    'dramatic': 'dramatic contrast between compressed and expanded spaces',
  },
  'social_gradient.type': {
    'abrupt':   'abrupt transition from public to private',
    'gradual':  'gradual layered transition from public to private',
    'inverted': 'interior is public space, civic interior',
    'flat':     'uniformly public space throughout',
  },
  'color.presence': {
    'achromatic':    'achromatic, no color, monochrome gray palette',
    'monochromatic': 'monochromatic single-hue color scheme',
    'polychromatic': 'polychromatic multiple colors coexisting',
  },
  'color.temperature': {
    'warm':    'warm color palette, earthy tones, amber, ochre',
    'cool':    'cool color palette, gray, blue, stone',
    'neutral': 'neutral color palette, white, gray, natural',
    'varied':  'varied color temperature across different zones',
  },
  'ground.topographic_response': {
    'following':  'building follows and conforms to topography',
    'ignoring':   'building ignores topography, imposed on land',
    'carving':    'building carved into the earth, excavated',
    'elevating':  'building lifts above topography',
  },
}

export function configToPromptElements(config: ArchitectureConfig): string[] {
  const elements: string[] = []

  const check = (path: string, value: string | null | undefined) => {
    if (!value) return
    const map = AXIS_PROMPT_MAP[path]
    if (map && map[value]) elements.push(map[value])
  }

  check('boundary.strategy',                    config.boundary.strategy)
  check('spatial.topology',                     config.spatial.topology)
  check('ground.relation',                      config.ground.relation)
  check('ground.topographic_response',          config.ground.topographic_response)
  check('light.source_strategy',                config.light.source_strategy)
  check('light.quality',                        config.light.quality)
  check('movement.path_topology.type',          config.movement.path_topology.type)
  check('movement.revelation_mode.approach.type', config.movement.revelation_mode.approach.type)
  check('movement.entry_character.type',        config.movement.entry_character.type)
  check('tectonic.system',                      config.tectonic.system)
  check('tectonic.expression',                  config.tectonic.expression)
  check('material.weight_impression',           config.material.weight_impression)
  check('scale.human_relation',                 config.scale.human_relation)
  check('scale.internal_variation',             config.scale.internal_variation)
  check('social_gradient.type',                 config.social_gradient.type)
  check('color.presence',                       config.color.presence)
  check('color.temperature',                    config.color.temperature)

  // primary materials をそのまま追加
  if (config.material.primary.length > 0) {
    elements.push(config.material.primary.join(', ') + ' materials')
  }

  // tags をそのまま追加
  const allTags = [
    ...config.boundary.tags,
    ...config.spatial.tags,
    ...config.movement.tags,
    ...config.light.tags,
  ]
  if (allTags.length > 0) {
    elements.push(...allTags)
  }

  return elements
}

// Generate 時の prompt 組み立て（既存の buildArchitecturePrompt を拡張）
export function buildPromptFromConfig(
  config: ArchitectureConfig,
  basePrompt: string,
  style: string,
  abstractionLevel: number
): string {
  const configElements = configToPromptElements(config)
  const configDescription = configElements.join(', ')
  return `${basePrompt}. Architectural characteristics: ${configDescription}. Style: ${style}. Abstraction level: ${abstractionLevel}.`
}
```

---

## Store の変更

`src/lib/store.ts` の `PersistedState` に以下を追加する：

```typescript
// 既存の selectedConcepts の型を更新
// （ArchitecturalConcept に architectureConfig が追加されるため自動的に対応）

// 追加不要（ArchitecturalConcept の型変更で吸収される）
```

---

## UI の変更

### ResearchSection.tsx

Concept A / B が生成された後に、以下の UI フローを追加する：

```
[Concept A カード]  [Concept B カード]
        ↓
[「建築的に翻訳」ボタン]
        ↓
  Gemini が自動で ArchitectureConfig を生成
        ↓
[Config の表示（主要軸のみサマリー表示）]
  boundary: void  |  spatial: linear  |  light: side
  ground: bridging  |  movement: processional
  ...
        ↓
（任意）ユーザーが軸の値を編集できる
        ↓
[Generate フェーズへ進む]
```

**表示する軸の優先順位**（すべて表示すると重くなるため主要軸に絞る）：
1. boundary.strategy
2. spatial.topology
3. ground.relation
4. light.source_strategy
5. movement.path_topology.type
6. scale.human_relation
7. social_gradient.type
8. tectonic.expression

### GenerateSection.tsx

スペクトラムスライダー（A ↔ B）と Config の関係を表示する：

```
[Concept A]  ────────●────────  [Concept B]
              50%

変化している軸:
  boundary: void ────────── solid
  spatial:  linear ──────── centralized
  light:    side ─────────── top
```

---

## スペクトラム補間（将来対応）

Config A と Config B の差分から、スペクトラム上の位置に応じた
プロンプトを生成するロジック。

```typescript
// スペクトラム位置 ratio: 0.0(A) - 1.0(B)
function interpolateConfigs(
  configA: ArchitectureConfig,
  configB: ArchitectureConfig,
  ratio: number
): Partial<ArchitectureConfig> {
  // numerical fields: linear interpolation
  // categorical fields: ratio < 0.5 → A の値、ratio >= 0.5 → B の値
  // tags: 両方を含める
}
```

---

## 参照ファイル

スキーマの詳細定義は archielement プロジェクトを参照：

```
/Users/btb/Desktop/dev/claude-pro/archielement/
  architecture-config.yaml    # 12軸の完全なスキーマ定義（コメント付き）
  similarity-config.yaml      # 距離行列・類似性計算の設定
```

---

## 実装優先順位

```
Phase 1（最小実装）
  1. types.ts に ArchitectureConfig を追加
  2. ArchitecturalConcept に architectureConfig?: を追加
  3. /api/architecture/from-concept エンドポイントを実装
  4. ResearchSection に「建築的に翻訳」ボタンと結果表示を追加

Phase 2（生成への統合）
  5. gemini.ts に configToPromptElements() を追加
  6. GenerateSection でConfig を使った prompt 生成に対応

Phase 3（比較・スペクトラム制御）
  7. GenerateSection でスペクトラムと Config の差分を可視化
  8. interpolateConfigs() を実装
```
