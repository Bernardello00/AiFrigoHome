# AiFrigoHome (iOS)

Applicazione iOS in **SwiftUI** per gestire il frigorifero di casa su due dispositivi e ricevere suggerimenti AI su ricette/consumo alimenti.

## Obiettivo
- Tenere sincronizzata la lista alimenti su due iPhone/iPad.
- Ridurre sprechi (scadenze, priorità uso ingredienti).
- Ottenere consigli AI con gli ingredienti disponibili.

## Funzionalità implementate (MVP)
- Inserimento alimento con nome, quantità e data di scadenza.
- Vista elenco alimenti ordinata per scadenza.
- Evidenza visiva per alimenti in scadenza.
- Suggerimento ricette AI da ingredienti presenti.
- Architettura predisposta per sincronizzazione cloud.

## Sincronizzazione tra 2 dispositivi iOS
Per usare l'app su due dispositivi:
1. Accedi con lo **stesso Apple ID** su entrambi.
2. Abilita iCloud Drive.
3. Nel progetto Xcode abilita il capability **iCloud / CloudKit**.
4. Usa il container CloudKit privato per condividere i dati del frigo.

> Nel codice è presente `FridgeStore` con persistenza locale JSON. Puoi estenderlo con CloudKit mantenendo la stessa API del repository locale.

## Integrazione AI
`AIAdvisorService` usa endpoint compatibile OpenAI (`/chat/completions`) e legge:
- `AI_API_KEY`
- `AI_BASE_URL` (opzionale, default OpenAI)
- `AI_MODEL` (opzionale, default `gpt-4o-mini`)

Per sviluppo locale puoi definire le variabili nello scheme di Xcode (Run > Arguments > Environment Variables).

## Struttura
- `AiFrigoHome/AiFrigoHomeApp.swift`: entry point.
- `AiFrigoHome/Models/FoodItem.swift`: modello alimento.
- `AiFrigoHome/Services/FridgeStore.swift`: stato + persistenza locale.
- `AiFrigoHome/Services/AIAdvisorService.swift`: chiamate AI.
- `AiFrigoHome/Views/ContentView.swift`: dashboard principale.
- `AiFrigoHome/Views/AddItemView.swift`: inserimento alimento.
- `AiFrigoHome/Views/RecipeSuggestionView.swift`: suggerimenti AI.

## Prossimi step consigliati
- Notifiche locali per alimenti in scadenza.
- Scanner barcode per inserimento rapido.
- Sincronizzazione CloudKit completa con conflitti multi-device.
- Profili dieta/famiglia per suggerimenti personalizzati.
