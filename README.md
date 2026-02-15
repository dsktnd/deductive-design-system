# Deductive Design System

**断定の連鎖から、連続的な探索へ。AI時代の建築設計フレームワーク**

従来の設計プロセスにおける「断定（A案かB案か）」を、リサーチに基づく連続的な設計空間の探索に置き換えるWebアプリケーション。

> 詳しい設計思想は [concept.md](./concept.md) を参照。

---

## Tech Stack

| 項目 | 技術 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| AI (Text) | Gemini 2.5 Flash |
| AI (Image) | Gemini 3 Pro Image |
| State | React Context + localStorage |

---

## セットアップ

```bash
# 依存関係インストール
npm install

# 環境変数を設定
cp .env.example .env.local
# .env.local に GEMINI_API_KEY を設定

# 開発サーバー起動
npm run dev
```

http://localhost:3000 でアクセス。

---

## アプリケーション構成

単一ページ（SPA的構成）に4つのセクションが縦に並び、上部ナビゲーションでスクロール移動する。

```
┌─────────────────────────────────────┐
│  ProcessNav  [R] [G] [F] [D]        │  ← 固定ヘッダー
├─────────────────────────────────────┤
│  1. Research  / リサーチ             │
│  2. Generate  / 生成                 │
│  3. Filter    / フィルタ             │
│  4. Distill   / 蒸留                 │
└─────────────────────────────────────┘
```

---

## 4つのフェーズ

### 1. Research / リサーチ

リサーチテーマを入力し、6つの領域について調査条件を設定する。

**6つのリサーチ領域:**
| 領域 | Domain |
|------|--------|
| 環境 | Environment |
| 市場 | Market |
| 文化 | Culture |
| 経済 | Economy |
| 社会 | Society |
| 技術 | Technology |

**機能:**
- テーマ入力 → AIが6領域のノート・タグ・重みを自動生成（`/api/research`）
- 各領域のノート・重み（0〜1）・タグを手動編集可能
- 「Propose Concepts」→ AIが対照的な2つの建築コンセプト（A・B）を提案（`/api/concepts`）
- コンセプトA・Bの編集・確定
- リサーチジョブの履歴保存・読み込み

### 2. Generate / 生成

2つのコンセプト間の連続的なスペクトラムとして画像を生成する。

**機能:**
- シーン制約（Scene Constraint）の設定 — 空間パラメータを共有
- 抽象度の選択（4段階: Material Board / Concept Image / Space / Architecture）
- スタイル選択（Diagram / Sketch / Photorealistic）
- スペクトラム生成 — コンセプトA〜Bの間を段階的に画像生成（`/api/generate`）
- 生成された各画像にA:B比率を表示
- 「Add to Filter」で画像をFilter工程に追加
- 生成ジョブの履歴管理

### 3. Filter / フィルタ

選択した画像群の方向性を分析し、精緻化コンセプトから5段階のディテール画像を連鎖生成する。

**機能:**
- **選択画像一覧** — Generateで追加した画像のグリッド表示（スペクトラム位置付き）
- **コンセプト精緻化** — 選択画像のスペクトラム位置を分析し、A・Bを統合した精緻化コンセプトを生成（`/api/concepts/refine`）
  - 精緻化コンセプトの手動編集・リセット
- **ディテール連鎖生成** — 抽象→具体の5段階で画像を順次生成（`/api/generate`）

**5つのディテールステージ:**
| # | ステージ | スタイル | 説明 |
|---|---------|---------|------|
| 1 | Diagram | Diagram | 関係性・フロー・空間構成の抽象ダイアグラム |
| 2 | Concept Image | Sketch | 雰囲気・色彩・光・マテリアルのコンセプトイメージ |
| 3 | Material Board | Sketch | テクスチャ・色・素材パレット |
| 4 | Exterior | Photorealistic | 外観パース（1〜3の画像を参照して生成） |
| 5 | Interior | Photorealistic | 内観パース（1〜3の画像を参照して生成） |

ステージ4・5は、ステージ1〜3の生成画像をリファレンスとして渡すことで、一貫性のあるデザインを連鎖的に生成する。

### 4. Distill / 蒸留

Filterで生成した5つのディテール画像を、リサーチ条件に照らしてAIが自動評価する。

**機能:**
- Filterの5画像をサムネイル表示（storeから取得）
- 精緻化コンセプトの表示
- 「評価を実行」→ 6領域それぞれについてスコア（0〜100）+ AIコメントを生成（`/api/evaluate`）
- 評価結果をスコアバー+コメントで視覚的に表示
- 平均スコアの表示

---

## API エンドポイント

| Method | Path | 概要 |
|--------|------|------|
| POST | `/api/research` | テーマから6領域の調査条件を生成 |
| POST | `/api/concepts` | 条件から対照的な2コンセプトを提案 |
| POST | `/api/concepts/refine` | スペクトラム選択からコンセプトを精緻化 |
| POST | `/api/generate` | 条件+プロンプトから建築画像を生成 |
| POST | `/api/evaluate` | 最終案を6領域で評価 |
| GET/POST | `/api/logs` | プロセスログの保存・取得 |

---

## ステート管理

React Contextベースのグローバルステート。localStorageに自動永続化される。

| ステート | 型 | 説明 |
|---------|---|------|
| `researchTheme` | `string` | リサーチテーマ |
| `conditions` | `ResearchCondition[]` | 6領域の調査条件 |
| `selectedConcepts` | `ArchitecturalConcept[]` | AI提案コンセプトA・B |
| `refinedConcept` | `RefinedConcept \| null` | 精緻化コンセプト |
| `sceneConstraint` | `string` | シーン制約（Generate/Filter共有） |
| `generateImages` | `GeneratedImage[]` | 生成画像 |
| `generatedDesigns` | `GeneratedDesign[]` | Filterに追加された画像 |
| `detailImages` | `Record<string, GeneratedImage>` | 5段階ディテール画像 |
| `researchJobs` | `ResearchJob[]` | リサーチ履歴 |
| `generateJobs` | `GenerateJob[]` | 生成履歴 |

---

## プロジェクト構造

```
src/
├── app/
│   ├── layout.tsx          # ルートレイアウト（ProcessNav + AppProvider）
│   ├── page.tsx            # メインページ（4セクション配置）
│   ├── globals.css         # Tailwind + CSS変数
│   └── api/
│       ├── research/route.ts
│       ├── generate/route.ts
│       ├── concepts/route.ts
│       ├── concepts/refine/route.ts
│       ├── evaluate/route.ts
│       └── logs/route.ts
├── components/
│   ├── ProcessNav.tsx      # 固定ナビゲーション（Intersection Observer）
│   ├── RadarChart.tsx      # レーダーチャート
│   └── sections/
│       ├── ResearchSection.tsx
│       ├── GenerateSection.tsx
│       ├── FilterSection.tsx
│       └── DistillSection.tsx
├── hooks/
│   └── useImageGeneration.ts
└── lib/
    ├── types.ts            # 型定義
    ├── gemini.ts           # Geminiクライアント設定
    └── store.ts            # React Context + localStorage永続化
```

---

## ワークフロー

```
Research                Generate              Filter                Distill
┌─────────┐      ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ テーマ入力 │      │ スペクトラム   │     │ コンセプト     │     │ 6領域評価     │
│ 6領域分析  │ ───→ │ A ──── B     │ ──→ │ 精緻化        │ ──→ │ スコア+       │
│ コンセプト │      │ 画像生成      │     │ ディテール     │     │ コメント      │
│ A・B提案  │      │ Filterに追加  │     │ 5段階連鎖生成  │     │              │
└─────────┘      └──────────────┘     └──────────────┘     └──────────────┘
     ↑                                                           │
     └───────────── フィードバックループ（条件の見直し）──────────────┘
```

---

## ライセンス

Private
