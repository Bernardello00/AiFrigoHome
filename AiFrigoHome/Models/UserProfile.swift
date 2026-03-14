import Foundation

struct UserProfile: Codable, Equatable {
    enum DietStyle: String, CaseIterable, Codable, Identifiable {
        case omnivore = "Onnivora"
        case vegetarian = "Vegetariana"
        case vegan = "Vegana"
        case pescatarian = "Pescetariana"

        var id: String { rawValue }
    }

    var householdName: String
    var householdMembers: Int
    var dietStyle: DietStyle
    var allergies: String

    static let `default` = UserProfile(
        householdName: "Casa",
        householdMembers: 2,
        dietStyle: .omnivore,
        allergies: ""
    )
}
