# AiFrigoHome Web

Nuova versione **web app responsive** (desktop + mobile) ricreata da zero.

## Funzionalità
- Gestione alimenti (aggiunta/rimozione, quantità, scadenza, barcode opzionale).
- Evidenza alimenti in scadenza / scaduti.
- Profilo famiglia/dieta/allergie.
- Suggerimenti ricette AI basati su ingredienti e profilo.
- Notifiche browser per alimenti in scadenza (se abilitate).
- Persistenza locale con `localStorage`.

## Avvio
Apri `index.html` direttamente nel browser oppure avvia un server statico:

```bash
python3 -m http.server 5173
```

Poi visita `http://localhost:5173`.

## Configurazione AI (opzionale)
Nel pannello **Impostazioni AI** puoi impostare:
- API Key
- Base URL (default: `https://api.openai.com/v1`)
- Modello (default: `gpt-4o-mini`)

Se non configurata, l'app mostra un suggerimento locale di fallback.
