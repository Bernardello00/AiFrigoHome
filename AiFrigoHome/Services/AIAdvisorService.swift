import Foundation

enum AIAdvisorError: LocalizedError {
    case missingAPIKey
    case invalidResponse

    var errorDescription: String? {
        switch self {
        case .missingAPIKey:
            return "API key mancante. Configura AI_API_KEY nelle variabili ambiente dello scheme."
        case .invalidResponse:
            return "Risposta AI non valida."
        }
    }
}

struct AIAdvisorService {
    private let apiKey: String
    private let baseURL: URL
    private let model: String

    init(processInfo: ProcessInfo = .processInfo) throws {
        guard let key = processInfo.environment["AI_API_KEY"], !key.isEmpty else {
            throw AIAdvisorError.missingAPIKey
        }

        apiKey = key
        let configuredBaseURL = processInfo.environment["AI_BASE_URL"] ?? "https://api.openai.com/v1"
        baseURL = URL(string: configuredBaseURL) ?? URL(string: "https://api.openai.com/v1")!
        model = processInfo.environment["AI_MODEL"] ?? "gpt-4o-mini"
    }

    func suggestRecipe(from ingredients: String) async throws -> String {
        let prompt = """
        Sei un assistente culinario. Con questi ingredienti: \(ingredients).
        Proponi:
        1) 2 ricette semplici
        2) tempi indicativi
        3) priorità ingredienti da consumare prima per scadenza.
        Rispondi in italiano in modo sintetico.
        """

        var request = URLRequest(url: baseURL.appendingPathComponent("chat/completions"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")

        let body = ChatRequest(
            model: model,
            messages: [
                .init(role: "system", content: "Sei un nutrizionista pratico orientato alla riduzione sprechi."),
                .init(role: "user", content: prompt)
            ],
            temperature: 0.4
        )

        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200 ... 299).contains(httpResponse.statusCode) else {
            let payload = String(data: data, encoding: .utf8) ?? "n/a"
            throw NSError(domain: "AIAdvisorService", code: 1, userInfo: [NSLocalizedDescriptionKey: "Errore API: \(payload)"])
        }

        let decoded = try JSONDecoder().decode(ChatResponse.self, from: data)
        guard let content = decoded.choices.first?.message.content else {
            throw AIAdvisorError.invalidResponse
        }

        return content.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

private struct ChatRequest: Codable {
    let model: String
    let messages: [Message]
    let temperature: Double

    struct Message: Codable {
        let role: String
        let content: String
    }
}

private struct ChatResponse: Codable {
    let choices: [Choice]

    struct Choice: Codable {
        let message: Message
    }

    struct Message: Codable {
        let role: String
        let content: String
    }
}
