window.AiState = {
  STATUS: {
    DISCONNECTED: 'disconnected',
    TESTING: 'testing',
    CONNECTED: 'connected',
    ERROR: 'error'
  },

  buildConfigFingerprint(aiConfig) {
    const base = [aiConfig.provider || '', aiConfig.baseUrl || '', aiConfig.model || '', aiConfig.apiKey || ''].join('|');
    let hash = 0;
    for (let i = 0; i < base.length; i += 1) {
      hash = ((hash << 5) - hash) + base.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  },

  isConfigComplete(aiConfig) {
    return Boolean(aiConfig?.apiKey && aiConfig?.baseUrl && aiConfig?.model && aiConfig?.provider);
  },

  deriveConnectionState(aiConfig) {
    if (!this.isConfigComplete(aiConfig)) {
      return {
        status: this.STATUS.DISCONNECTED,
        message: 'Configura provider, API key, base URL e modello nelle Impostazioni AI.',
        technicalMessage: 'Configurazione AI incompleta'
      };
    }

    const currentFingerprint = this.buildConfigFingerprint(aiConfig);
    if (aiConfig?.connection?.status === this.STATUS.CONNECTED && aiConfig.connection.fingerprint === currentFingerprint) {
      return {
        status: this.STATUS.CONNECTED,
        message: aiConfig.connection.message || 'Connessione Gemini verificata.',
        technicalMessage: aiConfig.connection.technicalMessage || 'Connessione valida'
      };
    }

    if (aiConfig?.connection?.status === this.STATUS.ERROR) {
      return {
        status: this.STATUS.ERROR,
        message: aiConfig.connection.message || 'Ultimo test connessione fallito.',
        technicalMessage: aiConfig.connection.technicalMessage || 'Errore non specificato'
      };
    }

    return {
      status: this.STATUS.DISCONNECTED,
      message: 'Testa la connessione Gemini dalle Impostazioni AI.',
      technicalMessage: 'Connessione non ancora verificata'
    };
  }
};
