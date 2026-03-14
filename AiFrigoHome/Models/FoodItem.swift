import Foundation

struct FoodItem: Identifiable, Codable, Hashable {
    let id: UUID
    var name: String
    var quantity: String
    var expirationDate: Date
    var createdAt: Date

    init(id: UUID = UUID(), name: String, quantity: String, expirationDate: Date, createdAt: Date = .now) {
        self.id = id
        self.name = name
        self.quantity = quantity
        self.expirationDate = expirationDate
        self.createdAt = createdAt
    }

    var isExpiringSoon: Bool {
        guard let threeDaysAhead = Calendar.current.date(byAdding: .day, value: 3, to: .now) else {
            return false
        }
        return expirationDate <= threeDaysAhead
    }

    var isExpired: Bool {
        expirationDate < .now
    }
}
