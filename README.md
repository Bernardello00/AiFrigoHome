# AiFrigoHome Smart Planner Web

Web app responsive (desktop + mobile) per pianificare pasti in famiglia, votare i piatti e ottimizzare la spesa su supermercati vicini.

## Cosa è stato migliorato
- UI/UX semplificata e più moderna (dashboard con card, sezioni chiare, popup persona).
- Profilo famiglia con **Aggiungi persona in popup** e checklist cibi preferiti/non graditi.
- Niente barcode: rimosso per mantenere un flusso coerente e davvero utilizzabile.
- Supermercati per **zona reale + raggio** (inclusa `Genova Piazza Dante`) con selezione preferiti.
- Sezione offerte resa più chiara con promo per punto vendita e priorità ingredienti mancanti.
- AI con gestione robusta del caso `429` (fallback locale automatico, senza bloccare l’uso).

## Funzioni principali
- Gestione frigo con scadenze.
- Proposta piatti per pranzo/cena.
- Votazione per persona (Sì/No).
- Inserimento in calendario dei soli piatti approvati.
- Dettaglio piatto con ingredienti, disponibilità in frigo e ricetta.
- Suggerimenti AI contestuali (o fallback locale se API non disponibile).

## Avvio
```bash
python3 -m http.server 5173
```
Apri `http://localhost:5173`.

## Configurazione AI (opzionale)
Nel pannello AI imposta:
- API Key
- Base URL (default `https://api.openai.com/v1`)
- Modello (default `gpt-4o-mini`)
