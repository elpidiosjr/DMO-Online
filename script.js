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
    } catch (e) {}
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
        toggleSelectDigimon({ name: d.name, img: d.img, stats, level: d.level });
  
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

    


    // botão Treinar (aparece quando 1 digimon selecionado e nível In Training)
    const trainBtn = document.createElement('button');
    trainBtn.textContent = 'Treinar';
    trainBtn.id = 'trainBtn';
    trainBtn.className = 'btn-train';
    trainBtn.style.padding = '6px 10px';
    trainBtn.style.borderRadius = '8px';
    trainBtn.style.cursor = 'pointer';
    trainBtn.disabled = true;
    trainBtn.style.opacity = '0.6';
    trainBtn.addEventListener('click', () => {

      if (!/in[- ]?training/i.test(level)) {
        alert('Apenas Digimon de nível "In Training" podem ser treinados.');
        return;
      }
      window.location.href = 'train.html?name=' + encodeURIComponent(selected[0].name);
    });

    // área de logs (mensagens)
    const logs = document.createElement('div');
    logs.id = 'arenaLogs';
    logs.style.width = '100%';
    logs.style.marginTop = '8px';
    logs.style.padding = '8px';
    logs.style.borderRadius = '8px';
    logs.style.background = 'rgba(0,0,0,0.25)';
    logs.style.fontSize = '13px';

    arenaRoot.appendChild(title);
    arenaRoot.appendChild(slotSelected);
    arenaRoot.appendChild(trainBtn);
    if (header) header.after(arenaRoot);
    arenaRoot.after(logs);

    updateArenaUI();
  }

  function updateArenaUI() {
    const slotSel = document.getElementById('slotSelected');
    const logs = document.getElementById('arenaLogs');

    if (!slotSel || !logs) return;

    slotSel.innerHTML = selected[0] ? renderSlot(selected[0]) : '<em>Clique em um card para selecionar</em>';

    logs.innerHTML = selected.length === 1 ? `<strong>Pronto para treinar (se In Training)</strong>` : `<em>Selecione um Digimon</em>`;

    // controlar botao Treinar
    const trainBtn = document.getElementById('trainBtn');
    if (trainBtn) {
      if (selected.length === 1 && selected[0].level && /in[- ]?training/i.test(selected[0].level)) {
        trainBtn.disabled = false;
        trainBtn.style.opacity = '1';
      } else {
        trainBtn.disabled = true;
        trainBtn.style.opacity = '0.6';
      }
    }
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


  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
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

