import SwiftUI

struct ContentView: View {
    @Environment(FridgeStore.self) private var fridgeStore
    @State private var showAddSheet = false

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
                ToolbarItem(placement: .topBarTrailing) {
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
        }
    }
}

#Preview {
    ContentView()
        .environment(FridgeStore())
}
