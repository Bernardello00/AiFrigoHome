import SwiftUI

struct ContentView: View {
    @Environment(FridgeStore.self) private var fridgeStore
    @State private var showAddSheet = false
    @State private var showProfileSheet = false

    var body: some View {
        NavigationStack {
            List {
                Section("Frigorifero") {
                    if fridgeStore.items.isEmpty {
                        ContentUnavailableView(
                            "Nessun alimento",
                            systemImage: "refrigerator",
                            description: Text("Aggiungi ingredienti per iniziare.")
                        )
                    } else {
                        ForEach(fridgeStore.items) { item in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(item.name)
                                    .font(.headline)

                                Text("Quantità: \(item.quantity)")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)

                                Text("Scadenza: \(item.expirationDate, style: .date)")
                                    .font(.caption)
                                    .foregroundStyle(item.isExpired ? .red : (item.isExpiringSoon ? .orange : .secondary))
                            }
                            .padding(.vertical, 2)
                        }
                        .onDelete(perform: fridgeStore.removeItems)
                    }
                }

                Section("Profilo famiglia") {
                    HStack {
                        Text("Casa")
                        Spacer()
                        Text(fridgeStore.profile.householdName)
                            .foregroundStyle(.secondary)
                    }
                    HStack {
                        Text("Dieta")
                        Spacer()
                        Text(fridgeStore.profile.dietStyle.rawValue)
                            .foregroundStyle(.secondary)
                    }
                    Button("Modifica profilo") {
                        showProfileSheet = true
                    }
                }

                Section("Sincronizzazione iCloud") {
                    Button {
                        Task { await fridgeStore.syncFromCloud() }
                    } label: {
                        Label("Scarica da iCloud", systemImage: "arrow.down.circle")
                    }

                    Button {
                        Task { await fridgeStore.syncToCloud() }
                    } label: {
                        Label("Invia su iCloud", systemImage: "arrow.up.circle")
                    }

                    if let lastSyncDate = fridgeStore.lastSyncDate {
                        Text("Ultimo sync: \(lastSyncDate.formatted(date: .abbreviated, time: .shortened))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    if let syncMessage = fridgeStore.syncMessage {
                        Text(syncMessage)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Section("AI") {
                    NavigationLink {
                        RecipeSuggestionView()
                    } label: {
                        Label("Suggerimenti ricette", systemImage: "sparkles")
                    }
                }
            }
            .navigationTitle("AiFrigoHome")
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {
                        showAddSheet = true
                    } label: {
                        Label("Aggiungi", systemImage: "plus")
                    }
                }
            }
            .sheet(isPresented: $showAddSheet) {
                AddItemView()
            }
            .sheet(isPresented: $showProfileSheet) {
                ProfileSettingsView()
            }
        }
    }
}

#Preview {
    ContentView()
        .environment(FridgeStore())
}
