

const STORAGE_KEYS = {
  STATS:  'dc_digimon_stats_v1',   
  OWNED:  'dc_owned_digimons_v1',  
  COINS:  'dc_coins_v1',           
  ITEMS:  'dc_items_v1',           
  BATTLE: 'dc_battle_team_v1'      
};

function gsGetJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn('Erro lendo localStorage', key, e);
    return fallback;
  }
}

function gsSetJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Erro salvando localStorage', key, e);
  }
}

// ---------- COINS ----------
function getCoins() {
  let coins = gsGetJson(STORAGE_KEYS.COINS, null);
  if (coins === null) {
    coins = 1000; // coins iniciais
    gsSetJson(STORAGE_KEYS.COINS, coins);
  }
  return coins;
}

function setCoins(value) {
  gsSetJson(STORAGE_KEYS.COINS, Math.max(0, Number(value) || 0));
}

function addCoins(delta) {
  const current = getCoins();
  const next = Math.max(0, current + Number(delta || 0));
  setCoins(next);
  return next;
}

// ---------- STATS ----------
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

  const level = digimon.level || 'Rookie';
  const weight = levelWeight[level] || 0.95;

  let hash = 0;
  const name = digimon.name || '';
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);

  const base = 45 + (abs % 20);
  const atk = Math.min(100, Math.round((base + (abs % 25)) * weight));
  const def = Math.min(100, Math.round((base + ((abs >> 3) % 25)) * weight));
  const esp = Math.min(100, Math.round((base + ((abs >> 6) % 25)) * weight));

  return { atk, def, esp };
}

function getStats(digimon) {
  const name = digimon.name;
  if (!name) return { atk: 10, def: 10, esp: 10 };

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    const map = raw ? JSON.parse(raw) : {};
    if (map[name]) return map[name];

    const stats = generateStats(digimon);
    map[name] = stats;
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(map));
    return stats;
  } catch (e) {
    console.warn('Erro em getStats', e);
    return generateStats(digimon);
  }
}

// ---------- COLEÇÃO ----------
function getOwned() {
  return gsGetJson(STORAGE_KEYS.OWNED, []);
}

function addOwned(digimon) {
  if (!digimon || !digimon.name) return;

  const owned = getOwned();
  if (!owned.find(d => d.name === digimon.name)) {
    owned.push({
      name: digimon.name,
      img: digimon.img,
      level: digimon.level
    });
    gsSetJson(STORAGE_KEYS.OWNED, owned);
  }

  // garante stats
  getStats(digimon);
}

function removeOwned(name) {
  const owned = getOwned();
  const filtered = owned.filter(d => d.name !== name);
  gsSetJson(STORAGE_KEYS.OWNED, filtered);
}

// ---------- ITENS ----------
function getItems() {
  return gsGetJson(STORAGE_KEYS.ITEMS, []);
}

function addItem(item) {
  const items = getItems();
  items.push(item);
  gsSetJson(STORAGE_KEYS.ITEMS, items);
}

// ---------- TIME DE BATALHA ----------
function getBattleTeam() {
  return gsGetJson(STORAGE_KEYS.BATTLE, []);
}

function setBattleTeam(team) {
  const cleaned = (team || []).slice(0, 2).map(d => ({
    name: d.name,
    img: d.img,
    level: d.level
  }));
  gsSetJson(STORAGE_KEYS.BATTLE, cleaned);
}

function clearBattleTeam() {
  gsSetJson(STORAGE_KEYS.BATTLE, []);
}
