window.GeminiService = {
  DEFAULT_TIMEOUT_MS: 12000,
  RETRYABLE_STATUS: [429, 500, 503],
  ALLOWED_MODELS: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp', 'gemini-2.0-flash'],

  normalizeBaseUrl(baseUrl) {
    const cleaned = String(baseUrl || '').trim().replace(/\/+$/, '');
    if (!cleaned) return '';
    if (/\/v1beta$/i.test(cleaned) || /\/v1$/i.test(cleaned)) return cleaned;
    return `${cleaned}/v1beta`;
  },

  normalizeModelName(model) {
    return String(model || '').trim();
  },

  validateConfig(aiConfig) {
    const provider = String(aiConfig?.provider || '').trim().toLowerCase();
    const apiKey = String(aiConfig?.apiKey || '').trim();
    const baseUrl = this.normalizeBaseUrl(aiConfig?.baseUrl);
    const model = this.normalizeModelName(aiConfig?.model);

    if (provider !== 'gemini') throw this.createClientError('INVALID_PROVIDER', 'Provider AI non supportato: usa Gemini.');
    if (!apiKey) throw this.createClientError('MISSING_API_KEY', 'API key Gemini mancante.');
    if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) throw this.createClientError('INVALID_BASE_URL', 'Base URL Gemini non valido.');
    if (!model) throw this.createClientError('INVALID_MODEL', 'Nome modello Gemini mancante.');
    if (!/^[\w.-]+$/.test(model)) throw this.createClientError('INVALID_MODEL', 'Formato modello Gemini non valido.');

    return { provider, apiKey, baseUrl, model };
  },

  createClientError(code, message, technicalMessage) {
    const err = new Error(message);
    err.code = code;
    err.userMessage = message;
    err.technicalMessage = technicalMessage || message;
    return err;
  },

  mapHttpError(status, responseText, context) {
    const httpPrefix = context === 'test' ? 'test connessione' : 'generazione contenuti';
    if (status === 400) return this.createClientError('BAD_REQUEST', 'Richiesta Gemini non valida (400). Controlla payload e modello.', `${httpPrefix}: 400 ${responseText}`);
    if (status === 401 || status === 403) return this.createClientError('AUTH_ERROR', 'API key Gemini non valida o priva di permessi.', `${httpPrefix}: ${status} ${responseText}`);
    if (status === 404) return this.createClientError('NOT_FOUND', 'Endpoint o modello Gemini non trovato (404). Verifica Base URL e modello.', `${httpPrefix}: 404 ${responseText}`);
    if (status === 429) return this.createClientError('RATE_LIMIT', 'Gemini ha applicato un rate limit (429). Riprova tra poco.', `${httpPrefix}: 429 ${responseText}`);
    if (status === 500 || status === 503) return this.createClientError('TRANSIENT_ERROR', 'Servizio Gemini temporaneamente non disponibile. Riprova.', `${httpPrefix}: ${status} ${responseText}`);
    return this.createClientError('HTTP_ERROR', `Errore Gemini HTTP ${status}.`, `${httpPrefix}: ${status} ${responseText}`);
  },

  async withRetry(task, { retries = 1, context = 'request' } = {}) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        if (attempt > 0) this.log('warn', `${context}: retry ${attempt}/${retries}`);
        return await task(attempt);
      } catch (err) {
        lastErr = err;
        const retryable = this.RETRYABLE_STATUS.includes(err?.status) || err?.code === 'NETWORK_ERROR' || err?.code === 'TIMEOUT';
        if (!retryable || attempt === retries) break;
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      }
    }
    throw lastErr;
  },

  log(level, message, details) {
    const prefix = '[GeminiService]';
    if (level === 'error') {
      console.error(prefix, message, details || '');
      return;
    }
    if (level === 'warn') {
      console.warn(prefix, message, details || '');
      return;
    }
    console.info(prefix, message, details || '');
  },

  async requestJson(url, { method = 'GET', headers = {}, body, timeoutMs = this.DEFAULT_TIMEOUT_MS, context = 'request' } = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    this.log('info', `${context}: request started`, { url, method });

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal
      });

      if (!response.ok) {
        const responseText = await response.text();
        const mapped = this.mapHttpError(response.status, responseText, context);
        mapped.status = response.status;
        this.log('error', `${context}: request failed`, { status: response.status, userMessage: mapped.userMessage });
        throw mapped;
      }

      const data = await response.json();
      this.log('info', `${context}: request success`, { status: response.status });
      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        const timeoutErr = this.createClientError('TIMEOUT', 'Timeout richiesta Gemini. Verifica rete o aumenta timeout.', `${context}: timeout ${timeoutMs}ms`);
        this.log('error', `${context}: timeout`, { timeoutMs });
        throw timeoutErr;
      }
      if (err.userMessage) throw err;
      const networkErr = this.createClientError('NETWORK_ERROR', 'Errore di rete verso Gemini. Controlla la connessione.', `${context}: ${err.message}`);
      this.log('error', `${context}: network failure`, { message: err.message });
      throw networkErr;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  buildGenerateUrl(config) {
    return `${config.baseUrl}/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
  },

  buildPayload(prompt, minimal = false) {
    return {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: minimal
        ? { temperature: 0, maxOutputTokens: 8 }
        : {
          temperature: 0.2,
          maxOutputTokens: 512,
          responseMimeType: 'application/json'
        }
    };
  },

  async testConnection(aiConfig) {
    const config = this.validateConfig(aiConfig);
    const url = this.buildGenerateUrl(config);
    const payload = this.buildPayload('Rispondi solo con: OK', true);

    await this.withRetry(() => this.requestJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      context: 'test',
      timeoutMs: 10000
    }), { retries: 1, context: 'test' });

    return { ok: true, message: 'Connessione Gemini verificata con chiamata reale.' };
  },

  async generate(aiConfig, prompt) {
    const config = this.validateConfig(aiConfig);
    const url = this.buildGenerateUrl(config);
    const payload = this.buildPayload(prompt, false);

    const json = await this.withRetry(() => this.requestJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      context: 'generate',
      timeoutMs: this.DEFAULT_TIMEOUT_MS
    }), { retries: 2, context: 'generate' });

    const output = json.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n').trim();
    if (!output) {
      throw this.createClientError('EMPTY_RESPONSE', 'Gemini non ha restituito contenuto utile.', 'generate: empty candidates');
    }
    return output;
  }
};
