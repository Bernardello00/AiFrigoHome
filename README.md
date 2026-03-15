# AiFrigoHome Smart Live Web

Web app responsive per gestione frigo, pianificazione pasti e spesa con dati online aggiornati.

## Novità principali
- UI/UX riprogettata con layout ordinato, spaziature coerenti e flussi più semplici.
- Ricerca supermercati **live online** da indirizzo reale (Nominatim + Overpass OpenStreetMap).
- Selezione supermercati preferiti tra i risultati reali nel raggio impostato.
- Offerte lette da fonti online (feed news/volantini per catena + zona), non da liste statiche hardcoded.
- Calendario visibile come **mese corrente** con eventi pranzo/cena dei piatti approvati.
- Fallback AI robusto anche in caso di rate-limit `429`.

## Avvio
```bash
python3 -m http.server 5173
```
Apri `http://localhost:5173`.

## Configurazione AI (opzionale)
Nel pannello AI:
- API Key
- Base URL (default `https://api.openai.com/v1`)
- Modello (default `gpt-4o-mini`)

## Nota sui dati live
- Supermercati: query live su OpenStreetMap (Nominatim + Overpass).
- Offerte: recupero online da fonti news/volantini per catena/zona.
- Se una fonte esterna non risponde (CORS/rate limit), l’app mostra messaggi di fallback senza bloccarsi.
