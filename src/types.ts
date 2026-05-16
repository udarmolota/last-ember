// ── PRIMITIVES ──
export type Profession =
  | 'FARMER' | 'LUMBERJACK' | 'MINER' | 'BUILDER' | 'STONEMASON'
  | 'BLACKSMITH' | 'TAILOR' | 'MEDIC' | 'COOK' | 'HUNTER'
  | 'PORTER' | 'GUARD' | 'GATHERER'

export type ResourceKey =
  | 'food' | 'water' | 'cooked' | 'wood' | 'stone'
  | 'metal' | 'copper' | 'meds' | 'seeds' | 'cloth'

export type TileType =
  | 'grass' | 'forest' | 'water' | 'soil'
  | 'ore' | 'rock' | 'road'

export type Season = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER'

export type LogType = 'normal' | 'good' | 'warn' | 'danger' | 'lore'

// ── COLONIST STATE & TASK (новая система) ──

export type ColonistState =
  | 'IDLE'          // нет задачи, стоит
  | 'GOING'         // идёт к цели (targetCol/targetRow)
  | 'WORKING'       // выполняет задачу на месте
  | 'SLEEPING'      // спит ночью
  | 'EATING'        // ест (идёт к костру/кухне)
  | 'FLEEING'       // убегает от врага
  | 'FIGHTING'      // атакует врага (только GUARD или с оружием)
  | 'RESTING'       // отдыхает у костра (нет работы днём)
  | 'SOCIALIZING'   // общается с другим колонистом
  | 'MOURNING'      // горюет после смерти колониста
  | 'BREAKDOWN'     // моральный срыв (mood < 15)
  | 'INCAPACITATED' // тяжело ранен, ждёт медика
  | 'DEAD'          // мёртв

export type TaskType =
  | 'NONE'
  | 'ROLE_WORK'     // обычная работа по профессии
  | 'PRIORITY_TILE' // приоритетная задача игрока (тап на тайл)
  | 'BUILD'         // строит здание
  | 'HAUL'          // переносит ресурсы (носильщик)
  | 'FETCH_WATER'   // идёт за водой
  | 'EAT'           // идёт есть
  | 'SLEEP'         // идёт спать
  | 'FLEE'          // убегает
  | 'ATTACK'        // атакует врага
  | 'HEAL'          // лечит пациента (медик)
  | 'BURY'          // хоронит умершего
  | 'SOCIALIZE'     // общается

export type HaulPhase = 'TO_SOURCE' | 'PICKUP' | 'TO_STORAGE' | 'DROPOFF'

export interface ColonistTask {
  type: TaskType
  priority: number              // 0-100, выше = важнее
  assignedByPlayer?: boolean    // true = приоритетный таск от игрока
  targetTile?: { col: number; row: number } | null
  targetColonistId?: number     // для HEAL/SOCIALIZE
  phase?: HaulPhase             // для HAUL
  workTicksRequired?: number    // сколько тиков нужно
  workTicksDone?: number        // сколько сделано
  resType?: string              // для HAUL — какой ресурс несём
  resAmount?: number            // для HAUL — сколько несём
}

// ── SMALL OBJECTS ──
export interface Tool {
  type: string
  dur: number
}

export interface ColonistVisual {
  skin: string
  hair: string
  hairStyle: string
  body: string
}

export interface ResPile {
  type: string
  amount: number
  age: number
  label?: string
}

export interface LogEntry {
  t: string
  msg: string
  type: LogType
  ico: string
}

// ── GAME OBJECTS ──
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

  // --- новая система состояний ---
  state: ColonistState        // физическое/психологическое состояние
  task: ColonistTask | null   // текущая задача

  // --- здоровье (детализированное) ---
  sick: boolean
  sickTimer: number
  wounded: boolean            // ранен (работает медленнее)
  incapacitated: boolean      // тяжело ранен (не работает)
  breakdownTimer: number      // таймер морального срыва
  mourningTimer: number       // таймер траура

  dead: boolean
  sleeping: boolean           // оставляем для совместимости
  shelterAssigned?: string | null
  action: string              // оставляем для совместимости (отображение в UI)

  col: number
  row: number
  targetCol: number
  targetRow: number

  // carry — новая структура (заменит carryType + carryAmt)
  carry: {
    type: string | null
    amount: number
  }

  // старые поля carry — оставляем для совместимости пока идёт миграция
  carryType: string | null
  carryAmt: number

  visual: ColonistVisual
  tool: Tool
  weapon?: Tool
  attackTimer?: number

  // старые поля задач — оставляем пока идёт миграция
  priorityTarget?: { col: number; row: number; role?: string } | null
  waterTask?: { col: number; row: number } | null
  priorityPile?: { col: number; row: number; res: string } | null
  _pendingWork?: { role: string; col: number; row: number } | null

  // warning flags
  _warnedHunger?: boolean
  _warnedThirst?: boolean
  _warnedStarving?: boolean
  _warnedDehydrated?: boolean
  deathWarned?: boolean
}

export interface PlacedBuilding {
  id: string
  col: number
  row: number
  lv: number
  paused: boolean
  field?: boolean
  crop?: string | null
  growth?: number
  phase?: 'seeding' | 'growing' | 'harvest'
  seedTimer?: number
}

export interface TileBuilding {
  id: string
  buildTime: number
  totalTime: number
  lv: number
  field?: boolean
  crop?: string | null
  growth?: number
  phase?: 'seeding' | 'growing' | 'harvest'
  seedTimer?: number
  paused?: boolean
  hp?: number
  // 2x2 support
  isMain?: boolean
  mainCol?: number
  mainRow?: number
}

export interface Tile {
  col: number
  row: number
  type: TileType
  bldg: TileBuilding | null
  resAmt: number
  maxRes: number
  res: string | null
  resPile: ResPile | null
  _el: HTMLElement | null
}

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

// ── STATIC DATA ──
export interface Trait {
  id: string
  label: string
  speed: number
  hp: number
  sick: number
}

export interface SupplyDef {
  id: string
  ico: string
  name: string
  res: ResourceKey
  qty: number
  cost: number
}

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
  _selectedCrop?: string
}

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

// ── WORKSHOP QUEUE ──
export interface WorkshopQueueItem {
  id: string
  toolType: string
  ico: string
  timeLeft: number
  weapon?: boolean
  dur?: number
  role?: string
  shop: string
}

// ── GAME STATE ──
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
  development: number
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
  workshopQueue: WorkshopQueueItem[]
  raidPending: boolean
  hqUpgradeTimer: number
  hqUpgradeVisual: boolean
  // optional runtime fields
  enemies?: Enemy[]
  combatMode?: boolean
  firstRaidDay?: number
  firstRaidDone?: boolean
  startingRes?: Record<ResourceKey, number>
  groundSupplies?: Tile | null
}