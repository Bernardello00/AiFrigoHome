const state = {
  items: JSON.parse(localStorage.getItem('items') || '[]'),
  people: JSON.parse(localStorage.getItem('people') || '[]'),
  markets: JSON.parse(localStorage.getItem('markets') || '[]'),
  dishes: JSON.parse(localStorage.getItem('dishes') || '[]'),
  ai: JSON.parse(localStorage.getItem('ai') || '{}')
};

const marketOffersCatalog = {
  Esselunga: ['Pasta Integrale -30%', 'Petto di pollo 2x1', 'Yogurt greco -25%'],
  Coop: ['Tonno in scatola -20%', 'Verdure surgelate -30%', 'Uova bio -15%'],
  Conad: ['Passata di pomodoro -25%', 'Riso basmati -20%', 'Legumi secchi -30%'],
  Carrefour: ['Salmone fresco -20%', 'Latte alta digeribilità -25%', 'Pane integrale -30%'],
  Lidl: ['Mozzarella -35%', 'Zucchine -30%', 'Farina avena -20%']
};

const $ = (id) => document.getElementById(id);

function save() {
  localStorage.setItem('items', JSON.stringify(state.items));
  localStorage.setItem('people', JSON.stringify(state.people));
  localStorage.setItem('markets', JSON.stringify(state.markets));
  localStorage.setItem('dishes', JSON.stringify(state.dishes));
  localStorage.setItem('ai', JSON.stringify(state.ai));
}

function daysTo(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date - today) / 86400000);
}

function normalize(text) {
  return String(text || '').trim().toLowerCase();
}

function approvedDishes() {
  return state.dishes.filter((dish) => {
    const votes = Object.values(dish.votes || {});
    const yes = votes.filter((v) => v === 'yes').length;
    const no = votes.filter((v) => v === 'no').length;
    return votes.length > 0 && yes > no;
  });
}

function renderKpi() {
  const expiring = state.items.filter((i) => {
    const d = daysTo(i.expiry);
    return d >= 0 && d <= 2;
  }).length;

  $('kpiItems').textContent = state.items.length;
  $('kpiExpiring').textContent = expiring;
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
    li.innerHTML = `
      <div>
        <strong>${item.name}</strong>
        <div class="meta">Quantità: ${item.quantity} · ${tag}</div>
      </div>
      <button data-item-id="${item.id}" class="secondary">Elimina</button>
    `;
    el.appendChild(li);
  }
}

function renderPeople() {
  const list = $('peopleList');
  list.innerHTML = '';

  if (!state.people.length) {
    list.innerHTML = '<li class="meta">Nessuna persona configurata.</li>';
    $('voterSelect').innerHTML = '<option value="">Aggiungi una persona</option>';
    return;
  }

  const options = state.people.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  $('voterSelect').innerHTML = options;

  for (const person of state.people) {
    const li = document.createElement('li');
    li.className = 'person';
    li.innerHTML = `
      <div>
        <strong>${person.name}</strong>
        <div class="meta">Età: ${person.age || '-'} · Obiettivo: ${person.goal || '-'}</div>
        <div class="meta">Preferiti: ${person.likes || '-'}</div>
        <div class="meta">Non graditi: ${person.dislikes || '-'}</div>
        <div class="meta">Intolleranze: ${person.intolerances || '-'}</div>
        <div class="meta">Note: ${person.notes || '-'}</div>
      </div>
      <button data-person-id="${person.id}" class="secondary">Rimuovi</button>
    `;
    list.appendChild(li);
  }
}

function renderMarkets() {
  const list = $('marketsList');
  list.innerHTML = '';

  if (!state.markets.length) {
    list.innerHTML = '<li class="meta">Nessun supermercato vicino configurato.</li>';
    return;
  }

  for (const market of state.markets) {
    const li = document.createElement('li');
    li.innerHTML = `${market.chain} (${market.distance} km) <button data-market-id="${market.id}">×</button>`;
    list.appendChild(li);
  }
}

function computeIngredientCoverage(ingredients) {
  const pantry = state.items.map((i) => normalize(i.name));
  const missing = ingredients.filter((ing) => !pantry.includes(normalize(ing)));
  return {
    allPresent: missing.length === 0,
    missing
  };
}

function renderDishes() {
  const list = $('dishesList');
  list.innerHTML = '';

  if (!state.dishes.length) {
    list.innerHTML = '<li class="meta">Nessun piatto proposto.</li>';
    return;
  }

  const ordered = [...state.dishes].sort((a, b) => `${a.date}${a.mealType}`.localeCompare(`${b.date}${b.mealType}`));

  for (const dish of ordered) {
    const votes = Object.values(dish.votes || {});
    const yes = votes.filter((v) => v === 'yes').length;
    const no = votes.filter((v) => v === 'no').length;
    const approved = votes.length > 0 && yes > no;
    const coverage = computeIngredientCoverage(dish.ingredients);

    const li = document.createElement('li');
    li.className = 'dish';
    li.innerHTML = `
      <div>
        <strong>${dish.name}</strong>
        <div class="meta">${dish.date} · ${dish.mealType.toUpperCase()} · Voti sì/no: ${yes}/${no}</div>
        <span class="badge ${approved ? 'ok' : 'pending'}">${approved ? 'Approvato' : 'In votazione'}</span>
        <div class="vote-actions">
          <button data-vote="yes" data-dish-id="${dish.id}" class="yes">Voto Sì</button>
          <button data-vote="no" data-dish-id="${dish.id}" class="no">Voto No</button>
          <button data-detail-id="${dish.id}" class="secondary">Dettagli</button>
          <button data-remove-dish-id="${dish.id}" class="secondary">Elimina</button>
        </div>
        <div class="details-box" id="detail-${dish.id}" hidden>
          <div class="meta"><strong>Ingredienti:</strong> ${dish.ingredients.join(', ')}</div>
          <div class="meta"><strong>Disponibilità:</strong> ${coverage.allPresent ? 'Tutti presenti' : `Mancano: ${coverage.missing.join(', ')}`}</div>
          <div class="meta"><strong>Ricetta:</strong> ${dish.recipe || 'Non inserita'}</div>
        </div>
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
    list.innerHTML = '<li class="meta">Nessun piatto ancora approvato per calendario.</li>';
    return;
  }

  const grouped = {};
  for (const dish of approved) {
    if (!grouped[dish.date]) grouped[dish.date] = { pranzo: null, cena: null };
    grouped[dish.date][dish.mealType] = dish;
  }

  Object.keys(grouped)
    .sort()
    .forEach((date) => {
      const slot = grouped[date];
      const li = document.createElement('li');
      li.className = 'calendar-slot';
      li.innerHTML = `
        <strong>${date}</strong>
        <div class="meta">Pranzo: ${slot.pranzo ? slot.pranzo.name : '-'}</div>
        <div class="meta">Cena: ${slot.cena ? slot.cena.name : '-'}</div>
      `;
      list.appendChild(li);
    });
}

function computeOfferSuggestions() {
  const offers = [];
  const sortedMarkets = [...state.markets].sort((a, b) => Number(a.distance) - Number(b.distance));
  const missingFromApproved = [...new Set(approvedDishes().flatMap((d) => computeIngredientCoverage(d.ingredients).missing))];

  for (const market of sortedMarkets) {
    const promos = marketOffersCatalog[market.chain] || [];
    offers.push({
      title: `${market.chain} vicino a casa (${market.distance} km)`,
      detail: promos.slice(0, 2).join(' · ') || 'Nessuna promo disponibile'
    });
  }

  if (missingFromApproved.length) {
    offers.unshift({
      title: 'Ingredienti da integrare per i piatti approvati',
      detail: missingFromApproved.join(', ')
    });
  }

  return offers;
}

function renderOffers() {
  const list = $('offersList');
  list.innerHTML = '';
  const suggestions = computeOfferSuggestions();

  if (!suggestions.length) {
    list.innerHTML = '<li class="meta">Configura supermercati vicini per attivare i consigli scontistiche.</li>';
    return;
  }

  for (const offer of suggestions) {
    const li = document.createElement('li');
    li.className = 'offer';
    li.innerHTML = `<div><strong>${offer.title}</strong><div class="meta">${offer.detail}</div></div>`;
    list.appendChild(li);
  }
}

function scheduleExpiryNotice() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const soon = state.items.filter((item) => {
    const d = daysTo(item.expiry);
    return d >= 0 && d <= 1;
  });
  if (!soon.length) return;
  new Notification('AiFrigoHome', { body: `Hai ${soon.length} alimento/i in scadenza entro 24 ore.` });
}

$('itemForm').addEventListener('submit', (e) => {
  e.preventDefault();
  state.items.push({
    id: crypto.randomUUID(),
    name: $('name').value.trim(),
    quantity: $('quantity').value.trim(),
    expiry: $('expiry').value
  });
  $('itemForm').reset();
  save();
  renderAll();
  scheduleExpiryNotice();
});

$('itemsList').addEventListener('click', (e) => {
  const id = e.target.dataset.itemId;
  if (!id) return;
  state.items = state.items.filter((item) => item.id !== id);
  save();
  renderAll();
});

$('personForm').addEventListener('submit', (e) => {
  e.preventDefault();
  state.people.push({
    id: crypto.randomUUID(),
    name: $('personName').value.trim(),
    age: $('personAge').value.trim(),
    goal: $('personGoal').value.trim(),
    intolerances: $('personIntolerances').value.trim(),
    likes: $('personLikes').value.trim(),
    dislikes: $('personDislikes').value.trim(),
    notes: $('personNotes').value.trim()
  });
  $('personForm').reset();
  save();
  renderAll();
});

$('peopleList').addEventListener('click', (e) => {
  const id = e.target.dataset.personId;
  if (!id) return;
  state.people = state.people.filter((p) => p.id !== id);
  for (const dish of state.dishes) {
    if (dish.votes) delete dish.votes[id];
  }
  save();
  renderAll();
});

$('marketForm').addEventListener('submit', (e) => {
  e.preventDefault();
  state.markets.push({
    id: crypto.randomUUID(),
    zone: $('homeZone').value.trim(),
    chain: $('marketChain').value,
    distance: Number($('marketDistance').value || 0)
  });
  $('marketDistance').value = '';
  save();
  renderAll();
});

$('marketsList').addEventListener('click', (e) => {
  const id = e.target.dataset.marketId;
  if (!id) return;
  state.markets = state.markets.filter((m) => m.id !== id);
  save();
  renderAll();
});

$('refreshOffersBtn').addEventListener('click', () => {
  renderOffers();
  $('aiOutput').textContent = 'Consigli offerte aggiornati in base ai supermercati più vicini.';
});

$('dishForm').addEventListener('submit', (e) => {
  e.preventDefault();
  state.dishes.push({
    id: crypto.randomUUID(),
    name: $('dishName').value.trim(),
    date: $('dishDate').value,
    mealType: $('dishMealType').value,
    ingredients: $('dishIngredients').value.split(',').map((x) => x.trim()).filter(Boolean),
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
    $('aiOutput').textContent = 'Aggiungi almeno una persona per poter votare i piatti.';
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
  const nearest = [...state.markets].sort((a, b) => a.distance - b.distance).slice(0, 2);
  const nearestText = nearest.length
    ? nearest.map((m) => `${m.chain} (${m.distance} km)`).join(', ')
    : 'nessun supermercato configurato';
  const approved = approvedDishes();
  const approvedText = approved.map((d) => `${d.name} (${d.date} ${d.mealType})`).join('; ') || 'nessun piatto approvato';
  const peopleContext = state.people.map((p) => `${p.name}: likes ${p.likes || '-'}, dislikes ${p.dislikes || '-'}, intolleranze ${p.intolerances || '-'}`).join(' | ') || 'nessun profilo';
  const offersContext = computeOfferSuggestions().map((o) => `${o.title}: ${o.detail}`).join(' | ') || 'nessuna offerta';

  if (!state.ai.apiKey) {
    $('aiOutput').textContent = `Suggerimento locale:\nSupermercati vicini: ${nearestText}.\nOfferte: ${offersContext}.\nPiatti approvati: ${approvedText}.\n\nConsiglio: pianifica acquisti sulla catena più vicina e completa gli ingredienti mancanti prima del pranzo/cena.`;
    return;
  }

  $('aiOutput').textContent = 'Generazione consigli AI in corso...';
  try {
    const response = await fetch(`${state.ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.ai.apiKey}`
      },
      body: JSON.stringify({
        model: state.ai.model,
        messages: [
          { role: 'system', content: 'Sei un assistente meal planner e spesa intelligente.' },
          {
            role: 'user',
            content: `Profili: ${peopleContext}. Supermercati vicini: ${nearestText}. Offerte rilevate: ${offersContext}. Piatti approvati in calendario: ${approvedText}. Fornisci consigli su scontistiche vicine e ottimizzazione ricette.`
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) throw new Error(`Errore API (${response.status})`);
    const json = await response.json();
    $('aiOutput').textContent = json.choices?.[0]?.message?.content || 'Nessuna risposta.';
  } catch (error) {
    $('aiOutput').textContent = `Errore AI: ${error.message}`;
  }
});

$('notifyBtn').addEventListener('click', async () => {
  if (!('Notification' in window)) {
    $('aiOutput').textContent = 'Notifiche non supportate dal browser.';
    return;
  }
  const permission = await Notification.requestPermission();
  $('aiOutput').textContent = permission === 'granted' ? 'Notifiche abilitate.' : 'Permesso notifiche negato.';
});

function hydrate() {
  $('aiKey').value = state.ai.apiKey || '';
  $('aiBase').value = state.ai.baseUrl || 'https://api.openai.com/v1';
  $('aiModel').value = state.ai.model || 'gpt-4o-mini';

  const defaultZone = state.markets[0]?.zone || '';
  $('homeZone').value = defaultZone;
}

function renderAll() {
  renderItems();
  renderPeople();
  renderMarkets();
  renderDishes();
  renderCalendar();
  renderOffers();
  renderKpi();
}

hydrate();
renderAll();
