const FOOD_TAGS = [
  'Pasta', 'Riso', 'Pollo', 'Pesce', 'Legumi', 'Verdure', 'Frutta', 'Pizza', 'Insalata', 'Formaggi', 'Uova', 'Dolci'
];

const ZONE_MARKETS = {
  'Genova Piazza Dante': [
    { id: 'ge-ess-1', chain: 'Esselunga', store: 'Esselunga Genova', address: 'Via G. d’Annunzio 95', distance: 1.1 },
    { id: 'ge-coop-1', chain: 'Coop', store: 'Coop Darsena', address: 'Via al Porto Antico 2', distance: 0.9 },
    { id: 'ge-car-1', chain: 'Carrefour', store: 'Carrefour Express Centro', address: 'Via XX Settembre 45', distance: 0.6 },
    { id: 'ge-con-1', chain: 'Conad', store: 'Conad City Sarzano', address: 'Piazza Sarzano 8R', distance: 1.4 }
  ],
  'Milano Duomo': [
    { id: 'mi-ess-1', chain: 'Esselunga', store: 'Esselunga Porta Vittoria', address: 'Viale Umbria 66', distance: 1.8 },
    { id: 'mi-car-1', chain: 'Carrefour', store: 'Carrefour Market Missori', address: 'Corso Italia 3', distance: 0.7 },
    { id: 'mi-coop-1', chain: 'Coop', store: 'Coop Loreto', address: 'Piazzale Loreto 9', distance: 2.0 }
  ],
  'Torino Porta Nuova': [
    { id: 'to-coop-1', chain: 'Coop', store: 'Coop Porta Nuova', address: 'Via Nizza 20', distance: 0.8 },
    { id: 'to-con-1', chain: 'Conad', store: 'Conad City', address: 'Via Madama Cristina 14', distance: 1.1 },
    { id: 'to-lid-1', chain: 'Lidl', store: 'Lidl San Salvario', address: 'Via Saluzzo 60', distance: 1.3 }
  ]
};

const OFFERS_DB = {
  'ge-ess-1': ['Pasta Garofalo 500g €0,89', 'Salmone affumicato -30%', 'Yogurt greco 2x1'],
  'ge-coop-1': ['Tonno all’olio Coop €1,19', 'Banane bio -25%', 'Uova bio 6pz €1,89'],
  'ge-car-1': ['Passata Mutti €0,99', 'Mozzarella fiordilatte -20%', 'Petto di pollo €8,90/kg'],
  'ge-con-1': ['Riso Arborio -30%', 'Zucchine €1,49/kg', 'Parmigiano 24 mesi -20%'],
  'mi-ess-1': ['Pane integrale -25%', 'Bresaola punta d’anca -20%'],
  'mi-car-1': ['Sgombro in scatola 3x2', 'Insalata mista €0,99'],
  'mi-coop-1': ['Fesa di tacchino -20%', 'Mela Golden €1,79/kg'],
  'to-coop-1': ['Ceci in vetro €0,89', 'Ricotta fresca -25%'],
  'to-con-1': ['Pasta integrale €0,79', 'Pomodori datterini -30%'],
  'to-lid-1': ['Mozzarella light €0,79', 'Avena istantanea -20%']
};

const state = {
  items: JSON.parse(localStorage.getItem('items') || '[]'),
  people: JSON.parse(localStorage.getItem('people') || '[]'),
  selectedMarkets: JSON.parse(localStorage.getItem('selectedMarkets') || '[]'),
  dishes: JSON.parse(localStorage.getItem('dishes') || '[]'),
  ai: JSON.parse(localStorage.getItem('ai') || '{}'),
  zone: localStorage.getItem('zone') || 'Genova Piazza Dante',
  maxDistance: Number(localStorage.getItem('maxDistance') || 2)
};

const $ = (id) => document.getElementById(id);

function save() {
  localStorage.setItem('items', JSON.stringify(state.items));
  localStorage.setItem('people', JSON.stringify(state.people));
  localStorage.setItem('selectedMarkets', JSON.stringify(state.selectedMarkets));
  localStorage.setItem('dishes', JSON.stringify(state.dishes));
  localStorage.setItem('ai', JSON.stringify(state.ai));
  localStorage.setItem('zone', state.zone);
  localStorage.setItem('maxDistance', String(state.maxDistance));
}

function daysTo(dateStr) {
  const d = new Date(dateStr);
  const t = new Date();
  d.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  return Math.ceil((d - t) / 86400000);
}

function normalize(s) {
  return String(s || '').trim().toLowerCase();
}

function approvedDishes() {
  return state.dishes.filter((dish) => {
    const votes = Object.values(dish.votes || {});
    const yes = votes.filter((v) => v === 'yes').length;
    const no = votes.filter((v) => v === 'no').length;
    return votes.length > 0 && yes > no;
  });
}

function missingIngredientsForApproved() {
  const pantry = state.items.map((i) => normalize(i.name));
  return [...new Set(approvedDishes().flatMap((d) => d.ingredients.filter((ing) => !pantry.includes(normalize(ing)))))];
}

function buildChecklist(targetId, list, name) {
  $(targetId).innerHTML = list
    .map((item) => `<label><input type="checkbox" name="${name}" value="${item}" />${item}</label>`)
    .join('');
}

function getChecked(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((el) => el.value);
}

function renderKpi() {
  $('kpiItems').textContent = state.items.length;
  $('kpiExpiring').textContent = state.items.filter((i) => {
    const d = daysTo(i.expiry);
    return d >= 0 && d <= 2;
  }).length;
  $('kpiPeople').textContent = state.people.length;
  $('kpiApproved').textContent = approvedDishes().length;
}

function renderItems() {
  const el = $('itemsList');
  el.innerHTML = '';
  const ordered = [...state.items].sort((a, b) => a.expiry.localeCompare(b.expiry));
  if (!ordered.length) {
    el.innerHTML = '<li class="meta">Nessun alimento inserito.</li>';
    return;
  }
  for (const item of ordered) {
    const d = daysTo(item.expiry);
    const cls = d < 0 ? 'expired' : d <= 2 ? 'warning' : '';
    const tag = d < 0 ? 'Scaduto' : d === 0 ? 'Scade oggi' : `Scade tra ${d} giorni`;
    const li = document.createElement('li');
    li.className = `item ${cls}`;
    li.innerHTML = `<div><strong>${item.name}</strong><div class="meta">${item.quantity} · ${tag}</div></div><button data-item-id="${item.id}" class="ghost">Elimina</button>`;
    el.appendChild(li);
  }
}

function renderPeople() {
  const list = $('peopleList');
  list.innerHTML = '';
  if (!state.people.length) {
    list.innerHTML = '<li class="meta">Nessuna persona inserita.</li>';
    $('voterSelect').innerHTML = '<option value="">Aggiungi una persona</option>';
    return;
  }
  $('voterSelect').innerHTML = state.people.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  for (const p of state.people) {
    const li = document.createElement('li');
    li.className = 'person';
    li.innerHTML = `
      <div>
        <strong>${p.name}</strong>
        <div class="meta">Età: ${p.age || '-'}</div>
        <div class="meta">Preferiti: ${p.likes.length ? p.likes.join(', ') : '-'}</div>
        <div class="meta">Non graditi: ${p.dislikes.length ? p.dislikes.join(', ') : '-'}</div>
        <div class="meta">Note: ${p.notes || '-'}</div>
      </div>
      <button data-person-id="${p.id}" class="ghost">Rimuovi</button>
    `;
    list.appendChild(li);
  }
}

function getMarketsInRange() {
  const list = ZONE_MARKETS[state.zone] || [];
  return list.filter((m) => Number(m.distance) <= Number(state.maxDistance));
}

function renderZoneResults() {
  const container = $('zoneResult');
  const inRange = getMarketsInRange();
  if (!inRange.length) {
    container.innerHTML = '<div class="meta">Nessun supermercato trovato nel raggio indicato.</div>';
    return;
  }
  container.innerHTML = inRange.map((m) => {
    const checked = state.selectedMarkets.some((s) => s.id === m.id) ? 'checked' : '';
    return `<label class="market-row"><span><strong>${m.chain}</strong> · ${m.store}<br><small class="meta">${m.address} · ${m.distance} km</small></span><input type="checkbox" data-market-id="${m.id}" ${checked}></label>`;
  }).join('');
}

function renderSelectedMarkets() {
  const list = $('marketsList');
  list.innerHTML = '';
  if (!state.selectedMarkets.length) {
    list.innerHTML = '<li class="meta">Nessun supermercato preferito selezionato.</li>';
    return;
  }
  for (const market of state.selectedMarkets) {
    const li = document.createElement('li');
    li.innerHTML = `${market.chain} (${market.distance} km) <button data-remove-market-id="${market.id}">×</button>`;
    list.appendChild(li);
  }
}

function renderOffers() {
  const list = $('offersList');
  list.innerHTML = '';
  const missing = missingIngredientsForApproved();

  if (!state.selectedMarkets.length) {
    list.innerHTML = '<li class="meta">Seleziona i supermercati preferiti per vedere le offerte disponibili.</li>';
    return;
  }

  if (missing.length) {
    const li = document.createElement('li');
    li.className = 'offer';
    li.innerHTML = `<strong>Ingredienti mancanti per i piatti approvati</strong><div class="meta">${missing.join(', ')}</div>`;
    list.appendChild(li);
  }

  for (const market of state.selectedMarkets.sort((a, b) => a.distance - b.distance)) {
    const offers = OFFERS_DB[market.id] || ['Nessuna promo disponibile in questo momento'];
    const li = document.createElement('li');
    li.className = 'offer';
    li.innerHTML = `<strong>${market.chain} · ${market.store}</strong><div class="meta">${market.distance} km · ${market.address}</div><div class="meta">${offers.join(' · ')}</div>`;
    list.appendChild(li);
  }
}

function ingredientCoverage(ingredients) {
  const pantry = state.items.map((i) => normalize(i.name));
  const missing = ingredients.filter((i) => !pantry.includes(normalize(i)));
  return { allPresent: missing.length === 0, missing };
}

function renderDishes() {
  const list = $('dishesList');
  list.innerHTML = '';
  if (!state.dishes.length) {
    list.innerHTML = '<li class="meta">Nessun piatto proposto.</li>';
    return;
  }
  for (const dish of [...state.dishes].sort((a, b) => `${a.date}${a.mealType}`.localeCompare(`${b.date}${b.mealType}`))) {
    const votes = Object.values(dish.votes || {});
    const yes = votes.filter((v) => v === 'yes').length;
    const no = votes.filter((v) => v === 'no').length;
    const approved = votes.length > 0 && yes > no;
    const coverage = ingredientCoverage(dish.ingredients);

    const li = document.createElement('li');
    li.className = 'dish';
    li.innerHTML = `
      <strong>${dish.name}</strong>
      <div class="meta">${dish.date} · ${dish.mealType.toUpperCase()} · Voti sì/no: ${yes}/${no}</div>
      <span class="badge ${approved ? 'ok' : 'pending'}">${approved ? 'Approvato' : 'In votazione'}</span>
      <div class="vote-actions">
        <button data-dish-id="${dish.id}" data-vote="yes" class="yes">Voto Sì</button>
        <button data-dish-id="${dish.id}" data-vote="no" class="no">Voto No</button>
        <button data-detail-id="${dish.id}" class="ghost">Dettagli</button>
        <button data-remove-dish-id="${dish.id}" class="ghost">Elimina</button>
      </div>
      <div id="detail-${dish.id}" class="details-box" hidden>
        <div class="meta"><strong>Ingredienti:</strong> ${dish.ingredients.join(', ')}</div>
        <div class="meta"><strong>Disponibilità:</strong> ${coverage.allPresent ? 'Tutti presenti' : `Mancano: ${coverage.missing.join(', ')}`}</div>
        <div class="meta"><strong>Ricetta:</strong> ${dish.recipe || 'Non inserita'}</div>
      </div>
    `;
    list.appendChild(li);
  }
}

function renderCalendar() {
  const list = $('calendarList');
  list.innerHTML = '';
  const approved = approvedDishes();
  if (!approved.length) {
    list.innerHTML = '<li class="meta">Nessun piatto approvato nel calendario.</li>';
    return;
  }
  const grouped = {};
  for (const d of approved) {
    if (!grouped[d.date]) grouped[d.date] = { pranzo: null, cena: null };
    grouped[d.date][d.mealType] = d;
  }
  for (const date of Object.keys(grouped).sort()) {
    const slot = grouped[date];
    const li = document.createElement('li');
    li.className = 'calendar-slot';
    li.innerHTML = `<strong>${date}</strong><div class="meta">Pranzo: ${slot.pranzo ? slot.pranzo.name : '-'}</div><div class="meta">Cena: ${slot.cena ? slot.cena.name : '-'}</div>`;
    list.appendChild(li);
  }
}

function scheduleExpiryNotice() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const soon = state.items.filter((it) => {
    const d = daysTo(it.expiry);
    return d >= 0 && d <= 1;
  });
  if (soon.length) new Notification('AiFrigoHome', { body: `Hai ${soon.length} alimento/i in scadenza entro 24h.` });
}

$('itemForm').addEventListener('submit', (e) => {
  e.preventDefault();
  state.items.push({ id: crypto.randomUUID(), name: $('name').value.trim(), quantity: $('quantity').value.trim(), expiry: $('expiry').value });
  $('itemForm').reset();
  save();
  renderAll();
  scheduleExpiryNotice();
});

$('itemsList').addEventListener('click', (e) => {
  const id = e.target.dataset.itemId;
  if (!id) return;
  state.items = state.items.filter((x) => x.id !== id);
  save();
  renderAll();
});

$('openPersonModalBtn').addEventListener('click', () => $('personModal').showModal());
$('closePersonModalBtn').addEventListener('click', () => $('personModal').close());
$('cancelPersonBtn').addEventListener('click', () => $('personModal').close());

$('personForm').addEventListener('submit', (e) => {
  e.preventDefault();
  state.people.push({
    id: crypto.randomUUID(),
    name: $('personName').value.trim(),
    age: $('personAge').value.trim(),
    likes: getChecked('likes'),
    dislikes: getChecked('dislikes'),
    notes: $('personNotes').value.trim()
  });
  $('personForm').reset();
  buildChecklist('likesChecklist', FOOD_TAGS, 'likes');
  buildChecklist('dislikesChecklist', FOOD_TAGS, 'dislikes');
  $('personModal').close();
  save();
  renderAll();
});

$('peopleList').addEventListener('click', (e) => {
  const id = e.target.dataset.personId;
  if (!id) return;
  state.people = state.people.filter((p) => p.id !== id);
  state.dishes.forEach((d) => { if (d.votes) delete d.votes[id]; });
  save();
  renderAll();
});

$('zoneForm').addEventListener('submit', (e) => {
  e.preventDefault();
  state.zone = $('zoneSelect').value;
  state.maxDistance = Number($('maxDistance').value || 2);
  const visible = getMarketsInRange().map((m) => m.id);
  state.selectedMarkets = state.selectedMarkets.filter((m) => visible.includes(m.id));
  save();
  renderAll();
});

$('zoneResult').addEventListener('change', (e) => {
  const marketId = e.target.dataset.marketId;
  if (!marketId) return;
  const found = (ZONE_MARKETS[state.zone] || []).find((m) => m.id === marketId);
  if (!found) return;
  if (e.target.checked) {
    if (!state.selectedMarkets.some((m) => m.id === marketId)) state.selectedMarkets.push(found);
  } else {
    state.selectedMarkets = state.selectedMarkets.filter((m) => m.id !== marketId);
  }
  save();
  renderSelectedMarkets();
  renderOffers();
});

$('marketsList').addEventListener('click', (e) => {
  const id = e.target.dataset.removeMarketId;
  if (!id) return;
  state.selectedMarkets = state.selectedMarkets.filter((m) => m.id !== id);
  save();
  renderAll();
});

$('refreshOffersBtn').addEventListener('click', () => {
  renderOffers();
  $('aiOutput').textContent = 'Offerte aggiornate in base a zona, raggio e supermercati preferiti.';
});

$('dishForm').addEventListener('submit', (e) => {
  e.preventDefault();
  state.dishes.push({
    id: crypto.randomUUID(),
    name: $('dishName').value.trim(),
    date: $('dishDate').value,
    mealType: $('dishMealType').value,
    ingredients: $('dishIngredients').value.split(',').map((v) => v.trim()).filter(Boolean),
    recipe: $('dishRecipe').value.trim(),
    votes: {}
  });
  $('dishForm').reset();
  save();
  renderAll();
});

$('dishesList').addEventListener('click', (e) => {
  const dishId = e.target.dataset.dishId;
  const vote = e.target.dataset.vote;
  const detailId = e.target.dataset.detailId;
  const removeDishId = e.target.dataset.removeDishId;

  if (removeDishId) {
    state.dishes = state.dishes.filter((d) => d.id !== removeDishId);
    save();
    renderAll();
    return;
  }
  if (detailId) {
    const detail = document.getElementById(`detail-${detailId}`);
    if (detail) detail.hidden = !detail.hidden;
    return;
  }
  if (!dishId || !vote) return;

  const voter = $('voterSelect').value;
  if (!voter) {
    $('aiOutput').textContent = 'Seleziona una persona votante.';
    return;
  }
  const dish = state.dishes.find((d) => d.id === dishId);
  if (!dish) return;
  dish.votes[voter] = vote;
  save();
  renderAll();
});

$('aiForm').addEventListener('submit', (e) => {
  e.preventDefault();
  state.ai = {
    apiKey: $('aiKey').value.trim(),
    baseUrl: $('aiBase').value.trim() || 'https://api.openai.com/v1',
    model: $('aiModel').value.trim() || 'gpt-4o-mini'
  };
  save();
  $('aiOutput').textContent = 'Impostazioni AI salvate.';
});

$('aiBtn').addEventListener('click', async () => {
  const nearest = [...state.selectedMarkets].sort((a, b) => a.distance - b.distance).slice(0, 3);
  const nearestText = nearest.length
    ? nearest.map((m) => `${m.chain} ${m.store} (${m.distance} km)`).join('; ')
    : 'nessun supermercato selezionato';
  const offersText = nearest.flatMap((m) => (OFFERS_DB[m.id] || []).map((o) => `${m.chain}: ${o}`)).join(' | ') || 'nessuna offerta';
  const approvedText = approvedDishes().map((d) => `${d.name} ${d.date} ${d.mealType}`).join(' | ') || 'nessun piatto approvato';
  const peopleText = state.people.map((p) => `${p.name}: preferiti ${p.likes.join(', ') || '-'}, non graditi ${p.dislikes.join(', ') || '-'}`).join(' | ') || 'nessuna persona';

  if (!state.ai.apiKey) {
    $('aiOutput').textContent = `Fallback locale:\nZona: ${state.zone} (raggio ${state.maxDistance} km)\nSupermercati vicini: ${nearestText}\nOfferte: ${offersText}\nPiatti approvati: ${approvedText}\n\nSuggerimento: compra prima dai market sotto 1.2 km e copri gli ingredienti mancanti: ${missingIngredientsForApproved().join(', ') || 'nessuno'}.`;
    return;
  }

  $('aiOutput').textContent = 'Generazione consigli in corso...';
  try {
    const res = await fetch(`${state.ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.ai.apiKey}` },
      body: JSON.stringify({
        model: state.ai.model,
        messages: [
          { role: 'system', content: 'Sei un assistente per meal planning, offerte supermarket e risparmio.' },
          {
            role: 'user',
            content: `Zona: ${state.zone}. Supermercati vicini: ${nearestText}. Offerte disponibili: ${offersText}. Persone: ${peopleText}. Piatti approvati: ${approvedText}. Dammi piano acquisti + ricette ottimizzate ai preferiti.`
          }
        ],
        temperature: 0.6
      })
    });

    if (res.status === 429) {
      $('aiOutput').textContent = `AI temporaneamente limitata (429).\nUso fallback locale:\n- Supermercati: ${nearestText}\n- Offerte: ${offersText}\n- Priorità acquisto: ${missingIngredientsForApproved().join(', ') || 'nessuna'}.\n\nSuggerimento: riprova tra poco o riduci la frequenza richieste.`;
      return;
    }
    if (!res.ok) throw new Error(`Errore API (${res.status})`);

    const json = await res.json();
    $('aiOutput').textContent = json.choices?.[0]?.message?.content || 'Nessuna risposta.';
  } catch (err) {
    $('aiOutput').textContent = `Errore AI: ${err.message}\nFallback: usa la sezione Offerte disponibili e i piatti approvati per comprare solo il necessario.`;
  }
});

$('notifyBtn').addEventListener('click', async () => {
  if (!('Notification' in window)) {
    $('aiOutput').textContent = 'Notifiche non supportate dal browser.';
    return;
  }
  const p = await Notification.requestPermission();
  $('aiOutput').textContent = p === 'granted' ? 'Notifiche abilitate.' : 'Permesso notifiche negato.';
});

function hydrate() {
  $('zoneSelect').innerHTML = Object.keys(ZONE_MARKETS).map((z) => `<option ${z === state.zone ? 'selected' : ''}>${z}</option>`).join('');
  $('maxDistance').value = state.maxDistance;
  $('aiKey').value = state.ai.apiKey || '';
  $('aiBase').value = state.ai.baseUrl || 'https://api.openai.com/v1';
  $('aiModel').value = state.ai.model || 'gpt-4o-mini';
  buildChecklist('likesChecklist', FOOD_TAGS, 'likes');
  buildChecklist('dislikesChecklist', FOOD_TAGS, 'dislikes');
}

function renderAll() {
  renderKpi();
  renderItems();
  renderPeople();
  renderZoneResults();
  renderSelectedMarkets();
  renderOffers();
  renderDishes();
  renderCalendar();
}

hydrate();
renderAll();
