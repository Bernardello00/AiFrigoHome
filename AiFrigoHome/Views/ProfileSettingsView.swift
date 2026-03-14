import SwiftUI

struct ProfileSettingsView: View {
    @Environment(FridgeStore.self) private var fridgeStore
    @Environment(\.dismiss) private var dismiss

    @State private var profile = UserProfile.default

    var body: some View {
        NavigationStack {
            Form {
                Section("Famiglia") {
                    TextField("Nome casa", text: $profile.householdName)
                    Stepper("Componenti: \(profile.householdMembers)", value: $profile.householdMembers, in: 1 ... 12)
                }

                Section("Dieta") {
                    Picker("Stile alimentare", selection: $profile.dietStyle) {
                        ForEach(UserProfile.DietStyle.allCases) { diet in
                            Text(diet.rawValue).tag(diet)
                        }
                    }
                    TextField("Allergie/intolleranze", text: $profile.allergies, axis: .vertical)
                }
            }
            .navigationTitle("Profilo")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annulla") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Salva") {
                        fridgeStore.updateProfile(profile)
                        dismiss()
                    }
                }
            }
            .onAppear {
                profile = fridgeStore.profile
            }
        }
    }
}

#Preview {
    ProfileSettingsView()
        .environment(FridgeStore())
}
