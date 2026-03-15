window.RecipeService = {
  safeJsonParse(payload) {
    const cleaned = String(payload || '').replace(/```json|```/gi, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) throw new Error('Risposta AI non in formato JSON valido.');
    return JSON.parse(cleaned.slice(start, end + 1));
  },

  validateRecipeSchema(data) {
    const recipe = {
      dishName: String(data?.dishName || '').trim(),
      ingredientsRequired: Array.isArray(data?.ingredientsRequired) ? data.ingredientsRequired.map((x) => String(x || '').trim()).filter(Boolean) : [],
      recipeSteps: Array.isArray(data?.recipeSteps) ? data.recipeSteps.map((x) => String(x || '').trim()).filter(Boolean) : [],
      servings: Number.isFinite(Number(data?.servings)) ? Number(data.servings) : null,
      optionalIngredients: Array.isArray(data?.optionalIngredients) ? data.optionalIngredients.map((x) => String(x || '').trim()).filter(Boolean) : [],
      notes: String(data?.notes || '').trim()
    };

    if (!recipe.dishName) throw new Error('Campo dishName mancante nella risposta AI.');
    if (!recipe.ingredientsRequired.length) throw new Error('Campo ingredientsRequired vuoto nella risposta AI.');
    if (!recipe.recipeSteps.length) throw new Error('Campo recipeSteps vuoto nella risposta AI.');
    return recipe;
  },

  async generateRecipeFromDishName(aiConfig, dishName) {
    const prompt = `Sei uno chef preciso. Genera SOLO JSON valido, senza markdown, con schema:\n{"dishName":"string","ingredientsRequired":["string"],"recipeSteps":["string"],"servings":number,"optionalIngredients":["string"],"notes":"string"}.\n\nVincoli:\n- dishName deve essere '${dishName}'.\n- ingredientsRequired deve contenere ingredienti realistici e deduplicati.\n- recipeSteps deve essere una lista ordinata di passaggi sintetici.`;

    const raw = await window.GeminiService.generate(aiConfig, prompt);
    const parsed = this.safeJsonParse(raw);
    return this.validateRecipeSchema(parsed);
  },

  analyzeMissingIngredients(fridgeItems, recipeIngredients) {
    return window.AppUtils.comparePantryToRecipeIngredients(fridgeItems, recipeIngredients);
  },

  findMissingIngredientsOnOffers(missingIngredients, offers) {
    const normalizedMissing = (missingIngredients || []).map((item) => ({
      raw: item,
      normalized: window.AppUtils.normalizeIngredientName(item)
    }));

    const found = [];
    for (const offer of offers || []) {
      const normalizedTitle = window.AppUtils.normalizeSearchText(offer.title);
      for (const ingredient of normalizedMissing) {
        if (ingredient.normalized && normalizedTitle.includes(ingredient.normalized)) {
          found.push({ ingredient: ingredient.raw, offerTitle: offer.title, link: offer.link || '' });
        }
      }
    }

    return window.AppUtils.uniqueBy(found, (entry) => `${window.AppUtils.normalizeSearchText(entry.ingredient)}|${window.AppUtils.normalizeSearchText(entry.offerTitle)}`);
  }
};
