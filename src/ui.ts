import { G } from './state'
import { TRAITS, PROF, PICO, BLDGS, BCAT_DATA, PROF_TOOL, rnd } from './data'
import type { BuildingDef } from './types'
import { SFX } from './audio'
import { getToolFromStock, returnToolToStock } from './colonists'

// ── SIDEBAR ──
export function renderSidebar() {
  const list = document.getElementById('collist')!
  list.innerHTML = ''
  G.colonists.forEach((c) => {
    const tr = TRAITS.find((t) => t.id === c.trait)!
    const hpC = c.hp / c.maxHp > 0.6 ? '#3a8030' : c.hp / c.maxHp > 0.3 ? '#907010' : '#902010'
    const mC = c.mood > 60 ? '#3a8030' : c.mood > 35 ? '#907010' : '#902010'
    const topSk = Object.entries(c.skill || {}).sort((a, b) => b[1] - a[1])[0]
    const debuf = !c.dead && c.role && (c.prefs[c.role] || 1) <= 2 && (c.skill[c.role] || 0) < 60
    const card = document.createElement('div')
    card.className = 'cc' + (G.selectedCol === c.id ? ' sel' : '')
    card.innerHTML = `<div class="ccn"><span class="ccd" style="background:${c.color}"></span>${c.name}${c.dead ? ' ✝' : ''}</div>
<div class="ccr">${c.dead ? 'DECEASED' : (PICO[c.role] || '') + ' ' + (c.role || '')}</div>
<div class="ccs">${c.action || 'IDLE'}${c.sick ? ' 🤒' : ''}</div>
<div class="ccb">
  <div class="mbr"><span class="mbl">HP</span><div class="mb"><div class="mbf" style="width:${(c.hp / c.maxHp) * 100}%;background:${hpC}"></div></div><span style="font-size:8px;color:${hpC}">${c.hp}</span></div>
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

export function selCol(id: number) {
  G.selectedCol = G.selectedCol === id ? null : id
  renderSidebar()
  if (G.selectedCol !== null) showCdet(G.selectedCol)
  else document.getElementById('cdet')!.classList.remove('show')
}

export function showCdet(id: number) {
  const c = G.colonists.find((x) => x.id === id)
  if (!c) return
  const tr = TRAITS.find((t) => t.id === c.trait)!
  document.getElementById('cdname')!.textContent = c.name
  ;(document.getElementById('cdname') as HTMLElement).style.color = c.color
  let h = `<div class="cdr"><span class="cdl">Trait</span><span class="cdv">${tr.label}</span></div>
    <div class="cdr"><span class="cdl">HP</span><span class="cdv">${c.hp}/${c.maxHp}</span></div>
    <div class="cdr"><span class="cdl">Mood</span><span class="cdv">${c.mood}%</span></div>
    <div class="cdr"><span class="cdl">Action</span><span class="cdv">${c.action || 'IDLE'}</span></div>
    <div class="cdr"><span class="cdl">Tool</span><span class="cdv" style="color:${c.tool && c.tool.dur > 0 && c.tool.type !== '—' ? 'var(--accent)' : 'var(--danger)'}">${c.tool ? c.tool.type : '—'} ${c.tool && c.tool.type !== '—' ? c.tool.dur + '%' : ''}</span></div>
    <div class="cdr"><span class="cdl">Weapon</span><span class="cdv" style="color:var(--accent2)">${c.weapon ? c.weapon.type + ' ' + c.weapon.dur + '%' : 'none'}</span></div>
    <div style="font-size:9px;color:var(--textdim);margin:5px 0 3px">PREFS & SKILLS</div>`
  PROF.forEach((p) => {
    const sk = c.skill[p as keyof typeof c.skill] || 0, pr = c.prefs[p as keyof typeof c.prefs] || 1
    let st = ''
    for (let i = 1; i <= 5; i++)
      st += `<span class="cds${i <= pr ? ' lit' : ''}" data-id="${id}" data-p="${p}" data-s="${i}">★</span>`
    h += `<div class="cdprow"><span class="cdpj">${PICO[p as keyof typeof PICO]} ${p.slice(0, 5)}</span><div class="cdst">${st}</div><span style="font-size:8px;color:var(--dim);margin-left:2px">${sk}%</span></div>`
  })
  document.getElementById('cdbody')!.innerHTML = h
  document.querySelectorAll('.cds').forEach((s) =>
    s.addEventListener('click', () => {
      const el = s as HTMLElement
      const col = G.colonists.find((x) => x.id === parseInt(el.dataset.id!))
      if (col) { (col.prefs as any)[el.dataset.p!] = parseInt(el.dataset.s!); showCdet(id) }
    })
  )
  document.getElementById('cdet')!.style.borderColor = c.color
  document.getElementById('cdet')!.classList.add('show')
}

document.getElementById('cdclose')!.addEventListener('click', () => {
  document.getElementById('cdet')!.classList.remove('show')
  G.selectedCol = null
  renderSidebar()
})

// ── BUILD ──
let activeCat = 'SHELTER'
const CATS = Object.keys(BCAT_DATA)

export function renderBuild() {
  const cats = document.getElementById('bcats')!
  cats.innerHTML = ''
  CATS.forEach((cat) => {
    const b = document.createElement('div')
    b.className = 'bcat' + (cat === activeCat ? ' active' : '')
    b.title = cat; b.setAttribute('aria-label', cat); b.textContent = BCAT_DATA[cat as keyof typeof BCAT_DATA]
    b.addEventListener('click', () => { activeCat = cat; renderBuild() })
    cats.appendChild(b)
  })
  const grid = document.getElementById('bgrid')!
  grid.innerHTML = ''
  if (activeCat === 'OTHER' && !G.hqPlaced) {
    const hqBtn = document.createElement('div')
    hqBtn.className = 'bb'
    hqBtn.innerHTML = '🏚 HEADQUARTERS <span class="bc">[free]</span>'
    hqBtn.addEventListener('click', () => {
      G.placingBldg = { isHQ: true, ico: '🏚', name: 'HEADQUARTERS' } as any
      document.getElementById('pname')!.textContent = '🏚 HEADQUARTERS'
      document.getElementById('phint')!.classList.add('show')
    })
    grid.appendChild(hqBtn)
  }
  BLDGS.filter((b) => b.cat === activeCat).forEach((bd) => {
    const lk = bd.lv > G.hqLevel
    const btn = document.createElement('div')
    btn.className = 'bb' + (lk ? ' lk' : '')
    const cost = Object.entries(bd.cost).map(([k, v]) => v + k[0].toUpperCase()).join('+')
    btn.title = bd.name + ' [' + cost + ']'
    btn.innerHTML = `<span class="bbi">${bd.ico}</span><span class="bbn">${bd.name}</span>`
    if (!lk) btn.addEventListener('click', () => showBuildConfirm(bd))
    grid.appendChild(btn)
  })
}

function resourceLabel(k: string) {
  return ({ food:'FOOD', water:'WATER', cooked:'MEALS', wood:'WOOD', stone:'STONE', metal:'METAL', copper:'COPPER', meds:'MEDS', seeds:'SEEDS', cloth:'CLOTH' }[k] || k.toUpperCase())
}
function resourceIcon(k: string) {
  return ({ food:'🌾', water:'💧', cooked:'🍞', wood:'🪵', stone:'🪨', metal:'⚙️', copper:'🟤', meds:'💊', seeds:'🌱', cloth:'🧶' }[k] || '⬡')
}
function canAffordCost(cost: Record<string, number>) {
  return Object.entries(cost).every(([r, a]) => (G.res[r as keyof typeof G.res] || 0) >= a)
}

export function showBuildConfirm(bd: BuildingDef) {
  if (bd.isHQ) {
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
  ;(document.getElementById('mdt') as HTMLElement).style.color = affordable ? 'var(--accent2)' : 'var(--danger)'
  const costRows = Object.entries(bd.cost).map(([r, a]) => {
    const have = Math.floor(G.res[r as keyof typeof G.res] || 0)
    const miss = have < (a as number)
    return `<div class="costrow ${miss ? 'missing' : 'ok'}"><span>${resourceIcon(r)} ${resourceLabel(r)}</span><span>${a} <span class="costhave">/ have ${have}</span></span></div>`
  }).join('')
  const missingNote = !affordable
    ? '<div class="buildnote warn">Not enough resources. Missing resources are marked red.</div>'
    : '<div class="buildnote">Press Build, then tap a valid land tile to place it.</div>'
  let cropSelector = '', selectedCrop = 'wheat'
  if (bd.field) {
    const crops = [{ id:'wheat', label:'🌾 Wheat' }, { id:'veg', label:'🥕 Veggies' }, { id:'cotton', label:'🌱 Cotton' }]
    const hasSeeds = G.res.seeds > 0
    cropSelector = `<div style="margin:8px 0 4px;font-size:10px;color:var(--textdim);letter-spacing:1px">CHOOSE CROP:</div>
<div style="display:flex;gap:5px;margin-bottom:8px;">` +
      crops.map((cr) => `<button id="crop-${cr.id}" onclick="selectCrop('${cr.id}')" style="flex:1;padding:5px 3px;font-size:11px;background:var(--bg3);border:2px solid ${cr.id === 'wheat' ? 'var(--accent)' : 'var(--border)'};border-radius:3px;cursor:pointer;color:var(--text)">${cr.label}</button>`).join('') +
      `</div>` + (!hasSeeds ? '<div class="buildnote warn">⚠ No seeds! You need seeds to plant.</div>' : '<div class="buildnote">Seeds needed: 5 · Have: ' + Math.floor(G.res.seeds) + '</div>')
  }
  document.getElementById('mdp')!.innerHTML = `<div class="costlist">${costRows}</div>${cropSelector}${missingNote}`
  const be = document.getElementById('mdb')!
  be.innerHTML = ''
  const buildBtn = document.createElement('button')
  buildBtn.className = 'mb2 ' + (affordable ? 'ok' : '')
  buildBtn.textContent = bd.field ? 'PLANT' : 'BUILD'
  buildBtn.disabled = !affordable || (!!bd.field && G.res.seeds <= 0)
  if (buildBtn.disabled) { buildBtn.style.opacity = '.45'; buildBtn.style.cursor = 'not-allowed' }
  buildBtn.addEventListener('click', () => {
    if (!canAffordCost(bd.cost as Record<string, number>)) { addLog('Not enough resources for ' + bd.name, 'warn'); return }
    if (bd.field && G.res.seeds <= 0) { addLog('No seeds to plant!', 'warn'); return }
    if (bd.field) bd._selectedCrop = selectedCrop
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
  ;(window as any).selectCrop = function(id: string) {
    selectedCrop = id
    document.querySelectorAll('[id^="crop-"]').forEach((b) => (b as HTMLElement).style.borderColor = 'var(--border)')
    const el = document.getElementById('crop-' + id)
    if (el) el.style.borderColor = 'var(--accent)'
  }
}

document.getElementById('phint')!.addEventListener('click', () => {
  if (!G.hqPlaced) return
  G.placingBldg = null
  document.getElementById('phint')!.classList.remove('show')
})

// ── ASSIGN ──
export function renderAssign() {
  const el = document.getElementById('assignp')
  if (!el) return
  el.innerHTML = ''
  const alive = G.colonists.filter((c) => !c.dead)
  if (!alive.length) { el.innerHTML = '<div style="font-size:9px;color:var(--textdim);padding:4px">No survivors</div>'; return }
  alive.forEach((col) => {
    const row = document.createElement('div'); row.className = 'ar'
    const nameSpan = document.createElement('span')
    nameSpan.className = 'an'; nameSpan.style.color = col.color; nameSpan.textContent = col.name
    const sel = document.createElement('select'); sel.className = 'rs'
    PROF.forEach((p) => {
      const o = document.createElement('option'); o.value = p
      o.textContent = PICO[p as keyof typeof PICO] + ' ' + p
      if (p === col.role) o.selected = true
      sel.appendChild(o)
    })
    sel.addEventListener('change', (e) => {
      if (col.tool && col.tool.type && col.tool.type !== '—') { returnToolToStock(col.tool); col.tool = { type: '—', dur: 0 } }
      col.role = (e.target as HTMLSelectElement).value as any
      if (G.enemies && G.enemies.length && col.role !== 'GUARD') { col.targetCol = G.hqCol; col.targetRow = G.hqRow; col.action = 'FLEEING' }
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

// ── LOG ──
export function addLog(msg: string, type = 'normal') {
  const h = String(G.hour).padStart(2, '0'), m = String(G.minute).padStart(2, '0')
  const ico = type === 'good' ? '✅' : type === 'danger' ? '🔴' : type === 'warn' ? '⚠️' : type === 'lore' ? '📜' : '·'
  G.log.unshift({ t: 'D' + G.day + ' ' + h + ':' + m, msg, type: type as any, ico })
  if (G.log.length > 50) G.log.pop()
  if (type === 'warn' || type === 'danger') SFX.warn()
  else if (type === 'good') SFX.up()
  else SFX.msg()
  renderLog()
  const tq = document.getElementById('taskqueue')
  if (tq) {
    const recent = G.log.filter((e) => e.type !== 'normal').slice(0, 3)
    tq.innerHTML = recent.map((e) => `<div class="tq-line">${e.ico} ${e.msg}</div>`).join('')
  }
}

export function renderLog() {
  document.getElementById('logp')!.innerHTML = G.log.slice(0, 14).map((e) =>
    `<div class="ll"><span class="lt">${e.t}</span><span class="lm ${e.type}"><span class="li-ico">${e.ico || '·'}</span>${e.msg}</span></div>`
  ).join('')
}

// ── RESOURCES ──
const lastRes: Record<string, number | null> = {
  food: null, water: null, cooked: null, wood: null, stone: null,
  metal: null, copper: null, meds: null, seeds: null, cloth: null,
}

export function renderResources() {
  let up = false, down = false
  ;['food','water','cooked','wood','stone','metal','copper','meds','seeds','cloth'].forEach((k) => {
    const el = document.getElementById('r-' + k)
    if (!el) return
    const v = Math.floor(G.res[k as keyof typeof G.res] || 0)
    if (lastRes[k] !== null && v !== lastRes[k]) {
      const box = el.closest('.ri')
      if (box) { box.classList.remove('res-up', 'res-down'); void (box as HTMLElement).offsetWidth; box.classList.add(v > lastRes[k]! ? 'res-up' : 'res-down') }
      if (v > lastRes[k]!) up = true; else down = true
    }
    el.textContent = String(v); lastRes[k] = v
  })
  if (down) SFX.down(); else if (up) SFX.up()
}

// ── MODAL ──
export function showModal(title: string, text: string, btns: Array<{ label: string; cls: string; fn: () => void }>, danger = false) {
  SFX.warn()
  G.paused = true; updPauseBtn()
  document.getElementById('mdt')!.textContent = title
  ;(document.getElementById('mdt') as HTMLElement).style.color = danger ? 'var(--danger)' : 'var(--accent2)'
  document.getElementById('mdp')!.textContent = text
  const be = document.getElementById('mdb')!
  be.innerHTML = ''
  btns.forEach((b) => {
    const btn = document.createElement('button')
    btn.className = 'mb2 ' + (b.cls || ''); btn.textContent = b.label
    btn.addEventListener('click', () => { document.getElementById('mdbg')!.classList.remove('show'); b.fn() })
    be.appendChild(btn)
  })
  document.getElementById('mdbg')!.classList.add('show')
}

export function updPauseBtn() {
  const b = document.getElementById('pbtn') as HTMLButtonElement
  b.textContent = G.paused ? '▶' : '⏸'
  b.classList.toggle('paused', G.paused)
}

document.getElementById('pbtn')!.addEventListener('click', () => { if (!G.hqPlaced) return; G.paused = !G.paused; updPauseBtn() })
document.getElementById('spdbtn')!.addEventListener('click', () => {
  G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 5 : G.speed === 5 ? 10 : 1
  document.getElementById('spdbtn')!.textContent = '×' + G.speed
})
