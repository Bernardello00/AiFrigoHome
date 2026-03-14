import SwiftUI

struct AddItemView: View {
    @Environment(FridgeStore.self) private var fridgeStore
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var quantity = ""
    @State private var expirationDate = Date.now
    @State private var showScanner = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Dettagli") {
                    TextField("Nome alimento", text: $name)
                    TextField("Quantità (es. 2 confezioni)", text: $quantity)
                    DatePicker("Scadenza", selection: $expirationDate, displayedComponents: .date)
                }

                Section("Inserimento rapido") {
                    Button {
                        showScanner = true
                    } label: {
                        Label("Scansiona barcode", systemImage: "barcode.viewfinder")
                    }
                }
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
            .sheet(isPresented: $showScanner) {
                BarcodeScannerView { barcode in
                    guard !barcode.isEmpty else { return }
                    name = mappedName(for: barcode)
                    if quantity.isEmpty {
                        quantity = "1"
                    }
                }
            }
        }
    }

    private func mappedName(for barcode: String) -> String {
        let localMap: [String: String] = [
            "8001505005707": "Latte intero",
            "3017620422003": "Crema nocciole",
            "7622210449283": "Biscotti"
        ]
        return localMap[barcode] ?? "Prodotto (barcode: \(barcode))"
    }
}

#Preview {
    AddItemView()
        .environment(FridgeStore())
}
