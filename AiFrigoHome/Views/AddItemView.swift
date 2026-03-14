import SwiftUI

struct AddItemView: View {
    @Environment(FridgeStore.self) private var fridgeStore
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var quantity = ""
    @State private var expirationDate = Date.now

    var body: some View {
        NavigationStack {
            Form {
                TextField("Nome alimento", text: $name)
                TextField("Quantità (es. 2 confezioni)", text: $quantity)
                DatePicker("Scadenza", selection: $expirationDate, displayedComponents: .date)
            }
            .navigationTitle("Nuovo alimento")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annulla") { dismiss() }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Salva") {
                        fridgeStore.addItem(
                            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                            quantity: quantity.trimmingCharacters(in: .whitespacesAndNewlines),
                            expirationDate: expirationDate
                        )
                        dismiss()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}

#Preview {
    AddItemView()
        .environment(FridgeStore())
}
