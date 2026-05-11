import { G } from './state'
import { MAP_W, MAP_H, TS, rnd, pick } from './data'
import type { Enemy, Colonist } from './types'
import { addLog } from './ui'
import { updPauseBtn } from './ui'
import { onDeath } from './game'

const ENEMY_TYPES = [
  { id: 'bandit', name: 'Bandit', ico: '💀', hp: 40, maxHp: 40, combatSkill: 10, weapon: 'Stone Knife', damage: 8, color: '#8a1a08', speed: 0.08 },
]

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
  sp.style.cssText = `position:absolute;width:16px;height:16px;border-radius:2px;border:2px solid #8a1a08;background:${enemy.color};z-index:25;display:flex;align-items:center;justify-content:center;font-size:9px;box-shadow:0 1px 4px rgba(0,0,0,0.5);transition:left 0.4s,top 0.4s;`
  sp.textContent = enemy.ico
  document.getElementById('mapcanvas')!.appendChild(sp)
  posEnemy(enemy)
  return enemy
}

function posEnemy(e: Enemy) {
  const sp = document.getElementById('enemy-' + e.id)
  if (!sp) return
  sp.style.left = e.col * TS + TS / 2 - 8 + 'px'
  sp.style.top = e.row * TS + TS / 2 - 8 + 'px'
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
  G.colonists.filter((c) => !c.dead && c.role !== 'GUARD').forEach((c) => {
    const nearEnemy = G.enemies!.some((e) => Math.sqrt(Math.pow(c.col - e.col, 2) + Math.pow(c.row - e.row, 2)) < 6)
    if (nearEnemy) { c.targetCol = G.hqCol; c.targetRow = G.hqRow; c.action = 'FLEEING' }
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
  alive.filter((c) => c.role === 'GUARD').forEach((guard) => {
    const nearEnemy = G.enemies!.find((e) => !e.dead && Math.hypot(guard.col - e.col, guard.row - e.row) < 1.5)
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