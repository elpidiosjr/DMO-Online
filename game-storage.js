const STORAGE_KEYS = {
  STATS:  'dc_digimon_stats_v1',
  OWNED:  'dc_owned_digimons_v1',
  COINS:  'dc_coins_v1',
  ITEMS:  'dc_items_v1',
  BATTLE: 'dc_battle_team_v1',
  PITY:   'dc_summon_pity_v1'
};

// ---------- STORAGE HELPERS ----------

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
    coins = 1000;
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

// ---------- SISTEMA PITY (ANTI AZAR) ----------

function getPity() {
  return gsGetJson(STORAGE_KEYS.PITY, 0);
}

function setPity(value) {
  gsSetJson(STORAGE_KEYS.PITY, value);
}

function increasePity() {
  const pity = getPity() + 1;
  setPity(pity);
  return pity;
}

function resetPity() {
  setPity(0);
}

// ---------- RARIDADE SUMMON ----------

function rollRarity() {

  const pity = increasePity();

  if (pity >= 10) {
    resetPity();
    return "Ultimate";
  }

  const r = Math.random();

  if (r < 0.05) return "Mega";
  if (r < 0.18) return "Ultimate";
  if (r < 0.45) return "Champion";

  return "Rookie";
}

// ---------- INVOCAR DIGIMON ----------

function summonDigimon(pool) {

  const rarity = rollRarity();

  const candidates = pool.filter(d => d.level === rarity);

  if (!candidates.length) {
    console.warn("Nenhum Digimon da raridade:", rarity);
    return null;
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];

  addOwned(chosen);

  return chosen;
}

// ---------- RECOMPENSA DE BATALHA ----------

function rewardBattleVictory(enemyTeam = []) {

  let baseReward = 120;

  enemyTeam.forEach(d => {
    if (d.level === 'Ultimate') baseReward += 40;
    if (d.level === 'Mega') baseReward += 80;
  });

  if (Math.random() < 0.25) {
    baseReward += 50;
  }

  addCoins(baseReward);

  return baseReward;
}

// ---------- FAVICON DINÂMICO ----------

function setUltimateFavicon() {

  const favicon = document.getElementById("favicon");

  if (!favicon) return;

  favicon.href = "image/agumon-ultimate.png";

  setTimeout(() => {
    resetFavicon();
  }, 5000);
}

function resetFavicon() {

  const favicon = document.getElementById("favicon");

  if (!favicon) return;

  favicon.href = "image/agumon.png";
}

// ---------- UTIL ----------

function isUltimate(digimon) {
  return digimon && digimon.level === 'Ultimate';
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

  getStats(digimon);

  if (isUltimate(digimon)) {
    setUltimateFavicon();
  }

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

// ---------- IA COMBATE AUTOMÁTICO ----------

function chooseAction(attacker, defender) {

  const atkStats = getStats(attacker);
  const defStats = getStats(defender);

  const attackerHP = attacker.hp || 100;
  const defenderHP = defender.hp || 100;

  const normalDamage = Math.max(5, atkStats.atk - defStats.def / 2);
  const specialDamage = Math.max(8, atkStats.esp - defStats.def / 3);

  if (normalDamage >= defenderHP) {
    return "attack";
  }

  if (attackerHP < 30 && specialDamage > normalDamage) {
    return "special";
  }

  if (defStats.def > atkStats.atk) {
    return "special";
  }

  return "attack";
}

function performTurn(attacker, defender) {

  const action = chooseAction(attacker, defender);

  const atkStats = getStats(attacker);
  const defStats = getStats(defender);

  let damage = 0;

  if (action === "attack") {
    damage = Math.max(5, atkStats.atk - defStats.def / 2);
  } else {
    damage = Math.max(8, atkStats.esp - defStats.def / 3);
  }

  defender.hp = Math.max(0, (defender.hp || 100) - damage);

  return {
    action,
    damage,
    defenderHP: defender.hp
  };
}

function autoBattle(teamA, teamB) {

  const a = { ...teamA[0], hp: 100 };
  const b = { ...teamB[0], hp: 100 };

  const log = [];
  let turn = 0;

  while (a.hp > 0 && b.hp > 0 && turn < 50) {

    const resultA = performTurn(a, b);

    log.push({
      attacker: a.name,
      action: resultA.action,
      damage: resultA.damage
    });

    if (b.hp <= 0) break;

    const resultB = performTurn(b, a);

    log.push({
      attacker: b.name,
      action: resultB.action,
      damage: resultB.damage
    });

    turn++;
  }

  const winner = a.hp > 0 ? a.name : b.name;

  return {
    winner,
    log
  };
}