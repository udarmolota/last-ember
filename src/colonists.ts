function getTarget(c) {
  const hq = { col: G.hqCol, row: G.hqRow };
  const bof = (...ids) => {
    for (const id of ids) {
      const b = G.buildings.find((x) => ids.includes(x.id) && !x.paused);
      if (b) return { col: b.col, row: b.row };
    }
    return null;
  };
  const ftile = (type, needRes = false) =>
    G.tiles.find((t) => t.type === type && (!needRes || t.resAmt > 0));
  if (c.sleeping) return hq;
  if (c.priorityTarget) {
    const pt = c.priorityTarget;
    const dist = Math.sqrt(
      Math.pow(c.col - pt.col, 2) + Math.pow(c.row - pt.row, 2)
    );
    if (dist < 0.9) {
      if (c.waterTask) {
        G.res.water += 20;
        addLog(c.name + ' fetched water 💧', 'good');
        c.waterTask = null;
      }
      c.priorityTarget = null;
    } else return pt;
  }
  switch (c.role) {
    case 'FARMER':
      return bof('field') || ftile('soil') || hq;
    case 'LUMBERJACK': {
      const mill = bof('lumbermill');
      if (mill) return mill;
      const forests = G.tiles.filter(
        (t) => t.type === 'forest' && t.resAmt > 0
      );
      if (!forests.length) return hq;
      return forests[c.id % forests.length];
    }
    case 'MINER': {
      const mine = bof('mine');
      if (mine) return mine;
      const rocks = G.tiles.filter(
        (t) => (t.type === 'ore' || t.type === 'rock') && t.resAmt > 0
      );
      if (!rocks.length) return hq;
      return rocks[c.id % rocks.length];
    }
    case 'STONEMASON': {
      const cutter = bof('stonecutter');
      if (cutter) return cutter;
      const rocks = G.tiles.filter((t) => t.type === 'rock' && t.resAmt > 0);
      if (!rocks.length) return hq;
      return rocks[c.id % rocks.length];
    }
    case 'BLACKSMITH':
      return bof('forge') || hq;
    case 'COOK':
      return bof('kitchen', 'campfire') || hq;
    case 'MEDIC':
      return bof('infirmary') || hq;
    case 'TAILOR':
      return bof('weaver') || hq;
    case 'BUILDER':
      return G.tiles.find((t) => t.bldg && t.bldg.buildTime > 0) || hq;
    case 'HUNTER':
      return ftile('grass') || hq;
    case 'PORTER':
      return (
        G.tiles.find((t) => t.resPile && t.resPile.amount > 0) ||
        (c.carryAmt > 0 ? bof('storehouse') || hq : hq)
      );
    case 'GUARD':
      return bof('barracks') || hq;
    case 'GATHERER': {
      const patches = G.tiles.filter(
        (t) => (t.res === 'berries' || t.res === 'mushrooms') && t.resAmt > 0
      );
      return patches.length ? patches[c.id % patches.length] : hq;
    }
    default:
      return hq;
  }
}

function doWork(c) {
  if (c.sleeping || c.dead) return;
  if (isNightTime()) {
    c.action = 'SLEEPING';
    return;
  }
  const tr = TRAITS.find((t) => t.id === c.trait);
  const sk = c.skill[c.role] || 0;
  const pref = c.prefs[c.role] || 1;
  const eff = pref <= 2 && sk < 60 ? 0.6 : 1.0;
  const hasTool =
    c.tool && c.tool.type && c.tool.type !== '—' && c.tool.dur > 0;
  const toolMod = hasTool ? 1.0 : 0.3;
  const chance = 0.08 * eff * tr.speed * toolMod;
  switch (c.role) {
    case 'LUMBERJACK': {
      const ti = G.tiles.find(
        (t) =>
          t.col === Math.round(c.col) &&
          t.row === Math.round(c.row) &&
          t.type === 'forest' &&
          t.resAmt > 0
      );
      if (ti) {
        if (Math.random() < chance) {
          const a = Math.min(2, ti.resAmt);
          ti.resAmt -= a;
          addPile(ti, 'wood', a);
          refreshTileEl(ti);
        }
        c.action = 'CHOPPING';
      } else {
        const any = G.tiles.find((t) => t.type === 'forest' && t.resAmt > 0);
        if (any) {
          c.targetCol = any.col;
          c.targetRow = any.row;
          c.action = 'WALKING TO FOREST';
        } else c.action = 'IDLE';
      }
      if (
        !G.buildings.some((b) => b.id === 'storehouse') &&
        !G.colonists.some((x) => x.role === 'PORTER' && !x.dead)
      ) {
        const pile = G.tiles.find(
          (t) => t.resPile && t.resPile.amount > 0 && t.resPile.type === 'wood'
        );
        if (
          pile &&
          Math.sqrt(
            Math.pow(c.col - pile.col, 2) + Math.pow(c.row - pile.row, 2)
          ) < 0.9
        ) {
          G.res.wood = (G.res.wood || 0) + pile.resPile.amount;
          pile.resPile = null;
          refreshTileEl(pile);
        }
      }
      break;
    }
    case 'MINER': {
      const ti = G.tiles.find(
        (t) =>
          t.col === Math.round(c.col) &&
          t.row === Math.round(c.row) &&
          (t.type === 'ore' || t.type === 'rock') &&
          t.resAmt > 0
      );
      if (ti && Math.random() < chance * 0.7) {
        const a = Math.min(2, ti.resAmt);
        ti.resAmt -= a;
        const hasPorter = G.colonists.some(
          (x) => !x.dead && x.role === 'PORTER'
        );
        const hasStore = G.buildings.some(
          (b) => b.id === 'storehouse' || b.id === 'hq'
        );
        if (hasPorter && hasStore) addPile(ti, 'stone', a);
        else G.res.stone = (G.res.stone || 0) + a;
        refreshTileEl(ti);
        c.action = 'MINING';
      } else c.action = ti ? 'MINING' : 'WALKING';
      break;
    }
    case 'FARMER': {
      const allFields = G.tiles.filter(
        (t) => t.bldg && t.bldg.field && !t.bldg.paused && t.bldg.buildTime <= 0
      );
      const fieldTile =
        allFields.find((t) => t.bldg.phase === 'harvest') ||
        allFields.find((t) => t.bldg.phase === 'seeding') ||
        allFields[0];
      if (fieldTile) {
        const fb = fieldTile.bldg;
        if (!fb.phase) fb.phase = 'seeding';
        c.targetCol = fieldTile.col;
        c.targetRow = fieldTile.row;
        const dist = Math.sqrt(
          Math.pow(c.col - fieldTile.col, 2) +
            Math.pow(c.row - fieldTile.row, 2)
        );
        if (dist < 1.0) {
          if (fb.phase === 'seeding') {
            if (!fb.seedTimer) fb.seedTimer = 0;
            fb.seedTimer++;
            c.action = 'SEEDING';
            if (fb.seedTimer >= 60) {
              fb.phase = 'growing';
              fb.seedTimer = 0;
              fb.growth = 0;
              addLog('Field seeded with ' + fb.crop + '! Now growing.', 'good');
              refreshTileEl(fieldTile);
            }
          } else if (fb.phase === 'growing') {
            c.action = 'TENDING';
            fb.growth = Math.min(100, (fb.growth || 0) + 0.025);
            if (fb.growth >= 100) {
              fb.phase = 'harvest';
              addLog(fb.crop + ' ready to harvest!', 'good');
              refreshTileEl(fieldTile);
            }
          } else if (fb.phase === 'harvest') {
            c.action = 'HARVESTING';
            G.res.food += rnd(15, 25);
            fb.phase = 'seeding';
            fb.seedTimer = 0;
            fb.growth = 0;
            addLog(c.name + ' harvested ' + fb.crop + '!', 'good');
            refreshTileEl(fieldTile);
          }
        } else c.action = '→ FIELD';
      } else c.action = 'IDLE';
      break;
    }
    case 'COOK': {
      const fire = G.buildings.find(
        (b) => (b.id === 'campfire' || b.id === 'kitchen') && !b.paused
      );
      if (
        fire &&
        G.res.food >= 10 &&
        G.res.water >= 2 &&
        Math.random() < 0.05
      ) {
        G.res.food -= 10;
        G.res.water -= 2;
        G.res.cooked += 5;
        c.action = 'COOKING';
        addLog(c.name + ' cooked 5 meals', 'good');
      } else c.action = fire ? 'COOKING' : 'IDLE';
      break;
    }
    case 'HUNTER':
      if (Math.random() < 0.03) {
        G.res.food += rnd(3, 7);
        c.action = 'HUNTING';
        addLog(c.name + ' caught game', 'good');
      } else c.action = 'HUNTING';
      break;
    case 'PORTER': {
      const hasStore = G.buildings.some(
        (b) => b.id === 'storehouse' && !b.paused
      );
      if (!hasStore) {
        c.action = 'IDLE';
        break;
      }
      if (!c.carryAmt) {
        const piles = G.tiles.filter((t) => t.resPile && t.resPile.amount > 0);
        if (piles.length > 0) {
          G.porterPileIdx = G.porterPileIdx % piles.length;
          const pile = piles[G.porterPileIdx];
          c.targetCol = pile.col;
          c.targetRow = pile.row;
          const dist = Math.sqrt(
            Math.pow(c.col - pile.col, 2) + Math.pow(c.row - pile.row, 2)
          );
          if (dist < 0.8) {
            const take = Math.min(10, pile.resPile.amount);
            pile.resPile.amount -= take;
            c.carryType = pile.resPile.type;
            c.carryAmt = take;
            if (pile.resPile.amount <= 0) pile.resPile = null;
            refreshTileEl(pile);
            G.porterPileIdx =
              (G.porterPileIdx + 1) %
              Math.max(
                1,
                G.tiles.filter((t) => t.resPile && t.resPile.amount > 0).length
              );
            c.action = 'CARRYING ' + c.carryType.toUpperCase();
          } else c.action = 'FETCHING ' + pile.resPile.type;
        } else c.action = 'IDLE';
      } else {
        const store = G.buildings.find(
          (b) => b.id === 'storehouse' || b.id === 'hq'
        );
        if (store) {
          c.targetCol = store.col;
          c.targetRow = store.row;
          const dist = Math.sqrt(
            Math.pow(c.col - store.col, 2) + Math.pow(c.row - store.row, 2)
          );
          if (dist < 0.8) {
            const deliveredType =
              c.carryType === 'berries' || c.carryType === 'mushrooms'
                ? 'food'
                : c.carryType;
            G.res[deliveredType] = (G.res[deliveredType] || 0) + c.carryAmt;
            addLog(
              c.name + ' delivered ' + c.carryAmt + ' ' + c.carryType,
              'good'
            );
            c.carryType = null;
            c.carryAmt = 0;
            c.action = 'IDLE';
          } else c.action = 'DELIVERING';
        }
      }
      break;
    }
    case 'GATHERER': {
      const ti = G.tiles.find(
        (t) =>
          (t.res === 'berries' || t.res === 'mushrooms') &&
          t.resAmt > 0 &&
          Math.round(c.col) === t.col &&
          Math.round(c.row) === t.row
      );
      if (ti && Math.random() < 0.12) {
        const a = Math.min(3, ti.resAmt);
        ti.resAmt -= a;
        addPile(ti, ti.res, a);
        refreshTileEl(ti);
        c.action = 'GATHERING';
      } else {
        const any = G.tiles.find(
          (t) => (t.res === 'berries' || t.res === 'mushrooms') && t.resAmt > 0
        );
        c.targetCol = any ? any.col : G.hqCol;
        c.targetRow = any ? any.row : G.hqRow;
        c.action = any ? 'WALKING' : 'IDLE';
      }
      break;
    }
    case 'BUILDER': {
      const sites = G.tiles.filter((t) => t.bldg && t.bldg.buildTime > 0);
      const site = sites[0] || null;
      if (site) {
        c.targetCol = site.col;
        c.targetRow = site.row;
        const dist = Math.sqrt(
          Math.pow(c.col - site.col, 2) + Math.pow(c.row - site.row, 2)
        );
        c.action = dist < 1.2 ? 'BUILDING' : 'WALKING TO SITE';
      } else c.action = 'IDLE';
      break;
    }
    case 'MEDIC': {
      const patient = G.colonists.find(
        (x) => x.sick && x.id !== c.id && !x.dead
      );
      if (patient) {
        c.action = 'HEALING ' + patient.name;
        if (
          Math.round(c.col) === Math.round(patient.col) &&
          Math.round(c.row) === Math.round(patient.row)
        )
          patient.sickTimer = Math.max(0, patient.sickTimer - 3);
      } else c.action = 'IDLE';
      break;
    }
    default:
      c.action = 'IDLE';
  }
  if (c.role && c.action !== 'IDLE')
    c.skill[c.role] = Math.min(
      100,
      (c.skill[c.role] || 0) + (Math.random() < 0.04 ? 1 : 0)
    );
  if (c.action !== 'IDLE' && c.action !== 'RESTING')
    c.tool.dur = Math.max(0, c.tool.dur - (Math.random() < 0.02 ? 1 : 0));
  if (c.tool.dur === 0) {
    addLog(c.name + "'s tool broke!", 'warn');
    c.tool.dur = 10;
  }
}

function addPile(ti, type, amt) {
  if (!ti.resPile || ti.resPile.type !== type)
    ti.resPile = { type, amount: 0, age: 0 };
  ti.resPile.amount += amt;
  ti.resPile.age = 0;
  refreshTileEl(ti);
}

function updNight() {
  const ni = document.getElementById('night');
  const isNight = isNightTime();
  const tw = (G.hour >= 19 && G.hour < 21) || (G.hour >= 6 && G.hour < 8);
  ni.className = isNight ? 'ni' : tw ? 'tw' : '';
  document.getElementById('nightLabel').classList.toggle('show', isNight);
  G.colonists
    .filter((c) => !c.dead)
    .forEach((c) => {
      c.sleeping = isNight;
      if (c.sleeping) {
        c.action = 'SLEEPING';
        if (!c.shelterAssigned) {
          const shelterTiles = G.tiles.filter(
            (t) =>
              t.bldg &&
              (t.bldg.id === 'tent' || t.bldg.id === 'house') &&
              t.bldg.buildTime <= 0
          );
          let assigned = false;
          for (const s of shelterTiles) {
            const cap = s.bldg.id === 'tent' ? 2 : 4;
            const key = s.col + ',' + s.row;
            const occupants = G.colonists.filter(
              (x) => !x.dead && x.shelterAssigned === key
            ).length;
            if (occupants < cap) {
              c.shelterAssigned = key;
              c.targetCol = s.col;
              c.targetRow = s.row;
              assigned = true;
              break;
            }
          }
          if (!assigned) {
            const fireTile = G.tiles.find(
              (t) => t.bldg && t.bldg.id === 'campfire' && t.bldg.buildTime <= 0
            );
            const dest = fireTile || { col: G.hqCol, row: G.hqRow };
            c.targetCol = dest.col;
            c.targetRow = dest.row;
            if (!fireTile) c.mood = Math.max(0, c.mood - 2);
          }
        } else {
          const [sc, sr] = c.shelterAssigned.split(',').map(Number);
          c.targetCol = sc;
          c.targetRow = sr;
        }
      } else {
        c.shelterAssigned = null;
      }
      const sp = document.getElementById('sp-' + c.id);
      if (sp) sp.className = 'spr' + (c.sleeping ? ' zzz' : '');
    });
}

function checkMeals() {
  if ((G.hour === 8 || G.hour === 19) && G.minute === 0) {
    const alive = G.colonists.filter((c) => !c.dead);
    const fire = G.buildings.find(
      (b) => b.id === 'campfire' || b.id === 'kitchen'
    );
    const dest = fire || { col: G.hqCol, row: G.hqRow };
    alive.forEach((c) => {
      c.targetCol = dest.col;
      c.targetRow = dest.row;
    });
    const total = alive.length;
    const foodSrc =
      G.res.cooked >= total
        ? 'cooked'
        : G.res.cooked > 0
        ? 'cooked'
        : G.res.food >= total
        ? 'food'
        : 'food';
    const fedCount = Math.min(total, G.res[foodSrc] || 0);
    G.res[foodSrc] = Math.max(0, G.res[foodSrc] - fedCount);
    const wateredCount = Math.min(total, G.res.water || 0);
    G.res.water = Math.max(0, G.res.water - wateredCount);
    alive.forEach((c, i) => {
      if (i < fedCount) {
        c.hunger = Math.max(0, c.hunger - 50);
        c.mood = Math.min(100, c.mood + 5);
      } else {
        c.hunger = Math.min(100, c.hunger + 18);
        c.mood = Math.max(0, c.mood - 8);
      }
      if (i < wateredCount) {
        c.thirst = Math.max(0, c.thirst - 50);
        c.mood = Math.min(100, c.mood + 3);
      } else {
        c.thirst = Math.min(100, c.thirst + 22);
        c.mood = Math.max(0, c.mood - 8);
      }
    });
    const mealName = G.hour === 8 ? 'Morning' : 'Evening';
    const waterWarn = wateredCount < total ? ' ⚠ no water!' : '';
    addLog(
      mealName +
        ': fed ' +
        fedCount +
        '/' +
        total +
        (fedCount < total ? ' ⚠ no food!' : '') +
        waterWarn,
      'normal'
    );
  }
}

function updHappy() {
  const alive = G.colonists.filter((c) => !c.dead);
  if (!alive.length) return;
  G.happiness = Math.round(
    alive.reduce((a, c) => a + c.mood, 0) / alive.length
  );
  document.getElementById('hbf').style.width = G.happiness + '%';
  document.getElementById('hbf').style.background =
    G.happiness > 65 ? '#3a8030' : G.happiness > 40 ? '#907010' : '#902010';
  document.getElementById('hpct').textContent = G.happiness + '%';
  if (
    G.happiness >= 70 &&
    Math.random() < 0.0008 &&
    G.colonists.filter((c) => !c.dead).length < 12 &&
    G.day >= 7 &&
    (!G.lastStranger || G.day - G.lastStranger >= 3)
  ) {
    showModal(
      'STRANGER AT THE GATE',
      'A lone survivor stands outside your camp.\nThey look weary but capable.\n\nWill you take them in?',
      [
        {
          label: 'WELCOME',
          cls: 'ok',
          fn: () => {
            addNewCol();
            G.paused = false;
            updPauseBtn();
          },
        },
        {
          label: 'TURN AWAY',
          cls: 'danger',
          fn: () => {
            G.lastStranger = G.day;
            addLog('Turned a stranger away.', 'warn');
            G.paused = false;
            updPauseBtn();
          },
        },
      ]
    );
  }
}

function addNewCol() {
  const p = genPool(1)[0];
  p.id = G.colonists.length;
  p.col = G.hqCol + rnd(-2, 2);
  p.row = G.hqRow + rnd(-2, 2);
  p.targetCol = p.col;
  p.targetRow = p.row;
  G.colonists.push(p);
  const sp = document.createElement('div');
  sp.className = 'spr';
  sp.id = 'sp-' + p.id;
  sp.innerHTML = dollHTML(p);
  sp.title = p.name;
  sp.addEventListener('click', (e) => {
    e.stopPropagation();
    selCol(p.id);
  });
  document.getElementById('mapcanvas').appendChild(sp);
  posSprite(p);
  addLog(p.name + ' joined the camp!', 'good');
  renderSidebar();
  renderAssign();
}

function heraldTributeCost() {
  const base = Math.min(G.day * 2, 60);
  return {
    food: Math.max(20, base),
    wood: Math.max(15, Math.floor(base * 0.7)),
    metal: Math.max(8, Math.floor(base * 0.4)),
  };
}

function triggerRaid() {
  const alive = G.colonists.filter((c) => !c.dead);
  const guardCount = alive.filter((c) => c.role === 'GUARD').length;
  const power = Math.max(1, 5 - guardCount);
  const foodLost = rnd(10, 20) * power,
    woodLost = rnd(8, 15) * power;
  G.res.food = Math.max(0, G.res.food - foodLost);
  G.res.wood = Math.max(0, G.res.wood - woodLost);
  alive.forEach((c) => (c.mood = Math.max(0, c.mood - 20)));
  if (Math.random() < 0.4 && alive.length) {
    const victim = pick(alive);
    victim.hp = Math.max(5, victim.hp - rnd(20, 40));
    addLog('⚔ ' + victim.name + ' was wounded in the raid!', 'danger');
  }
  addLog(
    'Raiders attacked! Food -' + foodLost + ', Wood -' + woodLost,
    'danger'
  );
  renderResources();
  renderSidebar();
}

function checkHerald() {
  if (!G.hqPlaced) return;
  G.heraldTimer--;
  if (G.heraldTimer <= 0) {
    G.heraldTimer = rnd(4320, 7200);
    const alive = G.colonists.filter((c) => !c.dead);
    if (!alive.length) return;
    const cost = heraldTributeCost();
    const canPay =
      G.res.food >= cost.food &&
      G.res.wood >= cost.wood &&
      G.res.metal >= cost.metal;
    const costStr =
      'Food: ' + cost.food + ', Wood: ' + cost.wood + ', Metal: ' + cost.metal;
    showModal(
      'THE HERALD ARRIVES',
      'A figure in ash-grey robes stands at the edge of camp.\nIt extends an open hand.\n\nTRIBUTE DEMANDED:\n' +
        costStr +
        (canPay
          ? '\n\nYou can afford this.'
          : '\n\n⚠ You cannot afford this tribute.'),
      [
        {
          label: 'SACRIFICE ONE',
          cls: 'danger',
          fn: () => {
            const t = pick(alive);
            t.dead = true;
            alive
              .filter((x) => x.id !== t.id)
              .forEach((x) => (x.mood = Math.max(5, x.mood - 30)));
            document.getElementById('sp-' + t.id)?.remove();
            addLog(
              t.name + ' was given to the wasteland. The herald is satisfied.',
              'danger'
            );
            renderSidebar();
            G.paused = false;
            updPauseBtn();
          },
        },
        {
          label: 'PAY TRIBUTE',
          cls: 'warn',
          fn: () => {
            if (canPay) {
              G.res.food -= cost.food;
              G.res.wood -= cost.wood;
              G.res.metal -= cost.metal;
              addLog('Tribute paid. The herald departs in silence.', 'warn');
              renderResources();
            } else {
              addLog(
                'Not enough to pay. The herald is displeased...',
                'danger'
              );
              G.heraldTimer = rnd(60, 120);
              G.raidPending = true;
            }
            G.paused = false;
            updPauseBtn();
          },
        },
        {
          label: 'REFUSE',
          cls: '',
          fn: () => {
            addLog('The herald departs. Raiders will come.', 'danger');
            G.raidPending = true;
            G.raidTimer = rnd(rnd(3, 7) * 120, rnd(3, 7) * 120 + 60);
            G.paused = false;
            updPauseBtn();
          },
        },
      ],
      true
    );
  }
  if (G.raidPending && G.raidTimer > 0) {
    G.raidTimer--;
    if (G.raidTimer <= 0) {
      G.raidPending = false;
      triggerRaid();
    }
  }
}

function tickConstruction() {
  const isNight = isNightTime();
  G.tiles.forEach((ti) => {
    if (ti.bldg && ti.bldg.buildTime > 0) {
      const builders = G.colonists.filter(
        (c) =>
          c.role === 'BUILDER' &&
          !c.dead &&
          !c.sleeping &&
          Math.sqrt(
            Math.pow(Math.round(c.col) - ti.col, 2) +
              Math.pow(Math.round(c.row) - ti.row, 2)
          ) < 1.5
      ).length;
      if (builders === 0 || isNight) return;
      ti.bldg.buildTime = Math.max(0, ti.bldg.buildTime - (1 + builders));
      refreshTileEl(ti);
      if (ti.bldg.buildTime === 0) {
        const bd = BLDGS.find((b) => b.id === ti.bldg.id);
        addLog(
          (bd ? bd.ico + ' ' + bd.name : 'Building') + ' complete!',
          'good'
        );
      }
    }
  });
}

function tickPiles() {
  G.tiles.forEach((ti) => {
    if (!ti.resPile || ti.resPile.amount <= 0) return;
    ti.resPile.age = (ti.resPile.age || 0) + 1;
    if (
      (ti.resPile.type === 'berries' ||
        ti.resPile.type === 'mushrooms' ||
        ti.resPile.type === 'food') &&
      ti.resPile.age > 360
    ) {
      ti.resPile.amount = Math.max(0, ti.resPile.amount - 1);
      ti.resPile.age = 300;
      if (ti.resPile.amount <= 0) ti.resPile = null;
      refreshTileEl(ti);
    }
  });
}

function renderAdvisor() {
  const alive = G.colonists.filter((c) => !c.dead);
  const piles = G.tiles.filter((t) => t.resPile && t.resPile.amount > 0);
  const builders = alive.filter((c) => c.role === 'BUILDER').length;
  const porters = alive.filter((c) => c.role === 'PORTER').length;
  const shelterCap = G.tiles.reduce(
    (a, t) =>
      a +
      (t.bldg && t.bldg.buildTime <= 0
        ? t.bldg.id === 'tent'
          ? 2
          : t.bldg.id === 'house'
          ? 4
          : 0
        : 0),
    0
  );
  const sites = G.tiles.filter((t) => t.bldg && t.bldg.buildTime > 0).length;
  const lines = [];
  if (!G.hqPlaced) {
    lines.push(['warn', 'Place HQ on land to begin.']);
  } else {
    if (isNightTime())
      lines.push(['good', 'Night rest: nobody works until 06:00.']);
    if (alive.length && shelterCap < alive.length)
      lines.push([
        'warn',
        `Shelter: ${shelterCap}/${alive.length}. Build tents/houses.`,
      ]);
    else if (alive.length)
      lines.push(['good', `Shelter: ${shelterCap}/${alive.length}.`]);
    if (G.res.food + G.res.cooked < alive.length * 2)
      lines.push(['danger', 'Food is low. Assign farmer/gatherer/hunter.']);
    if (G.res.water < alive.length * 2)
      lines.push([
        'danger',
        'Water is low. Start with water barrels / build well later.',
      ]);
    if (piles.length && !porters)
      lines.push([
        'warn',
        `${piles.length} resource piles waiting. Assign a porter.`,
      ]);
    if (sites && !builders)
      lines.push([
        'warn',
        `${sites} construction site(s), no builder assigned.`,
      ]);
    if (!sites && !piles.length)
      lines.push(['good', 'Stable. Expand production before Herald returns.']);
  }
  const body = document.getElementById('advbody');
  if (body)
    body.innerHTML = lines
      .slice(0, 5)
      .map(([cls, txt]) => `<div class="advline ${cls}">${txt}</div>`)
      .join('');
}

function showModal(title, text, btns, danger = false) {
  SFX.warn();
  G.paused = true;
  updPauseBtn();
  document.getElementById('mdt').textContent = title;
  document.getElementById('mdt').style.color = danger
    ? 'var(--danger)'
    : 'var(--accent2)';
  document.getElementById('mdp').textContent = text;
  const be = document.getElementById('mdb');
  be.innerHTML = '';
  btns.forEach((b) => {
    const btn = document.createElement('button');
    btn.className = 'mb2 ' + (b.cls || '');
    btn.textContent = b.label;
    btn.addEventListener('click', () => {
      document.getElementById('mdbg').classList.remove('show');
      b.fn();
    });
    be.appendChild(btn);
  });
  document.getElementById('mdbg').classList.add('show');
}

function updPauseBtn() {
  const b = document.getElementById('pbtn');
  b.textContent = G.paused ? '▶ PLAY' : '⏸ PAUSE';
  b.classList.toggle('paused', G.paused);
}
document.getElementById('pbtn').addEventListener('click', () => {
  if (!G.hqPlaced) return;
  G.paused = !G.paused;
  updPauseBtn();
});
document.getElementById('spdbtn').addEventListener('click', () => {
  G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 5 : G.speed === 5 ? 10 : 1;
  document.getElementById('spdbtn').textContent = '×' + G.speed;
});

// ── TOOL SYSTEM ──
function getToolFromStock(toolType) {
  if (!toolType) return null;
  if (!G.toolStock) G.toolStock = {};
  const key = toolType.replace(/ /g, '_');
  if ((G.toolStock[key] || 0) > 0) {
    G.toolStock[key]--;
    return { type: toolType, dur: 80 };
  }
  return null;
}
function returnToolToStock(tool) {
  if (!tool || !tool.type) return;
  if (!G.toolStock) G.toolStock = {};
  const key = tool.type.replace(/ /g, '_');
  G.toolStock[key] = (G.toolStock[key] || 0) + 1;
}
function tryEquipTool(col) {
  const needed = PROF_TOOL[col.role];
  if (!needed) {
    col.tool = { type: '—', dur: 100 };
    return;
  }
  // already has right tool?
  if (
    col.tool &&
    col.tool.type &&
    col.tool.type.toLowerCase().includes(needed.toLowerCase())
  ) {
    return;
  }
  // return old tool
  if (
    col.tool &&
    col.tool.type &&
    col.tool.type !== '—' &&
    col.tool.type !== 'Stone'
  ) {
    returnToolToStock(col.tool);
    col.tool = { type: '—', dur: 0 };
  }
  // get new tool
  const t = getToolFromStock(needed);
  if (t) {
    col.tool = t;
    addLog(col.name + ' picked up ' + t.type, 'normal');
  } else {
    col.tool = { type: '—', dur: 0 };
    addLog('⚠ No ' + needed + ' for ' + col.name + '!', 'danger');
  }
}
