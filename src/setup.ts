let pts = 50,
  supQty = {};
SUPPLIES.forEach((s) => (supQty[s.id] = 0));
function buildSetup() {
  const sg = document.getElementById('sgrid');
  SUPPLIES.forEach((s) => {
    const d = document.createElement('div');
    d.className = 'si';
    d.innerHTML = `<span class="si-ico">${s.ico}</span><div class="si-info"><div class="si-name">${s.name}</div><div class="si-cost">${s.cost}pt=${s.qty}</div></div><div class="si-qty"><div class="qb" data-id="${s.id}" data-d="-1">−</div><div class="qv" id="qv-${s.id}">0</div><div class="qb" data-id="${s.id}" data-d="1">+</div></div>`;
    sg.appendChild(d);
  });
  sg.querySelectorAll('.qb').forEach((b) =>
    b.addEventListener('click', () => {
      const s = SUPPLIES.find((x) => x.id === b.dataset.id),
        d = parseInt(b.dataset.d);
      const nv = supQty[s.id] + d,
        np = pts - d * s.cost;
      if (nv < 0 || np < 0 || np > 50) return;
      supQty[s.id] = nv;
      pts = np;
      document.getElementById('qv-' + s.id).textContent = nv;
      document.getElementById('ptsnum').textContent = pts;
    })
  );
  const pool = genPool(10);
  const cl = document.getElementById('cpl');
  let sel = new Set();
  pool.forEach((c, i) => {
    const tr = TRAITS.find((t) => t.id === c.trait);
    const best = PROF.reduce((a, b) => (c.prefs[a] >= c.prefs[b] ? a : b));
    const card = document.createElement('div');
    card.className = 'cpc';
    card.dataset.i = i;
    card.innerHTML = `<div class="cp-dot" style="background:${c.color}"></div><div class="cp-info"><div class="cp-name">${c.name}</div><div class="cp-sub">${tr.label} · ${c.gender}</div><div class="cp-pref">★ ${PICO[best]} ${best}</div></div>`;
    card.addEventListener('click', () => {
      if (sel.has(i)) {
        sel.delete(i);
        card.classList.remove('sel');
      } else {
        if (sel.size >= 5) return;
        sel.add(i);
        card.classList.add('sel');
      }
      document.getElementById('startbtn').disabled = sel.size !== 5;
    });
    cl.appendChild(card);
  });
  document.getElementById('startbtn').addEventListener('click', () => {
    SUPPLIES.forEach((s) => {
      if (supQty[s.id] > 0)
        G.res[s.res] = (G.res[s.res] || 0) + supQty[s.id] * s.qty;
    });
    G.colonists = [...sel].map((i, idx) => {
      const c = { ...pool[i] };
      c.id = idx;
      return c;
    });
    startGame();
  });
}
function genPool(n) {
  const names = [...NAMES].sort(() => Math.random() - 0.5);
  return Array.from({ length: n }, (_, i) => {
    const tr = pick(TRAITS),
      prefs = {};
    PROF.forEach((p) => (prefs[p] = rnd(1, 5)));
    prefs[pick(PROF)] = 5;
    const maxHp = Math.round(100 * tr.hp);
    return {
      name: names[i] || 'SURVIVOR',
      gender: Math.random() > 0.5 ? 'M' : 'F',
      color: COLORS[i % COLORS.length],
      trait: tr.id,
      prefs,
      role: PROF[i % PROF.length],
      skill: {},
      combatSkill: 0,
      hp: maxHp,
      maxHp,
      mood: 75,
      hunger: 0,
      thirst: 0,
      sick: false,
      sickTimer: 0,
      dead: false,
      sleeping: false,
      action: 'IDLE',
      col: 0,
      row: 0,
      targetCol: 0,
      targetRow: 0,
      carryType: null,
      carryAmt: 0,
      visual: {
        skin: pick(SKINS),
        hair: pick(HAIRS),
        hairStyle: pick(HAIR_STYLES),
        body: COLORS[i % COLORS.length],
      },
      tool: { type: 'Stone', dur: 100 },
    };
  });
}
