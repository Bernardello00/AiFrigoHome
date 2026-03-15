const {
  AppBar, Toolbar, Typography, Container, Grid, Card, CardContent, Button, TextField,
  Stack, List, ListItem, ListItemText, Alert, Box, CssBaseline, ThemeProvider, createTheme,
  FormControl, InputLabel, Select, MenuItem, Tabs, Tab, Chip, Link, CircularProgress
} = MaterialUI;

const { LS_KEY, DEFAULT_AI } = window.APP_CONFIG;

const initialState = {
  items: [],
  marketsFound: [],
  selectedMarketId: '',
  address: 'Genova Piazza Dante',
  radiusKm: 2,
  ai: { ...DEFAULT_AI, connection: { status: window.AiState.STATUS.DISCONNECTED, message: '' } }
};

function readState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw);
    return {
      ...initialState,
      ...parsed,
      ai: {
        ...DEFAULT_AI,
        ...(parsed.ai || {}),
        connection: { ...initialState.ai.connection, ...(parsed.ai?.connection || {}) }
      }
    };
  } catch {
    return initialState;
  }
}

function App() {
  const [state, setState] = React.useState(readState);
  const [status, setStatus] = React.useState('');
  const [page, setPage] = React.useState('dashboard');

  const [itemDraft, setItemDraft] = React.useState({ name: '', quantity: '', expiry: new Date().toISOString().slice(0, 10) });
  const [marketNameFilter, setMarketNameFilter] = React.useState('');
  const [offersStatus, setOffersStatus] = React.useState({ state: 'idle', items: [], error: '' });
  const [dishName, setDishName] = React.useState('');
  const [analysisStatus, setAnalysisStatus] = React.useState({ state: 'idle', error: '', data: null });

  React.useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [state]);

  const aiConnection = React.useMemo(() => window.AiState.deriveConnectionState(state.ai), [state.ai]);
  const aiEnabled = aiConnection.status === window.AiState.STATUS.CONNECTED;

  const selectedMarket = React.useMemo(
    () => state.marketsFound.find((market) => market.id === state.selectedMarketId) || null,
    [state.marketsFound, state.selectedMarketId]
  );

  const filteredMarkets = React.useMemo(
    () => window.OffersService.searchSupermarkets(marketNameFilter, state.marketsFound),
    [marketNameFilter, state.marketsFound]
  );

  function updateAiConfig(patch) {
    setState((s) => ({
      ...s,
      ai: {
        ...s.ai,
        ...patch,
        connection: {
          status: window.AiState.STATUS.DISCONNECTED,
          message: 'Configurazione aggiornata: riesegui il test connessione.',
          technicalMessage: 'Config changed'
        }
      }
    }));
  }

  async function checkAiConnection() {
    setState((s) => ({ ...s, ai: { ...s.ai, connection: { status: window.AiState.STATUS.TESTING, message: 'Test connessione Gemini in corso...' } } }));
    try {
      const result = await window.GeminiService.testConnection(state.ai);
      const fingerprint = window.AiState.buildConfigFingerprint(state.ai);
      setState((s) => ({
        ...s,
        ai: {
          ...s.ai,
          connection: {
            status: window.AiState.STATUS.CONNECTED,
            message: result.message,
            technicalMessage: 'test connection success',
            fingerprint
          }
        }
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        ai: {
          ...s.ai,
          connection: {
            status: window.AiState.STATUS.ERROR,
            message: err.userMessage || err.message,
            technicalMessage: err.technicalMessage || err.message
          }
        }
      }));
    }
  }

  async function searchMarketsLive() {
    setStatus('Ricerca supermercati in corso...');
    try {
      const mapped = await window.AppServices.searchLiveSupermarkets(state.address, state.radiusKm);
      setState((s) => ({
        ...s,
        marketsFound: mapped,
        selectedMarketId: mapped.some((market) => market.id === s.selectedMarketId) ? s.selectedMarketId : ''
      }));
      setStatus(`${mapped.length} supermercati trovati.`);
      setOffersStatus({ state: 'idle', items: [], error: '' });
    } catch (err) {
      setStatus(`Errore ricerca supermercati: ${err.message}`);
    }
  }

  async function loadOffersForSelectedStore(store) {
    if (!store) {
      setOffersStatus({ state: 'error', items: [], error: 'Seleziona prima un supermercato.' });
      return;
    }

    setOffersStatus({ state: 'loading', items: [], error: '' });
    try {
      const today = new Date();
      const offers = await window.OffersService.getOffersByStoreAndDate(store, today, state.address);
      setOffersStatus({ state: 'success', items: offers, error: '' });
    } catch (err) {
      setOffersStatus({ state: 'error', items: [], error: err.message || 'Errore caricamento offerte.' });
    }
  }

  async function handleSelectMarket(storeId) {
    setState((s) => ({ ...s, selectedMarketId: storeId }));
    const store = state.marketsFound.find((market) => market.id === storeId);
    await loadOffersForSelectedStore(store);
  }

  async function analyzeDish() {
    if (!aiEnabled) return setAnalysisStatus({ state: 'error', error: `AI non disponibile: ${aiConnection.message}`, data: null });
    if (!dishName.trim()) return setAnalysisStatus({ state: 'error', error: 'Inserisci il nome del piatto.', data: null });

    setAnalysisStatus({ state: 'loading', error: '', data: null });
    try {
      const recipe = await window.RecipeService.generateRecipeFromDishName(state.ai, dishName.trim());
      const fridgeItems = state.items.map((item) => item.name).filter(Boolean);
      const comparison = window.RecipeService.analyzeMissingIngredients(fridgeItems, recipe.ingredientsRequired);
      const missingOnOffers = window.RecipeService.findMissingIngredientsOnOffers(comparison.missingIngredients, offersStatus.items);
      setAnalysisStatus({ state: 'success', error: '', data: { recipe, comparison, missingOnOffers } });
    } catch (err) {
      setAnalysisStatus({ state: 'error', error: err.userMessage || err.message, data: null });
    }
  }

  function renderAiConnectionAlert() {
    const severityByStatus = {
      connected: 'success',
      testing: 'info',
      error: 'warning',
      disconnected: 'info'
    };
    return <Alert severity={severityByStatus[aiConnection.status] || 'info'}>{aiConnection.message}</Alert>;
  }

  const theme = createTheme({ palette: { primary: { main: '#2b61d9' }, background: { default: '#f3f6fc' } } });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="sticky" color="inherit"><Toolbar><Typography variant="h6">Food AI · AiFrigoHome</Typography></Toolbar></AppBar>
      <Container maxWidth="lg" sx={{ py: 2 }}>
        {!!status && <Alert sx={{ mb: 2 }} severity="info">{status}</Alert>}

        <Tabs value={page} onChange={(_, value) => setPage(value)} sx={{ mb: 2 }}>
          <Tab label="Dashboard" value="dashboard" />
          <Tab label="Impostazioni AI" value="settings" />
        </Tabs>

        {page === 'settings' && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Impostazioni AI</Typography>
              <Stack spacing={1.5} sx={{ maxWidth: 600 }}>
                <FormControl>
                  <InputLabel>Provider</InputLabel>
                  <Select value={state.ai.provider} label="Provider" onChange={(e) => updateAiConfig({ provider: e.target.value })}>
                    <MenuItem value="gemini">Gemini</MenuItem>
                  </Select>
                </FormControl>
                <TextField label="Gemini API key" type="password" value={state.ai.apiKey} onChange={(e) => updateAiConfig({ apiKey: e.target.value })} />
                <TextField label="Base URL" value={state.ai.baseUrl} onChange={(e) => updateAiConfig({ baseUrl: e.target.value })} />
                <TextField label="Modello Gemini" value={state.ai.model} onChange={(e) => updateAiConfig({ model: e.target.value })} />
                <Button variant="contained" onClick={checkAiConnection} disabled={aiConnection.status === window.AiState.STATUS.TESTING}>Test connessione</Button>
                {renderAiConnectionAlert()}
              </Stack>
            </CardContent>
          </Card>
        )}

        {page === 'dashboard' && (
          <Grid container spacing={2}>
            <Grid item xs={12}><Card><CardContent>
              <Typography variant="h6" gutterBottom>1) Seleziona supermercato</Typography>
              <Stack spacing={1}>
                <TextField label="Indirizzo" value={state.address} onChange={(e) => setState((s) => ({ ...s, address: e.target.value }))} />
                <TextField label="Raggio km" type="number" value={state.radiusKm} onChange={(e) => setState((s) => ({ ...s, radiusKm: Number(e.target.value || 1) }))} />
                <Button variant="contained" onClick={searchMarketsLive}>Cerca supermercati</Button>
                <TextField label="Filtra supermercato (es. Esselunga)" value={marketNameFilter} onChange={(e) => setMarketNameFilter(e.target.value)} />
                {!!filteredMarkets.length && (
                  <FormControl>
                    <InputLabel>Supermercato</InputLabel>
                    <Select
                      value={state.selectedMarketId}
                      label="Supermercato"
                      onChange={(e) => handleSelectMarket(e.target.value)}
                    >
                      {filteredMarkets.map((market) => (
                        <MenuItem key={market.id} value={market.id}>{market.chain} · {market.name} ({market.distanceKm.toFixed(2)} km)</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                {!filteredMarkets.length && <Typography variant="body2" color="text.secondary">Nessun supermercato trovato: prova ad ampliare il raggio o cambiare indirizzo.</Typography>}
              </Stack>
            </CardContent></Card></Grid>

            <Grid item xs={12}><Card><CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">2) Offerte attive oggi</Typography>
                <Button onClick={() => loadOffersForSelectedStore(selectedMarket)} disabled={!selectedMarket || offersStatus.state === 'loading'}>Aggiorna offerte</Button>
              </Stack>
              {offersStatus.state === 'loading' && <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}><CircularProgress size={18} /><Typography>Caricamento offerte...</Typography></Stack>}
              {offersStatus.state === 'error' && <Alert sx={{ mt: 1 }} severity="error">{offersStatus.error}</Alert>}
              {offersStatus.state === 'success' && offersStatus.items.length === 0 && <Alert sx={{ mt: 1 }} severity="info">Nessuna offerta attiva oggi per il supermercato selezionato.</Alert>}
              {offersStatus.items.length > 0 && (
                <List>
                  {offersStatus.items.map((offer) => (
                    <ListItem key={offer.id}>
                      <ListItemText
                        primary={offer.title}
                        secondary={`Valida: ${offer.validFrom.toLocaleDateString('it-IT')} - ${offer.validTo.toLocaleDateString('it-IT')}`}
                      />
                      {!!offer.link && <Link href={offer.link} target="_blank" rel="noreferrer">Fonte</Link>}
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent></Card></Grid>

            <Grid item xs={12} md={6}><Card><CardContent>
              <Typography variant="h6" gutterBottom>3) Inserisci piatto</Typography>
              <TextField fullWidth label="Nome piatto (es. carbonara)" value={dishName} onChange={(e) => setDishName(e.target.value)} />
            </CardContent></Card></Grid>

            <Grid item xs={12} md={6}><Card><CardContent>
              <Typography variant="h6" gutterBottom>4) Ingredienti nel frigo</Typography>
              <Stack spacing={1}>
                <TextField label="Nome ingrediente" value={itemDraft.name} onChange={(e) => setItemDraft({ ...itemDraft, name: e.target.value })} />
                <TextField label="Quantità" value={itemDraft.quantity} onChange={(e) => setItemDraft({ ...itemDraft, quantity: e.target.value })} />
                <TextField type="date" label="Scadenza" InputLabelProps={{ shrink: true }} value={itemDraft.expiry} onChange={(e) => setItemDraft({ ...itemDraft, expiry: e.target.value })} />
                <Button variant="outlined" onClick={() => {
                  if (!itemDraft.name || !itemDraft.quantity || !itemDraft.expiry) return;
                  setState((s) => ({ ...s, items: [...s.items, { ...itemDraft, id: crypto.randomUUID() }] }));
                  setItemDraft({ name: '', quantity: '', expiry: new Date().toISOString().slice(0, 10) });
                }}>Aggiungi ingrediente</Button>
                <List dense>
                  {state.items.map((item) => (
                    <ListItem key={item.id} secondaryAction={<Button onClick={() => setState((s) => ({ ...s, items: s.items.filter((x) => x.id !== item.id) }))}>Rimuovi</Button>}>
                      <ListItemText primary={item.name} secondary={`${item.quantity} • scadenza ${item.expiry}`} />
                    </ListItem>
                  ))}
                </List>
              </Stack>
            </CardContent></Card></Grid>

            <Grid item xs={12}><Card><CardContent>
              <Typography variant="h6" gutterBottom>5) Analisi AI</Typography>
              {renderAiConnectionAlert()}
              <Button sx={{ mt: 1 }} variant="contained" onClick={analyzeDish} disabled={analysisStatus.state === 'loading' || !aiEnabled || !dishName.trim()}>
                Analizza piatto
              </Button>
              {analysisStatus.state === 'loading' && <Typography sx={{ mt: 1 }}>Analisi AI in corso...</Typography>}
              {analysisStatus.state === 'error' && <Alert sx={{ mt: 1 }} severity="error">{analysisStatus.error}</Alert>}
            </CardContent></Card></Grid>

            {analysisStatus.state === 'success' && analysisStatus.data && (
              <Grid item xs={12}><Card><CardContent>
                <Typography variant="h6" gutterBottom>6) Risultati</Typography>
                <Stack spacing={1}>
                  <Typography><strong>Ingredienti richiesti:</strong></Typography>
                  <Box>{analysisStatus.data.comparison.requiredIngredients.map((item) => <Chip sx={{ mr: .5, mb: .5 }} key={`req-${item}`} label={item} />)}</Box>

                  <Typography><strong>Ingredienti già presenti:</strong> {analysisStatus.data.comparison.presentIngredients.join(', ') || 'nessuno'}</Typography>
                  <Typography><strong>Ingredienti mancanti:</strong> {analysisStatus.data.comparison.missingIngredients.join(', ') || 'nessuno'}</Typography>

                  <Typography><strong>Ingredienti mancanti in offerta:</strong></Typography>
                  {analysisStatus.data.missingOnOffers.length === 0 && <Typography variant="body2">Nessun ingrediente mancante trovato nelle offerte di oggi.</Typography>}
                  {analysisStatus.data.missingOnOffers.map((entry, index) => (
                    <Typography key={`${entry.ingredient}-${index}`} variant="body2">• {entry.ingredient}: {entry.offerTitle}</Typography>
                  ))}

                  <Typography sx={{ mt: 1 }}><strong>Ricetta completa:</strong></Typography>
                  <Typography variant="body2">Porzioni: {analysisStatus.data.recipe.servings || 'n/d'}</Typography>
                  <List dense>
                    {analysisStatus.data.recipe.recipeSteps.map((step, index) => (
                      <ListItem key={`step-${index}`}><ListItemText primary={`${index + 1}. ${step}`} /></ListItem>
                    ))}
                  </List>
                  {!!analysisStatus.data.recipe.notes && <Alert severity="info">Note: {analysisStatus.data.recipe.notes}</Alert>}
                </Stack>
              </CardContent></Card></Grid>
            )}
          </Grid>
        )}
      </Container>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
