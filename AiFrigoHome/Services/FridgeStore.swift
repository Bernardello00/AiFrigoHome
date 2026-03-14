import Foundation
import Observation

@MainActor
@Observable
final class FridgeStore {
    private(set) var items: [FoodItem] = []
    private(set) var profile: UserProfile = .default
    private(set) var lastSyncDate: Date?
    var syncMessage: String?

    private let saveURL: URL
    private let profileURL: URL
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private let notificationService = NotificationService()
    private let cloudKitService = CloudKitSyncService()

    init() {
        let documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
        let baseURL = documentsDirectory ?? URL(fileURLWithPath: NSTemporaryDirectory())
        saveURL = baseURL.appendingPathComponent("fridge_items.json")
        profileURL = baseURL.appendingPathComponent("user_profile.json")

        load()
        loadProfile()

        Task {
            await notificationService.scheduleExpiringNotifications(for: items)
        }
    }

    func addItem(name: String, quantity: String, expirationDate: Date) {
        let newItem = FoodItem(name: name, quantity: quantity, expirationDate: expirationDate)
        items.append(newItem)
        sortAndSave()
        Task { await notificationService.scheduleExpiringNotifications(for: items) }
    }

    func removeItems(at offsets: IndexSet) {
        items.remove(atOffsets: offsets)
        save()
        Task { await notificationService.scheduleExpiringNotifications(for: items) }
    }

    func updateProfile(_ newProfile: UserProfile) {
        profile = newProfile
        saveProfile()
    }

    func ingredientsList() -> String {
        items
            .sorted { $0.expirationDate < $1.expirationDate }
            .map { "\($0.name) (\($0.quantity))" }
            .joined(separator: ", ")
    }

    func expiringIngredientsList() -> String {
        items
            .filter { $0.isExpiringSoon || $0.isExpired }
            .sorted { $0.expirationDate < $1.expirationDate }
            .map { "\($0.name) (scadenza: \($0.expirationDate.formatted(date: .abbreviated, time: .omitted)))" }
            .joined(separator: ", ")
    }

    func syncFromCloud() async {
        do {
            let remote = try await cloudKitService.fetchItems()
            if !remote.isEmpty {
                items = remote.sorted { $0.expirationDate < $1.expirationDate }
                save()
                await notificationService.scheduleExpiringNotifications(for: items)
            }
            lastSyncDate = .now
            syncMessage = "Sincronizzazione completata."
        } catch {
            syncMessage = "Sync fallita: \(error.localizedDescription)"
        }
    }

    func syncToCloud() async {
        do {
            try await cloudKitService.save(items: items)
            lastSyncDate = .now
            syncMessage = "Dati inviati su iCloud."
        } catch {
            syncMessage = "Invio iCloud fallito: \(error.localizedDescription)"
        }
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

    private func saveProfile() {
        do {
            let data = try encoder.encode(profile)
            try data.write(to: profileURL, options: .atomic)
        } catch {
            print("Errore salvataggio profilo: \(error.localizedDescription)")
        }
    }

    private func loadProfile() {
        guard FileManager.default.fileExists(atPath: profileURL.path) else {
            profile = .default
            return
        }

        do {
            let data = try Data(contentsOf: profileURL)
            profile = try decoder.decode(UserProfile.self, from: data)
        } catch {
            profile = .default
        }
    }
}
