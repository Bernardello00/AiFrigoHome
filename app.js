const FOOD_TAGS = ['Pasta', 'Riso', 'Pollo', 'Pesce', 'Legumi', 'Verdure', 'Frutta', 'Pizza', 'Insalata', 'Formaggi', 'Uova', 'Dolci'];
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const state = {
  items: JSON.parse(localStorage.getItem('items') || '[]'),
  people: JSON.parse(localStorage.getItem('people') || '[]'),
  selectedMarkets: JSON.parse(localStorage.getItem('selectedMarkets') || '[]'),
  dishes: JSON.parse(localStorage.getItem('dishes') || '[]'),
  ai: JSON.parse(localStorage.getItem('ai') || '{}'),
  lastMarketsSearch: JSON.parse(localStorage.getItem('lastMarketsSearch') || '[]'),
  address: localStorage.getItem('address') || 'Genova Piazza Dante',
  radiusKm: Number(localStorage.getItem('radiusKm') || 2)
};

const $ = (id) => document.getElementById(id);

function save() {
  localStorage.setItem('items', JSON.stringify(state.items));
  localStorage.setItem('people', JSON.stringify(state.people));
  localStorage.setItem('selectedMarkets', JSON.stringify(state.selectedMarkets));
  localStorage.setItem('dishes', JSON.stringify(state.dishes));
  localStorage.setItem('ai', JSON.stringify(state.ai));
  localStorage.setItem('lastMarketsSearch', JSON.stringify(state.lastMarketsSearch));
  localStorage.setItem('address', state.address);
  localStorage.setItem('radiusKm', String(state.radiusKm));
}

function daysTo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  d.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d - now) / 86400000);
}

function normalize(v) {
  return String(v || '').trim().toLowerCase();
}

function buildChecklist(targetId, values, name) {
  $(targetId).innerHTML = values.map((value) => `<label><input type="checkbox" name="${name}" value="${value}" />${value}</label>`).join('');
}

function getChecked(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((x) => x.value);
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
  const missing = approvedDishes().flatMap((d) => d.ingredients.filter((i) => !pantry.includes(normalize(i))));
  return [...new Set(missing)];
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
  const list = $('itemsList');
  list.innerHTML = '';
  const ordered = [...state.items].sort((a, b) => a.expiry.localeCompare(b.expiry));

  if (!ordered.length) {
    list.innerHTML = '<li class="meta">Nessun alimento inserito.</li>';
    return;
  }

  for (const item of ordered) {
    const d = daysTo(item.expiry);
    const cls = d < 0 ? 'expired' : d <= 2 ? 'warning' : '';
    const label = d < 0 ? 'Scaduto' : d === 0 ? 'Scade oggi' : `Scade tra ${d} giorni`;
    const li = document.createElement('li');
    li.className = `item ${cls}`;
    li.innerHTML = `<div><strong>${item.name}</strong><div class="meta">${item.quantity} · ${label}</div></div><button class="btn secondary" data-item-id="${item.id}">Elimina</button>`;
    list.appendChild(li);
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
      <button class="btn secondary" data-person-id="${p.id}">Rimuovi</button>
    `;
    list.appendChild(li);
  }
}

function renderLiveMarkets() {
  const wrap = $('liveMarkets');
  wrap.innerHTML = '';

  if (!state.lastMarketsSearch.length) {
    wrap.innerHTML = '<div class="meta">Nessuna ricerca ancora eseguita.</div>';
    return;
  }

  for (const m of state.lastMarketsSearch) {
    const checked = state.selectedMarkets.some((x) => x.id === m.id) ? 'checked' : '';
    const row = document.createElement('label');
    row.className = 'market-row';
    row.innerHTML = `<span><strong>${m.chain}</strong> · ${m.name}<br><small class="meta">${m.address || 'Indirizzo non disponibile'} · ${m.distanceKm.toFixed(2)} km</small></span><input type="checkbox" data-market-id="${m.id}" ${checked} />`;
    wrap.appendChild(row);
  }
}

function renderSelectedMarkets() {
  const list = $('marketsList');
  list.innerHTML = '';
  if (!state.selectedMarkets.length) {
    list.innerHTML = '<li class="meta">Nessun supermercato preferito.</li>';
    return;
  }
  for (const m of state.selectedMarkets) {
    const li = document.createElement('li');
    li.innerHTML = `${m.chain} (${m.distanceKm.toFixed(2)} km) <button data-remove-market-id="${m.id}">×</button>`;
    list.appendChild(li);
  }
}

async function fetchOnlineOffersForMarket(market, address) {
  const query = encodeURIComponent(`${market.chain} offerte volantino ${address}`);
  const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=it&gl=IT&ceid=IT:it`;
  const proxy = `https://r.jina.ai/http://news.google.com/rss/search?q=${query}&hl=it&gl=IT&ceid=IT:it`;

  try {
    const res = await fetch(proxy, { headers: { Accept: 'text/plain' } });
    if (!res.ok) throw new Error('rss proxy fail');
    const txt = await res.text();
    const lines = txt.split('\n').filter((line) => line.includes('<title>') && !line.includes('Google News'));
    const parsed = lines.slice(0, 3).map((line) => line.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
    return parsed.length ? parsed : [`Nessuna offerta trovata online per ${market.chain}.`];
  } catch {
    return [`Feed online non raggiungibile ora (${rssUrl}).`];
  }
}

async function renderOffers() {
  const list = $('offersList');
  list.innerHTML = '<li class="meta">Caricamento offerte online…</li>';

  if (!state.selectedMarkets.length) {
    list.innerHTML = '<li class="meta">Seleziona almeno un supermercato dai risultati online.</li>';
    return;
  }

  list.innerHTML = '';
  const missing = missingIngredientsForApproved();
  if (missing.length) {
    const miss = document.createElement('li');
    miss.className = 'offer';
    miss.innerHTML = `<strong>Ingredienti mancanti (piatti approvati)</strong><div class="meta">${missing.join(', ')}</div>`;
    list.appendChild(miss);
  }

  for (const market of [...state.selectedMarkets].sort((a, b) => a.distanceKm - b.distanceKm)) {
    const offers = await fetchOnlineOffersForMarket(market, state.address);
    const li = document.createElement('li');
    li.className = 'offer';
    li.innerHTML = `<strong>${market.chain} · ${market.name}</strong><div class="meta">${market.distanceKm.toFixed(2)} km · ${market.address || '-'}</div><div class="meta">${offers.join(' · ')}</div>`;
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

  const ordered = [...state.dishes].sort((a, b) => `${a.date}${a.mealType}`.localeCompare(`${b.date}${b.mealType}`));
  for (const dish of ordered) {
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
        <button class="btn yes" data-dish-id="${dish.id}" data-vote="yes">Voto Sì</button>
        <button class="btn no" data-dish-id="${dish.id}" data-vote="no">Voto No</button>
        <button class="btn secondary" data-detail-id="${dish.id}">Dettagli</button>
        <button class="btn secondary" data-remove-dish-id="${dish.id}">Elimina</button>
      </div>
      <div class="details-box" id="detail-${dish.id}" hidden>
        <div class="meta"><strong>Ingredienti:</strong> ${dish.ingredients.join(', ')}</div>
        <div class="meta"><strong>Disponibilità:</strong> ${coverage.allPresent ? 'Tutti presenti' : `Mancano: ${coverage.missing.join(', ')}`}</div>
        <div class="meta"><strong>Ricetta:</strong> ${dish.recipe || 'Non inserita'}</div>
      </div>
    `;
    list.appendChild(li);
  }
}

function renderMonthCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
  $('calendarTitle').textContent = `Calendario ${monthName}`;

  const grid = $('calendarGrid');
  grid.innerHTML = '';

  for (const day of DAY_NAMES) {
    const hd = document.createElement('div');
    hd.className = 'cal-head';
    hd.textContent = day;
    grid.appendChild(hd);
  }

  const first = new Date(year, month, 1);
  let firstWeekday = first.getDay();
  firstWeekday = firstWeekday === 0 ? 7 : firstWeekday;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const approved = approvedDishes();

  for (let i = 1; i < firstWeekday; i += 1) {
    const empty = document.createElement('div');
    empty.className = 'cal-day';
    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = date.toISOString().slice(0, 10);
    const events = approved.filter((d) => d.date === dateKey);

    const box = document.createElement('div');
    box.className = 'cal-day';
    box.innerHTML = `<div class="num">${day}</div>`;

    for (const ev of events) {
      const e = document.createElement('div');
      e.className = `event ${ev.mealType === 'pranzo' ? 'lunch' : 'dinner'}`;
      e.textContent = `${ev.mealType === 'pranzo' ? 'Pranzo' : 'Cena'}: ${ev.name}`;
      box.appendChild(e);
    }

    grid.appendChild(box);
  }
}

async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Geocoding non disponibile');
  const data = await res.json();
  if (!data?.length) throw new Error('Indirizzo non trovato');
  return { lat: Number(data[0].lat), lon: Number(data[0].lon) };
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapChain(name) {
  const n = normalize(name);
  if (n.includes('esselunga')) return 'Esselunga';
  if (n.includes('coop')) return 'Coop';
  if (n.includes('conad')) return 'Conad';
  if (n.includes('carrefour')) return 'Carrefour';
  if (n.includes('lidl')) return 'Lidl';
  if (n.includes('md')) return 'MD';
  if (n.includes('pam')) return 'Pam';
  return 'Supermercato';
}

async function searchLiveSupermarkets(address, radiusKm) {
  const center = await geocodeAddress(address);
  const radiusM = Math.floor(Number(radiusKm) * 1000);
  const overpassQuery = `[out:json][timeout:25];(node["shop"="supermarket"](around:${radiusM},${center.lat},${center.lon});way["shop"="supermarket"](around:${radiusM},${center.lat},${center.lon}););out center tags;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(overpassQuery)}`
  });
  if (!res.ok) throw new Error('Ricerca supermercati non disponibile');
  const data = await res.json();

  const raw = (data.elements || []).map((el) => {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!lat || !lon) return null;
    const name = el.tags?.name || 'Supermercato';
    const addressParts = [el.tags?.['addr:street'], el.tags?.['addr:housenumber'], el.tags?.['addr:city']].filter(Boolean);
    return {
      id: `osm-${el.type}-${el.id}`,
      chain: mapChain(name),
      name,
      address: addressParts.join(' ') || '',
      lat,
      lon,
      distanceKm: distanceKm(center.lat, center.lon, lat, lon)
    };
  }).filter(Boolean);

  return raw.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 25);
}

function scheduleExpiryNotice() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const soon = state.items.filter((i) => {
    const d = daysTo(i.expiry);
    return d >= 0 && d <= 1;
  });
  if (soon.length) new Notification('AiFrigoHome', { body: `Hai ${soon.length} alimento/i in scadenza entro 24 ore.` });
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
    notes: $('personNotes').value.trim(),
    likes: getChecked('likes'),
    dislikes: getChecked('dislikes')
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
  for (const d of state.dishes) {
    if (d.votes) delete d.votes[id];
  }
  save();
  renderAll();
});

$('liveSearchForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const address = $('addressInput').value.trim();
  const radiusKm = Number($('radiusKm').value || 2);
  $('searchStatus').textContent = 'Ricerca live in corso...';

  try {
    const markets = await searchLiveSupermarkets(address, radiusKm);
    state.address = address;
    state.radiusKm = radiusKm;
    state.lastMarketsSearch = markets;

    const valid = new Set(markets.map((m) => m.id));
    state.selectedMarkets = state.selectedMarkets.filter((m) => valid.has(m.id));

    save();
    $('searchStatus').textContent = `${markets.length} supermercati trovati online.`;
    renderLiveMarkets();
    renderSelectedMarkets();
    await renderOffers();
  } catch (err) {
    $('searchStatus').textContent = `Errore ricerca online: ${err.message}`;
  }
});

$('liveMarkets').addEventListener('change', async (e) => {
  const id = e.target.dataset.marketId;
  if (!id) return;
  const found = state.lastMarketsSearch.find((m) => m.id === id);
  if (!found) return;

  if (e.target.checked) {
    if (!state.selectedMarkets.some((m) => m.id === id)) state.selectedMarkets.push(found);
  } else {
    state.selectedMarkets = state.selectedMarkets.filter((m) => m.id !== id);
  }

  save();
  renderSelectedMarkets();
  await renderOffers();
});

$('marketsList').addEventListener('click', async (e) => {
  const id = e.target.dataset.removeMarketId;
  if (!id) return;
  state.selectedMarkets = state.selectedMarkets.filter((m) => m.id !== id);
  save();
  renderAll();
  await renderOffers();
});

$('refreshOffersBtn').addEventListener('click', async () => {
  await renderOffers();
  $('aiOutput').textContent = 'Offerte online aggiornate.';
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
  const nearest = [...state.selectedMarkets].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 5);
  const nearestText = nearest.length
    ? nearest.map((m) => `${m.chain} ${m.name} (${m.distanceKm.toFixed(2)} km)`).join('; ')
    : 'nessun supermercato selezionato';

  let offersSummary = 'nessuna offerta online disponibile';
  if (nearest.length) {
    const chunks = [];
    for (const m of nearest.slice(0, 2)) {
      const offers = await fetchOnlineOffersForMarket(m, state.address);
      chunks.push(`${m.chain}: ${offers.join(' | ')}`);
    }
    offersSummary = chunks.join(' || ');
  }

  const approved = approvedDishes().map((d) => `${d.name} (${d.date} ${d.mealType})`).join(' | ') || 'nessun piatto approvato';
  const people = state.people.map((p) => `${p.name}: pref ${p.likes.join(', ') || '-'}; no ${p.dislikes.join(', ') || '-'}`).join(' | ') || 'nessuna persona';

  if (!state.ai.apiKey) {
    $('aiOutput').textContent = `Fallback smart:\nZona: ${state.address}\nSupermercati vicini: ${nearestText}\nOfferte online: ${offersSummary}\nPiatti approvati: ${approved}\n\nSuggerimento: acquista prima ingredienti mancanti (${missingIngredientsForApproved().join(', ') || 'nessuno'}) nei market più vicini.`;
    return;
  }

  $('aiOutput').textContent = 'Generazione consigli AI in corso...';
  try {
    const res = await fetch(`${state.ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.ai.apiKey}`
      },
      body: JSON.stringify({
        model: state.ai.model,
        messages: [
          { role: 'system', content: 'Sei un assistente meal planning e risparmio spesa basato su dati online aggiornati.' },
          {
            role: 'user',
            content: `Zona: ${state.address}. Supermercati: ${nearestText}. Offerte online: ${offersSummary}. Persone: ${people}. Piatti approvati: ${approved}. Dammi piano smart acquisti+menù.`
          }
        ],
        temperature: 0.6
      })
    });

    if (res.status === 429) {
      $('aiOutput').textContent = `AI limitata (429). Uso fallback online locale:\nSupermercati: ${nearestText}\nOfferte: ${offersSummary}\nPriorità: ${missingIngredientsForApproved().join(', ') || 'nessuna'}.`;
      return;
    }

    if (!res.ok) throw new Error(`Errore API (${res.status})`);
    const json = await res.json();
    $('aiOutput').textContent = json.choices?.[0]?.message?.content || 'Nessuna risposta.';
  } catch (err) {
    $('aiOutput').textContent = `Errore AI: ${err.message}\nUsa la sezione offerte online e i piatti approvati per la spesa smart.`;
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
  $('addressInput').value = state.address;
  $('radiusKm').value = state.radiusKm;
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
  renderLiveMarkets();
  renderSelectedMarkets();
  renderDishes();
  renderMonthCalendar();
}

hydrate();
renderAll();
void renderOffers();
