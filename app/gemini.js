window.GeminiService = {
  async checkConnection(aiConfig) {
    const url = `${aiConfig.baseUrl}/models?key=${encodeURIComponent(aiConfig.apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  },

  async generate(aiConfig, prompt) {
    const url = `${aiConfig.baseUrl}/models/${encodeURIComponent(aiConfig.model)}:generateContent?key=${encodeURIComponent(aiConfig.apiKey)}`;
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
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    return json.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n').trim() || 'Nessuna risposta da Gemini.';
  }
};
