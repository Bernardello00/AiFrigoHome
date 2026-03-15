window.GeminiService = {
  buildApiBaseUrl(baseUrl) {
    const cleaned = String(baseUrl || '').trim().replace(/\/+$/, '');
    if (!cleaned) return '';
    if (/\/v1(beta)?$/i.test(cleaned)) return cleaned;
    return `${cleaned}/v1beta`;
  },

  async checkConnection(aiConfig) {
    const apiBaseUrl = this.buildApiBaseUrl(aiConfig.baseUrl);
    const url = `${apiBaseUrl}/models?key=${encodeURIComponent(aiConfig.apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('HTTP 404: endpoint non trovato. Verifica Base URL (consigliato: https://generativelanguage.googleapis.com/v1beta) e modello Gemini.');
      }
      throw new Error(`HTTP ${res.status}`);
    }
    return true;
  },

  async generate(aiConfig, prompt) {
    const apiBaseUrl = this.buildApiBaseUrl(aiConfig.baseUrl);
    const url = `${apiBaseUrl}/models/${encodeURIComponent(aiConfig.model)}:generateContent?key=${encodeURIComponent(aiConfig.apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6 }
      })
    });

    if (res.status === 429) {
      const err = new Error('RATE_LIMIT');
      err.code = 429;
      throw err;
    }
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('HTTP 404: endpoint/modello non trovato. Controlla Base URL e nome modello Gemini.');
      }
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();
    return json.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n').trim() || 'Nessuna risposta da Gemini.';
  }
};
