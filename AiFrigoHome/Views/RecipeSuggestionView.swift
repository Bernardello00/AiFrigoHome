import SwiftUI

struct RecipeSuggestionView: View {
    @Environment(FridgeStore.self) private var fridgeStore

    @State private var suggestion: String = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Ingredienti attuali")
                    .font(.headline)

                Text(fridgeStore.ingredientsList().isEmpty ? "Nessun ingrediente disponibile." : fridgeStore.ingredientsList())
                    .foregroundStyle(.secondary)

                Button {
                    Task { await fetchSuggestion() }
                } label: {
                    HStack {
                        if isLoading {
                            ProgressView()
                        }
                        Text(isLoading ? "Generazione in corso..." : "Genera suggerimenti AI")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(isLoading || fridgeStore.items.isEmpty)

                if let errorMessage {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                        .font(.footnote)
                }

                if !suggestion.isEmpty {
                    Text("Risposta AI")
                        .font(.headline)
                    Text(suggestion)
                        .textSelection(.enabled)
                }
            }
            .padding()
        }
        .navigationTitle("Ricette AI")
        .navigationBarTitleDisplayMode(.inline)
    }

    @MainActor
    private func fetchSuggestion() async {
        isLoading = true
        errorMessage = nil
        suggestion = ""

        do {
            let service = try AIAdvisorService()
            let ingredients = fridgeStore.ingredientsList()
            suggestion = try await service.suggestRecipe(from: ingredients)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

#Preview {
    RecipeSuggestionView()
        .environment(FridgeStore())
}
