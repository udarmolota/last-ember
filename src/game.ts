import { G } from './state'
import { TRAITS, PROF, CRAFTS, LORE, SEASONS, MAP_W, TICK_MS, rnd, pick, isNightTime } from './data'
import type { Colonist } from './types'
import { refreshTileEl, centerOn } from './map'
import { posSprite } from './buildings'
import { addLog, renderLog, renderSidebar, renderResources, renderAssign, renderToolStock, showModal, updPauseBtn } from './ui'
import { getTarget, doWork, updNight, updHappy, checkMeals, checkHerald, tickConstruction, tickPiles, renderAdvisor, updateColonist } from './colonists'
import { spawnEnemy, tickCombat, checkFirstRaid, triggerCombatMode } from './combat'

let lastTick = 0

export function loop() {
  requestAnimationFrame(loop)
  if (G.paused) return
  const now = Date.now()
  if (now - lastTick < TICK_MS / G.speed) return
  lastTick = now
  tick()
}

export function tick() {
  G.minute++
  if (G.minute >= 60) { G.minute = 0; G.hour++; hourTick() }
  if (G.hour >= 24) { G.hour = 0; G.day++; dayTick() }
  G.colonists.filter((c) => !c.dead).forEach((c) => {
    if (c.priorityTarget && !c.sleeping && !(c.carryAmt > 0 && c.priorityPile)) {
      c.targetCol = c.priorityTarget.col; c.targetRow = c.priorityTarget.row
    }
    if (G.minute % 10 === 0 && !c.sleeping && !c.task) {
      const t = getTarget(c)
      if (t) {
        const tgt = G.tiles[t.row * MAP_W + t.col]
        if (tgt && (tgt.type !== 'water' || c.waterTask)) { c.targetCol = t.col; c.targetRow = t.row }
      }
    }
    const dc = c.targetCol - c.col, dr = c.targetRow - c.row
    const dist = Math.sqrt(dc * dc + dr * dr)
    const spd = 0.3
    if (dist > spd) { c.col += (dc / dist) * spd; c.row += (dr / dist) * spd }
    else { c.col = c.targetCol; c.row = c.targetRow }

    // separation — отталкиваемся от других колонистов
    G.colonists.filter((o) => !o.dead && o.id !== c.id).forEach((o) => {
      const dx = c.col - o.col, dy = c.row - o.row
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < 0.8 && d > 0) {
        const push = (0.8 - d) * 0.15
        c.col += (dx / d) * push
        c.row += (dy / d) * push
      }
    })

    posSprite(c)
  })
  if (G.minute % 5 === 0) {
    G.colonists.filter((c) => !c.dead).forEach(doWork)       // старая система — пока оставляем
    G.colonists.filter((c) => !c.dead).forEach(updateColonist) // новая система — постепенно берёт управление
  }
  if (G.minute % 3 === 0) tickConstruction()
  if (G.minute % 10 === 0) tickPiles()
  document.getElementById('hday')!.textContent = String(G.day)
  document.getElementById('hclock')!.textContent = String(G.hour).padStart(2, '0') + ':' + String(G.minute).padStart(2, '0')
  document.getElementById('hdr-season')!.textContent = SEASONS[G.season]
  updNight(); updHappy(); renderResources(); renderToolStock(); renderAdvisor()
  if (G.minute % 15 === 0) { renderSidebar(); renderLog() }
  if (G.enemies && G.enemies.length) {
    tickCombat()
    G.colonists.filter((co) => !co.dead && co.role !== 'GUARD').forEach((co) => {
      const nearEnemy = G.enemies!.some((e) => Math.sqrt(Math.pow(co.col - e.col, 2) + Math.pow(co.row - e.row, 2)) < 6)
      if (nearEnemy && co.action !== 'FLEEING') { co.targetCol = G.hqCol; co.targetRow = G.hqRow; co.action = 'FLEEING' }
      else if (!nearEnemy && co.action === 'FLEEING') co.action = 'IDLE'
    })
  }
  if (G.hqUpgradeTimer > 0) {
    G.hqUpgradeTimer--
    if (G.hqUpgradeTimer === 0) {
      G.hqUpgradeVisual = true
      const hqTile = G.tiles[G.hqRow * MAP_W + G.hqCol]
      if (hqTile) refreshTileEl(hqTile)
      addLog('🏛 Headquarters reconstruction complete.', 'good')
    }
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

export function hourTick() {
  const alive = G.colonists.filter((c) => !c.dead)
  alive.forEach((c) => {
    if (c.hunger === 60 && !c._warnedHunger) { c._warnedHunger = true; addLog(c.name + ' is getting hungry', 'warn') }
    if (c.thirst === 60 && !c._warnedThirst) { c._warnedThirst = true; addLog(c.name + ' is getting thirsty', 'warn') }
    if (c.hunger < 60) c._warnedHunger = false
    if (c.thirst < 60) c._warnedThirst = false
    if (c.hunger >= 80) {
      const drain = Math.floor((c.hunger - 79) / 10) + 1
      c.hp = Math.max(0, c.hp - drain)
      if (c.hunger >= 90 && !c._warnedStarving) { c._warnedStarving = true; addLog('⚠ ' + c.name + ' is STARVING! HP draining!', 'danger') }
    } else c._warnedStarving = false
    if (c.thirst >= 80) {
      const drain = Math.floor((c.thirst - 79) / 8) + 1
      c.hp = Math.max(0, c.hp - drain)
      if (c.thirst >= 90 && !c._warnedDehydrated) { c._warnedDehydrated = true; addLog('⚠ ' + c.name + ' DEHYDRATED! HP draining!', 'danger') }
    } else c._warnedDehydrated = false
    if (c.hp <= 0 && !c.dead) {
      c.dead = true
      const cause = c.thirst >= 90 ? 'dehydration' : c.hunger >= 90 ? 'starvation' : c.sick ? 'illness' : 'wounds'
      addLog(c.name + ' died of ' + cause + '.', 'danger'); onDeath(c)
    }
    if (c.hunger >= 100 && !c.dead) { c.dead = true; addLog(c.name + ' starved.', 'danger'); onDeath(c) }
    if (c.thirst >= 100 && !c.dead) { c.dead = true; addLog(c.name + ' died of thirst.', 'danger'); onDeath(c) }
    const tr = TRAITS.find((t) => t.id === c.trait)!
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
    const hasShelter = G.tiles.some((t) => t.bldg && (t.bldg.id === 'tent' || t.bldg.id === 'house') && t.bldg.buildTime <= 0)
    if (!hasShelter && (G.hour < 6 || G.hour >= 20)) md -= 1.5
    const topPref = PROF.reduce((a, b) => ((c.prefs as any)[a] || 1) >= ((c.prefs as any)[b] || 1) ? a : b)
    if (c.role !== topPref && ((c.skill as any)[c.role] || 0) < 50) md -= 0.5
    if (c.hunger < 30 && c.thirst < 30) md += 0.3
    if (c.role === topPref && !c.sleeping) md += 0.4
    if (hasShelter) md += 0.2
    const hasBarracks = G.tiles.some((t) => t.bldg && t.bldg.id === 'barracks' && t.bldg.buildTime <= 0)
    if (c.role === 'GUARD' && hasBarracks) md += 0.5
    c.mood = Math.max(0, Math.min(100, c.mood + md + (Math.random() < 0.2 ? 0.3 : -0.1)))
  })
  checkMeals(); checkHerald()
  if (Math.random() < 0.015) randEvent()
  if (Math.random() < 0.007) loreNote()
  if (G.raidTimer > 0) {
    G.raidTimer--
    if (G.raidTimer === 0) {
      addLog('⚔ RAIDERS APPROACH FROM THE NORTH!', 'danger')
      showModal('RAID!', 'A band of raiders is attacking your camp!\nYour colonists will defend automatically.\n\nKnife-armed colonists fight. Others flee to HQ.', [{
        label: 'DEFEND', cls: 'danger', fn: () => {
          const fighters = G.colonists.filter((c) => !c.dead && (c.role === 'GUARD' || c.weapon))
          addLog('Your ' + fighters.length + ' fighters repel the attack.', 'good')
          if (fighters.length < 3 && G.colonists.filter((c) => !c.dead).length > 1) {
            const victim = pick(G.colonists.filter((c) => !c.dead && c.role !== 'GUARD'))
            if (victim) { victim.hp = Math.max(0, victim.hp - rnd(20, 50)); addLog(victim.name + ' was wounded in the raid!', 'danger') }
          }
          G.paused = false; updPauseBtn()
        }
      }])
    }
  }
  // проверка конца игры
  if (G.colonists.filter((c) => !c.dead).length === 0 && G.colonists.length > 0) {
    G.paused = true
    showModal(
      'COLONY LOST',
      'Your last survivor has fallen.\nThe ember goes dark.\n\nThe wasteland reclaims what was yours.',
      [{
        label: 'START OVER',
        cls: 'danger',
        fn: () => { location.reload() }
      }],
      true
    )
  }
}

export function dayTick() {
  G.seasonDay++
  if (G.seasonDay >= 10) { G.seasonDay = 0; G.season = (G.season + 1) % 4; addLog('Season: ' + SEASONS[G.season], 'good') }
  G.tiles.filter((t) => t.bldg && t.bldg.field && t.bldg.phase === 'growing').forEach((t) => {
    t.bldg!.growth = Math.min(100, (t.bldg!.growth || 0) + rnd(8, 15))
    if (t.bldg!.growth >= 100) { t.bldg!.phase = 'harvest'; addLog(t.bldg!.crop + ' ready to harvest!', 'good'); refreshTileEl(t) }
    else refreshTileEl(t)
  })
  addLog('— Day ' + G.day + ' —')
}

export function onDeath(c: Colonist) {
  document.getElementById('sp-' + c.id)?.remove()
  G.colonists.filter((x) => !x.dead).forEach((x) => (x.mood = Math.max(0, x.mood - 20)))
  showModal('SURVIVOR LOST', c.name + ' has died.\n\nBuild a Grave (OTHER tab) — an unburied body\ndamages the morale of survivors nearby.',
    [{ label: 'UNDERSTOOD', cls: 'ok', fn: () => { G.paused = false; updPauseBtn() } }])
  renderSidebar()
}

export function randEvent() {
  const evs = [
    { m: 'Scavenger found extra supplies!', t: 'good', fn: () => { G.res.food += rnd(5, 12); G.res.water += rnd(10, 20) } },
    { m: 'Strange static on all frequencies.', t: 'normal' },
    { m: 'A tool was misplaced. Work slowed.', t: 'warn' },
    { m: 'Distant howling in the night.', t: 'warn' },
    { m: 'Someone carved a symbol in the dirt.', t: 'lore' },
    { m: 'Mushrooms found near the water.', t: 'good', fn: () => { G.res.food += rnd(3, 6) } },
    { m: 'The eastern sky glows strangely orange.', t: 'normal' },
  ]
  const ev = pick(evs) as any
  if (ev.fn) ev.fn()
  addLog(ev.m, ev.t)
}

export function loreNote() {
  const c = pick(G.colonists.filter((x) => !x.dead))
  if (!c) return
  showModal('NOTE FOUND', c.name + ' found a scrap of paper:\n\n' + pick(LORE),
    [{ label: 'READ & CONTINUE', cls: 'ok', fn: () => { G.paused = false; updPauseBtn() } }])
  addLog(c.name + ' found a note', 'lore')
}

export function openCraftShop(shopId: string) {
  const tile = G.tiles.find((t) => t.bldg && t.bldg.id === shopId && t.bldg.buildTime <= 0)
  if (!tile) { addLog(shopId + ' not ready', 'warn'); return }
  const shopLv = tile.bldg!.lv || 1
  const name = shopId === 'workshop' ? 'WORKSHOP 🔧' : 'FORGE ⚒'
  const crafter = shopId === 'workshop' ? 'STONEMASON' : 'BLACKSMITH'
  const hasCrafter = G.colonists.some((co) => !co.dead && co.role === crafter)
  const available = CRAFTS.filter((r) => r.shop === shopId && r.lv <= shopLv)
  const header = hasCrafter ? '' : '⚠ No ' + crafter + ' - items will take longer.\n'
  showModal(name, header + 'Select item to craft.',
    available.map((r) => {
      const canAfford = Object.entries(r.cost).every(([k, v]) => (G.res[k as keyof typeof G.res] || 0) >= (v as number))
      const costStr = Object.entries(r.cost).map(([k, v]) => v + k[0].toUpperCase()).join('+')
      return {
        label: r.ico + ' ' + r.name + ' [' + costStr + ']',
        cls: canAfford ? 'ok' : '',
        fn: () => {
          if (!canAfford) { addLog('Not enough for ' + r.name, 'warn'); G.paused = false; updPauseBtn(); return }
          for (const [k, v] of Object.entries(r.cost)) G.res[k as keyof typeof G.res] -= (v as number)
          if (!G.workshopQueue) G.workshopQueue = []
          G.workshopQueue.push({ id: r.id, toolType: r.toolType, ico: r.ico, timeLeft: 72, weapon: r.weapon, dur: r.dur, role: r.role, shop: r.shop })
          addLog(r.ico + ' ' + r.name + ' queued — 6h to craft', 'normal')
          renderResources(); G.paused = false; updPauseBtn()
        }
      }
    }).concat([{ label: 'CLOSE', cls: '', fn: () => { G.paused = false; updPauseBtn() } }])
  )
}

export function openWorkshop() { openCraftShop('workshop') }
export function openForge() { openCraftShop('forge') }