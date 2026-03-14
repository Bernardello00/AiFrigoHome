const state = {
  items: JSON.parse(localStorage.getItem('items') || '[]'),
  profile: JSON.parse(localStorage.getItem('profile') || '{}'),
  ai: JSON.parse(localStorage.getItem('ai') || '{}')
};

const $ = (id) => document.getElementById(id);

const itemForm = $('itemForm');
const itemsList = $('itemsList');
const profileForm = $('profileForm');
const aiForm = $('aiForm');
const aiOutput = $('aiOutput');

function save() {
  localStorage.setItem('items', JSON.stringify(state.items));
  localStorage.setItem('profile', JSON.stringify(state.profile));
  localStorage.setItem('ai', JSON.stringify(state.ai));
}

function daysTo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  d.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d - now) / 86400000);
}

function renderItems() {
  state.items.sort((a, b) => a.expiry.localeCompare(b.expiry));
  itemsList.innerHTML = '';
  if (!state.items.length) {
    itemsList.innerHTML = '<li class="meta">Nessun alimento inserito.</li>';
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
    itemsList.appendChild(li);
  }
}

itemForm.addEventListener('submit', (e) => {
  e.preventDefault();
  state.items.push({
    id: crypto.randomUUID(),
    name: $('name').value.trim(),
    quantity: $('quantity').value.trim(),
    expiry: $('expiry').value,
    barcode: $('barcode').value.trim()
  });
  itemForm.reset();
  save();
  renderItems();
  scheduleExpiryNotice();
});

itemsList.addEventListener('click', (e) => {
  const id = e.target.dataset.id;
  if (!id) return;
  state.items = state.items.filter((x) => x.id !== id);
  save();
  renderItems();
});

profileForm.addEventListener('submit', (e) => {
  e.preventDefault();
  state.profile = {
    members: $('members').value.trim(),
    diet: $('diet').value.trim(),
    allergies: $('allergies').value.trim()
  };
  save();
  aiOutput.textContent = 'Profilo salvato.';
});

aiForm.addEventListener('submit', (e) => {
  e.preventDefault();
  state.ai = {
    apiKey: $('aiKey').value.trim(),
    baseUrl: $('aiBase').value.trim() || 'https://api.openai.com/v1',
    model: $('aiModel').value.trim() || 'gpt-4o-mini'
  };
  save();
  aiOutput.textContent = 'Impostazioni AI salvate.';
});

$('aiBtn').addEventListener('click', async () => {
  const ingredients = state.items.map((i) => `${i.name} (${i.quantity})`).join(', ') || 'nessun ingrediente';
  const profile = `Famiglia: ${state.profile.members || '-'}; Dieta: ${state.profile.diet || '-'}; Allergie: ${state.profile.allergies || '-'}`;

  if (!state.ai.apiKey) {
    aiOutput.textContent = `Suggerimento locale:\nCon ${ingredients}, prepara una ricetta semplice in stile ${state.profile.diet || 'libero'} evitando ${state.profile.allergies || 'allergeni noti'}.`;
    return;
  }

  aiOutput.textContent = 'Generazione in corso...';
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
          { role: 'system', content: 'Sei un assistente nutrizionale pratico.' },
          { role: 'user', content: `Ingredienti: ${ingredients}. Profilo: ${profile}. Dammi 3 idee ricette brevi.` }
        ],
        temperature: 0.7
      })
    });
    if (!res.ok) throw new Error(`Errore API (${res.status})`);
    const json = await res.json();
    aiOutput.textContent = json.choices?.[0]?.message?.content || 'Nessuna risposta.';
  } catch (err) {
    aiOutput.textContent = `Errore AI: ${err.message}`;
  }
});

$('notifyBtn').addEventListener('click', async () => {
  if (!('Notification' in window)) {
    aiOutput.textContent = 'Notifiche non supportate dal browser.';
    return;
  }
  const p = await Notification.requestPermission();
  aiOutput.textContent = p === 'granted' ? 'Notifiche abilitate.' : 'Permesso notifiche negato.';
});

function scheduleExpiryNotice() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const soon = state.items.filter((i) => {
    const d = daysTo(i.expiry);
    return d >= 0 && d <= 1;
  });
  if (!soon.length) return;
  new Notification('AiFrigoHome', {
    body: `Hai ${soon.length} alimento/i in scadenza entro 24 ore.`
  });
}

function hydrate() {
  $('members').value = state.profile.members || '';
  $('diet').value = state.profile.diet || '';
  $('allergies').value = state.profile.allergies || '';

  $('aiKey').value = state.ai.apiKey || '';
  $('aiBase').value = state.ai.baseUrl || 'https://api.openai.com/v1';
  $('aiModel').value = state.ai.model || 'gpt-4o-mini';

  renderItems();
}

hydrate();
