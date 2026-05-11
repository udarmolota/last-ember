import { G } from './state'
import { PROF, PROF_TOOL, MAP_W, MAP_H, rnd } from './data'
import { genMap, renderMap, centerOn } from './map'
import { renderSidebar, renderResources, renderBuild, renderAssign, renderLog } from './ui'
import { renderAdvisor } from './colonists'
import { loop } from './game'
import { buildSetup } from './setup'

document.addEventListener('game:start', () => startGame())
buildSetup()

export function startGame() {
  document.getElementById('setup-screen')!.classList.remove('active')
  document.getElementById('game-screen')!.classList.add('active')
  genMap()
  renderMap()
  G.colonists.forEach((c) => (c.role = PROF.reduce((a, b) => ((c.prefs as any)[a] >= (c.prefs as any)[b] ? a : b)) as any))
  G.startingRes = { ...G.res }
  G.toolStock = {}
  G.colonists.forEach((c) => {
    const needed = PROF_TOOL[c.role]
    if (needed) { const key = needed.replace(/ /g, '_'); G.toolStock[key] = (G.toolStock[key] || 0) + 1 }
  })
  G.colonists.forEach((c) => {
    const needed = PROF_TOOL[c.role]
    if (needed) c.tool = { type: 'Stone ' + needed, dur: 80 }
    else c.tool = { type: '—', dur: 100 }
    c.weapon = { type: 'Stone Knife', dur: 60 }
  })
  G.firstRaidDay = rnd(8, 15)
  G.firstRaidDone = false
  renderSidebar(); renderResources(); renderAdvisor(); renderBuild()
  setTimeout(() => { renderAssign(); renderLog(); renderSidebar() }, 50)
  document.getElementById('pname')!.textContent = '🏚 HEADQUARTERS — tap any land tile'
  document.getElementById('phint')!.classList.add('show')
  setTimeout(() => centerOn(MAP_W / 2, MAP_H / 2), 100)
  requestAnimationFrame(loop)
}

//buildSetup()
