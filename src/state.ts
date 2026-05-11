import { ResourceKey } from './types'
import type { Colonist, Tile, PlacedBuilding, BuildingDef, Enemy, LogEntry, GameState } from './types'

export const G: GameState = {
  day: 1,
  hour: 6,
  minute: 0,
  season: 0,
  seasonDay: 0,
  paused: true,
  speed: 1,
  res: {
    food: 0, water: 0, cooked: 0, wood: 0, stone: 0,
    metal: 0, copper: 0, meds: 0, seeds: 0, cloth: 0,
  },
  colonists: [],
  tiles: [],
  buildings: [],
  hqPlaced: false,
  hqCol: 0,
  hqRow: 0,
  hqLevel: 1,
  shelter: 0,
  log: [],
  selectedCol: null,
  placingBldg: null,
  happiness: 75,
  heraldTimer: 0,
  raidTimer: 0,
  lastStranger: 0,
  porterPileIdx: 0,
  toolStock: {},
  raidPending: false,
}