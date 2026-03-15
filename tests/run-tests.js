const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = {
  window: {},
  console,
  fetch: async () => ({ ok: true, status: 200, text: async () => '', json: async () => ({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] }) }),
  setTimeout,
  clearTimeout,
  AbortController
};
sandbox.window = sandbox;
vm.createContext(sandbox);

for (const file of ['app/utils.js', 'app/services.js', 'app/offers-service.js', 'app/ai-state.js', 'app/gemini.js', 'app/recipe-service.js']) {
  const code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  vm.runInContext(code, sandbox, { filename: file });
}

const { AppUtils, OffersService, RecipeService } = sandbox;

// 1) Ricerca supermercati robusta
const stores = [
  { id: '1', name: 'Esselunga Genova Centro', chain: 'Esselunga', distanceKm: 1.2 },
  { id: '2', name: 'Coop', chain: 'Coop', distanceKm: 0.5 }
];
assert.strictEqual(OffersService.searchSupermarkets('esselunga', stores)[0].id, '1');
assert.strictEqual(OffersService.searchSupermarkets('Esselunga', stores)[0].id, '1');
assert.strictEqual(OffersService.searchSupermarkets(' esselunga ', stores)[0].id, '1');
assert.strictEqual(OffersService.searchSupermarkets('essel', stores)[0].id, '1');

// 2) Offerte attive/scadute/future
const today = new Date('2026-03-15T00:00:00Z');
const active = { validFrom: new Date('2026-03-10'), validTo: new Date('2026-03-20') };
const expired = { validFrom: new Date('2026-03-01'), validTo: new Date('2026-03-10') };
const future = { validFrom: new Date('2026-03-16'), validTo: new Date('2026-03-30') };
assert.strictEqual(OffersService.isOfferActiveOnDate(active, today), true);
assert.strictEqual(OffersService.isOfferActiveOnDate(expired, today), false);
assert.strictEqual(OffersService.isOfferActiveOnDate(future, today), false);

// 3) AI ricetta parser + confronto ingredienti
const rawRecipe = '{"dishName":"Carbonara","ingredientsRequired":["spaghetti","uova","guanciale"],"recipeSteps":["Bolli la pasta","Cuoci il guanciale"],"servings":2,"optionalIngredients":["pecorino"],"notes":"Sale q.b."}';
const parsed = RecipeService.validateRecipeSchema(RecipeService.safeJsonParse(rawRecipe));
assert.strictEqual(parsed.dishName, 'Carbonara');
const compare = RecipeService.analyzeMissingIngredients(['Spaghetti', 'Uovo'], parsed.ingredientsRequired);
assert.deepStrictEqual(Array.from(compare.presentIngredients), ['spaghetti', 'uova']);
assert.deepStrictEqual(Array.from(compare.missingIngredients), ['guanciale']);

// 4) UI: sezione consigli AI rimossa e risultati presenti
const appReactContent = fs.readFileSync(path.join(__dirname, '..', 'app-react.js'), 'utf8');
assert.strictEqual(appReactContent.includes('Consigli AI'), false);
assert.strictEqual(appReactContent.includes('Ingredienti mancanti'), true);
assert.strictEqual(appReactContent.includes('Ricetta completa'), true);

// Utility ingredienti
assert.strictEqual(AppUtils.normalizeIngredientName(' UOVA '), 'uovo');
assert.strictEqual(AppUtils.normalizeIngredientName('Pomodori'), 'pomodoro');

console.log('All tests passed');
