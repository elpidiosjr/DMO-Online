const API_URL = 'https://digimon-api.vercel.app/api/digimon';


const gallery = document.getElementById('gallery');
const status = document.getElementById('status') || createStatus();
const searchInput = document.getElementById('search');
const levelFilter = document.getElementById('levelFilter');
const template = document.getElementById('cardTemplate');
const header = document.querySelector('header') || document.body;


let digimons = [];          
let filteredList = [];      
let selected = [];          

function createStatus() {
  const el = document.createElement('div');
  el.id = 'status';
  el.className = 'status';
  el.textContent = '';
  if (header) header.after(el);
  return el;
}

function generateStats(digimon) {
  const levelWeight = {
    'Fresh': 0.6,
    'In Training': 0.75,
    'In-Training': 0.75,
    'Rookie': 0.9,
    'Champion': 1.05,
    'Ultimate': 1.2,
    'Mega': 1.35
  };

  let hash = 0;
  for (let i = 0; i < digimon.name.length; i++) {
    hash = ((hash << 5) - hash) + digimon.name.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);

  const base = 30 + (abs % 40); // 30..69
  const weight = levelWeight[digimon.level] || 0.95;

  const atk = Math.min(100, Math.round((base + (abs % 25)) * weight));
  const def = Math.min(100, Math.round((base + ((abs >> 3) % 25)) * weight));
  const esp = Math.min(100, Math.round((base + ((abs >> 6) % 25)) * weight));

  return { atk, def, esp };
}


function getSavedStats(name) {
  try {
    const raw = localStorage.getItem('digimon_stats_v1');
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[name] || null;
  } catch (e) {
    console.warn('Erro lendo localStorage', e);
    return null;
  }
}


function saveStats(name, stats) {
  try {
    const raw = localStorage.getItem('digimon_stats_v1');
    const map = raw ? JSON.parse(raw) : {};
    map[name] = stats;
    localStorage.setItem('digimon_stats_v1', JSON.stringify(map));
  } catch (e) {
    console.warn('Erro salvando localStorage', e);
  }
}


async function loadDigimons() {
  try {
    status.textContent = 'Carregando Digimon...';
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Erro na API: ' + res.status);
    digimons = await res.json();

    
    filteredList = digimons.slice();

    status.textContent = `Encontrados ${digimons.length} Digimon(s)`;
    renderGallery(filteredList);
    ensureArenaUI();
  } catch (err) {
    console.error(err);
    status.textContent = 'Falha ao carregar Digimon. Veja console.';
  }
}


function renderGallery(list) {
  gallery.innerHTML = ''; 

  if (!list.length) {
    gallery.innerHTML = '<p>Nenhum Digimon encontrado.</p>';
    return;
  }

  for (const d of list) {
    const clone = template.content.cloneNode(true);

   
    const card = clone.querySelector('.card') || clone.querySelector('article') || createCardWrapper();
    const img = clone.querySelector('.card-img') || createImg();
    const title = clone.querySelector('.card-title') || createTitle();
    const level = clone.querySelector('.card-level') || createLevel();

    
    img.src = d.img;
    img.alt = d.name;
    title.textContent = d.name;
    level.textContent = d.level;

  
    let stats = (d.atk !== undefined && d.def !== undefined && d.esp !== undefined)
                ? { atk: d.atk, def: d.def, esp: d.esp }
                : getSavedStats(d.name);

    if (!stats) {
      stats = generateStats(d);
      saveStats(d.name, stats);
    }


    const atkVal = clone.querySelector('.atk-val, .atk-value, .atk .value, .atk .stat-value, .stat-value.atk-value');
    const defVal = clone.querySelector('.def-val, .def-value, .def .value, .def .stat-value, .stat-value.def-value');
    const espVal = clone.querySelector('.esp-val, .esp-value, .eps-value, .esp .value, .eps .value, .esp .stat-value, .stat-value.esp-value, .stat-value.eps-value');

    if (atkVal) atkVal.textContent = stats.atk;
    if (defVal) defVal.textContent = stats.def;
    if (espVal) espVal.textContent = stats.esp;

    // Update the visual bars if present
    const atkBar = clone.querySelector('.bar-fill.atk, .bar-fill.atk-value');
    const defBar = clone.querySelector('.bar-fill.def, .bar-fill.def-value');
    const espBar = clone.querySelector('.bar-fill.esp, .bar-fill.eps, .bar-fill.esp-value, .bar-fill.eps-value');
    if (atkBar) atkBar.style.width = Math.min(100, Math.max(0, stats.atk)) + '%';
    if (defBar) defBar.style.width = Math.min(100, Math.max(0, stats.def)) + '%';
    if (espBar) espBar.style.width = Math.min(100, Math.max(0, stats.esp)) + '%';

  
    card.dataset.name = d.name;
    card.dataset.level = d.level;

   
    if (selected.find(s => s.name === d.name)) card.classList.add('selected-card');

 
    card.addEventListener('click', () => {
      toggleSelectDigimon({ name: d.name, img: d.img, stats });
 
      const inSel = selected.find(s => s.name === d.name);
      if (inSel) card.classList.add('selected-card'); else card.classList.remove('selected-card');
      updateArenaUI();
    });

    // 
    img.addEventListener('click', (ev) => {
      ev.stopPropagation();
      window.open(d.img, '_blank');
    });

    
    gallery.appendChild(clone);
  }
}


function toggleSelectDigimon(d) {
  const idx = selected.findIndex(s => s.name === d.name);
  if (idx !== -1) {

    selected.splice(idx, 1);
    return;
  }

  
  if (selected.length >= 2) {
   
    selected.shift();
  }
  selected.push(d);
}


let arenaRoot = null;
function ensureArenaUI() {
  if (arenaRoot) return;

  arenaRoot = document.createElement('div');
  arenaRoot.className = 'arena-root';
  arenaRoot.style.margin = '12px 0';
  arenaRoot.style.display = 'flex';
  arenaRoot.style.alignItems = 'center';
  arenaRoot.style.gap = '12px';
  arenaRoot.style.flexWrap = 'wrap';

  
  const slotA = document.createElement('div');
  slotA.id = 'slotA';
  slotA.style.minWidth = '200px';
  slotA.style.padding = '8px';
  slotA.style.borderRadius = '8px';
  slotA.style.background = 'rgba(255,255,255,0.02)';
  slotA.style.textAlign = 'center';

  const vs = document.createElement('div');
  vs.innerHTML = '<strong>ARENA</strong>';
  vs.style.minWidth = '120px';
  vs.style.textAlign = 'center';

  const slotB = document.createElement('div');
  slotB.id = 'slotB';
  slotB.style.minWidth = '200px';
  slotB.style.padding = '8px';
  slotB.style.borderRadius = '8px';
  slotB.style.background = 'rgba(255,255,255,0.02)';
  slotB.style.textAlign = 'center';

  // botões
  const fightBtn = document.createElement('button');
  fightBtn.textContent = 'Lutar';
  fightBtn.className = 'btn-fight';
  fightBtn.style.padding = '8px 12px';
  fightBtn.style.borderRadius = '8px';
  fightBtn.style.cursor = 'pointer';
  fightBtn.addEventListener('click', () => {
    if (selected.length < 2) {
      alert('Selecione dois Digimon para lutar (clique em dois cards).');
      return;
    }
    const result = simulateBattle(selected[0], selected[1]);
    showBattleResult(result);
  });

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Limpar';
  clearBtn.className = 'btn-clear';
  clearBtn.style.padding = '6px 10px';
  clearBtn.style.borderRadius = '8px';
  clearBtn.style.cursor = 'pointer';
  clearBtn.addEventListener('click', () => {
    selected = [];
    // remove highlights
    document.querySelectorAll('.selected-card').forEach(el => el.classList.remove('selected-card'));
    updateArenaUI();
  });

  // área de logs
  const logs = document.createElement('div');
  logs.id = 'arenaLogs';
  logs.style.width = '100%';
  logs.style.marginTop = '8px';
  logs.style.padding = '8px';
  logs.style.borderRadius = '8px';
  logs.style.background = 'rgba(0,0,0,0.25)';
  logs.style.fontSize = '13px';

  arenaRoot.appendChild(slotA);
  arenaRoot.appendChild(vs);
  arenaRoot.appendChild(slotB);
  arenaRoot.appendChild(fightBtn);
  arenaRoot.appendChild(clearBtn);
  if (header) header.after(arenaRoot);
  arenaRoot.after(logs);

  updateArenaUI();
}

function updateArenaUI() {
  const slotA = document.getElementById('slotA');
  const slotB = document.getElementById('slotB');
  const logs = document.getElementById('arenaLogs');

  if (!slotA || !slotB || !logs) return;

  slotA.innerHTML = selected[0] ? renderSlot(selected[0]) : '<em>Slot A (clique em um card)</em>';
  slotB.innerHTML = selected[1] ? renderSlot(selected[1]) : '<em>Slot B (clique em um card)</em>';

  logs.innerHTML = selected.length === 2 ? `<strong>Pronto para lutar</strong>` : `<em>Selecione dois Digimon</em>`;
}


function renderSlot(s) {
  
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px">
    <img src="${s.img}" alt="${s.name}" style="width:80px;height:80px;object-fit:contain;border-radius:6px;background:#fff;padding:6px">
    <div style="font-weight:700;color:#06b6d4">${s.name}</div>
    <div style="font-size:13px;">
      ⚔️ ${s.stats.atk} &nbsp; 🛡️ ${s.stats.def} &nbsp; ✨ ${s.stats.esp}
    </div>
  </div>`;
}


function showBattleResult(result) {
  const logs = document.getElementById('arenaLogs');
  if (!logs) {
    alert(result.logs.join('\n'));
    return;
  }
  logs.innerHTML = `<div><strong>Resultado</strong></div>
    <div style="margin-top:6px">${result.logs.map(l => `<div>${escapeHtml(l)}</div>`).join('')}</div>`;
}


function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}


function simulateBattle(d1, d2) {

  function power(a, b) {
    const randFactor = 0.85 + Math.random() * 0.3; // variação
    const offense = a.atk * randFactor + (a.esp * 0.6);
    const defense = b.def * (0.9 + Math.random() * 0.2);
    return offense - defense;
  }

  const score1 = power(d1.stats, d2.stats);
  const score2 = power(d2.stats, d1.stats);

  const logs = [
    `${d1.name} total ofensivo: ${score1.toFixed(1)}`,
    `${d2.name} total ofensivo: ${score2.toFixed(1)}`
  ];

  let winner;
  if (Math.abs(score1 - score2) < 1.0) {
    winner = Math.random() > 0.5 ? d1.name : d2.name;
    logs.push('Empate técnico — desempate aleatório.');
  } else {
    winner = score1 > score2 ? d1.name : d2.name;
  }
  logs.push(`Vencedor: ${winner}`);
  return { winner, logs };
}


function applyFilters() {
  const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const lvl = levelFilter ? levelFilter.value : '';

  filteredList = digimons.filter(d => {
    const matchName = !q || d.name.toLowerCase().includes(q);
    const matchLevel = !lvl || d.level.toLowerCase() === lvl.toLowerCase();
    return matchName && matchLevel;
  });

  status.textContent = `Mostrando ${filteredList.length} de ${digimons.length}`;
  renderGallery(filteredList);
}


if (searchInput) searchInput.addEventListener('input', applyFilters);
if (levelFilter) levelFilter.addEventListener('change', applyFilters);


function createCardWrapper() {
  const art = document.createElement('article');
  art.className = 'card';
  return art;
}
function createImg() {
  const img = document.createElement('img');
  img.className = 'card-img';
  return img;
}
function createTitle() {
  const h = document.createElement('h2');
  h.className = 'card-title';
  return h;
}
function createLevel() {
  const p = document.createElement('p');
  p.className = 'card-level';
  return p;
}


loadDigimons();

