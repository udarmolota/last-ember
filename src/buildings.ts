import { G } from './state'
import { SKINS, HAIRS, HAIR_STYLES, TS, pick, MAP_W } from './data'
import type { Tile, Colonist, BuildingDef } from './types'
import { placeHQ, refreshTileEl } from './map'
import { addLog, renderResources, selCol, updPauseBtn } from './ui'

export function placeBuilding(bd: BuildingDef, ti: Tile) {
  if (bd.isHQ) { placeHQ(ti); return }
  if (ti.type === 'water') { addLog("Can't build on water", 'warn'); return }
  if (!G.hqPlaced) { addLog('Place HQ first!', 'warn'); return }

  const isLarge = !bd.field && bd.id !== 'campfire'
  if (isLarge) {
    // проверяем все 4 тайла
    const positions = [
      { col: ti.col, row: ti.row },
      { col: ti.col + 1, row: ti.row },
      { col: ti.col, row: ti.row + 1 },
      { col: ti.col + 1, row: ti.row + 1 },
    ]
    for (const { col, row } of positions) {
      const t = G.tiles[row * MAP_W + col]
      if (!t || t.bldg || t.type === 'water') {
        addLog("Not enough space for " + bd.name, 'warn'); return
      }
    }
  } else {
    if (ti.bldg) { addLog('Tile occupied', 'warn'); return }
  }

  for (const [r, a] of Object.entries(bd.cost)) {
    if ((G.res[r as keyof typeof G.res] || 0) < (a as number)) {
      addLog('Need ' + a + ' ' + r + ' for ' + bd.name, 'warn'); return
    }
  }
  for (const [r, a] of Object.entries(bd.cost)) G.res[r as keyof typeof G.res] -= (a as number)
  const crop = bd.field ? bd._selectedCrop || 'wheat' : null
  finishPlace(bd, ti, crop)
}

export function finishPlace(bd: BuildingDef, ti: Tile, crop: string | null) {
  if (crop) G.res.seeds = Math.max(0, G.res.seeds - 5)
  
  const isLarge = !bd.field && bd.id !== 'campfire'
  
  const bldgData = {
    id: bd.id, buildTime: bd.time, totalTime: bd.time, lv: 1,
    field: !!bd.field, crop, growth: 0, phase: 'seeding' as const,
    seedTimer: 0, paused: false,
  }

  if (isLarge) {
    // занимаем 2x2 тайла
    const positions = [
      { col: ti.col, row: ti.row },
      { col: ti.col + 1, row: ti.row },
      { col: ti.col, row: ti.row + 1 },
      { col: ti.col + 1, row: ti.row + 1 },
    ]
    positions.forEach(({ col, row }, idx) => {
      const t = G.tiles[row * MAP_W + col]
      if (!t) return
      if (idx === 0) {
        t.bldg = { ...bldgData, isMain: true }
      } else {
        t.bldg = { ...bldgData, buildTime: bd.time, totalTime: bd.time, mainCol: ti.col, mainRow: ti.row }
      }
      refreshTileEl(t)
    })
  } else {
    ti.bldg = { ...bldgData, isMain: true }
    refreshTileEl(ti)
  }

  G.buildings.push({
    id: bd.id, col: ti.col, row: ti.row, lv: 1, paused: false,
    field: !!bd.field, crop, growth: 0, phase: 'seeding', seedTimer: 0,
  })
  if (bd.shelter) G.shelter += bd.shelter
  renderResources()
  addLog('Building: ' + bd.ico + ' ' + bd.name, 'warn')
  G.placingBldg = null
  document.getElementById('phint')!.classList.remove('show')
  G.paused = false; updPauseBtn()
}

// ── SPRITES ──
export function dollHTML(c: Colonist) {
  if (!c.visual) c.visual = { skin: pick(SKINS), hair: pick(HAIRS), hairStyle: pick(HAIR_STYLES), body: c.color }
  const v = c.visual
  return `<div class="doll" style="--col:${v.body || c.color};--skin:${v.skin};--hair:${v.hair}"><div class="doll-body"></div><div class="doll-head"></div><div class="doll-hair ${v.hairStyle || 'cap'}"></div><div class="doll-face"></div><div class="doll-mark"></div></div>`
}

export function refreshSprites() {
  document.querySelectorAll('.spr').forEach((e) => e.remove())
  G.colonists.filter((c) => !c.dead).forEach((c) => {
    const sp = document.createElement('div')
    sp.className = 'spr' + (c.sleeping ? ' zzz' : '')
    sp.id = 'sp-' + c.id; sp.title = c.name
    sp.innerHTML = dollHTML(c)
    sp.addEventListener('click', (e) => { e.stopPropagation(); selCol(c.id) })
    document.getElementById('mapcanvas')!.appendChild(sp)
    posSprite(c)
  })
}

export function posSprite(c: Colonist) {
  const sp = document.getElementById('sp-' + c.id); if (!sp) return
  const ox = (c.id % 3) * 2 - 2, oy = Math.floor(c.id / 3) * 2 - 2
  sp.style.left = c.col * TS + TS * 1.5 - 8 + ox + 'px'
  sp.style.top = c.row * TS + TS - 16 + oy + 'px'
}