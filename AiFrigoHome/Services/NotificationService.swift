import Foundation
import UserNotifications

struct NotificationService {
    func requestAuthorizationIfNeeded() async {
        let center = UNUserNotificationCenter.current()
        _ = try? await center.requestAuthorization(options: [.alert, .sound, .badge])
    }

    func scheduleExpiringNotifications(for items: [FoodItem]) async {
        let center = UNUserNotificationCenter.current()
        await requestAuthorizationIfNeeded()

        let ids = items.map { "expiring-\($0.id.uuidString)" }
        center.removePendingNotificationRequests(withIdentifiers: ids)

        for item in items {
            guard !item.isExpired else { continue }
            let triggerDate = Calendar.current.date(byAdding: .day, value: -1, to: item.expirationDate) ?? item.expirationDate
            if triggerDate < .now { continue }

            let content = UNMutableNotificationContent()
            content.title = "Alimento in scadenza"
            content.body = "\(item.name) scade il \(item.expirationDate.formatted(date: .abbreviated, time: .omitted))."
            content.sound = .default

            let components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: triggerDate)
            let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
            let request = UNNotificationRequest(identifier: "expiring-\(item.id.uuidString)", content: content, trigger: trigger)

            await withCheckedContinuation { continuation in
                center.add(request) { _ in
                    continuation.resume()
                }
            }
        }
    }
}
