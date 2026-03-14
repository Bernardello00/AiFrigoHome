import SwiftUI

@main
struct AiFrigoHomeApp: App {
    @State private var fridgeStore = FridgeStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(fridgeStore)
        }
    }
}
