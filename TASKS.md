# Last Ember — Game Development Tasks

## Stage 3: Game Logic & Content

### 🔲 1. New Tier-2 Buildings

- [ ] **Barracks** — 3×2 tiles (need to generalize building size system beyond 2×2)
- [ ] **Forge** — 4 tiles (2×2, already in BLDGS, needs ore recipes)
- [ ] **Well** — 1 tile
- [ ] **Palisade** — 1 tile, placeable in a line
- [ ] **Gate** — 1 tile, passable gap in palisade

---

### 🔲 2. Barracks — Guard Bonuses

When Barracks is built and operational:
- [ ] Guard attack cooldown −15%
- [ ] Guard combat skill gain +1 extra per hit
- [ ] Guard mood decay from stress/discomfort reduced

---

### 🔲 3. Forge — Ore Recipes

- [ ] Same tools as Workshop but using `ore` instead of `stone`
- [ ] Miner automatically targets ore tiles when Forge exists
- [ ] Blacksmith role required for bonus efficiency

---

### 🔲 4. Well — Auto Water Fetch

- [ ] If `G.res.water < 15` and a completed Well exists:
  - An idle Porter automatically fetches water from the Well
- [ ] Only if it fits current Porter AI cleanly (no rewrite)

---

### 🔲 5. Palisade & Gate — Perimeter Defense

**Placement:**
- [ ] Player places palisade tiles one by one around the settlement
- [ ] Buildings can act as walls (enemy treats any tile with bldg as blocked)
- [ ] Gate tile = intentional passable gap in palisade line

**Enemy behavior — outside perimeter:**
- [ ] Every N ticks, enemy scans radius 6-8 tiles for a passable gap
  - Passable = no building, no palisade, not water
- [ ] If gap found → enemy moves toward gap and enters settlement
- [ ] If no gap → enemy moves to nearest palisade tile or building on perimeter and attacks it

**Enemy behavior — inside perimeter:**
- [ ] Guard within radius 4-5 → Guard becomes priority target
- [ ] Colonist within radius 4-5 → attack colonist
- [ ] Building on path to HQ → attack building
- [ ] Otherwise → move toward HQ

**Palisade tile mechanics:**
- [ ] Palisade tile has `hp` and `maxHp` fields (e.g. maxHp: 40)
- [ ] At 0 HP → tile destroyed, becomes grass → enemy passes through
- [ ] Attack logic similar to existing combat but targeting a tile

**Implementation notes:**
- Radii are in tile coordinates (col/row), not pixels
- Scan radius 6-8 for gaps, attack radius 2-3, target switch radius 4-5
- No pathfinding needed — hybrid scan approach
- Enemy logic lives in `combat.ts`
- ~150 lines of new code, no rewrite of existing systems

---

### 🔲 6. Workshop — Remove Extra Dialog

- [ ] Clicking Workshop tile should open craft list directly
- [ ] Remove intermediate "Open Workshop" confirmation dialog
- [ ] Fix in `map.ts` in `showTilePop` actions

---

## Stage 4: Complete Gameplay Loop

### 🔲 Keeper Aggression System (basic)

`G.keeperAggression` counter (0–100):

**Increases from:**
- [ ] HQ upgrades to level 2: +20
- [ ] Every 10 buildings constructed: +5
- [ ] Every 5 raiders defeated: +3
- [ ] Every 10 days survived: +2

**Decreases from:**
- [ ] Herald tribute paid: −30
- [ ] Colonist sacrificed to Herald: −50

**Thresholds:**
- [ ] 0–33: calm, Herald visits rarely
- [ ] 34–66: Herald visits more often, Dead tiles begin appearing
- [ ] 67–99: Dead tiles spread, raids more frequent
- [ ] 100: final battle triggered

---

### 🔲 Dead Tiles

- [ ] New tile type: `dead`
- [ ] Placed randomly on grass/soil tiles
  (not water, rock, building, palisade)
- [ ] Visual: dark scorched earth, subtle CSS pulse animation
- [ ] Colonists cannot work on dead tiles
- [ ] Fields on dead tiles stop growing and die
- [ ] Every few days: spreads to 1 adjacent grass tile
- [ ] Spread rate increases with keeperAggression

---

### 🔲 Herald ↔ Keeper Connection

- [ ] Herald modal text changes based on aggression level:
  - 0–33: *"The Keeper watches. Pay and be left in peace."*
  - 34–66: *"The Keeper grows restless. His patience thins."*
  - 67–99: *"The Keeper is already here. This may be your last chance."*
- [ ] Tribute paid → aggression −30, log: *"The Keeper is appeased. For now."*
- [ ] Colonist sacrificed → aggression −50, log: *"The Keeper is satisfied. The dead tiles recede."*
  - [ ] 1–2 nearby dead tiles convert back to grass
- [ ] Refused → aggression unchanged, raid incoming

---

### 🔲 Win / Lose Conditions

- [ ] Lose: all colonists dead
- [ ] Win: Keeper defeated in final battle

---

### 🔲 Final Battle — Three Waves

- [ ] Triggered when keeperAggression reaches 100
- [ ] Wave 1: bandits in hazmat suits (recolor existing enemy doll)
- [ ] Wave 2: larger group, faster movement
- [ ] Wave 3: elite raiders + Keeper spawns

---

### 🔲 The Keeper

- [ ] CSS doll: human pilot inside mechanical exosuit
  - Large armored frame, bigger than colonist sprite
  - Viewport on chest showing pilot face
- [ ] HP: 200, slow movement, high damage
- [ ] On death: exosuit breaks, Keeper crawls out → end cutscene

---

### 🔲 Ending Cutscene (modal)

**Victory** — Keeper mortally wounded:
> *"I was meant to protect this world... from you.
> From what you build. From what you become.
> Maybe I was wrong. Or maybe you haven't shown me yet."*

**Defeat** — last colonist dying, Keeper steps out:
> *"The machines will sleep again.
> The soil will remember.
> It always does."*

---

### 🔲 HQ Upgrade Mechanic

- [ ] HQ level 1 → 2 → 3 (unlocks tier-2 and tier-3 buildings)
- [ ] Each upgrade: +20 keeperAggression

---

### 🔲 Seasons affect gameplay

- [ ] Winter: food production −50%, well unusable
- [ ] Spring: crop growth speed +25%
- [ ] Autumn: last chance to stockpile before winter

---

## Stage 5: Android APK

- [ ] Install Capacitor (`npm run cap:add`)
- [ ] Test build (`npm run build`)
- [ ] Sync to Android (`npm run cap:sync`)
- [ ] Open in Android Studio (`npm run cap:open`)
- [ ] Generate signed APK