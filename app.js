const state = {
  items: JSON.parse(localStorage.getItem('items') || '[]'),
  profile: JSON.parse(localStorage.getItem('profile') || '{}'),
  ai: JSON.parse(localStorage.getItem('ai') || '{}'),
  budget: JSON.parse(localStorage.getItem('budget') || '{"monthly":0,"spent":0}'),
  markets: JSON.parse(localStorage.getItem('markets') || '[]')
};

const $ = (id) => document.getElementById(id);
const foodCatalog = {
  Pasta: { Esselunga: '€1.09', Coop: '€1.19', Lidl: '€0.89' },
  Pomodori: { Esselunga: '€2.49/kg', Conad: '€2.29/kg', Lidl: '€1.99/kg' },
  Uova: { Coop: '€2.39', Conad: '€2.49', Carrefour: '€2.59' },
  Mozzarella: { Esselunga: '€0.99', Carrefour: '€1.09', Lidl: '€0.89' },
  Zucchine: { Conad: '€1.89/kg', Coop: '€2.09/kg', Esselunga: '€1.99/kg' }
};

function save() {
  localStorage.setItem('items', JSON.stringify(state.items));
  localStorage.setItem('profile', JSON.stringify(state.profile));
  localStorage.setItem('ai', JSON.stringify(state.ai));
  localStorage.setItem('budget', JSON.stringify(state.budget));
  localStorage.setItem('markets', JSON.stringify(state.markets));
}

function daysTo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  d.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d - now) / 86400000);
}

function formatEuro(value) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value || 0);
}

function renderKpi() {
  const expiring = state.items.filter((i) => {
    const d = daysTo(i.expiry);
    return d >= 0 && d <= 2;
  }).length;
  const expired = state.items.filter((i) => daysTo(i.expiry) < 0).length;
  const residual = Math.max((state.budget.monthly || 0) - (state.budget.spent || 0), 0);

  $('kpiItems').textContent = state.items.length;
  $('kpiExpiring').textContent = expiring;
  $('kpiExpired').textContent = expired;
  $('kpiBudget').textContent = formatEuro(residual);
}

function renderBudget() {
  const monthly = Number(state.budget.monthly || 0);
  const spent = Number(state.budget.spent || 0);
  const percent = monthly > 0 ? Math.min((spent / monthly) * 100, 100) : 0;

  $('monthlyBudget').value = monthly || '';
  $('budgetBar').style.width = `${percent}%`;
  $('budgetInfo').textContent = monthly > 0
    ? `Hai speso ${formatEuro(spent)} su ${formatEuro(monthly)} (${percent.toFixed(0)}%).`
    : 'Imposta il budget per iniziare.';
}

function renderItems() {
  const list = $('itemsList');
  list.innerHTML = '';
  state.items.sort((a, b) => a.expiry.localeCompare(b.expiry));

  if (!state.items.length) {
    list.innerHTML = '<li class="muted">Nessun alimento inserito.</li>';
    return;
  }

  for (const item of state.items) {
    const d = daysTo(item.expiry);
    const cls = d < 0 ? 'expired' : d <= 2 ? 'warning' : '';
    const badge = d < 0 ? 'Scaduto' : d === 0 ? 'Scade oggi' : `Scade tra ${d} giorni`;

    const li = document.createElement('li');
    li.className = `item ${cls}`;
    li.innerHTML = `
      <div>
        <strong>${item.name}</strong>
        <div class="meta">Quantità: ${item.quantity} · ${badge}</div>
        ${item.barcode ? `<div class="meta">Barcode: ${item.barcode}</div>` : ''}
      </div>
      <button data-id="${item.id}" class="secondary">Elimina</button>
    `;
    list.appendChild(li);
  }
}

function renderMarkets() {
  const list = $('marketsList');
  list.innerHTML = '';
  if (!state.markets.length) {
    list.innerHTML = '<li class="muted">Nessun supermercato impostato.</li>';
    return;
  }

  for (const market of state.markets) {
    const li = document.createElement('li');
    li.innerHTML = `${market} <button data-market="${market}" aria-label="rimuovi supermercato">×</button>`;
    list.appendChild(li);
  }
}

function computeMissingIngredients() {
  const names = state.items.map((i) => i.name.toLowerCase());
  return Object.keys(foodCatalog).filter((ingredient) => !names.includes(ingredient.toLowerCase()));
}

function renderOffers() {
  const offers = $('offersList');
  offers.innerHTML = '';
  const preferred = state.markets;
  const missing = computeMissingIngredients().slice(0, 5);

  if (!preferred.length) {
    offers.innerHTML = '<li class="muted">Aggiungi i supermercati preferiti per vedere offerte utili.</li>';
    return;
  }

  if (!missing.length) {
    offers.innerHTML = '<li class="muted">Ottimo! Hai già molti ingredienti base in casa.</li>';
    return;
  }

  for (const ingredient of missing) {
    const marketPrices = foodCatalog[ingredient] || {};
    const available = preferred
      .filter((m) => marketPrices[m])
      .map((m) => `${m}: ${marketPrices[m]}`);

    const li = document.createElement('li');
    li.className = 'offer';
    li.innerHTML = `
      <div>
        <strong>${ingredient}</strong>
        <div class="meta">${available.length ? available.join(' · ') : 'Nessuna promo specifica disponibile nei market selezionati.'}</div>
      </div>
    `;
    offers.appendChild(li);
  }
}

function scheduleExpiryNotice() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const soon = state.items.filter((i) => {
    const d = daysTo(i.expiry);
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
    expiry: $('expiry').value,
    barcode: $('barcode').value.trim()
  });
  $('itemForm').reset();
  save();
  renderAll();
  scheduleExpiryNotice();
});

$('itemsList').addEventListener('click', (e) => {
  const id = e.target.dataset.id;
  if (!id) return;
  state.items = state.items.filter((x) => x.id !== id);
  save();
  renderAll();
});

$('profileForm').addEventListener('submit', (e) => {
  e.preventDefault();
  state.profile = {
    members: $('members').value.trim(),
    diet: $('diet').value.trim(),
    allergies: $('allergies').value.trim()
  };
  save();
  $('aiOutput').textContent = 'Profilo salvato con successo.';
});

$('budgetForm').addEventListener('submit', (e) => {
  e.preventDefault();
  state.budget.monthly = Number($('monthlyBudget').value || 0);
  state.budget.spent = Number(state.budget.spent || 0) + Number($('spentAmount').value || 0);
  $('spentAmount').value = '';
  save();
  renderAll();
});

$('resetSpentBtn').addEventListener('click', () => {
  state.budget.spent = 0;
  save();
  renderAll();
});

$('marketForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const market = $('marketInput').value.trim();
  if (!market) return;
  if (!state.markets.includes(market)) state.markets.push(market);
  $('marketInput').value = '';
  save();
  renderAll();
});

$('marketsList').addEventListener('click', (e) => {
  const market = e.target.dataset.market;
  if (!market) return;
  state.markets = state.markets.filter((m) => m !== market);
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
  const ingredients = state.items.map((i) => `${i.name} (${i.quantity})`).join(', ') || 'nessun ingrediente';
  const profile = `Famiglia: ${state.profile.members || '-'}; Dieta: ${state.profile.diet || '-'}; Allergie: ${state.profile.allergies || '-'}`;
  const marketLine = state.markets.length ? `Supermercati preferiti: ${state.markets.join(', ')}` : 'Nessun supermercato preferito impostato';
  const missing = computeMissingIngredients().slice(0, 6).join(', ') || 'nessuno';

  if (!state.ai.apiKey) {
    $('aiOutput').textContent = `Suggerimento locale:\n- Usa: ${ingredients}\n- Da acquistare: ${missing}\n- ${marketLine}\n\nRicetta: bowl proteica con ingredienti freschi + variante pasta veloce. Controlla le offerte nella sezione dedicata.`;
    return;
  }

  $('aiOutput').textContent = 'Generazione consigli in corso...';
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
          { role: 'system', content: 'Sei un assistente di meal planning e spesa.' },
          {
            role: 'user',
            content: `Ingredienti in frigo: ${ingredients}. Profilo: ${profile}. ${marketLine}. Ingredienti mancanti: ${missing}. Dammi 3 ricette + lista acquisti minima e dove conviene cercare offerte.`
          }
        ],
        temperature: 0.7
      })
    });
    if (!res.ok) throw new Error(`Errore API (${res.status})`);
    const json = await res.json();
    $('aiOutput').textContent = json.choices?.[0]?.message?.content || 'Nessuna risposta.';
  } catch (err) {
    $('aiOutput').textContent = `Errore AI: ${err.message}`;
  }
});

$('notifyBtn').addEventListener('click', async () => {
  if (!('Notification' in window)) {
    $('aiOutput').textContent = 'Notifiche non supportate da questo browser.';
    return;
  }
  const p = await Notification.requestPermission();
  $('aiOutput').textContent = p === 'granted' ? 'Notifiche abilitate.' : 'Permesso notifiche negato.';
});

function hydrate() {
  $('members').value = state.profile.members || '';
  $('diet').value = state.profile.diet || '';
  $('allergies').value = state.profile.allergies || '';
  $('aiKey').value = state.ai.apiKey || '';
  $('aiBase').value = state.ai.baseUrl || 'https://api.openai.com/v1';
  $('aiModel').value = state.ai.model || 'gpt-4o-mini';
}

function renderAll() {
  renderItems();
  renderMarkets();
  renderOffers();
  renderBudget();
  renderKpi();
}

hydrate();
renderAll();
