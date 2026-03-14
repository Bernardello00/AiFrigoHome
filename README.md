# AiFrigoHome (iOS)

Applicazione iOS in **SwiftUI** per gestire il frigorifero di casa su due dispositivi e ricevere suggerimenti AI su ricette/consumo alimenti.

## Obiettivo
- Tenere sincronizzata la lista alimenti su due iPhone/iPad.
- Ridurre sprechi (scadenze, priorità uso ingredienti).
- Ottenere consigli AI con gli ingredienti disponibili.

## Funzionalità implementate
- Inserimento alimento con nome, quantità e data di scadenza.
- Vista elenco alimenti ordinata per scadenza.
- Evidenza visiva per alimenti in scadenza.
- Notifiche locali per alimenti in scadenza (1 giorno prima).
- Scanner barcode (VisionKit) per inserimento rapido.
- Profilo famiglia/dieta (componenti, stile alimentare, allergie).
- Suggerimento ricette AI personalizzato su ingredienti + profilo.
- Sincronizzazione iCloud CloudKit di base (upload/download snapshot frigo).

## Sincronizzazione tra 2 dispositivi iOS
Per usare l'app su due dispositivi:
1. Accedi con lo **stesso Apple ID** su entrambi.
2. Abilita iCloud Drive.
3. Nel progetto Xcode abilita il capability **iCloud / CloudKit**.
4. Verifica il record type `FridgeSnapshot` nel container CloudKit privato.
5. Usa i pulsanti "Invia su iCloud" e "Scarica da iCloud" nell'app.

## Permessi necessari
- **Notifiche**: per avvisi di scadenza.
- **Fotocamera**: per scansione barcode.

Ricorda di impostare in `Info.plist`:
- `NSCameraUsageDescription`
- eventuali stringhe localizzate per spiegare l'uso.

## Integrazione AI
`AIAdvisorService` usa endpoint compatibile OpenAI (`/chat/completions`) e legge:
- `AI_API_KEY`
- `AI_BASE_URL` (opzionale, default OpenAI)
- `AI_MODEL` (opzionale, default `gpt-4o-mini`)

Per sviluppo locale puoi definire le variabili nello scheme di Xcode (Run > Arguments > Environment Variables).

## Struttura
- `AiFrigoHome/AiFrigoHomeApp.swift`: entry point.
- `AiFrigoHome/Models/FoodItem.swift`: modello alimento.
- `AiFrigoHome/Models/UserProfile.swift`: profilo famiglia/dieta.
- `AiFrigoHome/Services/FridgeStore.swift`: stato + persistenza locale + sync.
- `AiFrigoHome/Services/AIAdvisorService.swift`: chiamate AI.
- `AiFrigoHome/Services/NotificationService.swift`: notifiche scadenze.
- `AiFrigoHome/Services/CloudKitSyncService.swift`: sync CloudKit.
- `AiFrigoHome/Views/ContentView.swift`: dashboard principale.
- `AiFrigoHome/Views/AddItemView.swift`: inserimento alimento + barcode.
- `AiFrigoHome/Views/RecipeSuggestionView.swift`: suggerimenti AI.
- `AiFrigoHome/Views/ProfileSettingsView.swift`: impostazioni famiglia/dieta.
- `AiFrigoHome/Views/BarcodeScannerView.swift`: scanner barcode.
