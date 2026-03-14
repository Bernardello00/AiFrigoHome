# AiFrigoHome Planner Web

Web app responsive per gestione frigo, pianificazione pasti e supporto decisionale famigliare.

## Funzionalità principali
- Gestione alimenti con scadenze (senza barcode, rimosso per evitare UX incoerente senza scansione reale).
- Profilo famiglia tramite **questionario per persona** (gusti, non graditi, intolleranze, obiettivi, note).
- Pianificazione calendario **pranzo/cena** con proposta piatti e votazione utenti (es. Andrea sì / Giada no).
- Approvazione automatica dei piatti con maggioranza voti e inserimento nel calendario.
- Dettaglio piatto cliccabile con ingredienti, verifica disponibilità in frigo e ricetta.
- Supermercati vicini (es. Esselunga vicino casa) e suggerimenti scontistiche contestuali.
- Consigli AI che includono profili persone, supermercati vicini, offerte e piatti approvati.

## Avvio
```bash
python3 -m http.server 5173
```
Apri `http://localhost:5173`.

## Configurazione AI (opzionale)
Nel pannello impostazioni AI:
- API Key
- Base URL (default `https://api.openai.com/v1`)
- Modello (default `gpt-4o-mini`)

Senza API key, è disponibile un fallback locale con consigli contestuali.
