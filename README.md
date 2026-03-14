# AiFrigoHome Dashboard Web

Web app responsive (desktop + mobile) per gestire frigorifero, budget spesa e suggerimenti ricette.

## Cosa include
- Dashboard KPI (totale alimenti, in scadenza, scaduti, budget residuo).
- Gestione alimenti: aggiunta/rimozione, quantità, data scadenza, barcode opzionale.
- Budget mensile e tracking spese con barra di avanzamento.
- Profilo famiglia/dieta/allergie.
- Supermercati preferiti con suggerimenti offerte/ingredienti mancanti.
- Consigli ricette AI + fallback locale se API key non configurata.
- Persistenza locale (`localStorage`) e notifiche browser per scadenze imminenti.

## Avvio
```bash
python3 -m http.server 5173
```
Poi apri `http://localhost:5173`.

## Configurazione AI (opzionale)
Nel pannello **Impostazioni AI**:
- API Key
- Base URL (default `https://api.openai.com/v1`)
- Modello (default `gpt-4o-mini`)

Senza API key, l'app fornisce consigli locali di base.
