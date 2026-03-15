window.RecipeService = {
  extractFirstJsonObject(text) {
    const source = String(text || '');
    const start = source.indexOf('{');
    if (start === -1) return '';

    let depth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = start; i < source.length; i += 1) {
      const char = source[i];

      if (inString) {
        if (escapeNext) {
          escapeNext = false;
        } else if (char === '\\') {
          escapeNext = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) return source.slice(start, i + 1);
      }
    }

    return '';
  },

  safeJsonParse(payload) {
    const cleaned = String(payload || '').replace(/```json|```/gi, '').trim();
    const jsonChunk = this.extractFirstJsonObject(cleaned);
    if (!jsonChunk) throw new Error('Risposta AI non in formato JSON valido.');

    try {
      return JSON.parse(jsonChunk);
    } catch {
      const repaired = jsonChunk
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'");
      return JSON.parse(repaired);
    }
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
    const prompt = `Sei uno chef preciso. Rispondi ESCLUSIVAMENTE con un oggetto JSON valido (UTF-8), senza testo extra, senza markdown, senza blocchi \`\`\`.
Schema richiesto:
{"dishName":"string","ingredientsRequired":["string"],"recipeSteps":["string"],"servings":number,"optionalIngredients":["string"],"notes":"string"}

Regole obbligatorie:
- dishName deve essere esattamente "${dishName}".
- ingredientsRequired: array non vuoto, ingredienti realistici, deduplicati.
- recipeSteps: array non vuoto, passaggi sintetici e ordinati.
- servings deve essere un numero.
- Nessuna virgola finale in JSON.
- Nessun commento o testo prima/dopo il JSON.`;

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
