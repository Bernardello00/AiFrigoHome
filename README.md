# AiFrigoHome React Live

Versione migrata in **React.js** con UI moderna in **Material UI**, dati supermercati/offerte online e calendario mese corrente.

## Stack UI/UX moderno
- React 18 (runtime browser)
- Material UI (component library)
- Dialog, card, grid responsive, feedback visuale con alert/chip

## Avvio rapido
Non serve build locale:
```bash
python3 -m http.server 5173
```
Apri `http://localhost:5173`.

## Configurazione AI GPT
Nel pannello AI inserisci:
- API Key
- Base URL (default `https://api.openai.com/v1`)
- Modello (es. `gpt-4o-mini`)

### Come creare la API key
1. Vai su OpenAI Platform con il tuo account.
2. Apri la sezione **API Keys**.
3. Clicca **Create new secret key**.
4. Copia la chiave e incollala nel campo **API key** dell’app.
5. Assicurati che billing/quota siano attivi.

> Non salvare mai la chiave nel repository.

## Sicurezza UX AI
- Le azioni AI sono **disabilitate** finché non configuri API key/baseUrl/modello.
- È presente un pulsante **Check connessione AI** che testa la raggiungibilità reale (`GET /models`).
- Se il check fallisce, i consigli AI restano disabilitati.
- Gestione errore `429` con fallback informativo.

## Dati live online
- Supermercati vicini: Nominatim + Overpass (OpenStreetMap), query da indirizzo/raggio.
- Offerte: recupero online via feed news/volantini per catena + zona (nessuna lista statica hardcoded).

## Feature principali
- Gestione alimenti e scadenze.
- Persone (popup) con preferiti/non graditi.
- Proposte piatti, votazioni per persona e approvazione.
- Calendario visuale del **mese corrente** con eventi pranzo/cena.
