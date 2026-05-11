import { G } from './state'
import { SKINS, HAIRS, HAIR_STYLES, TS, pick } from './data'
import type { Tile, Colonist, BuildingDef } from './types'
import { refreshTileEl } from './map'

export function placeBuilding(bd: BuildingDef, ti: Tile) {
  if (bd.isHQ) { placeHQ(ti); return }
  if (ti.bldg) { addLog('Tile occupied', 'warn'); return }
  if (ti.type === 'water') { addLog("Can't build on water", 'warn'); return }
  if (!G.hqPlaced) { addLog('Place HQ first!', 'warn'); return }
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
  ti.bldg = {
    id: bd.id, buildTime: bd.time, totalTime: bd.time, lv: 1,
    field: !!bd.field, crop, growth: 0, phase: 'seeding', seedTimer: 0, paused: false,
  }
  G.buildings.push({
    id: bd.id, col: ti.col, row: ti.row, lv: 1, paused: false,
    field: !!bd.field, crop, growth: 0, phase: 'seeding', seedTimer: 0,
  })
  if (bd.shelter) G.shelter += bd.shelter
  if (bd.id === 'storehouse' && G.groundSupplies) {
    const gs = G.groundSupplies
    gs.resPile = null; G.groundSupplies = null
    addLog('Supplies stored in Storehouse!', 'good')
    refreshTileEl(gs)
  }
  refreshTileEl(ti)
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
  const ox = (c.id % 3) * 6 - 6, oy = Math.floor(c.id / 3) * 5 - 5
  sp.style.left = c.col * TS + TS / 2 - 13 + ox + 'px'
  sp.style.top = c.row * TS + TS / 2 - 27 + oy + 'px'
}