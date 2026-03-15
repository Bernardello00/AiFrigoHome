# AiFrigoHome React Live (Gemini)

Applicazione web in **React.js** con UI moderna Material UI, dati live online e integrazione **Gemini API (free tier)**.

## Struttura codice (più pulita)
Il codice è stato diviso in sezioni/file per manutenzione semplice:
- `app/config.js`: costanti globali e config default.
- `app/utils.js`: utility (normalizzazione, distanza, riconoscimento catena).
- `app/services.js`: servizi live (ricerca supermercati online).
- `app/offers-service.js`: ricerca supermercati filtrata + recupero offerte attive alla data.
- `app/recipe-service.js`: orchestrazione AI ricetta strutturata + analisi ingredienti mancanti.
- `app/gemini.js`: integrazione Gemini (check connessione + generateContent).
- `app-react.js`: UI React orientata al flusso supermercato → offerte → piatto → analisi.
- `index.html`: bootstrap librerie + mount React.

## Avvio
```bash
python3 -m http.server 5173
```
Apri `http://localhost:5173`.

## Configurazione Gemini API (free)
Nel pannello AI inserisci:
- **Gemini API key**
- Base URL (default: `https://generativelanguage.googleapis.com/v1beta`)
- Modello (default: `gemini-1.5-flash`)

### Come creare la key Gemini
1. Vai su **Google AI Studio**.
2. Accedi con il tuo account Google.
3. Apri la sezione API keys.
4. Crea una nuova key.
5. Copia/incolla la key nel campo **Gemini API key** nell’app.

> Non salvare mai la key nel repository.

## Check connessione AI (obbligatorio)
- Usa il pulsante **Check connessione Gemini**.
- L’app verifica la connessione reale via endpoint `GET /models`.
- I pulsanti AI restano disabilitati finché:
  - la configurazione non è completa;
  - il check connessione non è OK.

## Dati live online
- Supermercati vicini: Nominatim + Overpass (OpenStreetMap).
- Offerte: feed online per catena/zona (no lista statica hardcoded).

## Feature
- Gestione alimenti/scadenze.
- Persone con preferiti/non graditi (popup).
- Proposta piatti, votazioni e approvazione.
- Calendario mese corrente con eventi pranzo/cena.
- Gestione errore AI `429` con fallback informativo.
