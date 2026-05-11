# Last Ember — JS → TS Migration Tasks

## Stage 2: Real TypeScript

### Step 1 — Types file
- [ ] Create `src/types.ts`
- [ ] Define `Colonist` interface
- [ ] Define `Tile` interface  
- [ ] Define `Building` interface
- [ ] Define `Enemy` interface
- [ ] Define `GameState` interface
- [ ] Define `BuildingDef` interface
- [ ] Define `CraftDef` interface
- [ ] Define `Trait` interface
- [ ] Define `Supply` interface

### Step 2 — Export every module
- [ ] `src/data.ts` — export all constants
- [ ] `src/state.ts` — export G
- [ ] `src/audio.ts` — export SFX, playBeep
- [ ] `src/setup.ts` — export buildSetup, genPool
- [ ] `src/map.ts` — export genMap, renderMap, refreshTileEl, centerOn
- [ ] `src/buildings.ts` — export placeBuilding, refreshSprites, posSprite
- [ ] `src/ui.ts` — export renderSidebar, renderLog, renderResources, renderBuild, renderAssign, showModal, updPauseBtn
- [ ] `src/colonists.ts` — export doWork, getTarget, updNight, checkMeals, updHappy, renderAdvisor
- [ ] `src/game.ts` — export loop, tick
- [ ] `src/combat.ts` — export spawnEnemy, tickCombat, checkFirstRaid
- [ ] `src/start.ts` — export startGame

### Step 3 — Import between modules
- [ ] `src/state.ts` — import types from `types.ts`
- [ ] `src/setup.ts` — import from `data.ts`, `state.ts`
- [ ] `src/map.ts` — import from `data.ts`, `state.ts`
- [ ] `src/buildings.ts` — import from `data.ts`, `state.ts`, `map.ts`
- [ ] `src/ui.ts` — import from `data.ts`, `state.ts`
- [ ] `src/colonists.ts` — import from `data.ts`, `state.ts`, `map.ts`, `ui.ts`
- [ ] `src/game.ts` — import from `state.ts`, `map.ts`, `colonists.ts`, `ui.ts`, `combat.ts`
- [ ] `src/combat.ts` — import from `data.ts`, `state.ts`, `map.ts`, `ui.ts`
- [ ] `src/start.ts` — import from all modules

### Step 4 — main.ts
- [ ] Create `src/main.ts` with all imports
- [ ] Replace all `<script>` tags in `index.html` with single `<script type="module" src="/src/main.ts">`

### Step 5 — Enable strict mode
- [ ] Set `strict: true` in `tsconfig.json`
- [ ] Fix all TypeScript errors in `data.ts`
- [ ] Fix all TypeScript errors in `state.ts`
- [ ] Fix all TypeScript errors in `audio.ts`
- [ ] Fix all TypeScript errors in `setup.ts`
- [ ] Fix all TypeScript errors in `map.ts`
- [ ] Fix all TypeScript errors in `buildings.ts`
- [ ] Fix all TypeScript errors in `ui.ts`
- [ ] Fix all TypeScript errors in `colonists.ts`
- [ ] Fix all TypeScript errors in `game.ts`
- [ ] Fix all TypeScript errors in `combat.ts`
- [ ] Fix all TypeScript errors in `start.ts`

---

## Stage 3: Game Logic Fixes
- [ ] Miner collects stone from both `rock` and `ore` tiles
- [ ] Stonemason role — decide: remove or repurpose
- [ ] Water balance — porter fetches water correctly
- [ ] Food/hunger cycle — verify meal timing
- [ ] Herald events — test tribute/raid flow
- [ ] Death handling — morale penalty, grave building
- [ ] Tool durability — breaking and replacement

---

## Stage 4: Complete Gameplay
- [ ] Win condition — survive N days or reach HQ level 3
- [ ] Lose condition — all colonists dead
- [ ] HQ upgrade mechanic (level 1 → 2 → 3)
- [ ] Forge → smelt ore into metal
- [ ] More random events
- [ ] More lore notes
- [ ] Seasons affect food production
- [ ] Winter survival mechanics

---

## Stage 5: Android APK
- [ ] Install Capacitor (`npm run cap:add`)
- [ ] Test build (`npm run build`)
- [ ] Sync to Android (`npm run cap:sync`)
- [ ] Open in Android Studio (`npm run cap:open`)
- [ ] Test on device or emulator
- [ ] Generate signed APK