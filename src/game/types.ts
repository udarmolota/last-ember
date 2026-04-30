// ─────────────────────────────────────────────
//  src/game/types.ts
//  Все интерфейсы игры в одном месте.
//  Меняй здесь — TS сразу покажет где сломалось.
// ─────────────────────────────────────────────

export type Profession =
  | 'FARMER' | 'LUMBERJACK' | 'MINER' | 'BUILDER'
  | 'STONEMASON' | 'BLACKSMITH' | 'TAILOR' | 'MEDIC'
  | 'COOK' | 'HUNTER' | 'PORTER' | 'GUARD' | 'GATHERER'

export type Season = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER'

export type TileType =
  | 'grass' | 'forest' | 'water' | 'soil'
  | 'ore' | 'rock' | 'road' | 'copper_ore'

export type ResourceKey =
  | 'food' | 'water' | 'cooked' | 'wood'
  | 'stone' | 'metal' | 'copper' | 'meds'
  | 'seeds' | 'cloth'

export type LogType = 'normal' | 'good' | 'warn' | 'danger' | 'lore'

// ── Визуальный образ колониста ──────────────────
export interface ColonistVisual {
  skin: string
  hair: string
  hairStyle: string
  body: string
}

// ── Инструмент / оружие ─────────────────────────
export interface Tool {
  type: string
  dur: number
}

// ── Колонист ────────────────────────────────────
export interface Colonist {
  id: number
  name: string
  gender: 'M' | 'F'
  color: string
  trait: string
  prefs: Record<Profession, number>
  role: Profession
  skill: Partial<Record<Profession, number>>
  combatSkill: number
  hp: number
  maxHp: number
  mood: number
  hunger: number
  thirst: number
  sick: boolean
  sickTimer: number
  dead: boolean
  sleeping: boolean
  shelterAssigned?: boolean
  action: string
  col: number
  row: number
  targetCol: number
  targetRow: number
  carryType: ResourceKey | string | null
  carryAmt: number
  visual: ColonistVisual
  tool: Tool
  weapon?: Tool
  attackTimer?: number
  // внутренние флаги предупреждений
  _warnedHunger?: boolean
  _warnedThirst?: boolean
  _warnedStarving?: boolean
  _warnedDehydrated?: boolean
  deathWarned?: boolean
}

// ── Здание (размещённое на тайле) ───────────────
export interface PlacedBuilding {
  id: string
  name: string
  ico: string
  lv: number
  cat: string
  buildTime: number       // убывает до 0, потом готово
  shelter?: number
  field?: boolean
  phase?: 'seeding' | 'planting' | 'growing' | 'harvest'
  crop?: string
  growth?: number
}

// ── Тайл карты ──────────────────────────────────
export interface Tile {
  col: number
  row: number
  type: TileType
  bldg: PlacedBuilding | null
  resAmt: number
  maxRes: number
  res: string | null      // 'berries' | 'mushrooms' | null
  resPile: ResourcePile | null
  _el: HTMLElement | null // ссылка на DOM-элемент (не сериализовать!)
}

// ── Куча ресурсов на земле ──────────────────────
export interface ResourcePile {
  type: ResourceKey
  amt: number
}

// ── Враг ────────────────────────────────────────
export interface Enemy {
  id: string
  name: string
  ico: string
  hp: number
  maxHp: number
  combatSkill: number
  weapon: string
  damage: number
  color: string
  speed: number
  col: number
  row: number
  targetCol: number
  targetRow: number
  dead: boolean
  attackTimer: number
}

// ── Запись лога ─────────────────────────────────
export interface LogEntry {
  msg: string
  type: LogType
  time: string
}

// ── Глобальное состояние игры ───────────────────
export interface GameState {
  day: number
  hour: number
  minute: number
  season: number
  seasonDay: number
  paused: boolean
  speed: number
  res: Record<ResourceKey, number>
  colonists: Colonist[]
  tiles: Tile[]
  buildings: PlacedBuilding[]
  hqPlaced: boolean
  hqCol: number
  hqRow: number
  hqLevel: number
  shelter: number
  log: LogEntry[]
  selectedCol: number | null
  placingBldg: BuildingDef | null
  happiness: number
  heraldTimer: number
  raidTimer: number
  lastStranger: number
  porterPileIdx: number
  toolStock: Record<string, number>
  raidPending: boolean
  firstRaidDay?: number
  firstRaidDone?: boolean
  combatMode?: boolean
  enemies?: Enemy[]
  startingRes?: Record<ResourceKey, number>
}

// ── Определение типа здания (из BLDGS) ──────────
export interface BuildingDef {
  id: string
  lv: number
  cat: string
  ico: string
  name: string
  cost: Partial<Record<ResourceKey, number>>
  time: number
  isHQ?: boolean
  shelter?: number
  field?: boolean
}

// ── Определение крафта ──────────────────────────
export interface CraftDef {
  id: string
  name: string
  ico: string
  shop: string
  lv: number
  cost: Partial<Record<ResourceKey, number>>
  toolType: string
  dur: number
  role?: Profession
  weapon?: boolean
}

// ── Черта характера ─────────────────────────────
export interface Trait {
  id: string
  label: string
  speed: number
  hp: number
  sick: number
}

// ── Снаряжение на старте ────────────────────────
export interface SupplyDef {
  id: string
  ico: string
  name: string
  res: ResourceKey
  qty: number
  cost: number
}
