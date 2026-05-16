import { SUPPLIES, TRAITS, PROF, PICO, COLORS, SKINS, HAIRS, HAIR_STYLES, NAMES, PROF_WOOD_TOOL, rnd, pick } from './data'
import type { Colonist, ColonistState } from './types'
import { G } from './state'

let pts = 50
const supQty: Record<string, number> = {}
SUPPLIES.forEach((s) => (supQty[s.id] = 0))

export function buildSetup() {
  const sg = document.getElementById('sgrid')!
  SUPPLIES.forEach((s) => {
    const d = document.createElement('div')
    d.className = 'si'
    d.innerHTML = `<span class="si-ico">${s.ico}</span><div class="si-info"><div class="si-name">${s.name}</div><div class="si-cost">${s.cost}pt=${s.qty}</div></div><div class="si-qty"><div class="qb" data-id="${s.id}" data-d="-1">−</div><div class="qv" id="qv-${s.id}">0</div><div class="qb" data-id="${s.id}" data-d="1">+</div></div>`
    sg.appendChild(d)
  })
  sg.querySelectorAll('.qb').forEach((b) =>
    b.addEventListener('click', () => {
      const btn = b as HTMLElement
      const s = SUPPLIES.find((x) => x.id === btn.dataset.id)!
      const d = parseInt(btn.dataset.d!)
      const nv = supQty[s.id] + d, np = pts - d * s.cost
      if (nv < 0 || np < 0 || np > 50) return
      supQty[s.id] = nv; pts = np
      document.getElementById('qv-' + s.id)!.textContent = String(nv)
      document.getElementById('ptsnum')!.textContent = String(pts)
    })
  )
  const pool = genPool(10)
  const cl = document.getElementById('cpl')!
  const sel = new Set<number>()
  pool.forEach((c, i) => {
    const tr = TRAITS.find((t) => t.id === c.trait)!
    const best = PROF.reduce((a, b) => c.prefs[a as keyof typeof c.prefs] >= c.prefs[b as keyof typeof c.prefs] ? a : b)
    const card = document.createElement('div')
    card.className = 'cpc'
    card.dataset.i = String(i)
    card.innerHTML = `<div class="cp-dot" style="background:${c.color}"></div><div class="cp-info"><div class="cp-name">${c.name}</div><div class="cp-sub">${tr.label} · ${c.gender}</div><div class="cp-pref">★ ${PICO[best as keyof typeof PICO]} ${best}</div></div>`
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
    SUPPLIES.forEach((s) => {
      if (supQty[s.id] > 0)
        G.res[s.res as keyof typeof G.res] = (G.res[s.res as keyof typeof G.res] || 0) + supQty[s.id] * s.qty
    })
    G.colonists = [...sel].map((i, idx) => {
      const c = { ...pool[i] }; c.id = idx; return c
    })
    document.dispatchEvent(new CustomEvent('game:start'))
  })
}

export function genPool(n: number): Colonist[] {
  const names = [...NAMES].sort(() => Math.random() - 0.5)
  return Array.from({ length: n }, (_, i) => {
    const tr = pick(TRAITS)
    const prefs: Record<string, number> = {}
    PROF.forEach((p) => (prefs[p] = rnd(1, 5)))
    prefs[pick(PROF)] = 5
    const maxHp = Math.round(100 * tr.hp)
    return {
      id: i, name: names[i] || 'SURVIVOR',
      gender: (Math.random() > 0.5 ? 'M' : 'F') as 'M' | 'F',
      color: COLORS[i % COLORS.length], trait: tr.id,
      prefs: prefs as any, role: PROF[i % PROF.length] as any,
      skill: {}, combatSkill: 0, hp: maxHp, maxHp, mood: 75,
      hunger: 0, thirst: 0, sick: false, sickTimer: 0, dead: false,
      sleeping: false, action: 'IDLE', col: 0, row: 0,
      targetCol: 0, targetRow: 0, carryType: null, carryAmt: 0,
      visual: { skin: pick(SKINS), hair: pick(HAIRS), hairStyle: pick(HAIR_STYLES), body: COLORS[i % COLORS.length] },
      tool: { type: PROF_WOOD_TOOL[PROF[i % PROF.length]] || '—', dur: 50 },
      weapon: { type: 'Wood Knife', dur: 60 },
      // --- новая система ---
      state: 'IDLE' as ColonistState,
      task: null,
      carry: { type: null, amount: 0 },
      wounded: false,
      incapacitated: false,
      breakdownTimer: 0,
      mourningTimer: 0,
    } as Colonist
  })
}
