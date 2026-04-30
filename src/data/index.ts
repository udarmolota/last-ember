// ─────────────────────────────────────────────
//  src/data/index.ts
//  Все статические данные игры. Раньше были
//  разбросаны по верху HTML-файла.
//  В будущем можно дробить: resources.ts,
//  professions.ts, buildings.ts и т.д.
// ─────────────────────────────────────────────

import type {
  Profession, BuildingDef, CraftDef, Trait, SupplyDef,
} from '../game/types'

// ── Профессии ───────────────────────────────────
export const PROF: Profession[] = [
  'FARMER', 'LUMBERJACK', 'MINER', 'BUILDER',
  'STONEMASON', 'BLACKSMITH', 'TAILOR', 'MEDIC',
  'COOK', 'HUNTER', 'PORTER', 'GUARD', 'GATHERER',
]

export const PICO: Record<Profession, string> = {
  FARMER: '🌾', LUMBERJACK: '🪵', MINER: '⛏', BUILDER: '🔨',
  STONEMASON: '🪨', BLACKSMITH: '🔥', TAILOR: '🧵', MEDIC: '💊',
  COOK: '🍳', HUNTER: '🏹', PORTER: '🎒', GUARD: '🛡', GATHERER: '🧺',
}

export const PRES: Record<Profession, string | null> = {
  FARMER: 'seeds', LUMBERJACK: 'wood', MINER: 'metal',
  STONEMASON: 'stone', MEDIC: 'meds', HUNTER: 'food',
  COOK: null, PORTER: null, GUARD: null, BUILDER: null,
  BLACKSMITH: null, TAILOR: 'cloth', GATHERER: 'food',
}

// ── Инструменты по профессии ────────────────────
export const PROF_TOOL: Partial<Record<Profession, string | null>> = {
  LUMBERJACK: 'Axe', MINER: 'Pickaxe', STONEMASON: 'Hammer',
  FARMER: 'Hoe', BLACKSMITH: 'Tongs', TAILOR: 'Needle',
  MEDIC: 'Bandage Kit', COOK: 'Knife', HUNTER: 'Bow',
  BUILDER: 'Mallet', PORTER: null, GUARD: 'Knife', GATHERER: null,
}

// ── Черты характера ─────────────────────────────
export const TRAITS: Trait[] = [
  { id: 'hardworking', label: 'Hardworking', speed: 1.2,  hp: 1.0,  sick: 0.7 },
  { id: 'lazy',        label: 'Lazy',        speed: 0.8,  hp: 1.0,  sick: 1.0 },
  { id: 'stocky',      label: 'Stocky',      speed: 0.9,  hp: 1.2,  sick: 0.9 },
  { id: 'lean',        label: 'Lean',        speed: 1.1,  hp: 0.85, sick: 1.1 },
  { id: 'sturdy',      label: 'Sturdy',      speed: 1.0,  hp: 1.1,  sick: 0.4 },
  { id: 'frail',       label: 'Frail',       speed: 0.95, hp: 0.85, sick: 2.0 },
]

// ── Имена и цвета ───────────────────────────────
export const NAMES = [
  'DOSS', 'KIRA', 'VANCE', 'YELENA', 'OLEG', 'PETRA',
  'MARAT', 'SASHA', 'REED', 'MIRA', 'JORIN', 'NEVA',
  'BAXTER', 'LIRA', 'COLT', 'ZOLA',
]
export const COLORS = [
  '#c05030', '#3060c0', '#30a040', '#a03090',
  '#d08020', '#208080', '#c04060', '#608020',
]
export const SKINS = ['#f0c98d', '#e2b071', '#c99155', '#8a5632', '#f4d6aa', '#d7a06a']
export const HAIRS = ['#2b2118', '#6b3f1f', '#b8792c', '#d7c7a3', '#8b8b8b', '#1f1f1f']
export const HAIR_STYLES = ['cap', 'bun', 'pigtails', 'mohawk', 'beard', 'bob']

// ── Снаряжение на старте ─────────────────────────
export const SUPPLIES: SupplyDef[] = [
  { id: 'food',   ico: '🌾', name: 'FOOD RATIONS',   res: 'food',   qty: 15, cost: 1 },
  { id: 'water',  ico: '💧', name: 'WATER BARRELS',  res: 'water',  qty: 40, cost: 1 },
  { id: 'wood',   ico: '🪵', name: 'TIMBER PLANKS',  res: 'wood',   qty: 15, cost: 1 },
  { id: 'stone',  ico: '🪨', name: 'STONE BLOCKS',   res: 'stone',  qty: 10, cost: 1 },
  { id: 'metal',  ico: '⚙️', name: 'SCRAP METAL',    res: 'metal',  qty: 6,  cost: 2 },
  { id: 'meds',   ico: '💊', name: 'FIRST AID KITS', res: 'meds',   qty: 4,  cost: 2 },
  { id: 'seeds',  ico: '🌱', name: 'MIXED SEEDS',    res: 'seeds',  qty: 25, cost: 1 },
  { id: 'cloth',  ico: '🧶', name: 'CLOTH ROLLS',    res: 'cloth',  qty: 6,  cost: 2 },
  { id: 'cooked', ico: '🍞', name: 'BREAD RATIONS',  res: 'cooked', qty: 10, cost: 2 },
  { id: 'copper', ico: '🟤', name: 'COPPER SCRAPS',  res: 'copper', qty: 6,  cost: 2 },
]

// ── Здания ──────────────────────────────────────
export const BLDGS: BuildingDef[] = [
  { id: 'hq_build',    lv: 0, cat: 'SHELTER',  ico: '🏚', name: 'HEADQUARTERS',  cost: { wood: 10, stone: 5 },        time: 0,   isHQ: true },
  { id: 'tent',        lv: 1, cat: 'SHELTER',  ico: '⛺', name: 'TENT',          cost: { wood: 5 },                   time: 120, shelter: 2 },
  { id: 'campfire',    lv: 1, cat: 'FOOD',     ico: '🔥', name: 'CAMPFIRE',      cost: { wood: 3, stone: 2 },         time: 60  },
  { id: 'field',       lv: 1, cat: 'FOOD',     ico: '🌿', name: 'FIELD',         cost: { wood: 2 },                   time: 90,  field: true },
  { id: 'storehouse',  lv: 1, cat: 'STORAGE',  ico: '📦', name: 'STOREHOUSE',    cost: { wood: 8 },                   time: 120 },
  { id: 'workshop',    lv: 1, cat: 'CRAFT',    ico: '🔧', name: 'WORKSHOP',      cost: { wood: 10, stone: 5 },        time: 180 },
  { id: 'house',       lv: 2, cat: 'SHELTER',  ico: '🏠', name: 'HOUSE',         cost: { wood: 15, stone: 10 },       time: 300, shelter: 4 },
  { id: 'kitchen',     lv: 2, cat: 'FOOD',     ico: '🍳', name: 'KITCHEN',       cost: { wood: 10, stone: 8 },        time: 240 },
  { id: 'forge',       lv: 2, cat: 'CRAFT',    ico: '⚒',  name: 'FORGE',         cost: { stone: 15, metal: 8 },       time: 360 },
  { id: 'lumbermill',  lv: 2, cat: 'PROD',     ico: '🪚', name: 'LUMBERMILL',    cost: { wood: 12, metal: 5 },        time: 300 },
  { id: 'mine',        lv: 2, cat: 'PROD',     ico: '⛏',  name: 'MINE',          cost: { wood: 10, stone: 8 },        time: 300 },
  { id: 'infirmary',   lv: 2, cat: 'SHELTER',  ico: '➕', name: 'INFIRMARY',     cost: { wood: 12, stone: 8 },        time: 300 },
  { id: 'barracks',    lv: 2, cat: 'MILITARY', ico: '🛡', name: 'BARRACKS',      cost: { wood: 15, stone: 10 },       time: 360 },
  { id: 'palisade',    lv: 2, cat: 'DEFENSE',  ico: '🟫', name: 'PALISADE',      cost: { wood: 8 },                   time: 120 },
  { id: 'market',      lv: 2, cat: 'TRADE',    ico: '🏪', name: 'MARKET STALL',  cost: { wood: 12, stone: 5 },        time: 240 },
  { id: 'well',        lv: 2, cat: 'PROD',     ico: '🪣', name: 'WELL',          cost: { stone: 10, wood: 5 },        time: 180 },
  { id: 'weaver',      lv: 2, cat: 'CRAFT',    ico: '🧵', name: 'WEAVER SHED',   cost: { wood: 10, stone: 5 },        time: 240 },
  { id: 'tower',       lv: 3, cat: 'MILITARY', ico: '🗼', name: 'WATCH TOWER',   cost: { stone: 20, metal: 10 },      time: 480 },
  { id: 'stone_wall',  lv: 3, cat: 'DEFENSE',  ico: '🧱', name: 'STONE WALL',    cost: { stone: 12 },                 time: 180 },
  { id: 'grave',       lv: 1, cat: 'OTHER',    ico: '✝',  name: 'GRAVE',         cost: { wood: 3, stone: 2 },         time: 90  },
]

// ── Крафт ───────────────────────────────────────
export const CRAFTS: CraftDef[] = [
  // WORKSHOP — stone & wood tools
  { id: 'axe_stone',    name: 'Stone Axe',     ico: '🪓', shop: 'workshop', lv: 1, cost: { stone: 3, wood: 2 }, toolType: 'Stone Axe',    dur: 70,  role: 'LUMBERJACK' },
  { id: 'pick_stone',   name: 'Stone Pickaxe', ico: '⛏',  shop: 'workshop', lv: 1, cost: { stone: 4, wood: 2 }, toolType: 'Stone Pick',   dur: 70,  role: 'MINER' },
  { id: 'hoe_stone',    name: 'Stone Hoe',     ico: '🌱', shop: 'workshop', lv: 1, cost: { stone: 3, wood: 2 }, toolType: 'Stone Hoe',    dur: 70,  role: 'FARMER' },
  { id: 'hammer_stone', name: 'Stone Hammer',  ico: '🔨', shop: 'workshop', lv: 1, cost: { stone: 3, wood: 2 }, toolType: 'Stone Hammer', dur: 70,  role: 'BUILDER' },
  { id: 'mallet_wood',  name: 'Wood Mallet',   ico: '🪵', shop: 'workshop', lv: 1, cost: { wood: 4 },           toolType: 'Wood Mallet',  dur: 50,  role: 'STONEMASON' },
  { id: 'club_wood',    name: 'Wood Club',     ico: '🏏', shop: 'workshop', lv: 2, cost: { wood: 5 },           toolType: 'Wood Club',    dur: 50,  weapon: true },
  { id: 'shield_wood',  name: 'Wood Shield',   ico: '🛡', shop: 'workshop', lv: 2, cost: { wood: 6 },           toolType: 'Wood Shield',  dur: 60,  weapon: true },
  // FORGE — copper & iron
  { id: 'axe_copper',   name: 'Copper Axe',    ico: '🪓', shop: 'forge',    lv: 1, cost: { copper: 4, wood: 2 }, toolType: 'Copper Axe',   dur: 140, role: 'LUMBERJACK' },
  { id: 'pick_copper',  name: 'Copper Pick',   ico: '⛏',  shop: 'forge',    lv: 1, cost: { copper: 5, wood: 2 }, toolType: 'Copper Pick',  dur: 140, role: 'MINER' },
  { id: 'hoe_copper',   name: 'Copper Hoe',    ico: '🌱', shop: 'forge',    lv: 1, cost: { copper: 3, wood: 2 }, toolType: 'Copper Hoe',   dur: 140, role: 'FARMER' },
  { id: 'sword_copper', name: 'Copper Sword',  ico: '⚔',  shop: 'forge',    lv: 2, cost: { copper: 6, wood: 2 }, toolType: 'Copper Sword', dur: 120, weapon: true },
  { id: 'knife_copper', name: 'Copper Knife',  ico: '🔪', shop: 'forge',    lv: 2, cost: { copper: 3, wood: 1 }, toolType: 'Copper Knife', dur: 100, weapon: true },
  { id: 'shield_copper',name: 'Copper Shield', ico: '🛡', shop: 'forge',    lv: 2, cost: { copper: 5, wood: 2 }, toolType: 'Copper Shield',dur: 130, weapon: true },
]

// ── Лор ─────────────────────────────────────────
export const LORE: string[] = [
  '"Day 47. The machines stopped the moment the sky turned red."',
  '"They say something guards the old vaults. We stay away."',
  '"Heard a broadcast last night. Not human words."',
  '"The old ones called it the Keeper. It hates progress."',
  '"Found blueprints for something. Half the words unreadable."',
  '"Grandfather said we built too high. Maybe he was right."',
  '"Lights on the horizon. Too regular. Too deliberate."',
  '"The soil remembers. Some places nothing will ever grow."',
  '"Day 112. A working radio. Static. Then a voice: stop."',
]

// ── Карта ────────────────────────────────────────
export const MAP_W = 28
export const MAP_H = 22
export const TS = 38
export const TICK_MS = 500

// ── Враги ────────────────────────────────────────
export const ENEMY_TYPES = [
  {
    id: 'bandit', name: 'Bandit', ico: '💀',
    hp: 40, maxHp: 40, combatSkill: 10,
    weapon: 'Stone Knife', damage: 8,
    color: '#8a1a08', speed: 0.08,
  },
]

// ── Сезоны ───────────────────────────────────────
export const SEASONS: readonly string[] = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER']

// ── Категории зданий ─────────────────────────────
export const BCAT_DATA: Record<string, string> = {
  SHELTER: '⛺', FOOD: '🌾', PROD: '⛏', CRAFT: '🔧',
  MILITARY: '⚔', DEFENSE: '🛡', TRADE: '🏪', STORAGE: '📦', OTHER: '⚙',
}
