const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = {
  window: {},
  console,
  fetch: async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] }) }),
  setTimeout,
  clearTimeout,
  AbortController
};
sandbox.window = sandbox;
vm.createContext(sandbox);

for (const file of ['app/utils.js', 'app/ai-state.js', 'app/gemini.js']) {
  const code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  vm.runInContext(code, sandbox, { filename: file });
}

const { AppUtils, AiState, GeminiService } = sandbox;

assert.strictEqual(AppUtils.normalizeSearchText(' Èsselùnga  '), 'esselunga');

const store = { name: 'Esselunga Genova Centro', chain: 'Esselunga', distanceKm: 1.2 };
assert.strictEqual(AppUtils.matchesStoreQuery(store, 'esselunga'), true);
assert.strictEqual(AppUtils.matchesStoreQuery(store, ' esselunga '), true);
assert.strictEqual(AppUtils.matchesStoreQuery(store, 'Esselùnga'), true);

const ranked = AppUtils.rankStoreResults([
  { name: 'Supermercato Centro', chain: 'Supermercato', distanceKm: 0.5 },
  { name: 'Esselunga Genova', chain: 'Esselunga', distanceKm: 2 }
], 'esselunga');
assert.strictEqual(ranked[0].chain, 'Esselunga');

const http404 = GeminiService.mapHttpError(404, 'Not Found', 'generate');
assert.strictEqual(http404.code, 'NOT_FOUND');

const disconnected = AiState.deriveConnectionState({ provider: 'gemini', apiKey: '', baseUrl: '', model: '' });
assert.strictEqual(disconnected.status, 'disconnected');

const cfg = { provider: 'gemini', apiKey: 'abc123', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-1.5-flash' };
const fp = AiState.buildConfigFingerprint(cfg);
const connected = AiState.deriveConnectionState({ ...cfg, connection: { status: 'connected', fingerprint: fp, message: 'ok' } });
assert.strictEqual(connected.status, 'connected');

console.log('All tests passed');
