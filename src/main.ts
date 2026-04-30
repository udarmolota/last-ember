// ─────────────────────────────────────────────────────────────────────────────
//  src/main.ts
//  Last Ember — главный игровой файл.
//  Этап 1 миграции: весь JS перенесён в TypeScript с типами.
//  Следующий шаг (Этап 2): дробить на src/game/map.ts, colonists.ts и т.д.
// ─────────────────────────────────────────────────────────────────────────────

import './styles.css'
import { G } from './game/state'
import type { Colonist, Tile, BuildingDef, Enemy, ResourceKey } from './game/types'
import {
  PROF, PICO, PRES, PROF_TOOL, TRAITS, NAMES, COLORS, SKINS, HAIRS, HAIR_STYLES,
  SUPPLIES, BLDGS, CRAFTS, LORE, ENEMY_TYPES,
  MAP_W, MAP_H, TS, TICK_MS, SEASONS, BCAT_DATA,
} from './data/index'

// ── УТИЛИТЫ ──────────────────────────────────────────────────────────────────
const rnd = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const isNightTime = () => G.hour < 6 || G.hour >= 21

// ── АУДИО ─────────────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null
function initAudio() {
  if (audioCtx) return audioCtx
  const Ctx = window.AudioContext || (window as any).webkitAudioContext
  if (!Ctx) return null
  audioCtx = new Ctx()
  return audioCtx
}
function playBeep(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.07) {
  const ctx = initAudio()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime)
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(gain); gain.connect(ctx.destination)
  osc.start(); osc.stop(ctx.currentTime + duration)
}
const SFX = {
  click: () => playBeep(620, 0.07, 'square', 0.045),
  msg:   () => playBeep(440, 0.045, 'sine', 0.045),
  up:    () => { playBeep(420, 0.06, 'sine', 0.045); setTimeout(() => playBeep(820, 0.06, 'sine', 0.04), 55) },
  down:  () => playBeep(260, 0.12, 'sawtooth', 0.04),
  warn:  () => playBeep(180, 0.16, 'sawtooth', 0.045),
}
document.addEventListener('pointerdown', () => { const ctx = initAudio(); if (ctx && ctx.state === 'suspended') ctx.resume() }, { once: true })
document.addEventListener('click', e => {
  const t = e.target as HTMLElement
  if (t.closest('button,.qb,.cpc,.hbtn,.btab,.bcat,.bb,.mb2,.cc,.tile,#phint,.cds')) SFX.click()
}, true)

// ── SETUP ────────────────────────────────────────────────────────────────────
let pts = 50
const supQty: Record<string, number> = {}
SUPPLIES.forEach(s => supQty[s.id] = 0)

function buildSetup() {
  const sg = document.getElementById('sgrid')!
  SUPPLIES.forEach(s => {
    const d = document.createElement('div'); d.className = 'si'
    d.innerHTML = `<span class="si-ico">${s.ico}</span><div class="si-info"><div class="si-name">${s.name}</div><div class="si-cost">${s.cost}pt=${s.qty}</div></div><div class="si-qty"><div class="qb" data-id="${s.id}" data-d="-1">−</div><div class="qv" id="qv-${s.id}">0</div><div class="qb" data-id="${s.id}" data-d="1">+</div></div>`
    sg.appendChild(d)
  })
  sg.querySelectorAll('.qb').forEach(b => b.addEventListener('click', () => {
    const btn = b as HTMLElement
    const s = SUPPLIES.find(x => x.id === btn.dataset.id)!
    const d = parseInt(btn.dataset.d!)
    const nv = supQty[s.id] + d, np = pts - (d * s.cost)
    if (nv < 0 || np < 0 || np > 50) return
    supQty[s.id] = nv; pts = np
    document.getElementById('qv-' + s.id)!.textContent = String(nv)
    document.getElementById('ptsnum')!.textContent = String(pts)
  }))
  const pool = genPool(10)
  const cl = document.getElementById('cpl')!
  const sel = new Set<number>()
  pool.forEach((c, i) => {
    const tr = TRAITS.find(t => t.id === c.trait)!
    const best = PROF.reduce((a, b) => c.prefs[a] >= c.prefs[b] ? a : b)
    const card = document.createElement('div'); card.className = 'cpc'; card.dataset.i = String(i)
    card.innerHTML = `<div class="cp-dot" style="background:${c.color}"></div><div class="cp-info"><div class="cp-name">${c.name}</div><div class="cp-sub">${tr.label} · ${c.gender}</div><div class="cp-pref">★ ${PICO[best]} ${best}</div></div>`
    card.addEventListener('click', () => {
      if (sel.has(i)) { sel.delete(i); card.classList.remove('sel') }
      else { if (sel.size >= 5) return; sel.add(i); card.classList.add('sel') }
      const startBtn = document.getElementById('startbtn') as HTMLButtonElement
      startBtn.disabled = sel.size !== 5
    })
    cl.appendChild(card)
  })
  const startBtn = document.getElementById('startbtn') as HTMLButtonElement
  startBtn.addEventListener('click', () => {
    SUPPLIES.forEach(s => { if (supQty[s.id] > 0) G.res[s.res] = (G.res[s.res] || 0) + supQty[s.id] * s.qty })
    G.colonists = [...sel].map((i, idx) => { const c = { ...pool[i] }; c.id = idx; return c })
    startGame()
  })
}

function genPool(n: number): Colonist[] {
  const names = [...NAMES].sort(() => Math.random() - 0.5)
  return Array.from({ length: n }, (_, i) => {
    const tr = pick(TRAITS)
    const prefs: Record<string, number> = {}
    PROF.forEach(p => prefs[p] = rnd(1, 5)); prefs[pick(PROF)] = 5
    const maxHp = Math.round(100 * tr.hp)
    return {
      id: i,
      name: names[i] || 'SURVIVOR',
      gender: (Math.random() > 0.5 ? 'M' : 'F') as 'M' | 'F',
      color: COLORS[i % COLORS.length],
      trait: tr.id,
      prefs: prefs as any,
      role: PROF[i % PROF.length],
      skill: {}, combatSkill: 0,
      hp: maxHp, maxHp, mood: 75, hunger: 0, thirst: 0,
      sick: false, sickTimer: 0, dead: false, sleeping: false, action: 'IDLE',
      col: 0, row: 0, targetCol: 0, targetRow: 0, carryType: null, carryAmt: 0,
      visual: { skin: pick(SKINS), hair: pick(HAIRS), hairStyle: pick(HAIR_STYLES), body: COLORS[i % COLORS.length] },
      tool: { type: 'Stone', dur: 100 },
    } as Colonist
  })
}
buildSetup()

// ── MAP ───────────────────────────────────────────────────────────────────────
function genMap() {
  G.tiles = []
  for (let r = 0; r < MAP_H; r++) for (let c = 0; c < MAP_W; c++)
    G.tiles.push({ col: c, row: r, type: 'grass', bldg: null, resAmt: 0, maxRes: 0, res: null, resPile: null, _el: null })
  const at = (c: number, r: number) => c >= 0 && c < MAP_W && r >= 0 && r < MAP_H ? G.tiles[r * MAP_W + c] : null
  const set = (c: number, r: number, t: any, amt = 0) => {
    const ti = at(c, r); if (!ti) return; ti.type = t
    if (amt) { ti.resAmt = amt; ti.maxRes = amt }
  }
  // water
  const wc = rnd(0, 3), wr = rnd(1, 3)
  for (let dr = 0; dr < 5; dr++) for (let dc = 0; dc < 6; dc++) set(wc + dc, wr + dr, 'water')
  for (let r2 = wr + 5; r2 < wr + 10; r2++) set(wc + 2, r2, 'water')
  // forests
  ;[[rnd(18, 23), rnd(0, 3)], [rnd(0, 2), rnd(12, 17)], [rnd(19, 24), rnd(14, 19)]].forEach(([fc, fr]) => {
    for (let dr = -3; dr <= 3; dr++) for (let dc = -3; dc <= 3; dc++) {
      const ti = at(fc + dc, fr + dr)
      if (ti && ti.type === 'grass' && Math.random() < 0.65) { ti.type = 'forest'; const a = rnd(40, 90); ti.resAmt = a; ti.maxRes = a }
    }
  })
  // soil
  const sc = rnd(8, 13), sr = rnd(8, 13)
  for (let dr = 0; dr < 5; dr++) for (let dc = 0; dc < 6; dc++) { if (Math.random() < 0.8) set(sc + dc, sr + dr, 'soil') }
  // ore
  const oc = rnd(16, 21), or2 = rnd(8, 12)
  for (let dr = 0; dr < 4; dr++) for (let dc = 0; dc < 5; dc++) {
    const ti = at(oc + dc, or2 + dr)
    if (ti && Math.random() < 0.7) { ti.type = 'ore'; const a = rnd(30, 70); ti.resAmt = a; ti.maxRes = a }
  }
  // rock
  ;[[rnd(5, 9), rnd(2, 5)], [rnd(21, 25), rnd(5, 9)]].forEach(([rc, rr]) => {
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      const ti = at(rc + dc, rr + dr)
      if (ti && ti.type === 'grass' && Math.random() < 0.6) { ti.type = 'rock'; const a = rnd(25, 55); ti.resAmt = a; ti.maxRes = a }
    }
  })
  // berry/mushroom patches
  for (let i = 0; i < 14; i++) {
    const ti = at(rnd(0, MAP_W - 1), rnd(0, MAP_H - 1))
    if (ti && (ti.type === 'grass' || ti.type === 'forest') && Math.random() < 0.5 && !ti.res) {
      ti.res = ti.type === 'forest' ? 'mushrooms' : 'berries'
      const a = rnd(6, 18); ti.resAmt = a; ti.maxRes = a
    }
  }
  // roads
  for (let i = 0; i < 10; i++) { const ti = at(rnd(4, MAP_W - 4), rnd(4, MAP_H - 4)); if (ti && ti.type === 'grass') ti.type = 'road' }
}

function renderMap() {
  const g = document.getElementById('mapgrid')!
  g.style.gridTemplateColumns = `repeat(${MAP_W},${TS}px)`
  g.style.gridTemplateRows = `repeat(${MAP_H},${TS}px)`
  g.innerHTML = ''
  G.tiles.forEach(ti => {
    const el = document.createElement('div')
    ti._el = el
    refreshTileEl(ti)
    el.addEventListener('click', e => { e.stopPropagation(); if (dragMoved) return; onTileClick(ti) })
    g.appendChild(el)
  })
  refreshSprites()
}

function tileClass(ti: Tile) {
  if (ti.bldg) return 't-building' + (ti.bldg.id === 'hq' ? ' hq' : '') + (ti.bldg.buildTime > 0 ? ' uc' : '')
  let c = 't-' + ti.type
  if (ti.type === 'forest' || ti.type === 'rock' || ti.type === 'ore') c += ' raised'
  if ((ti.type === 'forest' || ti.type === 'ore') && ti.maxRes > 0) {
    const p = ti.resAmt / ti.maxRes
    c += p < 0.25 ? ' d3' : p < 0.5 ? ' d2' : p < 0.75 ? ' d1' : ''
  }
  return c
}

function refreshTileEl(ti: Tile) {
  const el = ti._el; if (!el) return
  el.className = 'tile ' + tileClass(ti)
  el.innerHTML = ''
  const ico = document.createElement('span')
  if (ti.bldg) {
    const bd = BLDGS.find(b => b.id === ti.bldg!.id)
    if (ti.bldg.field && ti.bldg.buildTime <= 0) {
      const phase = ti.bldg.phase || 'seeding'
      const cropIco: Record<string, Record<string, string>> = {
        wheat:  { seeding: '🟫', growing25: '🌱', growing75: '🌿', harvest: '🌾' },
        veg:    { seeding: '🟫', growing25: '🌱', growing75: '🥬', harvest: '🥕' },
        cotton: { seeding: '🟫', growing25: '🌱', growing75: '🌿', harvest: '🌸' },
      }
      const ci = cropIco[ti.bldg.crop || 'wheat'] || cropIco.wheat
      const gv = ti.bldg.growth || 0
      if (phase === 'seeding') ico.textContent = ci.seeding
      else if (phase === 'growing') ico.textContent = gv < 40 ? ci.growing25 : ci.growing75
      else if (phase === 'harvest') ico.textContent = ci.harvest
      else ico.textContent = '🟫'
      ico.style.fontSize = '20px'
    } else {
      ico.textContent = bd ? bd.ico : ti.bldg.id === 'hq' ? '🏚' : '🏗'
    }
    if (ti.bldg.buildTime > 0) {
      const p = document.createElement('div'); p.className = 'bprog'
      p.style.width = Math.round((1 - ti.bldg.buildTime / (ti.bldg as any).totalTime) * 100) + '%'
      el.appendChild(p)
    }
  } else {
    const imap: Record<string, () => string> = {
      forest: () => Math.random() < 0.5 ? '🌲' : '🌳',
      water: () => '〰', ore: () => '◈', rock: () => '◇', soil: () => '', grass: () => '', road: () => '',
    }
    ico.textContent = (imap[ti.type] || imap.grass)()
    if (ti.res && ti.resAmt > 0) ico.textContent = ti.res === 'berries' ? '🫐' : '🍄'
  }
  el.appendChild(ico)
  if (ti.resPile && ((ti.resPile as any).amount > 0 || (ti.resPile as any).type === 'supplies')) {
    const p = document.createElement('div'); p.className = 'rpile'
    if ((ti.resPile as any).type === 'supplies') {
      p.innerHTML = '📦<br><span style="font-size:7px">' + ((ti.resPile as any).label || 'SUPPLIES') + '</span>'
      p.style.cssText = 'position:absolute;top:2px;left:2px;right:2px;background:rgba(122,80,8,0.92);color:#fff;font-size:9px;border-radius:2px;padding:2px 3px;line-height:1.3;text-align:center;pointer-events:none;border:1px solid rgba(200,160,80,0.6);'
    } else {
      const icons: Record<string, string> = { wood: '🪵', stone: '🪨', metal: '⚙', berries: '🫐', mushrooms: '🍄', food: '🌾', water: '💧', copper: '🟤' }
      p.textContent = (icons[(ti.resPile as any).type] || '📦') + '×' + (ti.resPile as any).amount
    }
    el.appendChild(p)
  }
  if ((ti.type === 'forest' || ti.type === 'ore' || ti.type === 'rock') && ti.resAmt > 0 && !ti.bldg) {
    const lbl = document.createElement('div'); lbl.className = 'tlbl'; lbl.textContent = String(ti.resAmt); el.appendChild(lbl)
  }
  if (ti.bldg && ti.bldg.field && ti.bldg.buildTime <= 0 && ti.bldg.crop) {
    const lbl = document.createElement('div'); lbl.className = 'tlbl'
    const ph = ti.bldg.phase || '?'
    const phShort: Record<string, string> = { seeding: 'SEED', growing: 'GRW ' + Math.round(ti.bldg.growth || 0) + '%', harvest: 'RIPE' }
    lbl.textContent = phShort[ph] || ph
    lbl.style.color = ph === 'harvest' ? '#3a6010' : ph === 'growing' ? '#5a7020' : '#7a5008'
    lbl.style.fontWeight = 'bold'
    el.appendChild(lbl)
  }
}

// ── CAMERA ────────────────────────────────────────────────────────────────────
let camX = 0, camY = 0, camS = 1
let drag: { x: number; y: number } | null = null
let dragO: { x: number; y: number } | null = null
let pinchD: number | null = null
const mw = document.getElementById('mapwrap')!
function updCam() { document.getElementById('mapcanvas')!.style.transform = `translate(${camX}px,${camY}px) scale(${camS})` }
function centerOn(col: number, row: number) {
  camS = 0.85
  camX = mw.offsetWidth / 2 - col * TS * camS - TS * camS / 2
  camY = mw.offsetHeight / 2 - row * TS * camS - TS * camS / 2
  updCam()
}
mw.addEventListener('touchstart', e => {
  if (e.touches.length === 1) { drag = { x: e.touches[0].clientX, y: e.touches[0].clientY }; dragO = { x: camX, y: camY }; dragMoved = false; mw.classList.add('grabbing') }
  if (e.touches.length === 2) pinchD = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
}, { passive: true })
mw.addEventListener('touchmove', e => {
  if (e.touches.length === 1 && drag && dragO) { const dx = e.touches[0].clientX - drag.x, dy = e.touches[0].clientY - drag.y; if (Math.sqrt(dx * dx + dy * dy) > 8) dragMoved = true; camX = dragO.x + dx; camY = dragO.y + dy; updCam() }
  if (e.touches.length === 2 && pinchD) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); camS = Math.max(0.4, Math.min(2.5, camS * d / pinchD)); pinchD = d; updCam() }
}, { passive: true })
mw.addEventListener('touchend', () => { drag = null; pinchD = null; mw.classList.remove('grabbing') })
let dragMoved = false
mw.addEventListener('mousedown', e => { drag = { x: e.clientX, y: e.clientY }; dragO = { x: camX, y: camY }; dragMoved = false; mw.classList.add('grabbing') })
window.addEventListener('mousemove', e => { if (drag && dragO) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.sqrt(dx * dx + dy * dy) > 5) dragMoved = true; camX = dragO.x + dx; camY = dragO.y + dy; updCam() } })
window.addEventListener('mouseup', () => { drag = null; mw.classList.remove('grabbing') })
mw.addEventListener('wheel', e => { e.preventDefault(); camS = Math.max(0.4, Math.min(2.5, camS * (e.deltaY < 0 ? 1.1 : 0.9))); updCam() }, { passive: false })

// ── TILE CLICK ────────────────────────────────────────────────────────────────
let popTO: ReturnType<typeof setTimeout> | null = null
function onTileClick(ti: Tile) {
  document.getElementById('tpop')!.classList.remove('show')
  if (G.placingBldg) { placeBuilding(G.placingBldg, ti); return }
  if (!G.hqPlaced) { addLog('Open BUILD menu → SHELTER → place Headquarters first', 'warn'); return }
  showTilePop(ti)
}
function showTilePop(ti: Tile) {
  if (popTO) clearTimeout(popTO)
  const pop = document.getElementById('tpop')!
  const titles: Record<string, string> = { grass: 'Grassland', forest: 'Forest', water: 'Water Source', soil: 'Fertile Soil', rock: 'Rocky Ground', ore: 'Ore Deposit', road: 'Old Road' }
  let title = ti.bldg ? (BLDGS.find(b => b.id === ti.bldg!.id) || { name: 'HQ' }).name : titles[ti.type] || ti.type

  let body = ''
  if (ti.bldg) {
    if (ti.bldg.buildTime > 0) body = 'Under construction: ' + Math.round((1 - ti.bldg.buildTime / (ti.bldg as any).totalTime) * 100) + '%'
    else {
      if (ti.bldg.id === 'storehouse' || ti.bldg.id === 'hq') body = 'Contents: ' + (Object.entries(G.res).filter(([, v]) => v > 0).map(([k, v]) => k + ': ' + Math.floor(v)).join(', ') || 'empty')
      if (ti.bldg.field) body = 'Crop: ' + (ti.bldg.crop || 'none') + ' · ' + ((ti.bldg.phase || '?').toUpperCase()) + ' ' + Math.round(ti.bldg.growth || 0) + '%'
      if (ti.bldg.id === 'workshop') body = 'Tap CRAFT tab to make tools'
    }
  } else {
    if (ti.type === 'forest') body = 'Timber available: ' + ti.resAmt
    else if (ti.type === 'ore') body = 'Ore: ' + ti.resAmt
    else if (ti.type === 'rock') body = 'Stone: ' + ti.resAmt
    else if (ti.type === 'water') body = 'Permanent water source\nTap → Fetch Water to send a Porter here.\nWater stock: ' + Math.floor(G.res.water)
    else if (ti.type === 'soil') body = 'Fertile soil — good for fields'
    if (ti.res && ti.resAmt > 0) body += ' · ' + ti.res + ': ' + ti.resAmt
    if (ti.resPile && (ti.resPile as any).amount > 0) body += ' · Pile: ' + (ti.resPile as any).type + '×' + (ti.resPile as any).amount
  }

  const actions: Array<{ label: string; fn: () => void }> = []
  if (!ti.bldg) {
    if (ti.type === 'water') actions.push({ label: '💧 Fetch Water (Porter)', fn: () => assignWaterFetch(ti) })
    if (ti.type === 'forest' && ti.resAmt > 0) actions.push({ label: '🪵 Gather Wood', fn: () => assignPriorityTask('LUMBERJACK', ti) })
    if (ti.type === 'ore' && ti.resAmt > 0) actions.push({ label: '⛏ Mine Ore', fn: () => assignPriorityTask('MINER', ti) })
    if (ti.type === 'rock' && ti.resAmt > 0) actions.push({ label: '🪨 Quarry Stone', fn: () => assignPriorityTask('STONEMASON', ti) })
    if ((ti.res === 'berries' || ti.res === 'mushrooms') && ti.resAmt > 0) actions.push({ label: '🧺 Gather', fn: () => assignPriorityTask('GATHERER', ti) })
    if (ti.resPile && (ti.resPile as any).amount > 0) actions.push({ label: '🎒 Carry to Store', fn: () => assignPriorityTask('PORTER', ti) })
  }
  if (ti.bldg?.id === 'workshop' && ti.bldg.buildTime <= 0) actions.push({ label: '🔧 Open Workshop', fn: () => openWorkshop() })
  if (ti.bldg?.id === 'forge' && ti.bldg.buildTime <= 0) actions.push({ label: '⚒ Open Forge', fn: () => openCraftShop('forge') })
  if (ti.bldg?.id === 'well' && ti.bldg.buildTime <= 0) actions.push({ label: '💧 Fetch Water (Porter)', fn: () => assignWaterFetch(ti) })

  document.getElementById('tpt')!.textContent = title
  const bp = document.getElementById('tpb')!
  bp.innerHTML = '<div style="margin-bottom:4px;color:var(--textdim);font-size:10px">' + body + '</div>'
  actions.forEach(a => {
    const btn = document.createElement('button')
    btn.style.cssText = 'display:block;width:100%;margin-top:3px;background:var(--bg3);border:1px solid var(--border);color:var(--text);font-family:Share Tech Mono,monospace;font-size:10px;padding:4px 6px;cursor:pointer;text-align:left;'
    btn.textContent = a.label
    btn.addEventListener('click', e => { e.stopPropagation(); pop.classList.remove('show'); a.fn() })
    bp.appendChild(btn)
  })
  pop.style.pointerEvents = 'auto'
  const rect = mw.getBoundingClientRect()
  const tx = (ti.col * TS + TS) * camS + camX, ty = (ti.row * TS) * camS + camY
  pop.style.left = Math.min(tx + 4, rect.width - 195) + 'px'
  pop.style.top = Math.max(ty - 90, 4) + 'px'
  pop.classList.add('show')
  popTO = setTimeout(() => pop.classList.remove('show'), 5000)
}

function assignWaterFetch(ti: Tile) {
  const porters = G.colonists.filter(c => !c.dead && !c.sleeping && c.role === 'PORTER')
  const target = porters.length
    ? porters.reduce((a, b) => (Math.abs(a.col - ti.col) + Math.abs(a.row - ti.row)) < (Math.abs(b.col - ti.col) + Math.abs(b.row - ti.row)) ? a : b)
    : G.colonists.find(c => !c.dead && !c.sleeping && c.action === 'IDLE')
  if (!target) { addLog('No one available to fetch water!', 'warn'); return }
  ;(target as any).waterTask = { col: ti.col, row: ti.row }
  ;(target as any).priorityTarget = { col: ti.col, row: ti.row }
  markTileTask(ti)
  addLog(target.name + ' → fetching water', 'normal')
}

function markTileTask(ti: Tile) {
  if (!ti._el) return
  const existing = ti._el.querySelector('.task-mark')
  if (existing) return
  const mark = document.createElement('div')
  mark.className = 'task-mark'
  mark.style.cssText = 'position:absolute;inset:0;border:2px solid var(--accent2);pointer-events:none;z-index:5;animation:taskPulse 1s ease infinite;'
  ti._el.appendChild(mark)
  setTimeout(() => mark.remove(), 8000)
}

function assignPriorityTask(role: string, ti: Tile) {
  const candidates = G.colonists.filter(c => !c.dead && !c.sleeping && c.role === role)
  if (!candidates.length) {
    const idle = G.colonists.find(c => !c.dead && !c.sleeping && c.action === 'IDLE')
    if (idle) { (idle as any).priorityTarget = { col: ti.col, row: ti.row, role }; addLog(idle.name + ' → ' + role + ' task assigned', 'good') }
    else addLog('No ' + role + ' available!', 'warn')
    return
  }
  const nearest = candidates.reduce((a, b) => {
    const da = Math.abs(a.col - ti.col) + Math.abs(a.row - ti.row)
    const db = Math.abs(b.col - ti.col) + Math.abs(b.row - ti.row)
    return da < db ? a : b
  })
  ;(nearest as any).priorityTarget = { col: ti.col, row: ti.row, role }
  addLog(nearest.name + ' → ' + role + ' priority task', 'good')
}

// ── HQ & BUILDINGS ────────────────────────────────────────────────────────────
function placeHQ(ti: Tile) {
  if (G.hqPlaced) { addLog('HQ already placed!', 'warn'); G.placingBldg = null; document.getElementById('phint')!.classList.remove('show'); return }
  if (ti.type === 'water') { addLog("Can't place on water", 'warn'); return }
  ti.bldg = { id: 'hq', buildTime: 0, name: 'HQ', ico: '🏚', lv: 1, cat: 'SHELTER' } as any
  G.hqCol = ti.col; G.hqRow = ti.row; G.hqPlaced = true
  G.buildings.push({ id: 'hq', col: ti.col, row: ti.row, lv: 1 } as any)
  G.colonists.forEach(c => { c.col = ti.col + rnd(-1, 1); c.row = ti.row + rnd(-1, 1); c.targetCol = c.col; c.targetRow = c.row })
  refreshTileEl(ti); refreshSprites()
  document.getElementById('phint')!.classList.remove('show')
  G.paused = false; updPauseBtn()
  addLog('Headquarters established!', 'good')
  addLog('Early goals: Tent → Campfire → Field → Storehouse.', 'lore')
  addLog('Assign roles and start building. Night is full rest: no work until morning.', 'normal')
  renderLog()
  setTimeout(() => centerOn(ti.col, ti.row), 100)
  G.heraldTimer = rnd(200, 360)
}

function placeBuilding(bd: BuildingDef, ti: Tile) {
  if ((bd as any).isHQ) { placeHQ(ti); return }
  if (ti.bldg) { addLog('Tile occupied', 'warn'); return }
  if (ti.type === 'water') { addLog("Can't build on water", 'warn'); return }
  if (!G.hqPlaced) { addLog('Place HQ first!', 'warn'); return }
  for (const [r, a] of Object.entries(bd.cost)) {
    if ((G.res[r as ResourceKey] || 0) < (a as number)) { addLog('Need ' + a + ' ' + r + ' for ' + bd.name, 'warn'); return }
  }
  for (const [r, a] of Object.entries(bd.cost)) G.res[r as ResourceKey] -= (a as number)
  const crop = bd.field ? ((bd as any)._selectedCrop || 'wheat') : null
  finishPlace(bd, ti, crop)
}

function finishPlace(bd: BuildingDef, ti: Tile, crop: string | null) {
  if (crop) G.res.seeds = Math.max(0, G.res.seeds - 5)
  ti.bldg = { id: bd.id, buildTime: bd.time, totalTime: bd.time, lv: 1, field: !!bd.field, crop, growth: 0, phase: 'seeding', seedTimer: 0, paused: false, name: bd.name, ico: bd.ico, cat: bd.cat } as any
  G.buildings.push({ id: bd.id, col: ti.col, row: ti.row, lv: 1, paused: false, field: !!bd.field, crop, growth: 0, phase: 'seeding', seedTimer: 0 } as any)
  if (bd.shelter) G.shelter += bd.shelter
  if (bd.id === 'storehouse' && (G as any).groundSupplies) {
    const gs = (G as any).groundSupplies
    gs.resPile = null; (G as any).groundSupplies = null
    addLog('Supplies stored in Storehouse!', 'good')
    refreshTileEl(gs)
  }
  refreshTileEl(ti); renderResources()
  addLog('Building: ' + bd.ico + ' ' + bd.name, 'warn')
  G.placingBldg = null; document.getElementById('phint')!.classList.remove('show')
  G.paused = false; updPauseBtn()
}

// ── SPRITES ───────────────────────────────────────────────────────────────────
function dollHTML(c: Colonist) {
  if (!c.visual) c.visual = { skin: pick(SKINS), hair: pick(HAIRS), hairStyle: pick(HAIR_STYLES), body: c.color }
  const v = c.visual
  return `<div class="doll" style="--col:${v.body || c.color};--skin:${v.skin};--hair:${v.hair}"><div class="doll-body"></div><div class="doll-head"></div><div class="doll-hair ${v.hairStyle || 'cap'}"></div><div class="doll-face"></div><div class="doll-mark"></div></div>`
}
function refreshSprites() {
  document.querySelectorAll('.spr').forEach(e => e.remove())
  G.colonists.filter(c => !c.dead).forEach(c => {
    const sp = document.createElement('div'); sp.className = 'spr' + (c.sleeping ? ' zzz' : '')
    sp.id = 'sp-' + c.id; sp.title = c.name; sp.innerHTML = dollHTML(c)
    sp.addEventListener('click', e => { e.stopPropagation(); selCol(c.id) })
    document.getElementById('mapcanvas')!.appendChild(sp)
    posSprite(c)
  })
}
function posSprite(c: Colonist) {
  const sp = document.getElementById('sp-' + c.id); if (!sp) return
  const ox = (c.id % 3) * 6 - 6, oy = Math.floor(c.id / 3) * 5 - 5
  sp.style.left = (c.col * TS + TS / 2 - 13 + ox) + 'px'; sp.style.top = (c.row * TS + TS / 2 - 27 + oy) + 'px'
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function renderSidebar() {
  const list = document.getElementById('collist')!; list.innerHTML = ''
  G.colonists.forEach(c => {
    const hpC = c.hp / c.maxHp > 0.6 ? '#3a8030' : c.hp / c.maxHp > 0.3 ? '#907010' : '#902010'
    const mC = c.mood > 60 ? '#3a8030' : c.mood > 35 ? '#907010' : '#902010'
    const topSk = Object.entries(c.skill || {}).sort((a, b) => b[1] - a[1])[0]
    const debuf = !c.dead && c.role && (c.prefs[c.role] || 1) <= 2 && (c.skill[c.role] || 0) < 60
    const card = document.createElement('div'); card.className = 'cc' + (G.selectedCol === c.id ? ' sel' : '')
    card.innerHTML = `<div class="ccn"><span class="ccd" style="background:${c.color}"></span>${c.name}${c.dead ? ' ✝' : ''}</div>
      <div class="ccr">${c.dead ? 'DECEASED' : (PICO[c.role] || '') + ' ' + (c.role || '')}</div>
      <div class="ccs">${c.action || 'IDLE'}${c.sick ? ' 🤒' : ''}</div>
      <div class="ccb">
        <div class="mbr"><span class="mbl">HP</span><div class="mb"><div class="mbf" style="width:${c.hp / c.maxHp * 100}%;background:${hpC}"></div></div><span style="font-size:8px;color:${hpC}">${c.hp}</span></div>
        <div class="mbr"><span class="mbl">😊</span><div class="mb"><div class="mbf" style="width:${c.mood}%;background:${mC}"></div></div></div>
        <div class="mbr"><span class="mbl" title="${topSk ? topSk[0] : 'skill'}">★</span><div class="mb"><div class="mbf" style="width:${topSk ? topSk[1] : 0}%;background:#3a70a0"></div></div><span style="font-size:8px;color:var(--dim)">${topSk ? topSk[0].slice(0, 4) + ' ' + topSk[1] + '%' : '—'}</span></div>
      </div>
      <div class="ccs" style="color:${(!c.tool || c.tool.type === '—') && PROF_TOOL[c.role] ? 'var(--danger)' : 'var(--dim)'}">${c.tool && c.tool.type && c.tool.type !== '—' ? '🔧 ' + c.tool.type : '⚠ no tool'}</div>
      ${debuf ? '<div class="ccdf">⚡ mismatch</div>' : ''}
      ${c.hunger > 65 ? '<div class="ccdf">🍽 hungry</div>' : ''}
      ${c.thirst > 65 ? '<div class="ccdf">💧 thirsty</div>' : ''}`
    card.addEventListener('click', () => selCol(c.id))
    list.appendChild(card)
  })
}
function selCol(id: number) {
  G.selectedCol = G.selectedCol === id ? null : id
  renderSidebar()
  if (G.selectedCol !== null) showCdet(G.selectedCol)
  else document.getElementById('cdet')!.classList.remove('show')
}
function showCdet(id: number) {
  const c = G.colonists.find(x => x.id === id); if (!c) return
  const tr = TRAITS.find(t => t.id === c.trait)!
  document.getElementById('cdname')!.textContent = c.name
  ;(document.getElementById('cdname')! as HTMLElement).style.color = c.color
  let h = `<div class="cdr"><span class="cdl">Trait</span><span class="cdv">${tr.label}</span></div>
    <div class="cdr"><span class="cdl">HP</span><span class="cdv">${c.hp}/${c.maxHp}</span></div>
    <div class="cdr"><span class="cdl">Mood</span><span class="cdv">${c.mood}%</span></div>
    <div class="cdr"><span class="cdl">Action</span><span class="cdv">${c.action || 'IDLE'}</span></div>
    <div class="cdr"><span class="cdl">Tool</span><span class="cdv" style="color:${c.tool && c.tool.dur > 0 && c.tool.type !== '—' ? 'var(--accent)' : 'var(--danger)'}">${c.tool ? c.tool.type : '—'} ${c.tool && c.tool.type !== '—' ? c.tool.dur + '%' : ''}</span></div>
    <div class="cdr"><span class="cdl">Weapon</span><span class="cdv" style="color:var(--accent2)">${c.weapon ? c.weapon.type + ' ' + c.weapon.dur + '%' : 'none'}</span></div>
    <div style="font-size:9px;color:var(--textdim);margin:5px 0 3px">PREFS & SKILLS</div>`
  PROF.forEach(p => {
    const sk = c.skill[p] || 0, pr = c.prefs[p] || 1
    let st = ''; for (let i = 1; i <= 5; i++) st += `<span class="cds${i <= pr ? ' lit' : ''}" data-id="${id}" data-p="${p}" data-s="${i}">★</span>`
    h += `<div class="cdprow"><span class="cdpj">${PICO[p]} ${p.slice(0, 5)}</span><div class="cdst">${st}</div><span style="font-size:8px;color:var(--dim);margin-left:2px">${sk}%</span></div>`
  })
  document.getElementById('cdbody')!.innerHTML = h
  document.querySelectorAll('.cds').forEach(s => s.addEventListener('click', () => {
    const el = s as HTMLElement
    const col = G.colonists.find(x => x.id === parseInt(el.dataset.id!))
    if (col) { (col.prefs as any)[el.dataset.p!] = parseInt(el.dataset.s!); showCdet(id) }
  }))
  const cdet = document.getElementById('cdet')!
  cdet.style.borderColor = c.color
  cdet.classList.add('show')
}
document.getElementById('cdclose')!.addEventListener('click', () => {
  document.getElementById('cdet')!.classList.remove('show'); G.selectedCol = null; renderSidebar()
})

// ── BUILD ────────────────────────────────────────────────────────────────────
let activeCat = 'SHELTER'
const CATS = Object.keys(BCAT_DATA)

function renderBuild() {
  const cats = document.getElementById('bcats')!; cats.innerHTML = ''
  CATS.forEach(cat => {
    const b = document.createElement('div')
    b.className = 'bcat' + (cat === activeCat ? ' active' : '')
    b.title = cat; b.setAttribute('aria-label', cat); b.textContent = BCAT_DATA[cat]
    b.addEventListener('click', () => { activeCat = cat; renderBuild() })
    cats.appendChild(b)
  })
  const grid = document.getElementById('bgrid')!; grid.innerHTML = ''
  if (activeCat === 'OTHER' && !G.hqPlaced) {
    const hqBtn = document.createElement('div'); hqBtn.className = 'bb'
    hqBtn.innerHTML = '🏚 HEADQUARTERS <span class="bc">[free]</span>'
    hqBtn.addEventListener('click', () => {
      G.placingBldg = { isHQ: true, ico: '🏚', name: 'HEADQUARTERS' } as any
      document.getElementById('pname')!.textContent = '🏚 HEADQUARTERS'
      document.getElementById('phint')!.classList.add('show')
    })
    grid.appendChild(hqBtn)
  }
  BLDGS.filter(b => b.cat === activeCat).forEach(bd => {
    const lk = bd.lv > G.hqLevel; const btn = document.createElement('div'); btn.className = 'bb' + (lk ? ' lk' : '')
    const cost = Object.entries(bd.cost).map(([k, v]) => v + k[0].toUpperCase()).join('+')
    btn.title = bd.name + ' [' + cost + ']'
    btn.innerHTML = `<span class="bbi">${bd.ico}</span><span class="bbn">${bd.name}</span>`
    if (!lk) btn.addEventListener('click', () => showBuildConfirm(bd))
    grid.appendChild(btn)
  })
}

function resourceLabel(k: string) {
  return ({ food: 'FOOD', water: 'WATER', cooked: 'MEALS', wood: 'WOOD', stone: 'STONE', metal: 'METAL', copper: 'COPPER', meds: 'MEDS', seeds: 'SEEDS', cloth: 'CLOTH' }[k] || k.toUpperCase())
}
function resourceIcon(k: string) {
  return ({ food: '🌾', water: '💧', cooked: '🍞', wood: '🪵', stone: '🪨', metal: '⚙️', copper: '🟤', meds: '💊', seeds: '🌱', cloth: '🧶' }[k] || '⬡')
}
function canAffordCost(cost: Record<string, number>) {
  return Object.entries(cost).every(([r, a]) => (G.res[r as ResourceKey] || 0) >= a)
}
function showBuildConfirm(bd: BuildingDef) {
  if ((bd as any).isHQ) {
    if (G.hqPlaced) { addLog('HQ already built!', 'warn'); return }
    G.placingBldg = bd
    document.getElementById('pname')!.textContent = bd.ico + ' ' + bd.name
    document.getElementById('phint')!.classList.add('show')
    addLog('Tap a land tile to place your Headquarters.', 'warn')
    return
  }
  if (!G.hqPlaced) { addLog('Place your Headquarters first! (BUILD → OTHER)', 'danger'); return }
  const affordable = canAffordCost(bd.cost as Record<string, number>)
  G.paused = true; updPauseBtn()
  document.getElementById('mdt')!.textContent = bd.ico + ' ' + bd.name
  ;(document.getElementById('mdt')! as HTMLElement).style.color = affordable ? 'var(--accent2)' : 'var(--danger)'
  const costRows = Object.entries(bd.cost).map(([r, a]) => {
    const have = Math.floor(G.res[r as ResourceKey] || 0)
    const miss = have < (a as number)
    return `<div class="costrow ${miss ? 'missing' : 'ok'}"><span>${resourceIcon(r)} ${resourceLabel(r)}</span><span>${a} <span class="costhave">/ have ${have}</span></span></div>`
  }).join('')
  const missingNote = !affordable
    ? '<div class="buildnote warn">Not enough resources. Missing resources are marked red.</div>'
    : '<div class="buildnote">Press Build, then tap a valid land tile to place it.</div>'

  let cropSelector = '', selectedCrop = 'wheat'
  if (bd.field) {
    const crops = [
      { id: 'wheat', label: '🌾 Wheat', needsSeeds: true },
      { id: 'veg', label: '🥕 Veggies', needsSeeds: true },
      { id: 'cotton', label: '🌱 Cotton', needsSeeds: true },
    ]
    const hasSeeds = G.res.seeds > 0
    cropSelector = `<div style="margin:8px 0 4px;font-size:10px;color:var(--textdim);letter-spacing:1px">CHOOSE CROP:</div>
      <div style="display:flex;gap:5px;margin-bottom:8px;">` +
      crops.map(cr => `<button id="crop-${cr.id}" onclick="selectCrop('${cr.id}')" style="flex:1;padding:5px 3px;font-size:11px;background:var(--bg3);border:2px solid ${cr.id === 'wheat' ? 'var(--accent)' : 'var(--border)'};border-radius:3px;cursor:pointer;color:var(--text)">${cr.label}</button>`).join('') +
      `</div>` + (!hasSeeds ? '<div class="buildnote warn">⚠ No seeds! You need seeds to plant.</div>' : '<div class="buildnote">Seeds needed: 5 · Have: ' + Math.floor(G.res.seeds) + '</div>')
  }

  document.getElementById('mdp')!.innerHTML = `<div class="costlist">${costRows}</div>${cropSelector}${missingNote}`
  const be = document.getElementById('mdb')!; be.innerHTML = ''
  const buildBtn = document.createElement('button')
  buildBtn.className = 'mb2 ' + (affordable ? 'ok' : '')
  buildBtn.textContent = bd.field ? 'PLANT' : 'BUILD'
  buildBtn.disabled = !affordable || (!!bd.field && G.res.seeds <= 0)
  if (buildBtn.disabled) { buildBtn.style.opacity = '.45'; buildBtn.style.cursor = 'not-allowed' }
  buildBtn.addEventListener('click', () => {
    if (!canAffordCost(bd.cost as Record<string, number>)) { addLog('Not enough resources for ' + bd.name, 'warn'); return }
    if (bd.field && G.res.seeds <= 0) { addLog('No seeds to plant!', 'warn'); return }
    if (bd.field) (bd as any)._selectedCrop = selectedCrop
    G.placingBldg = bd
    document.getElementById('pname')!.textContent = bd.ico + ' ' + bd.name + (bd.field ? ' (' + selectedCrop + ')' : '')
    document.getElementById('phint')!.classList.add('show')
    document.getElementById('mdbg')!.classList.remove('show')
    G.paused = false; updPauseBtn()
    addLog('Choose tile for ' + bd.name, 'normal')
  })
  const cancelBtn = document.createElement('button')
  cancelBtn.className = 'mb2'; cancelBtn.textContent = 'CANCEL'
  cancelBtn.addEventListener('click', () => { document.getElementById('mdbg')!.classList.remove('show'); G.paused = false; updPauseBtn() })
  be.appendChild(buildBtn); be.appendChild(cancelBtn)
  document.getElementById('mdbg')!.classList.add('show')
  ;(window as any).selectCrop = function (id: string) {
    selectedCrop = id
    document.querySelectorAll('[id^="crop-"]').forEach(b => (b as HTMLElement).style.borderColor = 'var(--border)')
    const el = document.getElementById('crop-' + id)
    if (el) el.style.borderColor = 'var(--accent)'
  }
}

document.getElementById('phint')!.addEventListener('click', () => {
  if (!G.hqPlaced) return
  G.placingBldg = null; document.getElementById('phint')!.classList.remove('show')
})

// ── ASSIGN ────────────────────────────────────────────────────────────────────
function renderAssign() {
  const el = document.getElementById('assignp'); if (!el) return
  el.innerHTML = ''
  const alive = G.colonists.filter(c => !c.dead)
  if (!alive.length) { el.innerHTML = '<div style="font-size:9px;color:var(--textdim);padding:4px">No survivors</div>'; return }
  alive.forEach(col => {
    const row = document.createElement('div'); row.className = 'ar'
    const nameSpan = document.createElement('span')
    nameSpan.className = 'an'; nameSpan.style.color = col.color; nameSpan.textContent = col.name
    const sel = document.createElement('select'); sel.className = 'rs'
    PROF.forEach(p => {
      const o = document.createElement('option'); o.value = p
      o.textContent = PICO[p] + ' ' + p
      if (p === col.role) o.selected = true
      sel.appendChild(o)
    })
    sel.addEventListener('change', e => {
      if (col.tool && col.tool.type && col.tool.type !== '—') { returnToolToStock(col.tool); col.tool = { type: '—', dur: 0 } }
      col.role = (e.target as HTMLSelectElement).value as any
      if (G.enemies?.length && col.role !== 'GUARD') { col.targetCol = G.hqCol; col.targetRow = G.hqRow; col.action = 'FLEEING' }
      const needed = PROF_TOOL[col.role]
      if (needed) {
        const t = getToolFromStock(needed)
        if (t) { col.tool = t; addLog(col.name + ' → ' + col.role + ' (' + t.type + ')', 'good') }
        else addLog('⚠ ' + col.name + ' → ' + col.role + ': no ' + needed + '!', 'danger')
      } else { col.tool = { type: '—', dur: 100 }; addLog(col.name + ' → ' + col.role) }
      renderSidebar()
    })
    row.appendChild(nameSpan); row.appendChild(sel); el.appendChild(row)
  })
}

// ── LOG ───────────────────────────────────────────────────────────────────────
function addLog(msg: string, type: string = 'normal') {
  const h = String(G.hour).padStart(2, '0'), m = String(G.minute).padStart(2, '0')
  const ico = type === 'good' ? '✅' : type === 'danger' ? '🔴' : type === 'warn' ? '⚠️' : type === 'lore' ? '📜' : '·'
  G.log.unshift({ t: 'D' + G.day + ' ' + h + ':' + m, msg, type: type as any, ico } as any)
  if (G.log.length > 50) G.log.pop()
  if (type === 'warn' || type === 'danger') SFX.warn()
  else if (type === 'good') SFX.up()
  else SFX.msg()
  renderLog()
  const tq = document.getElementById('taskqueue')
  if (tq) {
    const recent = (G.log as any[]).filter(e => e.type !== 'normal').slice(0, 3)
    tq.innerHTML = recent.map((e: any) => `<div class="tq-line">${e.ico} ${e.msg}</div>`).join('')
  }
}
function renderLog() {
  document.getElementById('logp')!.innerHTML = (G.log as any[]).slice(0, 14).map((e: any) =>
    `<div class="ll"><span class="lt">${e.t}</span><span class="lm ${e.type}"><span class="li-ico">${e.ico || '·'}</span>${e.msg}</span></div>`
  ).join('')
}

// ── RESOURCES ─────────────────────────────────────────────────────────────────
const lastRes: Record<string, number | null> = { food: null, water: null, cooked: null, wood: null, stone: null, metal: null, copper: null, meds: null, seeds: null, cloth: null }
function renderResources() {
  let up = false, down = false
  ;(['food', 'water', 'cooked', 'wood', 'stone', 'metal', 'copper', 'meds', 'seeds', 'cloth'] as ResourceKey[]).forEach(k => {
    const el = document.getElementById('r-' + k); if (!el) return
    const v = Math.floor(G.res[k] || 0)
    if (lastRes[k] !== null && v !== lastRes[k]) {
      const box = el.closest('.ri')
      if (box) { box.classList.remove('res-up', 'res-down'); void (box as HTMLElement).offsetWidth; box.classList.add(v > lastRes[k]! ? 'res-up' : 'res-down') }
      if (v > lastRes[k]!) up = true; else down = true
    }
    el.textContent = String(v); lastRes[k] = v
  })
  if (down) SFX.down(); else if (up) SFX.up()
}

// ── TOOL SYSTEM ───────────────────────────────────────────────────────────────
function getToolFromStock(toolType: string) {
  if (!toolType) return null
  if (!G.toolStock) G.toolStock = {}
  const key = toolType.replace(/ /g, '_')
  if ((G.toolStock[key] || 0) > 0) { G.toolStock[key]--; return { type: toolType, dur: 80 } }
  return null
}
function returnToolToStock(tool: { type: string; dur: number }) {
  if (!tool?.type) return
  if (!G.toolStock) G.toolStock = {}
  const key = tool.type.replace(/ /g, '_')
  G.toolStock[key] = (G.toolStock[key] || 0) + 1
}

// ── AI / WORK ─────────────────────────────────────────────────────────────────
function getTarget(c: Colonist) {
  const hq = { col: G.hqCol, row: G.hqRow }
  const bof = (...ids: string[]) => {
    const b = (G.buildings as any[]).find(x => ids.includes(x.id) && !x.paused)
    return b ? { col: b.col, row: b.row } : null
  }
  const ftile = (type: string, needRes = false) => G.tiles.find(t => t.type === type && (!needRes || t.resAmt > 0)) || null
  if (c.sleeping) return hq
  if ((c as any).priorityTarget) {
    const pt = (c as any).priorityTarget
    const dist = Math.sqrt(Math.pow(c.col - pt.col, 2) + Math.pow(c.row - pt.row, 2))
    if (dist < 0.9) {
      if ((c as any).waterTask) { G.res.water += 20; addLog(c.name + ' fetched water 💧', 'good'); (c as any).waterTask = null }
      ;(c as any).priorityTarget = null
    } else return pt
  }
  switch (c.role) {
    case 'FARMER': return bof('field') || ftile('soil') || hq
    case 'LUMBERJACK': {
      const mill = bof('lumbermill'); if (mill) return mill
      const forests = G.tiles.filter(t => t.type === 'forest' && t.resAmt > 0)
      if (!forests.length) return hq
      return forests[c.id % forests.length]
    }
    case 'MINER': {
      const mine = bof('mine'); if (mine) return mine
      const ores = G.tiles.filter(t => t.type === 'ore' && t.resAmt > 0)
      if (!ores.length) return hq
      return ores[c.id % ores.length]
    }
    case 'STONEMASON': {
      const cutter = bof('stonecutter'); if (cutter) return cutter
      const rocks = G.tiles.filter(t => t.type === 'rock' && t.resAmt > 0)
      if (!rocks.length) return hq
      return rocks[c.id % rocks.length]
    }
    case 'BLACKSMITH': return bof('forge') || hq
    case 'COOK': return bof('kitchen', 'campfire') || hq
    case 'MEDIC': return bof('infirmary') || hq
    case 'TAILOR': return bof('weaver') || hq
    case 'BUILDER': return G.tiles.find(t => t.bldg && t.bldg.buildTime > 0) || hq
    case 'HUNTER': return ftile('grass') || hq
    case 'PORTER': return G.tiles.find(t => t.resPile && (t.resPile as any).amount > 0) || (c.carryAmt > 0 ? (bof('storehouse') || hq) : hq)
    case 'GUARD': return bof('barracks') || hq
    case 'GATHERER': {
      const patches = G.tiles.filter(t => (t.res === 'berries' || t.res === 'mushrooms') && t.resAmt > 0)
      return patches.length ? patches[c.id % patches.length] : hq
    }
    default: return hq
  }
}

function doWork(c: Colonist) {
  if (c.sleeping || c.dead) return
  const isNight = isNightTime()
  if (isNight) { c.action = 'SLEEPING'; return }
  const tr = TRAITS.find(t => t.id === c.trait)!
  const sk = c.skill[c.role] || 0
  const pref = c.prefs[c.role] || 1
  const eff = (pref <= 2 && sk < 60) ? 0.6 : 1.0
  const hasTool = c.tool && c.tool.type && c.tool.type !== '—' && c.tool.dur > 0
  const toolMod = hasTool ? 1.0 : 0.3
  const chance = 0.08 * eff * tr.speed * toolMod
  switch (c.role) {
    case 'LUMBERJACK': {
      const ti = G.tiles.find(t => t.col === Math.round(c.col) && t.row === Math.round(c.row) && t.type === 'forest' && t.resAmt > 0)
      if (ti) {
        if (Math.random() < chance) { const a = Math.min(2, ti.resAmt); ti.resAmt -= a; addPile(ti, 'wood', a); refreshTileEl(ti) }
        c.action = 'CHOPPING'
      } else {
        const any = G.tiles.find(t => t.type === 'forest' && t.resAmt > 0)
        if (any) { c.targetCol = any.col; c.targetRow = any.row; c.action = 'WALKING TO FOREST' }
        else c.action = 'IDLE'
      }
      if (!G.buildings.some(b => (b as any).id === 'storehouse') && !G.colonists.some(x => x.role === 'PORTER' && !x.dead)) {
        const pile = G.tiles.find(t => t.resPile && (t.resPile as any).amount > 0 && (t.resPile as any).type === 'wood')
        if (pile && Math.sqrt(Math.pow(c.col - pile.col, 2) + Math.pow(c.row - pile.row, 2)) < 0.9) {
          G.res.wood = (G.res.wood || 0) + (pile.resPile as any).amount; pile.resPile = null; refreshTileEl(pile)
        }
      }
      break
    }
    case 'MINER': {
      const ti = G.tiles.find(t => t.col === Math.round(c.col) && t.row === Math.round(c.row) && t.type === 'ore' && t.resAmt > 0)
      if (ti && Math.random() < chance * 0.7) {
        const a = 1; ti.resAmt -= a
        const hp2 = G.colonists.some(x => !x.dead && x.role === 'PORTER'), hs2 = G.buildings.some(b => (b as any).id === 'storehouse' || (b as any).id === 'hq')
        if (hp2 && hs2) addPile(ti, 'metal', a); else G.res.metal = (G.res.metal || 0) + a
        refreshTileEl(ti); c.action = 'MINING'
      } else c.action = ti ? 'MINING' : 'WALKING'
      break
    }
    case 'STONEMASON': {
      const ti = G.tiles.find(t => t.col === Math.round(c.col) && t.row === Math.round(c.row) && t.type === 'rock' && t.resAmt > 0)
      if (ti && Math.random() < chance) {
        const a = Math.min(2, ti.resAmt); ti.resAmt -= a
        const hp3 = G.colonists.some(x => !x.dead && x.role === 'PORTER'), hs3 = G.buildings.some(b => (b as any).id === 'storehouse' || (b as any).id === 'hq')
        if (hp3 && hs3) addPile(ti, 'stone', a); else G.res.stone = (G.res.stone || 0) + a
        refreshTileEl(ti); c.action = 'QUARRYING'
      } else c.action = ti ? 'QUARRYING' : 'WALKING'
      break
    }
    case 'FARMER': {
      const allFields = G.tiles.filter(t => t.bldg && t.bldg.field && !(t.bldg as any).paused && t.bldg.buildTime <= 0)
      const fieldTile = allFields.find(t => t.bldg!.phase === 'harvest') || allFields.find(t => t.bldg!.phase === 'seeding') || allFields[0]
      if (fieldTile) {
        const fb = fieldTile.bldg!
        if (!fb.phase) fb.phase = 'seeding'
        c.targetCol = fieldTile.col; c.targetRow = fieldTile.row
        const dist = Math.sqrt(Math.pow(c.col - fieldTile.col, 2) + Math.pow(c.row - fieldTile.row, 2))
        if (dist < 1.0) {
          if (fb.phase === 'seeding') {
            if (!(fb as any).seedTimer) (fb as any).seedTimer = 0
            ;(fb as any).seedTimer++; c.action = 'SEEDING'
            if ((fb as any).seedTimer >= 60) { fb.phase = 'growing'; (fb as any).seedTimer = 0; fb.growth = 0; addLog('Field seeded with ' + fb.crop + '! Now growing.', 'good'); refreshTileEl(fieldTile) }
          } else if (fb.phase === 'growing') {
            c.action = 'TENDING'
            fb.growth = Math.min(100, (fb.growth || 0) + 0.025)
            if (fb.growth >= 100) { fb.phase = 'harvest'; addLog(fb.crop + ' ready to harvest!', 'good'); refreshTileEl(fieldTile) }
          } else if (fb.phase === 'harvest') {
            c.action = 'HARVESTING'; G.res.food += rnd(15, 25)
            fb.phase = 'seeding'; (fb as any).seedTimer = 0; fb.growth = 0
            addLog(c.name + ' harvested ' + fb.crop + '!', 'good'); refreshTileEl(fieldTile)
          }
        } else c.action = '→ FIELD'
      } else c.action = 'IDLE'
      break
    }
    case 'COOK': {
      const fire = (G.buildings as any[]).find(b => (b.id === 'campfire' || b.id === 'kitchen') && !b.paused)
      if (fire && G.res.food >= 10 && G.res.water >= 2 && Math.random() < 0.05) {
        G.res.food -= 10; G.res.water -= 2; G.res.cooked += 5; c.action = 'COOKING'; addLog(c.name + ' cooked 5 meals', 'good')
      } else c.action = fire ? 'COOKING' : 'IDLE'
      break
    }
    case 'HUNTER': if (Math.random() < 0.03) { G.res.food += rnd(3, 7); c.action = 'HUNTING'; addLog(c.name + ' caught game', 'good') } else c.action = 'HUNTING'; break
    case 'PORTER': {
      const hasStore = G.buildings.some(b => (b as any).id === 'storehouse' && !(b as any).paused)
      if (!hasStore) { c.action = 'IDLE'; break }
      if (!c.carryAmt) {
        const piles = G.tiles.filter(t => t.resPile && (t.resPile as any).amount > 0)
        if (piles.length > 0) {
          G.porterPileIdx = G.porterPileIdx % piles.length
          const pile = piles[G.porterPileIdx]
          c.targetCol = pile.col; c.targetRow = pile.row
          const dist = Math.sqrt(Math.pow(c.col - pile.col, 2) + Math.pow(c.row - pile.row, 2))
          if (dist < 0.8) {
            const take = Math.min(10, (pile.resPile as any).amount)
            ;(pile.resPile as any).amount -= take; c.carryType = (pile.resPile as any).type; c.carryAmt = take
            if ((pile.resPile as any).amount <= 0) pile.resPile = null
            refreshTileEl(pile)
            G.porterPileIdx = (G.porterPileIdx + 1) % Math.max(1, G.tiles.filter(t => t.resPile && (t.resPile as any).amount > 0).length)
            c.action = 'CARRYING ' + (c.carryType || '').toUpperCase()
          } else c.action = 'FETCHING ' + (pile.resPile as any).type
        } else c.action = 'IDLE'
      } else {
        const store = (G.buildings as any[]).find(b => b.id === 'storehouse' || b.id === 'hq')
        if (store) {
          c.targetCol = store.col; c.targetRow = store.row
          const dist = Math.sqrt(Math.pow(c.col - store.col, 2) + Math.pow(c.row - store.row, 2))
          if (dist < 0.8) {
            const deliveredType = (c.carryType === 'berries' || c.carryType === 'mushrooms') ? 'food' : c.carryType
            if (deliveredType) G.res[deliveredType as ResourceKey] = (G.res[deliveredType as ResourceKey] || 0) + c.carryAmt
            addLog(c.name + ' delivered ' + c.carryAmt + ' ' + c.carryType, 'good')
            c.carryType = null; c.carryAmt = 0; c.action = 'IDLE'
          } else c.action = 'DELIVERING'
        }
      }
      break
    }
    case 'GATHERER': {
      const ti = G.tiles.find(t => (t.res === 'berries' || t.res === 'mushrooms') && t.resAmt > 0 && Math.round(c.col) === t.col && Math.round(c.row) === t.row)
      if (ti && Math.random() < 0.12) { const a = Math.min(3, ti.resAmt); ti.resAmt -= a; addPile(ti, ti.res!, a); refreshTileEl(ti); c.action = 'GATHERING' }
      else { const any = G.tiles.find(t => (t.res === 'berries' || t.res === 'mushrooms') && t.resAmt > 0); c.targetCol = any ? any.col : G.hqCol; c.targetRow = any ? any.row : G.hqRow; c.action = any ? 'WALKING' : 'IDLE' }
      break
    }
    case 'BUILDER': {
      const sites = G.tiles.filter(t => t.bldg && t.bldg.buildTime > 0)
      const site = sites[0] || null
      if (site) {
        c.targetCol = site.col; c.targetRow = site.row
        const dist = Math.sqrt(Math.pow(c.col - site.col, 2) + Math.pow(c.row - site.row, 2))
        c.action = dist < 1.2 ? 'BUILDING' : 'WALKING TO SITE'
      } else c.action = 'IDLE'
      break
    }
    case 'MEDIC': {
      const patient = G.colonists.find(x => x.sick && x.id !== c.id && !x.dead)
      if (patient) { c.action = 'HEALING ' + patient.name; if (Math.round(c.col) === Math.round(patient.col) && Math.round(c.row) === Math.round(patient.row)) patient.sickTimer = Math.max(0, patient.sickTimer - 3) }
      else c.action = 'IDLE'
      break
    }
    default: c.action = 'IDLE'
  }
  if (c.role && c.action !== 'IDLE') c.skill[c.role] = Math.min(100, (c.skill[c.role] || 0) + (Math.random() < 0.04 ? 1 : 0))
  if (c.action !== 'IDLE' && c.action !== 'RESTING') c.tool.dur = Math.max(0, c.tool.dur - (Math.random() < 0.02 ? 1 : 0))
  if (c.tool.dur === 0) { addLog(c.name + "'s tool broke!", 'warn'); c.tool.dur = 10 }
}

function addPile(ti: Tile, type: string, amt: number) {
  if (!ti.resPile || (ti.resPile as any).type !== type) ti.resPile = { type, amount: 0, age: 0 } as any
  ;(ti.resPile as any).amount += amt
  refreshTileEl(ti)
}

// ── NIGHT / MEALS / HAPPY ─────────────────────────────────────────────────────
function updNight() {
  const night = isNightTime()
  const nl = document.getElementById('nightLabel')!
  const no = document.getElementById('night')!
  nl.style.display = night ? 'block' : 'none'
  no.style.opacity = night ? '0.35' : '0'
}

function checkMeals() {
  const alive = G.colonists.filter(c => !c.dead)
  const hour = G.hour
  if (hour === 8 || hour === 19) {
    const hasMeal = G.res.cooked > 0 || G.res.food > 0
    const hasWater = G.res.water > 0
    alive.forEach(c => {
      if (hasMeal) { if (G.res.cooked > 0) G.res.cooked -= 0.2; else G.res.food -= 0.2; c.hunger = Math.max(0, c.hunger - 30); c.mood = Math.min(100, c.mood + 3) }
      else { c.hunger += 20; addLog(c.name + ' went hungry — no food!', 'danger') }
      if (hasWater) { G.res.water -= 0.3; c.thirst = Math.max(0, c.thirst - 35) }
      else { c.thirst += 25; addLog(c.name + ' went thirsty — no water!', 'danger') }
    })
  }
  // passive hunger/thirst increase
  alive.forEach(c => { c.hunger = Math.min(100, c.hunger + 0.5); c.thirst = Math.min(100, c.thirst + 0.7) })
}

function updHappy() {
  const alive = G.colonists.filter(c => !c.dead)
  if (!alive.length) return
  G.happiness = Math.round(alive.reduce((s, c) => s + c.mood, 0) / alive.length)
  const hbf = document.getElementById('hbf')!
  hbf.style.width = G.happiness + '%'
  hbf.style.background = G.happiness > 60 ? 'var(--accent)' : G.happiness > 35 ? 'var(--warn)' : 'var(--danger)'
  document.getElementById('hpct')!.textContent = G.happiness + '%'
}

function addNewCol() {
  const name = pick(NAMES.filter(n => !G.colonists.some(c => c.name === n))) || 'SURVIVOR'
  const tr = pick(TRAITS)
  const prefs: Record<string, number> = {}
  PROF.forEach(p => prefs[p] = rnd(1, 5))
  const maxHp = Math.round(100 * tr.hp)
  const newCol: Colonist = {
    id: G.colonists.length, name, gender: (Math.random() > 0.5 ? 'M' : 'F') as 'M' | 'F',
    color: COLORS[G.colonists.length % COLORS.length],
    trait: tr.id, prefs: prefs as any, role: PROF[0], skill: {}, combatSkill: 0,
    hp: maxHp, maxHp, mood: 70, hunger: 20, thirst: 20,
    sick: false, sickTimer: 0, dead: false, sleeping: false, action: 'IDLE',
    col: G.hqCol + rnd(-2, 2), row: G.hqRow + rnd(-2, 2), targetCol: G.hqCol, targetRow: G.hqRow,
    carryType: null, carryAmt: 0,
    visual: { skin: pick(SKINS), hair: pick(HAIRS), hairStyle: pick(HAIR_STYLES), body: COLORS[G.colonists.length % COLORS.length] },
    tool: { type: '—', dur: 0 },
  }
  G.colonists.push(newCol)
  refreshSprites(); renderSidebar(); renderAssign()
  addLog(name + ' joined the colony!', 'good')
}

// ── HERALD / RAIDS ────────────────────────────────────────────────────────────
function heraldTributeCost() { return { food: 20 + G.day * 2, water: 15 } }

function triggerRaid() {
  G.enemies = G.enemies || []
  spawnEnemy('bandit')
  if (Math.random() < 0.5) spawnEnemy('bandit')
  triggerCombatMode()
  addLog('Raiders attack!', 'danger')
}

function checkHerald() {
  if (!G.hqPlaced) return
  if (G.heraldTimer > 0) {
    G.heraldTimer--
    if (G.heraldTimer === 0) {
      const cost = heraldTributeCost()
      showModal('THE HERALD',
        'A hooded figure approaches.\n"Pay tribute or face the consequences."\n\nTribute cost: ' + cost.food + ' Food, ' + cost.water + ' Water',
        [
          {
            label: 'PAY TRIBUTE', cls: 'ok', fn: () => {
              if (G.res.food >= cost.food && G.res.water >= cost.water) {
                G.res.food -= cost.food; G.res.water -= cost.water
                addLog('Tribute paid. The Herald departs.', 'good')
              } else {
                addLog('Not enough to pay tribute!', 'danger'); triggerRaid()
              }
              G.paused = false; updPauseBtn()
              G.heraldTimer = rnd(300, 500)
            }
          },
          {
            label: 'REFUSE', cls: 'danger', fn: () => {
              addLog('You refused the Herald. Raiders incoming!', 'danger')
              G.raidPending = true; G.raidTimer = rnd(10, 20)
              G.paused = false; updPauseBtn()
              G.heraldTimer = rnd(300, 500)
            }
          },
        ])
    }
  }
}

function tickConstruction() {
  G.tiles.filter(t => t.bldg && t.bldg.buildTime > 0).forEach(ti => {
    const builders = G.colonists.filter(c => !c.dead && c.role === 'BUILDER' && Math.sqrt(Math.pow(c.col - ti.col, 2) + Math.pow(c.row - ti.row, 2)) < 1.5)
    const rate = 1 + builders.length * 0.5
    ti.bldg!.buildTime = Math.max(0, ti.bldg!.buildTime - rate)
    if (ti.bldg!.buildTime <= 0) { addLog((ti.bldg as any).ico + ' ' + ti.bldg!.name + ' complete!', 'good'); refreshTileEl(ti) }
    else refreshTileEl(ti)
  })
}

function tickPiles() {
  G.tiles.filter(t => t.resPile && (t.resPile as any).age !== undefined).forEach(ti => {
    ;(ti.resPile as any).age = ((ti.resPile as any).age || 0) + 1
    if ((ti.resPile as any).age > 200) {
      addLog('Supplies rotting — build a Storehouse!', 'warn')
      ;(ti.resPile as any).amount = Math.max(0, (ti.resPile as any).amount - 1)
      if ((ti.resPile as any).amount <= 0) { ti.resPile = null; refreshTileEl(ti) }
    }
  })
}

// ── ADVISOR ───────────────────────────────────────────────────────────────────
function renderAdvisor() {
  const body = document.getElementById('advbody')!
  const alive = G.colonists.filter(c => !c.dead)
  const tips: string[] = []
  if (!G.hqPlaced) tips.push('📍 BUILD → OTHER to place HQ')
  if (G.hqPlaced && !G.buildings.some(b => (b as any).id === 'tent')) tips.push('⛺ Build a Tent — colonists need shelter')
  if (!G.buildings.some(b => (b as any).id === 'campfire' || (b as any).id === 'kitchen')) tips.push('🔥 Build a Campfire to cook food')
  if (G.res.food < 20) tips.push('🌾 LOW FOOD — build Field or send Hunter')
  if (G.res.water < 20) tips.push('💧 LOW WATER — send Porter to water source')
  if (alive.some(c => c.sick)) tips.push('🤒 Someone is ill — assign a Medic')
  if (alive.some(c => c.hunger > 70)) tips.push('🍽 Colonists are hungry!')
  if (alive.some(c => c.thirst > 70)) tips.push('💧 Colonists are thirsty!')
  body.innerHTML = (tips.length ? tips : ['✅ Colony stable']).map(t => `<div class="adv-tip">${t}</div>`).join('')
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function showModal(title: string, text: string, btns: Array<{ label: string; cls: string; fn: () => void }>, _danger = false) {
  G.paused = true; updPauseBtn()
  document.getElementById('mdt')!.textContent = title
  document.getElementById('mdp')!.textContent = text
  const be = document.getElementById('mdb')!; be.innerHTML = ''
  btns.forEach(b => {
    const btn = document.createElement('button'); btn.className = 'mb2 ' + b.cls; btn.textContent = b.label
    btn.addEventListener('click', () => { document.getElementById('mdbg')!.classList.remove('show'); b.fn() })
    be.appendChild(btn)
  })
  document.getElementById('mdbg')!.classList.add('show')
}

function updPauseBtn() {
  const b = document.getElementById('pbtn') as HTMLButtonElement
  b.textContent = G.paused ? '▶ PLAY' : '⏸ PAUSE'
  b.classList.toggle('paused', G.paused)
}

// ── PAUSE / SPEED BUTTONS ────────────────────────────────────────────────────
document.getElementById('pbtn')!.addEventListener('click', () => {
  if (!G.hqPlaced) return
  G.paused = !G.paused; updPauseBtn()
})
document.getElementById('spdbtn')!.addEventListener('click', () => {
  const speeds = [1, 2, 3]; const idx = speeds.indexOf(G.speed)
  G.speed = speeds[(idx + 1) % speeds.length]
  document.getElementById('spdbtn')!.textContent = '×' + G.speed
})

// ── GAME LOOP ─────────────────────────────────────────────────────────────────
let lastTick = 0
function loop() {
  requestAnimationFrame(loop)
  if (G.paused) return
  const now = Date.now()
  if (now - lastTick < TICK_MS / G.speed) return
  lastTick = now; tick()
}

function tick() {
  G.minute++
  if (G.minute >= 60) { G.minute = 0; G.hour++; hourTick() }
  if (G.hour >= 24) { G.hour = 0; G.day++; dayTick() }
  G.colonists.filter(c => !c.dead).forEach(c => {
    if (G.minute % 10 === 0 && !c.sleeping) {
      const t = getTarget(c)
      if (t) { const tgt = G.tiles[t.row * MAP_W + t.col]; if (tgt && tgt.type !== 'water') { c.targetCol = t.col; c.targetRow = t.row } }
    }
    const dc = c.targetCol - c.col, dr = c.targetRow - c.row, dist = Math.sqrt(dc * dc + dr * dr)
    const spd = 0.15
    if (dist > spd) { c.col += dc / dist * spd; c.row += dr / dist * spd }
    else { c.col = c.targetCol; c.row = c.targetRow }
    posSprite(c)
  })
  if (G.minute % 5 === 0) G.colonists.filter(c => !c.dead).forEach(doWork)
  if (G.minute % 3 === 0) tickConstruction()
  if (G.minute % 10 === 0) tickPiles()
  document.getElementById('hday')!.textContent = String(G.day)
  document.getElementById('hclock')!.textContent = String(G.hour).padStart(2, '0') + ':' + String(G.minute).padStart(2, '0')
  document.getElementById('hdr-season')!.textContent = SEASONS[G.season]
  updNight(); updHappy(); renderResources(); renderAdvisor()
  if (G.minute % 15 === 0) { renderSidebar(); renderLog() }
  if (G.enemies?.length) {
    tickCombat()
    G.colonists.filter(co => !co.dead && co.role !== 'GUARD').forEach(co => {
      const nearEnemy = G.enemies!.some(e => Math.sqrt(Math.pow(co.col - e.col, 2) + Math.pow(co.row - e.row, 2)) < 6)
      if (nearEnemy && co.action !== 'FLEEING') { co.targetCol = G.hqCol; co.targetRow = G.hqRow; co.action = 'FLEEING' }
      else if (!nearEnemy && co.action === 'FLEEING') co.action = 'IDLE'
    })
  }
  checkFirstRaid()
  if (G.raidPending && G.raidTimer > 0) {
    G.raidTimer--
    if (G.raidTimer <= 0) {
      G.raidPending = false
      if (!G.enemies) G.enemies = []
      spawnEnemy('bandit')
      if (Math.random() < 0.5) spawnEnemy('bandit')
      triggerCombatMode()
      addLog('Raiders attack!', 'danger')
    }
  }
}

function hourTick() {
  const alive = G.colonists.filter(c => !c.dead)
  alive.forEach(c => {
    if (c.hunger === 60 && !c._warnedHunger) { c._warnedHunger = true; addLog(c.name + ' is getting hungry', 'warn') }
    if (c.thirst === 60 && !c._warnedThirst) { c._warnedThirst = true; addLog(c.name + ' is getting thirsty', 'warn') }
    if (c.hunger < 60) c._warnedHunger = false
    if (c.thirst < 60) c._warnedThirst = false
    if (c.hunger >= 80) {
      const drain = Math.floor((c.hunger - 79) / 10) + 1; c.hp = Math.max(0, c.hp - drain)
      if (c.hunger >= 90 && !c._warnedStarving) { c._warnedStarving = true; addLog('⚠ ' + c.name + ' is STARVING! HP draining!', 'danger') }
    } else c._warnedStarving = false
    if (c.thirst >= 80) {
      const drain = Math.floor((c.thirst - 79) / 8) + 1; c.hp = Math.max(0, c.hp - drain)
      if (c.thirst >= 90 && !c._warnedDehydrated) { c._warnedDehydrated = true; addLog('⚠ ' + c.name + ' DEHYDRATED! HP draining!', 'danger') }
    } else c._warnedDehydrated = false
    if (c.hp <= 0 && !c.dead) {
      c.dead = true
      const cause = c.thirst >= 90 ? 'dehydration' : c.hunger >= 90 ? 'starvation' : c.sick ? 'illness' : 'wounds'
      addLog(c.name + ' died of ' + cause + '.', 'danger'); onDeath(c)
    }
    if (c.hunger >= 100 && !c.dead) { c.dead = true; addLog(c.name + ' starved.', 'danger'); onDeath(c) }
    if (c.thirst >= 100 && !c.dead) { c.dead = true; addLog(c.name + ' died of thirst.', 'danger'); onDeath(c) }
    const tr = TRAITS.find(t => t.id === c.trait)!
    if (!c.sick && Math.random() < 0.0007 * tr.sick) { c.sick = true; c.sickTimer = rnd(12, 48); addLog(c.name + ' fell ill - needs a medic!', 'warn') }
    if (c.sick) {
      c.sickTimer--; c.hp = Math.max(1, c.hp - rnd(1, 3))
      if (c.sickTimer <= 0) { c.sick = false; addLog(c.name + ' recovered', 'good') }
      if (c.hp <= 20 && !c.deathWarned) { c.deathWarned = true; addLog('⚠ ' + c.name + ' is critically ill!', 'danger') }
    } else {
      c.deathWarned = false
      if (c.hp < c.maxHp && c.hunger < 50 && c.thirst < 50) c.hp = Math.min(c.maxHp, c.hp + 1)
    }
    let md = -0.8
    if (c.hunger > 60) md -= 1; if (c.hunger > 85) md -= 2
    if (c.thirst > 60) md -= 1.5; if (c.thirst > 85) md -= 2.5
    if (c.sick) md -= 2
    const hasShelter = G.tiles.some(t => t.bldg && (t.bldg.id === 'tent' || t.bldg.id === 'house') && t.bldg.buildTime <= 0)
    if (!hasShelter && (G.hour < 6 || G.hour >= 20)) md -= 1.5
    const topPref = PROF.reduce((a, b) => (c.prefs[a] || 1) >= (c.prefs[b] || 1) ? a : b)
    if (c.role !== topPref && (c.skill[c.role] || 0) < 50) md -= 0.5
    if (c.hunger < 30 && c.thirst < 30) md += 0.3
    if (c.role === topPref && !c.sleeping) md += 0.4
    if (hasShelter) md += 0.2
    c.mood = Math.max(0, Math.min(100, c.mood + md + (Math.random() < 0.2 ? 0.3 : -0.1)))
  })
  checkMeals(); checkHerald()
  if (Math.random() < 0.015) randEvent()
  if (Math.random() < 0.007) loreNote()
  if (G.raidTimer > 0) {
    G.raidTimer--
    if (G.raidTimer === 0) {
      addLog('⚔ RAIDERS APPROACH FROM THE NORTH!', 'danger')
      showModal('RAID!',
        'A band of raiders is attacking your camp!\nYour colonists will defend automatically.\n\nKnife-armed colonists fight. Others flee to HQ.',
        [{
          label: 'DEFEND', cls: 'danger', fn: () => {
            const fighters = G.colonists.filter(c => !c.dead && (c.role === 'GUARD' || c.weapon))
            addLog('Your ' + fighters.length + ' fighters repel the attack.', 'good')
            if (fighters.length < 3 && G.colonists.filter(c => !c.dead).length > 1) {
              const victim = pick(G.colonists.filter(c => !c.dead && c.role !== 'GUARD'))
              if (victim) { victim.hp = Math.max(0, victim.hp - rnd(20, 50)); addLog(victim.name + ' was wounded in the raid!', 'danger') }
            }
            G.paused = false; updPauseBtn()
          }
        }])
    }
  }
}

function dayTick() {
  G.seasonDay++
  if (G.seasonDay >= 10) { G.seasonDay = 0; G.season = (G.season + 1) % 4; addLog('Season: ' + SEASONS[G.season], 'good') }
  G.tiles.filter(t => t.bldg?.field && t.bldg.phase === 'growing').forEach(t => {
    t.bldg!.growth = Math.min(100, (t.bldg!.growth || 0) + rnd(8, 15))
    if (t.bldg!.growth >= 100) { t.bldg!.phase = 'harvest'; addLog(t.bldg!.crop + ' ready to harvest!', 'good'); refreshTileEl(t) }
    else refreshTileEl(t)
  })
  addLog('— Day ' + G.day + ' —')
}

function onDeath(c: Colonist) {
  document.getElementById('sp-' + c.id)?.remove()
  G.colonists.filter(x => !x.dead).forEach(x => x.mood = Math.max(0, x.mood - 20))
  showModal('SURVIVOR LOST', c.name + ' has died.\n\nBuild a Grave (OTHER tab) — an unburied body\ndamages the morale of survivors nearby.',
    [{ label: 'UNDERSTOOD', cls: 'ok', fn: () => { G.paused = false; updPauseBtn() } }])
  renderSidebar()
}

function randEvent() {
  const evs = [
    { m: 'Scavenger found extra supplies!', t: 'good', fn: () => { G.res.food += rnd(5, 12); G.res.water += rnd(10, 20) } },
    { m: 'Strange static on all frequencies.', t: 'normal' },
    { m: 'A tool was misplaced. Work slowed.', t: 'warn' },
    { m: 'Distant howling in the night.', t: 'warn' },
    { m: 'Someone carved a symbol in the dirt.', t: 'lore' },
    { m: 'Mushrooms found near the water.', t: 'good', fn: () => { G.res.food += rnd(3, 6) } },
    { m: 'The eastern sky glows strangely orange.', t: 'normal' },
  ]
  const ev = pick(evs as any[]); if ((ev as any).fn) (ev as any).fn(); addLog((ev as any).m, (ev as any).t)
}

function loreNote() {
  const c = pick(G.colonists.filter(x => !x.dead)); if (!c) return
  showModal('NOTE FOUND', c.name + ' found a scrap of paper:\n\n' + pick(LORE),
    [{ label: 'READ & CONTINUE', cls: 'ok', fn: () => { G.paused = false; updPauseBtn() } }])
  addLog(c.name + ' found a note', 'lore')
}

// ── CRAFTING ──────────────────────────────────────────────────────────────────
function openCraftShop(shopId: string) {
  const tile = G.tiles.find(t => t.bldg?.id === shopId && t.bldg.buildTime <= 0)
  if (!tile) { addLog(shopId + ' not ready', 'warn'); return }
  const shopLv = (tile.bldg as any).lv || 1
  const name = shopId === 'workshop' ? 'WORKSHOP 🔧' : 'FORGE ⚒'
  const crafter = shopId === 'workshop' ? 'STONEMASON' : 'BLACKSMITH'
  const hasCrafter = G.colonists.some(co => !co.dead && co.role === crafter)
  const available = CRAFTS.filter(r => r.shop === shopId && r.lv <= shopLv)
  const header = hasCrafter ? '' : '⚠ No ' + crafter + ' - items will take longer.\n'
  showModal(name, header + 'Select item to craft.',
    available.map(r => {
      const canAfford = Object.entries(r.cost).every(([k, v]) => (G.res[k as ResourceKey] || 0) >= (v as number))
      const costStr = Object.entries(r.cost).map(([k, v]) => v + k[0].toUpperCase()).join('+')
      return {
        label: r.ico + ' ' + r.name + ' [' + costStr + ']',
        cls: canAfford ? 'ok' : '',
        fn: () => {
          if (!canAfford) { addLog('Not enough for ' + r.name, 'warn'); G.paused = false; updPauseBtn(); return }
          for (const [k, v] of Object.entries(r.cost)) G.res[k as ResourceKey] -= (v as number)
          if (r.weapon) {
            const t = G.colonists.find(co => !co.dead && co.role === 'GUARD' && !co.weapon) || G.colonists.find(co => !co.dead && !co.weapon)
            if (t) { t.weapon = { type: r.toolType, dur: r.dur }; addLog(r.ico + ' ' + r.name + ' → ' + t.name, 'good') }
            else addLog(r.ico + ' ' + r.name + ' stored', 'good')
          } else {
            const t = G.colonists.find(co => !co.dead && co.role === r.role && (!co.tool || co.tool.dur < 50)) || G.colonists.find(co => !co.dead && co.role === r.role)
            if (t) { t.tool = { type: r.toolType, dur: r.dur }; addLog(r.ico + ' ' + r.name + ' → ' + t.name, 'good') }
            else addLog(r.ico + ' ' + r.name + ' stored (no ' + r.role + ')', 'good')
          }
          renderResources(); G.paused = false; updPauseBtn()
        }
      }
    }).concat([{ label: 'CLOSE', cls: '', fn: () => { G.paused = false; updPauseBtn() } }])
  )
}
function openWorkshop() { openCraftShop('workshop') }
function openForge() { openCraftShop('forge') }

// ── COMBAT ────────────────────────────────────────────────────────────────────
function spawnEnemy(type: string) {
  const def = ENEMY_TYPES.find(e => e.id === type) || ENEMY_TYPES[0]
  const edges = [
    { col: 0, row: rnd(0, MAP_H - 1) },
    { col: MAP_W - 1, row: rnd(0, MAP_H - 1) },
    { col: rnd(0, MAP_W - 1), row: 0 },
    { col: rnd(0, MAP_W - 1), row: MAP_H - 1 },
  ]
  const spawn = pick(edges)
  const enemy: Enemy = {
    ...def, id: 'e' + Date.now(),
    col: spawn.col, row: spawn.row,
    targetCol: G.hqCol, targetRow: G.hqRow,
    dead: false, attackTimer: 0,
  }
  if (!G.enemies) G.enemies = []
  G.enemies.push(enemy)
  const sp = document.createElement('div')
  sp.id = 'enemy-' + enemy.id
  sp.style.cssText = `position:absolute;width:16px;height:16px;border-radius:2px;border:2px solid #8a1a08;background:${enemy.color};z-index:25;display:flex;align-items:center;justify-content:center;font-size:9px;box-shadow:0 1px 4px rgba(0,0,0,0.5);transition:left 0.4s,top 0.4s;`
  sp.textContent = enemy.ico
  document.getElementById('mapcanvas')!.appendChild(sp)
  posEnemy(enemy)
  return enemy
}

function posEnemy(e: Enemy) {
  const sp = document.getElementById('enemy-' + e.id); if (!sp) return
  sp.style.left = (e.col * TS + TS / 2 - 8) + 'px'
  sp.style.top = (e.row * TS + TS / 2 - 8) + 'px'
}

function removeEnemy(e: Enemy) {
  e.dead = true
  const sp = document.getElementById('enemy-' + e.id)
  if (sp) { sp.style.transform = 'scale(0)'; sp.style.opacity = '0'; setTimeout(() => sp.remove(), 400) }
  G.enemies = G.enemies!.filter(x => x.id !== e.id)
}

function calcDamage(attacker: { combatSkill?: number; damage?: number }, _defender: any) {
  const skill = attacker.combatSkill || 0
  const base = attacker.damage || 8
  return Math.max(1, Math.round(base * (0.3 + 0.7 * skill / 100)))
}

function punchAnim(spriteId: string) {
  const sp = document.getElementById(spriteId); if (!sp) return
  sp.style.transform = 'scale(1.4)'
  setTimeout(() => { if (sp) sp.style.transform = 'scale(1)' }, 150)
}

function triggerCombatMode() {
  G.combatMode = true; G.paused = true; updPauseBtn()
  G.colonists.filter(c => !c.dead && c.role !== 'GUARD').forEach(c => {
    const nearEnemy = G.enemies!.some(e => Math.sqrt(Math.pow(c.col - e.col, 2) + Math.pow(c.row - e.row, 2)) < 6)
    if (nearEnemy) { c.targetCol = G.hqCol; c.targetRow = G.hqRow; c.action = 'FLEEING' }
  })
}

function tickCombat() {
  if (!G.enemies!.length) {
    if (G.combatMode) { G.combatMode = false; addLog('Raiders repelled!', 'good') }
    return
  }
  const alive = G.colonists.filter(c => !c.dead)
  G.enemies!.forEach(enemy => {
    if (enemy.dead) return
    const guards = alive.filter(c => c.role === 'GUARD')
    const target: any = guards.length
      ? guards.reduce((a, b) => Math.hypot(a.col - enemy.col, a.row - enemy.row) < Math.hypot(b.col - enemy.col, b.row - enemy.row) ? a : b)
      : { col: G.hqCol, row: G.hqRow }
    const dc = target.col - enemy.col, dr = target.row - enemy.row
    const dist = Math.sqrt(dc * dc + dr * dr)
    if (dist > 0.9) {
      enemy.col += dc / dist * enemy.speed; enemy.row += dr / dist * enemy.speed
      posEnemy(enemy)
    } else {
      enemy.attackTimer = (enemy.attackTimer || 0) + 1
      if (enemy.attackTimer >= 20) {
        enemy.attackTimer = 0
        if ('hp' in target) {
          const dmg = calcDamage(enemy, target)
          target.hp = Math.max(0, target.hp - dmg)
          punchAnim('enemy-' + enemy.id); punchAnim('sp-' + target.id)
          addLog('⚔ ' + enemy.name + ' hit ' + target.name + ' for ' + dmg + ' dmg (HP: ' + target.hp + ')', 'danger')
          if (target.hp <= 0 && !target.dead) { target.dead = true; addLog(target.name + ' fell in battle!', 'danger'); onDeath(target) }
          target.combatSkill = Math.min(100, (target.combatSkill || 0) + rnd(1, 3))
        }
      }
    }
  })
  alive.filter(c => c.role === 'GUARD').forEach(guard => {
    const nearEnemy = G.enemies!.find(e => !e.dead && Math.hypot(guard.col - e.col, guard.row - e.row) < 1.5)
    if (nearEnemy) {
      guard.targetCol = nearEnemy.col; guard.targetRow = nearEnemy.row; guard.action = 'FIGHTING'
      guard.attackTimer = (guard.attackTimer || 0) + 1
      if (guard.attackTimer >= 18) {
        guard.attackTimer = 0
        const dmg = calcDamage({ combatSkill: guard.combatSkill || 0, damage: 10 + (guard.weapon ? 5 : 0) }, nearEnemy)
        nearEnemy.hp -= dmg
        punchAnim('sp-' + guard.id); punchAnim('enemy-' + nearEnemy.id)
        addLog('⚔ ' + guard.name + ' hit raider for ' + dmg, nearEnemy.hp <= 10 ? 'good' : 'normal')
        if (nearEnemy.hp <= 0) { addLog('Raider defeated!', 'good'); removeEnemy(nearEnemy) }
      }
    } else {
      const closest = G.enemies!.find(e => !e.dead)
      if (closest) { guard.targetCol = closest.col; guard.targetRow = closest.row; guard.action = 'PURSUING' }
    }
  })
  alive.filter(c => c.role === 'MEDIC').forEach(medic => {
    const wounded = alive.find(x => x.hp < x.maxHp * 0.7 && !x.dead && x.id !== medic.id)
    if (wounded) {
      medic.targetCol = wounded.col; medic.targetRow = wounded.row; medic.action = 'HEALING ' + wounded.name
      if (Math.hypot(medic.col - wounded.col, medic.row - wounded.row) < 1.0 && G.res.meds > 0) {
        G.res.meds--; wounded.hp = Math.min(wounded.maxHp, wounded.hp + rnd(15, 25))
        addLog('💊 ' + medic.name + ' healed ' + wounded.name, 'good')
      }
    }
  })
}

function checkFirstRaid() {
  if (!G.hqPlaced) return
  if (G.day >= (G.firstRaidDay || 999) && !G.firstRaidDone && G.minute === 0 && G.hour === 12) {
    G.firstRaidDone = true
    G.enemies = G.enemies || []
    spawnEnemy('bandit'); triggerCombatMode()
    addLog('⚔ A raider has been spotted!', 'danger')
  }
}

// ── START GAME ────────────────────────────────────────────────────────────────
function startGame() {
  document.getElementById('setup-screen')!.classList.remove('active')
  document.getElementById('game-screen')!.classList.add('active')
  genMap(); renderMap()
  G.colonists.forEach(c => c.role = PROF.reduce((a, b) => c.prefs[a] >= c.prefs[b] ? a : b))
  G.startingRes = { ...G.res }
  G.toolStock = {}
  G.colonists.forEach(c => {
    const needed = PROF_TOOL[c.role]
    if (needed) { const key = needed.replace(/ /g, '_'); G.toolStock[key] = (G.toolStock[key] || 0) + 1 }
  })
  G.colonists.forEach(c => {
    const needed = PROF_TOOL[c.role]
    if (needed) c.tool = { type: 'Stone ' + needed, dur: 80 }
    else c.tool = { type: '—', dur: 100 }
    c.weapon = { type: 'Stone Knife', dur: 60 }
  })
  G.firstRaidDay = rnd(8, 15)
  renderSidebar(); renderResources(); renderAdvisor(); renderBuild()
  setTimeout(() => { renderAssign(); renderLog(); renderSidebar() }, 50)
  document.getElementById('pname')!.textContent = '🏚 HEADQUARTERS — tap any land tile'
  document.getElementById('phint')!.classList.add('show')
  setTimeout(() => centerOn(MAP_W / 2, MAP_H / 2), 100)
  requestAnimationFrame(loop)
}

// suppress TS unused warnings for functions exposed to HTML onclick
;(window as any).openWorkshop = openWorkshop
;(window as any).openForge = openForge
;(window as any).addNewCol = addNewCol
