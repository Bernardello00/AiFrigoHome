import CloudKit
import Foundation

struct CloudKitSyncService {
    private let container = CKContainer.default()
    private let database: CKDatabase
    private let recordID = CKRecord.ID(recordName: "shared-fridge")

    init() {
        database = container.privateCloudDatabase
    }

    func fetchItems() async throws -> [FoodItem] {
        do {
            let record = try await database.record(for: recordID)
            guard let data = record["items"] as? Data else { return [] }
            return try JSONDecoder().decode([FoodItem].self, from: data)
        } catch let error as CKError where error.code == .unknownItem {
            return []
        }
    }

    func save(items: [FoodItem]) async throws {
        let record: CKRecord
        if let current = try? await database.record(for: recordID) {
            record = current
        } else {
            record = CKRecord(recordType: "FridgeSnapshot", recordID: recordID)
        }

        record["updatedAt"] = Date() as CKRecordValue
        record["items"] = try JSONEncoder().encode(items) as CKRecordValue

        _ = try await database.save(record)
    }
}
