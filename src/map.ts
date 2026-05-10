function genMap() {
  G.tiles = [];
  for (let r = 0; r < MAP_H; r++)
    for (let c = 0; c < MAP_W; c++)
      G.tiles.push({
        col: c,
        row: r,
        type: 'grass',
        bldg: null,
        resAmt: 0,
        maxRes: 0,
        res: null,
        resPile: null,
        _el: null,
      });
  const at = (c, r) =>
    c >= 0 && c < MAP_W && r >= 0 && r < MAP_H ? G.tiles[r * MAP_W + c] : null;
  const set = (c, r, t, amt = 0) => {
    const ti = at(c, r);
    if (!ti) return;
    ti.type = t;
    if (amt) {
      ti.resAmt = amt;
      ti.maxRes = amt;
    }
  };
  // water column, water tile
  const wc = rnd(2, MAP_W - 4),
    wr = rnd(2, MAP_H - 4);
  const waterTiles = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ];
  waterTiles.forEach(([dc, dr]) => set(wc + dc, wr + dr, 'water'));

  [
    [rnd(18, 23), rnd(0, 3)],
    [rnd(0, 2), rnd(12, 17)],
    [rnd(19, 24), rnd(14, 19)],
  ].forEach(([fc, fr]) => {
    for (let dr = -3; dr <= 3; dr++)
      for (let dc = -3; dc <= 3; dc++) {
        const ti = at(fc + dc, fr + dr);
        if (ti && ti.type === 'grass' && Math.random() < 0.65) {
          ti.type = 'forest';
          const a = rnd(40, 90);
          ti.resAmt = a;
          ti.maxRes = a;
        }
      }
  });
  const sc = rnd(8, 13),
    sr = rnd(8, 13);
  for (let dr = 0; dr < 5; dr++)
    for (let dc = 0; dc < 6; dc++) {
      if (Math.random() < 0.8) set(sc + dc, sr + dr, 'soil');
    }
  [
    [rnd(5, 9), rnd(2, 5)],
    [rnd(21, 25), rnd(5, 9)],
  ].forEach(([rc, rr]) => {
    for (let dr = -2; dr <= 2; dr++)
      for (let dc = -2; dc <= 2; dc++) {
        const ti = at(rc + dc, rr + dr);
        if (ti && ti.type === 'grass' && Math.random() < 0.6) {
          ti.type = 'rock';
          const a = rnd(25, 55);
          ti.resAmt = a;
          ti.maxRes = a;
        }
      }
  });
  for (let i = 0; i < 14; i++) {
    const ti = at(rnd(0, MAP_W - 1), rnd(0, MAP_H - 1));
    if (
      ti &&
      (ti.type === 'grass' || ti.type === 'forest') &&
      Math.random() < 0.5 &&
      !ti.res
    ) {
      ti.res = ti.type === 'forest' ? 'mushrooms' : 'berries';
      const a = rnd(6, 18);
      ti.resAmt = a;
      ti.maxRes = a;
    }
  }

  // ore вкрапления внутри rock
  G.tiles
    .filter((t) => t.type === 'rock')
    .sort(() => Math.random() - 0.5)
    .slice(0, rnd(3, 5))
    .forEach((t) => {
      t.type = 'ore';
      const a = rnd(15, 35);
      t.resAmt = a;
      t.maxRes = a;
    });

  for (let i = 0; i < 10; i++) {
    const ti = at(rnd(4, MAP_W - 4), rnd(4, MAP_H - 4));
    if (ti && ti.type === 'grass') ti.type = 'road';
  }
}

function renderMap() {
  const g = document.getElementById('mapgrid');
  g.style.gridTemplateColumns = `repeat(${MAP_W},${TS}px)`;
  g.style.gridTemplateRows = `repeat(${MAP_H},${TS}px)`;
  g.innerHTML = '';
  G.tiles.forEach((ti) => {
    const el = document.createElement('div');
    ti._el = el;
    refreshTileEl(ti);
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dragMoved) return;
      onTileClick(ti);
    });
    g.appendChild(el);
  });
  refreshSprites();
}

function tileClass(ti) {
  if (ti.bldg)
    return (
      't-building' +
      (ti.bldg.id === 'hq' ? ' hq' : '') +
      (ti.bldg.buildTime > 0 ? ' uc' : '')
    );
  let c = 't-' + ti.type;
  if (ti.type === 'forest' || ti.type === 'rock' || ti.type === 'ore')
    c += ' raised';
  if ((ti.type === 'forest' || ti.type === 'ore') && ti.maxRes > 0) {
    const p = ti.resAmt / ti.maxRes;
    c += p < 0.25 ? ' d3' : p < 0.5 ? ' d2' : p < 0.75 ? ' d1' : '';
  }
  return c;
}

function refreshTileEl(ti) {
  const el = ti._el;
  if (!el) return;
  el.className = 'tile ' + tileClass(ti);
  el.innerHTML = '';
  const ico = document.createElement('span');
  if (ti.bldg) {
    const bd = BLDGS.find((b) => b.id === ti.bldg.id);
    if (ti.bldg.field && ti.bldg.buildTime <= 0) {
      const phase = ti.bldg.phase || 'seeding';
      const cropIco = {
        wheat: {
          seeding: '🟫',
          growing25: '🌱',
          growing75: '🌿',
          harvest: '🌾',
        },
        veg: { seeding: '🟫', growing25: '🌱', growing75: '🥬', harvest: '🥕' },
        cotton: {
          seeding: '🟫',
          growing25: '🌱',
          growing75: '🌿',
          harvest: '🌸',
        },
      };
      const ci = cropIco[ti.bldg.crop] || cropIco.wheat;
      const g = ti.bldg.growth || 0;
      if (phase === 'seeding') ico.textContent = ci.seeding;
      else if (phase === 'growing')
        ico.textContent = g < 40 ? ci.growing25 : ci.growing75;
      else if (phase === 'harvest') ico.textContent = ci.harvest;
      else ico.textContent = '🟫';
      ico.style.fontSize = '20px';
    } else {
      ico.textContent = bd ? bd.ico : ti.bldg.id === 'hq' ? '🏚' : '🏗';
    }
    if (ti.bldg.buildTime > 0) {
      const p = document.createElement('div');
      p.className = 'bprog';
      p.style.width =
        Math.round((1 - ti.bldg.buildTime / ti.bldg.totalTime) * 100) + '%';
      el.appendChild(p);
    }
  } else {
    const imap = {
      forest: () => (Math.random() < 0.5 ? '🌲' : '🌳'),
      water: () => '〰',
      ore: () => '◈',
      rock: () => '◇',
      soil: () => '',
      grass: () => '',
      road: () => '',
    };
    ico.textContent = (imap[ti.type] || imap.grass)();
    if (ti.res && ti.resAmt > 0)
      ico.textContent = ti.res === 'berries' ? '🫐' : '🍄';
  }
  el.appendChild(ico);
  if (ti.resPile && (ti.resPile.amount > 0 || ti.resPile.type === 'supplies')) {
    const p = document.createElement('div');
    p.className = 'rpile';
    if (ti.resPile.type === 'supplies') {
      p.innerHTML =
        '📦<br><span style="font-size:7px">' +
        (ti.resPile.label || 'SUPPLIES') +
        '</span>';
      p.style.cssText =
        'position:absolute;top:2px;left:2px;right:2px;background:rgba(122,80,8,0.92);color:#fff;font-size:9px;border-radius:2px;padding:2px 3px;line-height:1.3;text-align:center;pointer-events:none;border:1px solid rgba(200,160,80,0.6);';
    } else {
      const icons = {
        wood: '🪵',
        stone: '🪨',
        metal: '⚙',
        berries: '🫐',
        mushrooms: '🍄',
        food: '🌾',
        water: '💧',
        copper: '🟤',
      };
      p.textContent =
        (icons[ti.resPile.type] || '📦') + '×' + ti.resPile.amount;
    }
    el.appendChild(p);
  }
  if (
    (ti.type === 'forest' || ti.type === 'ore' || ti.type === 'rock') &&
    ti.resAmt > 0 &&
    !ti.bldg
  ) {
    const lbl = document.createElement('div');
    lbl.className = 'tlbl';
    lbl.textContent = ti.resAmt;
    el.appendChild(lbl);
  }
  if (ti.bldg && ti.bldg.field && ti.bldg.buildTime <= 0 && ti.bldg.crop) {
    const lbl = document.createElement('div');
    lbl.className = 'tlbl';
    const ph = ti.bldg.phase || '?';
    const phShort = {
      seeding: 'SEED',
      growing: 'GRW ' + Math.round(ti.bldg.growth || 0) + '%',
      harvest: 'RIPE',
    };
    lbl.textContent = phShort[ph] || ph;
    lbl.style.color =
      ph === 'harvest' ? '#3a6010' : ph === 'growing' ? '#5a7020' : '#7a5008';
    lbl.style.fontWeight = 'bold';
    el.appendChild(lbl);
  }
}

// ── CAMERA ──
let camX = 0,
  camY = 0,
  camS = 1,
  drag = null,
  dragO = null,
  pinchD = null;
const mw = document.getElementById('mapwrap');
function updCam() {
  document.getElementById(
    'mapcanvas'
  ).style.transform = `translate(${camX}px,${camY}px) scale(${camS})`;
}
function centerOn(col, row) {
  const w = mw;
  camS = 0.85;
  camX = w.offsetWidth / 2 - col * TS * camS - (TS * camS) / 2;
  camY = w.offsetHeight / 2 - row * TS * camS - (TS * camS) / 2;
  updCam();
}
mw.addEventListener(
  'touchstart',
  (e) => {
    if (e.touches.length === 1) {
      drag = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      dragO = { x: camX, y: camY };
      dragMoved = false;
      mw.classList.add('grabbing');
    }
    if (e.touches.length === 2)
      pinchD = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
  },
  { passive: true }
);
mw.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches.length === 1 && drag) {
      const dx = e.touches[0].clientX - drag.x,
        dy = e.touches[0].clientY - drag.y;
      if (Math.sqrt(dx * dx + dy * dy) > 8) dragMoved = true;
      camX = dragO.x + dx;
      camY = dragO.y + dy;
      updCam();
    }
    if (e.touches.length === 2 && pinchD) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      camS = Math.max(0.4, Math.min(2.5, (camS * d) / pinchD));
      pinchD = d;
      updCam();
    }
  },
  { passive: true }
);
mw.addEventListener('touchend', () => {
  drag = null;
  pinchD = null;
  mw.classList.remove('grabbing');
});
let dragMoved = false;
mw.addEventListener('mousedown', (e) => {
  drag = { x: e.clientX, y: e.clientY };
  dragO = { x: camX, y: camY };
  dragMoved = false;
  mw.classList.add('grabbing');
});
window.addEventListener('mousemove', (e) => {
  if (drag && dragO) {
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    if (Math.sqrt(dx * dx + dy * dy) > 5) dragMoved = true;
    camX = dragO.x + dx;
    camY = dragO.y + dy;
    updCam();
  }
});
window.addEventListener('mouseup', () => {
  drag = null;
  mw.classList.remove('grabbing');
});
mw.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    camS = Math.max(0.4, Math.min(2.5, camS * (e.deltaY < 0 ? 1.1 : 0.9)));
    updCam();
  },
  { passive: false }
);

// ── TILE CLICK ──
let popTO = null;
function onTileClick(ti) {
  document.getElementById('tpop').classList.remove('show');
  if (G.placingBldg) {
    placeBuilding(G.placingBldg, ti);
    return;
  }
  if (!G.hqPlaced) {
    addLog('Open BUILD menu → SHELTER → place Headquarters first', 'warn');
    return;
  }
  showTilePop(ti);
}
function showTilePop(ti) {
  clearTimeout(popTO);
  const pop = document.getElementById('tpop');
  const titles = {
    grass: 'Grassland',
    forest: 'Forest',
    water: 'Water Source',
    soil: 'Fertile Soil',
    rock: 'Rocky Ground',
    ore: 'Ore Deposit',
    road: 'Old Road',
  };
  let title = ti.bldg
    ? (BLDGS.find((b) => b.id === ti.bldg.id) || { name: 'HQ' }).name
    : titles[ti.type] || ti.type;
  let body = '';
  if (ti.bldg) {
    if (ti.bldg.buildTime > 0)
      body =
        'Under construction: ' +
        Math.round((1 - ti.bldg.buildTime / ti.bldg.totalTime) * 100) +
        '%';
    else {
      if (ti.bldg.id === 'storehouse' || ti.bldg.id === 'hq')
        body =
          'Contents: ' +
          (Object.entries(G.res)
            .filter(([k, v]) => v > 0)
            .map(([k, v]) => k + ': ' + Math.floor(v))
            .join(', ') || 'empty');
      if (ti.bldg.field)
        body =
          'Crop: ' +
          (ti.bldg.crop || 'none') +
          ' · ' +
          (ti.bldg.phase || '?').toUpperCase() +
          ' ' +
          Math.round(ti.bldg.growth || 0) +
          '%';
      if (ti.bldg.id === 'workshop') body = 'Tap CRAFT tab to make tools';
    }
  } else {
    if (ti.type === 'forest') body = 'Timber available: ' + ti.resAmt;
    else if (ti.type === 'ore') body = 'Ore: ' + ti.resAmt;
    else if (ti.type === 'rock') body = 'Stone: ' + ti.resAmt;
    else if (ti.type === 'water')
      body =
        'Permanent water source\nTap → Fetch Water to send a Porter here.\nWater stock: ' +
        Math.floor(G.res.water);
    else if (ti.type === 'soil') body = 'Fertile soil — good for fields';
    if (ti.res && ti.resAmt > 0) body += ' · ' + ti.res + ': ' + ti.resAmt;
    if (ti.resPile && ti.resPile.amount > 0)
      body += ' · Pile: ' + ti.resPile.type + '×' + ti.resPile.amount;
  }
  const actions = [];
  if (!ti.bldg) {
    if (ti.type === 'water')
      actions.push({
        label: '💧 Fetch Water (Porter)',
        fn: () => assignWaterFetch(ti),
      });
    if (ti.type === 'forest' && ti.resAmt > 0)
      actions.push({
        label: '🪵 Gather Wood',
        fn: () => assignPriorityTask('LUMBERJACK', ti),
      });
    if (ti.type === 'ore' && ti.resAmt > 0)
      actions.push({
        label: '⛏ Mine Ore',
        fn: () => assignPriorityTask('MINER', ti),
      });
    if (ti.type === 'rock' && ti.resAmt > 0)
      actions.push({
        label: '🪨 Quarry Stone',
        fn: () => assignPriorityTask('STONEMASON', ti),
      });
    if ((ti.res === 'berries' || ti.res === 'mushrooms') && ti.resAmt > 0)
      actions.push({
        label: '🧺 Gather',
        fn: () => assignPriorityTask('GATHERER', ti),
      });
    if (ti.resPile && ti.resPile.amount > 0)
      actions.push({
        label: '🎒 Carry to Store',
        fn: () => assignPriorityTask('PORTER', ti),
      });
  }
  if (ti.bldg && ti.bldg.id === 'workshop' && ti.bldg.buildTime <= 0)
    actions.push({ label: '🔧 Open Workshop', fn: () => openWorkshop() });
  if (ti.bldg && ti.bldg.id === 'forge' && ti.bldg.buildTime <= 0)
    actions.push({ label: '⚒ Open Forge', fn: () => openCraftShop('forge') });
  if (ti.bldg && ti.bldg.id === 'well' && ti.bldg.buildTime <= 0)
    actions.push({
      label: '💧 Fetch Water (Porter)',
      fn: () => assignWaterFetch(ti),
    });
  if (ti.bldg && ti.bldg.field && ti.bldg.buildTime <= 0)
    actions.push({ label: '🌾 Field Status', fn: () => {} });
  document.getElementById('tpt').textContent = title;
  const bp = document.getElementById('tpb');
  bp.innerHTML =
    '<div style="margin-bottom:4px;color:var(--textdim);font-size:10px">' +
    body +
    '</div>';
  actions.forEach((a) => {
    const btn = document.createElement('button');
    btn.style.cssText =
      'display:block;width:100%;margin-top:3px;background:var(--bg3);border:1px solid var(--border);color:var(--text);font-family:Share Tech Mono,monospace;font-size:10px;padding:4px 6px;cursor:pointer;text-align:left;';
    btn.textContent = a.label;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      pop.classList.remove('show');
      a.fn();
    });
    bp.appendChild(btn);
  });
  pop.style.pointerEvents = 'auto';
  const rect = mw.getBoundingClientRect();
  const tx = (ti.col * TS + TS) * camS + camX,
    ty = ti.row * TS * camS + camY;
  pop.style.left = Math.min(tx + 4, rect.width - 195) + 'px';
  pop.style.top = Math.max(ty - 90, 4) + 'px';
  pop.classList.add('show');
  popTO = setTimeout(() => pop.classList.remove('show'), 5000);
}
function assignWaterFetch(ti) {
  const porter = G.colonists.filter(
    (c) => !c.dead && !c.sleeping && c.role === 'PORTER'
  );
  const target = porter.length
    ? porter.reduce((a, b) =>
        Math.abs(a.col - ti.col) + Math.abs(a.row - ti.row) <
        Math.abs(b.col - ti.col) + Math.abs(b.row - ti.row)
          ? a
          : b
      )
    : G.colonists.find((c) => !c.dead && !c.sleeping && c.action === 'IDLE');
  if (!target) {
    addLog('No one available to fetch water!', 'warn');
    return;
  }
  target.waterTask = { col: ti.col, row: ti.row };
  target.priorityTarget = { col: ti.col, row: ti.row };
  markTileTask(ti);
  addLog(target.name + ' → fetching water', 'normal');
}
function markTileTask(ti) {
  if (!ti._el) return;
  const existing = ti._el.querySelector('.task-mark');
  if (existing) return;
  const mark = document.createElement('div');
  mark.className = 'task-mark';
  mark.style.cssText =
    'position:absolute;inset:0;border:2px solid var(--accent2);pointer-events:none;z-index:5;animation:taskPulse 1s ease infinite;';
  ti._el.appendChild(mark);
  setTimeout(() => mark.remove(), 8000);
}
function assignPriorityTask(role, ti) {
  const candidates = G.colonists.filter(
    (c) => !c.dead && !c.sleeping && c.role === role
  );
  if (!candidates.length) {
    const idle = G.colonists.find(
      (c) => !c.dead && !c.sleeping && c.action === 'IDLE'
    );
    if (idle) {
      idle.priorityTarget = { col: ti.col, row: ti.row, role };
      addLog(idle.name + ' → ' + role + ' task assigned', 'good');
    } else addLog('No ' + role + ' available!', 'warn');
    return;
  }
  const nearest = candidates.reduce((a, b) => {
    const da = Math.abs(a.col - ti.col) + Math.abs(a.row - ti.row);
    const db = Math.abs(b.col - ti.col) + Math.abs(b.row - ti.row);
    return da < db ? a : b;
  });
  nearest.priorityTarget = { col: ti.col, row: ti.row, role };
  addLog(nearest.name + ' → ' + role + ' priority task', 'good');
}
function placeHQ(ti) {
  if (G.hqPlaced) {
    addLog('HQ already placed!', 'warn');
    G.placingBldg = null;
    document.getElementById('phint').classList.remove('show');
    return;
  }
  if (ti.type === 'water') {
    addLog("Can't place on water", 'warn');
    return;
  }
  ti.bldg = { id: 'hq', buildTime: 0, totalTime: 0, lv: 1 };
  G.hqCol = ti.col;
  G.hqRow = ti.row;
  G.hqPlaced = true;
  G.buildings.push({
    id: 'hq',
    col: ti.col,
    row: ti.row,
    lv: 1,
    paused: false,
  });
  G.colonists.forEach((c) => {
    c.col = ti.col + rnd(-1, 1);
    c.row = ti.row + rnd(-1, 1);
    c.targetCol = c.col;
    c.targetRow = c.row;
  });
  refreshTileEl(ti);
  refreshSprites();
  document.getElementById('phint').classList.remove('show');
  G.paused = false;
  updPauseBtn();
  addLog('Headquarters established!', 'good');
  addLog('Early goals: Tent → Campfire → Field → Storehouse.', 'lore');
  addLog(
    'Assign roles and start building. Night is full rest: no work until morning.',
    'normal'
  );
  renderLog();
  setTimeout(() => centerOn(ti.col, ti.row), 100);
  G.heraldTimer = rnd(200, 360);
}
