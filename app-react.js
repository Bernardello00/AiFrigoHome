const {
  AppBar, Toolbar, Typography, Container, Grid, Card, CardContent, Button, TextField,
  Stack, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, FormControl, InputLabel, Select, MenuItem, Alert, Box, CssBaseline, ThemeProvider, createTheme
} = MaterialUI;

const { FOODS, DAY_NAMES, LS_KEY, DEFAULT_AI } = window.APP_CONFIG;

const initialState = {
  items: [],
  people: [],
  dishes: [],
  marketsFound: [],
  selectedMarkets: [],
  address: 'Genova Piazza Dante',
  radiusKm: 2,
  ai: { ...DEFAULT_AI }
};

function readState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...initialState, ...JSON.parse(raw), ai: { ...DEFAULT_AI, ...(JSON.parse(raw).ai || {}) } } : initialState;
  } catch {
    return initialState;
  }
}

function App() {
  const [state, setState] = React.useState(readState);
  const [status, setStatus] = React.useState('');
  const [aiStatus, setAiStatus] = React.useState({ ok: false, checked: false, loading: false, message: '' });
  const [aiOutput, setAiOutput] = React.useState('');
  const [personOpen, setPersonOpen] = React.useState(false);
  const [voterId, setVoterId] = React.useState('');
  const [marketNameFilter, setMarketNameFilter] = React.useState('');

  const [itemDraft, setItemDraft] = React.useState({ name: '', quantity: '', expiry: new Date().toISOString().slice(0, 10) });
  const [dishDraft, setDishDraft] = React.useState({ name: '', date: new Date().toISOString().slice(0, 10), mealType: 'pranzo', ingredients: '', recipe: '' });
  const [personDraft, setPersonDraft] = React.useState({ name: '', age: '', notes: '', likes: [], dislikes: [] });

  React.useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [state]);

  const approvedDishes = React.useMemo(() => state.dishes.filter((d) => {
    const votes = Object.values(d.votes || {});
    const yes = votes.filter((v) => v === 'yes').length;
    const no = votes.filter((v) => v === 'no').length;
    return votes.length > 0 && yes > no;
  }), [state.dishes]);

  const missingIngredients = React.useMemo(() => {
    const pantry = state.items.map((i) => window.AppUtils.normalize(i.name));
    return [...new Set(approvedDishes.flatMap((d) => d.ingredients.filter((ing) => !pantry.includes(window.AppUtils.normalize(ing)))))];
  }, [approvedDishes, state.items]);

  const filteredMarkets = React.useMemo(() => {
    const needle = window.AppUtils.normalize(marketNameFilter);
    if (!needle) return state.marketsFound;
    return state.marketsFound.filter((m) => window.AppUtils.normalize(m.name).includes(needle) || window.AppUtils.normalize(m.chain).includes(needle));
  }, [state.marketsFound, marketNameFilter]);

  const aiConfigured = Boolean(state.ai.apiKey && state.ai.baseUrl && state.ai.model);
  const aiEnabled = aiConfigured && aiStatus.checked && aiStatus.ok;

  const kpi = {
    items: state.items.length,
    expiring: state.items.filter((i) => {
      const d = Math.ceil((new Date(i.expiry).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
      return d >= 0 && d <= 2;
    }).length,
    people: state.people.length,
    approved: approvedDishes.length
  };

  async function searchMarketsLive() {
    setStatus('Ricerca supermercati online in corso...');
    try {
      const mapped = await window.AppServices.searchLiveSupermarkets(state.address, state.radiusKm);
      setState((s) => ({
        ...s,
        marketsFound: mapped,
        selectedMarkets: s.selectedMarkets.filter((m) => mapped.some((x) => x.id === m.id))
      }));
      setStatus(`${mapped.length} supermercati trovati online.`);
    } catch (err) {
      setStatus(`Errore ricerca live: ${err.message}`);
    }
  }

  async function refreshOffers() {
    if (!state.selectedMarkets.length) return setStatus('Seleziona almeno un supermercato.');
    setStatus('Recupero offerte online...');
    const updated = [];
    for (const m of state.selectedMarkets) {
      const offers = await window.AppServices.fetchOffersOnline(m, state.address);
      updated.push({ ...m, offers });
    }
    setState((s) => ({ ...s, selectedMarkets: updated }));
    setStatus('Offerte online aggiornate.');
  }

  async function checkAiConnection() {
    if (!aiConfigured) return;
    setAiStatus({ ok: false, checked: false, loading: true, message: 'Verifica connessione Gemini...' });
    try {
      await window.GeminiService.checkConnection(state.ai);
      setAiStatus({ ok: true, checked: true, loading: false, message: 'Connessione Gemini OK' });
    } catch (err) {
      setAiStatus({ ok: false, checked: true, loading: false, message: `Connessione Gemini fallita: ${err.message}` });
    }
  }

  async function askAi() {
    if (!aiEnabled) return;
    setAiOutput('Generazione consigli in corso...');

    const markets = state.selectedMarkets.map((m) => `${m.chain} ${m.name} (${m.distanceKm.toFixed(2)} km)`).join('; ') || 'nessuno';
    const offers = state.selectedMarkets.flatMap((m) => (m.offers || []).map((o) => `${m.chain}: ${o}`)).join(' | ') || 'nessuna';
    const people = state.people.map((p) => `${p.name} pref ${p.likes.join(', ') || '-'} no ${p.dislikes.join(', ') || '-'}`).join(' | ') || 'nessuna';
    const dishes = approvedDishes.map((d) => `${d.name} ${d.date} ${d.mealType}`).join(' | ') || 'nessuno';

    const prompt = `Sei un assistente meal-planning e risparmio spesa.\nSupermercati: ${markets}\nOfferte online: ${offers}\nPersone: ${people}\nPiatti approvati: ${dishes}\nIngredienti mancanti: ${missingIngredients.join(', ') || 'nessuno'}\nDammi un piano smart acquisti + menù.`;

    try {
      const output = await window.GeminiService.generate(state.ai, prompt);
      setAiOutput(output);
    } catch (err) {
      if (err.code === 429) {
        setAiOutput(`Gemini rate-limited (429). Fallback: compra prima ${missingIngredients.join(', ') || 'nulla'} nei supermercati più vicini.`);
        return;
      }
      setAiOutput(`Errore Gemini: ${err.message}`);
    }
  }

  async function generateDishDetailsWithAi() {
    if (!aiEnabled) return setStatus('Prima verifica la connessione Gemini.');
    if (!dishDraft.name) return setStatus('Inserisci prima il nome del piatto.');

    const pantryItems = state.items.map((i) => i.name).filter(Boolean);
    setStatus('Generazione ingredienti e ricetta con AI in corso...');

    const prompt = `Sei uno chef nutrizionista.
Piatto richiesto: ${dishDraft.name}.
Ingredienti disponibili in frigo: ${pantryItems.join(', ') || 'nessuno'}.
Rispondi SOLO in JSON valido nel formato: {"ingredientiPresenti": ["..."], "ingredientiMancanti": ["..."], "ricetta": "testo breve step by step"}.
Non aggiungere markdown o testo extra.`;

    try {
      const raw = await window.GeminiService.generate(state.ai, prompt);
      const cleaned = raw.replace(/```json|```/gi, '').trim();
      const parsed = JSON.parse(cleaned);

      const ingredientiPresenti = Array.isArray(parsed.ingredientiPresenti) ? parsed.ingredientiPresenti : [];
      const ingredientiMancanti = Array.isArray(parsed.ingredientiMancanti) ? parsed.ingredientiMancanti : [];
      const ricetta = String(parsed.ricetta || '').trim();

      const combinedIngredients = [...new Set([...ingredientiPresenti, ...ingredientiMancanti].map((x) => String(x || '').trim()).filter(Boolean))];
      const recipeWithAvailability = [
        `Ingredienti presenti: ${ingredientiPresenti.join(', ') || 'nessuno'}`,
        `Ingredienti mancanti: ${ingredientiMancanti.join(', ') || 'nessuno'}`,
        '',
        ricetta || "Ricetta non fornita dall'AI."
      ].join('\n');

      setDishDraft((d) => ({
        ...d,
        ingredients: combinedIngredients.join(', '),
        recipe: recipeWithAvailability
      }));
      setStatus('Ingredienti e ricetta generati con AI.');
    } catch (err) {
      setStatus(`Errore generazione ricetta AI: ${err.message}`);
    }
  }

  function renderCalendarCells() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const first = new Date(y, m, 1);
    const days = new Date(y, m + 1, 0).getDate();
    const firstWeekday = (first.getDay() + 6) % 7;

    const blanks = Array.from({ length: firstWeekday }).map((_, i) => (
      <Grid item xs={12 / 7} key={`b-${i}`}><Box sx={{ minHeight: 96 }} /></Grid>
    ));

    const cells = Array.from({ length: days }).map((_, i) => {
      const day = i + 1;
      const key = new Date(y, m, day).toISOString().slice(0, 10);
      const events = approvedDishes.filter((d) => d.date === key);
      return (
        <Grid item xs={12 / 7} key={day}>
          <Box sx={{ minHeight: 96, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: .5 }}>
            <Typography variant="caption" color="text.secondary">{day}</Typography>
            <Stack spacing={.4} sx={{ mt: .4 }}>
              {events.map((e) => (
                <Chip key={e.id} size="small" color={e.mealType === 'pranzo' ? 'success' : 'secondary'} label={`${e.mealType}: ${e.name}`} />
              ))}
            </Stack>
          </Box>
        </Grid>
      );
    });

    return [...blanks, ...cells];
  }

  const theme = createTheme({ palette: { primary: { main: '#2b61d9' }, background: { default: '#f3f6fc' } } });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="sticky" color="inherit"><Toolbar><Typography variant="h6">AiFrigoHome · React.js + Gemini</Typography></Toolbar></AppBar>
      <Container maxWidth="xl" sx={{ py: 2 }}>
        {!!status && <Alert sx={{ mb: 2 }} severity="info">{status}</Alert>}

        <Grid container spacing={2}>
          {[['Alimenti', kpi.items], ['In scadenza', kpi.expiring], ['Persone', kpi.people], ['Piatti approvati', kpi.approved]].map(([l, v]) => (
            <Grid item xs={6} md={3} key={l}><Card><CardContent><Typography variant="caption">{l}</Typography><Typography variant="h4">{v}</Typography></CardContent></Card></Grid>
          ))}
        </Grid>

        <Grid container spacing={2} sx={{ mt: .5 }}>
          <Grid item xs={12} md={4}>
            <Card><CardContent><Typography variant="h6" gutterBottom>Frigo</Typography>
              <Stack spacing={1}>
                <TextField label="Nome" value={itemDraft.name} onChange={(e) => setItemDraft({ ...itemDraft, name: e.target.value })} />
                <TextField label="Quantità" value={itemDraft.quantity} onChange={(e) => setItemDraft({ ...itemDraft, quantity: e.target.value })} />
                <TextField type="date" label="Scadenza" InputLabelProps={{ shrink: true }} value={itemDraft.expiry} onChange={(e) => setItemDraft({ ...itemDraft, expiry: e.target.value })} />
                <Button variant="contained" onClick={() => {
                  if (!itemDraft.name || !itemDraft.quantity || !itemDraft.expiry) return;
                  setState((s) => ({ ...s, items: [...s.items, { ...itemDraft, id: crypto.randomUUID() }] }));
                  setItemDraft({ name: '', quantity: '', expiry: new Date().toISOString().slice(0, 10) });
                }}>Aggiungi alimento</Button>
              </Stack>
            </CardContent></Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card><CardContent><Typography variant="h6">Alimenti</Typography><List>
              {state.items.map((i) => (
                <ListItem key={i.id} secondaryAction={<Button onClick={() => setState((s) => ({ ...s, items: s.items.filter((x) => x.id !== i.id) }))}>Elimina</Button>}>
                  <ListItemText primary={i.name} secondary={`${i.quantity} • ${i.expiry}`} />
                </ListItem>
              ))}
            </List></CardContent></Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card><CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Persone</Typography>
                <Button variant="contained" onClick={() => setPersonOpen(true)}>Aggiungi persona</Button>
              </Stack>
              <List>
                {state.people.map((p) => (
                  <ListItem key={p.id} secondaryAction={<Button onClick={() => setState((s) => ({ ...s, people: s.people.filter((x) => x.id !== p.id) }))}>Rimuovi</Button>}>
                    <ListItemText primary={p.name} secondary={`Preferiti: ${p.likes.join(', ') || '-'} • Non graditi: ${p.dislikes.join(', ') || '-'}`} />
                  </ListItem>
                ))}
              </List>
            </CardContent></Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card><CardContent><Typography variant="h6" gutterBottom>Supermercati live</Typography>
              <Stack spacing={1}>
                <TextField label="Indirizzo" value={state.address} onChange={(e) => setState((s) => ({ ...s, address: e.target.value }))} />
                <TextField label="Raggio km" type="number" value={state.radiusKm} onChange={(e) => setState((s) => ({ ...s, radiusKm: Number(e.target.value || 1) }))} />
                <Button variant="contained" onClick={searchMarketsLive}>Cerca online</Button>
                <TextField label="Filtro nome supermercato" value={marketNameFilter} onChange={(e) => setMarketNameFilter(e.target.value)} />
                {filteredMarkets.map((m) => (
                  <Button key={m.id} variant={state.selectedMarkets.some((x) => x.id === m.id) ? 'contained' : 'outlined'} onClick={() => setState((s) => ({
                    ...s,
                    selectedMarkets: s.selectedMarkets.some((x) => x.id === m.id)
                      ? s.selectedMarkets.filter((x) => x.id !== m.id)
                      : [...s.selectedMarkets, m]
                  }))}>{m.chain} · {m.name} ({m.distanceKm.toFixed(2)} km)</Button>
                ))}
              </Stack>
            </CardContent></Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card><CardContent>
              <Stack direction="row" justifyContent="space-between"><Typography variant="h6">Offerte online</Typography><Button onClick={refreshOffers}>Aggiorna</Button></Stack>
              <List>
                {state.selectedMarkets.map((m) => (
                  <ListItem key={m.id}><ListItemText primary={`${m.chain} · ${m.name}`} secondary={(m.offers || []).join(' • ') || 'Nessuna offerta caricata'} /></ListItem>
                ))}
              </List>
            </CardContent></Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card><CardContent><Typography variant="h6">Pasti e votazioni</Typography>
              <Stack spacing={1}>
                <TextField label="Nome piatto" value={dishDraft.name} onChange={(e) => setDishDraft({ ...dishDraft, name: e.target.value })} />
                <TextField type="date" label="Data" InputLabelProps={{ shrink: true }} value={dishDraft.date} onChange={(e) => setDishDraft({ ...dishDraft, date: e.target.value })} />
                <FormControl><InputLabel>Slot</InputLabel><Select value={dishDraft.mealType} label="Slot" onChange={(e) => setDishDraft({ ...dishDraft, mealType: e.target.value })}><MenuItem value="pranzo">Pranzo</MenuItem><MenuItem value="cena">Cena</MenuItem></Select></FormControl>
                <TextField label="Ingredienti (virgola)" value={dishDraft.ingredients} onChange={(e) => setDishDraft({ ...dishDraft, ingredients: e.target.value })} />
                <TextField label="Ricetta" multiline minRows={3} value={dishDraft.recipe} onChange={(e) => setDishDraft({ ...dishDraft, recipe: e.target.value })} />
                <Button variant="outlined" onClick={generateDishDetailsWithAi} disabled={!aiEnabled}>Genera ingredienti + ricetta con AI</Button>
                <Button variant="contained" onClick={() => {
                  if (!dishDraft.name || !dishDraft.date || !dishDraft.ingredients) return;
                  setState((s) => ({ ...s, dishes: [...s.dishes, {
                    id: crypto.randomUUID(), name: dishDraft.name, date: dishDraft.date, mealType: dishDraft.mealType,
                    ingredients: dishDraft.ingredients.split(',').map((x) => x.trim()).filter(Boolean), recipe: dishDraft.recipe, votes: {}
                  }] }));
                  setDishDraft((d) => ({ ...d, name: '', ingredients: '', recipe: '' }));
                }}>Proponi</Button>
                <FormControl><InputLabel>Votante</InputLabel><Select value={voterId} label="Votante" onChange={(e) => setVoterId(e.target.value)}>{state.people.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}</Select></FormControl>
              </Stack>
              <List>
                {state.dishes.map((d) => {
                  const votes = Object.values(d.votes || {});
                  const yes = votes.filter((v) => v === 'yes').length;
                  const no = votes.filter((v) => v === 'no').length;
                  return (
                    <ListItem key={d.id}>
                      <ListItemText primary={`${d.name} (${d.date} ${d.mealType})`} secondary={`Voti sì/no: ${yes}/${no}`} />
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="contained" color="success" onClick={() => {
                          if (!voterId) return setStatus('Seleziona prima chi vota.');
                          setState((s) => ({ ...s, dishes: s.dishes.map((x) => x.id === d.id ? { ...x, votes: { ...x.votes, [voterId]: 'yes' } } : x) }));
                        }}>Sì</Button>
                        <Button size="small" variant="contained" color="error" onClick={() => {
                          if (!voterId) return setStatus('Seleziona prima chi vota.');
                          setState((s) => ({ ...s, dishes: s.dishes.map((x) => x.id === d.id ? { ...x, votes: { ...x.votes, [voterId]: 'no' } } : x) }));
                        }}>No</Button>
                      </Stack>
                    </ListItem>
                  );
                })}
              </List>
            </CardContent></Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card><CardContent><Typography variant="h6">Gemini AI (free)</Typography>
              <Stack spacing={1}>
                <TextField label="Gemini API key" type="password" value={state.ai.apiKey} onChange={(e) => {
                  setState((s) => ({ ...s, ai: { ...s.ai, apiKey: e.target.value } }));
                  setAiStatus({ ok: false, checked: false, loading: false, message: '' });
                }} />
                <TextField label="Base URL" value={state.ai.baseUrl} onChange={(e) => {
                  setState((s) => ({ ...s, ai: { ...s.ai, baseUrl: e.target.value } }));
                  setAiStatus({ ok: false, checked: false, loading: false, message: '' });
                }} />
                <TextField label="Modello Gemini" value={state.ai.model} onChange={(e) => {
                  setState((s) => ({ ...s, ai: { ...s.ai, model: e.target.value } }));
                  setAiStatus({ ok: false, checked: false, loading: false, message: '' });
                }} />
                <Button variant="outlined" onClick={checkAiConnection} disabled={!aiConfigured || aiStatus.loading}>Check connessione Gemini</Button>
                {aiStatus.message && <Alert severity={aiStatus.ok ? 'success' : 'warning'}>{aiStatus.message}</Alert>}
                <Button variant="contained" onClick={askAi} disabled={!aiEnabled}>Consigli AI</Button>
                <Typography variant="caption">I controlli AI restano disabilitati finché la connessione Gemini non è verificata.</Typography>
                <Box sx={{ p: 1, minHeight: 120, border: '1px solid', borderColor: 'divider', borderRadius: 1, whiteSpace: 'pre-wrap' }}>{aiOutput || 'Output AI...'}</Box>
              </Stack>
            </CardContent></Card>
          </Grid>
        </Grid>

        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6">Calendario mese corrente</Typography>
            <Grid container spacing={1} sx={{ mt: .5 }}>
              {DAY_NAMES.map((d) => <Grid key={d} item xs={12 / 7}><Typography variant="caption" color="text.secondary">{d}</Typography></Grid>)}
              {renderCalendarCells()}
            </Grid>
          </CardContent>
        </Card>

        <Dialog open={personOpen} onClose={() => setPersonOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Aggiungi persona</DialogTitle>
          <DialogContent>
            <Stack spacing={1} sx={{ mt: .5 }}>
              <TextField label="Nome" value={personDraft.name} onChange={(e) => setPersonDraft({ ...personDraft, name: e.target.value })} />
              <TextField label="Età" type="number" value={personDraft.age} onChange={(e) => setPersonDraft({ ...personDraft, age: e.target.value })} />
              <TextField label="Note" value={personDraft.notes} onChange={(e) => setPersonDraft({ ...personDraft, notes: e.target.value })} />
              <Typography variant="subtitle2">Preferiti</Typography>
              <Stack direction="row" gap={1} flexWrap="wrap">{FOODS.map((f) => <Chip key={`l-${f}`} label={f} color={personDraft.likes.includes(f) ? 'primary' : 'default'} onClick={() => setPersonDraft((p) => ({ ...p, likes: p.likes.includes(f) ? p.likes.filter((x) => x !== f) : [...p.likes, f] }))} />)}</Stack>
              <Typography variant="subtitle2">Non graditi</Typography>
              <Stack direction="row" gap={1} flexWrap="wrap">{FOODS.map((f) => <Chip key={`d-${f}`} label={f} color={personDraft.dislikes.includes(f) ? 'error' : 'default'} onClick={() => setPersonDraft((p) => ({ ...p, dislikes: p.dislikes.includes(f) ? p.dislikes.filter((x) => x !== f) : [...p.dislikes, f] }))} />)}</Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPersonOpen(false)}>Annulla</Button>
            <Button variant="contained" onClick={() => {
              if (!personDraft.name) return;
              setState((s) => ({ ...s, people: [...s.people, { ...personDraft, id: crypto.randomUUID() }] }));
              setPersonDraft({ name: '', age: '', notes: '', likes: [], dislikes: [] });
              setPersonOpen(false);
            }}>Salva</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
