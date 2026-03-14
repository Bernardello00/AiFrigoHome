import Foundation
import Observation

@Observable
final class FridgeStore {
    private(set) var items: [FoodItem] = []

    private let saveURL: URL
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init() {
        let documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
        saveURL = (documentsDirectory ?? URL(fileURLWithPath: NSTemporaryDirectory()))
            .appendingPathComponent("fridge_items.json")
        load()
    }

    func addItem(name: String, quantity: String, expirationDate: Date) {
        let newItem = FoodItem(name: name, quantity: quantity, expirationDate: expirationDate)
        items.append(newItem)
        sortAndSave()
    }

    func removeItems(at offsets: IndexSet) {
        items.remove(atOffsets: offsets)
        save()
    }

    func ingredientsList() -> String {
        items
            .sorted { $0.expirationDate < $1.expirationDate }
            .map { "\($0.name) (\($0.quantity))" }
            .joined(separator: ", ")
    }

    private func sortAndSave() {
        items.sort { $0.expirationDate < $1.expirationDate }
        save()
    }

    private func save() {
        do {
            let data = try encoder.encode(items)
            try data.write(to: saveURL, options: .atomic)
        } catch {
            print("Errore salvataggio locale: \(error.localizedDescription)")
        }
    }

    private func load() {
        guard FileManager.default.fileExists(atPath: saveURL.path) else {
            items = []
            return
        }

        do {
            let data = try Data(contentsOf: saveURL)
            items = try decoder.decode([FoodItem].self, from: data)
            items.sort { $0.expirationDate < $1.expirationDate }
        } catch {
            print("Errore caricamento locale: \(error.localizedDescription)")
            items = []
        }
    }
}
