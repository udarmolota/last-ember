import { G } from './state'
import { MAP_W, MAP_H, TS, rnd, pick } from './data'
import type { Enemy, Colonist } from './types'
import { addLog, showModal, updPauseBtn } from './ui'
import { refreshTileEl } from './map'
import { onDeath } from './game'

const ENEMY_TYPES = [
  { id: 'bandit', name: 'Bandit', ico: '💀', hp: 40, maxHp: 40, combatSkill: 10, weapon: 'Stone Knife', damage: 8, color: '#8a1a08', speed: 0.08 },
]

const WEAPON_DAMAGE: Record<string, number> = {
  'Wood Knife': 2, 'Stone Knife': 5, 'Metal Knife': 7, 'Copper Knife': 8,
  'Wood Club': 4, 'Stone Club': 6, 'Metal Club': 8,
  'Wood Shield': 3, 'Copper Shield': 5,
  'Copper Sword': 12,
}

export function spawnEnemy(type: string): Enemy {
  const def = ENEMY_TYPES.find((e) => e.id === type) || ENEMY_TYPES[0]
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
  sp.style.cssText = `position:absolute;width:16px;height:20px;z-index:25;cursor:pointer;transition:left 0.4s,top 0.4s;`
  sp.innerHTML = `<div class="enemy-doll" style="--cloth:#5a1a1a;--skin:#e0c8a8;--hair:#3a2a20">
    <div class="enemy-head"></div>
    <div class="enemy-hood"></div>
    <div class="enemy-mask"></div>
    <div class="enemy-body"></div>
    <div class="enemy-weapon"></div>
    <div class="enemy-mark"></div>
  </div>`
  sp.addEventListener('click', () => onEnemyClick(enemy))
  document.getElementById('mapcanvas')!.appendChild(sp)
  posEnemy(enemy)
  return enemy
}

function onEnemyClick(enemy: Enemy) {
  if (enemy.dead) return
  showModal('RAIDER SPOTTED', enemy.ico + ' ' + enemy.name + '\nHP: ' + enemy.hp + ' / ' + enemy.maxHp, [
    {
      label: '⚔ Attack!', cls: 'danger', fn: () => {
        const guard = G.colonists
          .filter((c) => !c.dead && c.role === 'GUARD')
          .sort((a, b) => Math.hypot(a.col - enemy.col, a.row - enemy.row) - Math.hypot(b.col - enemy.col, b.row - enemy.row))[0]
        if (guard) {
          guard.priorityTarget = { col: Math.round(enemy.col), row: Math.round(enemy.row) }
          addLog(guard.name + ' charging raider!', 'good')
        } else {
          addLog('No guards available!', 'warn')
        }
        G.paused = false; updPauseBtn()
      }
    },
    { label: 'CLOSE', cls: '', fn: () => { G.paused = false; updPauseBtn() } }
  ])
}

function posEnemy(e: Enemy) {
  const sp = document.getElementById('enemy-' + e.id)
  if (!sp) return
  sp.style.left = e.col * TS + TS / 2 - 8 + 'px'
  sp.style.top = e.row * TS + TS / 2 - 16 + 'px'
}

function removeEnemy(e: Enemy) {
  e.dead = true
  const sp = document.getElementById('enemy-' + e.id)
  if (sp) { sp.style.transform = 'scale(0)'; sp.style.opacity = '0'; setTimeout(() => sp.remove(), 400) }
  G.enemies = G.enemies!.filter((x) => x.id !== e.id)
}

function calcDamage(attacker: { combatSkill?: number; damage?: number }, _defender: any) {
  const skill = attacker.combatSkill || 0
  const base = attacker.damage || 8
  return Math.max(1, Math.round(base * (0.3 + (0.7 * skill) / 100)))
}

function punchAnim(spriteId: string) {
  const sp = document.getElementById(spriteId)
  if (!sp) return
  sp.style.transform = 'scale(1.4)'
  setTimeout(() => { if (sp) sp.style.transform = 'scale(1)' }, 150)
}

export function triggerCombatMode() {
  G.combatMode = true; G.paused = true; updPauseBtn()
  const shelterTiles = G.tiles.filter((t) => t.bldg && (t.bldg.id === 'tent' || t.bldg.id === 'house') && t.bldg.buildTime <= 0 && t.bldg.isMain)
  G.colonists.filter((c) => !c.dead && c.role !== 'GUARD').forEach((c) => {
    c.action = 'FLEEING'
    if (shelterTiles.length) {
      const nearest = shelterTiles.reduce((a, b) => Math.hypot(a.col - c.col, a.row - c.row) < Math.hypot(b.col - c.col, b.row - c.row) ? a : b)
      c.targetCol = nearest.col; c.targetRow = nearest.row
    } else {
      c.targetCol = G.hqCol; c.targetRow = G.hqRow
    }
  })
}

export function tickCombat() {
  if (!G.enemies!.length) {
    if (G.combatMode) { G.combatMode = false; addLog('Raiders repelled!', 'good') }
    return
  }
  const alive = G.colonists.filter((c) => !c.dead)
  G.enemies!.forEach((enemy) => {
    if (enemy.dead) return

    // Сканируем palisade/gate в радиусе 8 тайлов
    const walls = G.tiles.filter((t) =>
      t.bldg && (t.bldg.id === 'palisade' || t.bldg.id === 'gate') &&
      t.bldg.buildTime <= 0 && (t.bldg.hp || 0) > 0 &&
      Math.hypot(t.col - enemy.col, t.row - enemy.row) < 8
    )
    const nearestWall = walls.length
      ? walls.reduce((a, b) => Math.hypot(a.col - enemy.col, a.row - enemy.row) < Math.hypot(b.col - enemy.col, b.row - enemy.row) ? a : b)
      : null

    if (nearestWall) {
      const wd = Math.hypot(nearestWall.col - enemy.col, nearestWall.row - enemy.row)
      if (wd > 0.9) {
        const dc = nearestWall.col - enemy.col, dr = nearestWall.row - enemy.row
        enemy.col += (dc / wd) * enemy.speed; enemy.row += (dr / wd) * enemy.speed
        posEnemy(enemy)
      } else {
        enemy.attackTimer = (enemy.attackTimer || 0) + 1
        if (enemy.attackTimer >= 20) {
          enemy.attackTimer = 0
          nearestWall.bldg!.hp = (nearestWall.bldg!.hp || 0) - 5
          punchAnim('enemy-' + enemy.id)
          if (nearestWall.bldg!.hp <= 0) {
            addLog('💥 Palisade destroyed by raiders!', 'danger')
            nearestWall.bldg = null
            refreshTileEl(nearestWall)
          } else {
            addLog('🟫 Raiders attack the palisade! (HP: ' + nearestWall.bldg!.hp + ')', 'warn')
          }
        }
      }
      return
    }

    const guards = alive.filter((c) => c.role === 'GUARD')
    const target: any = guards.length
      ? guards.reduce((a, b) => Math.hypot(a.col - enemy.col, a.row - enemy.row) < Math.hypot(b.col - enemy.col, b.row - enemy.row) ? a : b)
      : { col: G.hqCol, row: G.hqRow }
    const dc = target.col - enemy.col, dr = target.row - enemy.row
    const dist = Math.sqrt(dc * dc + dr * dr)
    if (dist > 0.9) {
      enemy.col += (dc / dist) * enemy.speed
      enemy.row += (dr / dist) * enemy.speed
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
  const hasBarracks = G.buildings.some((b) => b.id === 'barracks' && !b.paused)
  alive.filter((c) => c.role === 'GUARD').forEach((guard) => {
    const nearEnemy = G.enemies!.find((e) => !e.dead && Math.hypot(guard.col - e.col, guard.row - e.row) < 1.5)
    if (nearEnemy) {
      guard.targetCol = nearEnemy.col; guard.targetRow = nearEnemy.row; guard.action = 'FIGHTING'
      guard.attackTimer = (guard.attackTimer || 0) + 1
      const cooldown = hasBarracks ? 15 : 18
      if (guard.attackTimer >= cooldown) {
        guard.attackTimer = 0
        const weaponBonus = guard.weapon ? (WEAPON_DAMAGE[guard.weapon.type] ?? 3) : 0
        const dmg = calcDamage({ combatSkill: guard.combatSkill || 0, damage: 10 + weaponBonus }, nearEnemy)
        nearEnemy.hp -= dmg
        punchAnim('sp-' + guard.id); punchAnim('enemy-' + nearEnemy.id)
        addLog('⚔ ' + guard.name + ' hit raider for ' + dmg, nearEnemy.hp <= 10 ? 'good' : 'normal')
        guard.combatSkill = Math.min(100, (guard.combatSkill || 0) + (hasBarracks ? 2 : 1))
        if (nearEnemy.hp <= 0) { addLog('Raider defeated!', 'good'); removeEnemy(nearEnemy) }
      }
    } else {
      const closest = G.enemies!.find((e) => !e.dead)
      if (closest) { guard.targetCol = closest.col; guard.targetRow = closest.row; guard.action = 'PURSUING' }
    }
  })
  alive.filter((c) => c.role === 'MEDIC').forEach((medic) => {
    const wounded = alive.find((x) => x.hp < x.maxHp * 0.7 && !x.dead && x.id !== medic.id)
    if (wounded) {
      medic.targetCol = wounded.col; medic.targetRow = wounded.row; medic.action = 'HEALING ' + wounded.name
      if (Math.hypot(medic.col - wounded.col, medic.row - wounded.row) < 1.0 && G.res.meds > 0) {
        G.res.meds--; wounded.hp = Math.min(wounded.maxHp, wounded.hp + rnd(15, 25))
        addLog('💊 ' + medic.name + ' healed ' + wounded.name, 'good')
      }
    }
  })
}

export function checkFirstRaid() {
  if (!G.hqPlaced) return
  if (G.day >= G.firstRaidDay! && !G.firstRaidDone && G.minute === 0 && G.hour === 12) {
    G.firstRaidDone = true
    G.enemies = G.enemies || []
    spawnEnemy('bandit')
    triggerCombatMode()
    addLog('⚔ A raider has been spotted!', 'danger')
  }
}