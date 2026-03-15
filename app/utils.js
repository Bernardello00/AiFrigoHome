window.AppUtils = {
  normalize(value) {
    return this.normalizeSearchText(value);
  },

  normalizeSearchText(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ');
  },

  uniqueBy(items, getKey) {
    const map = new Map();
    for (const item of items || []) {
      map.set(getKey(item), item);
    }
    return [...map.values()];
  },

  getChainAliases() {
    return {
      Esselunga: ['esselunga', 'esse lunga', 'esselunga spa', 'esse'],
      Coop: ['coop', 'coop liguria', 'ipercoop', 'coop italia'],
      Conad: ['conad', 'conad city', 'margherita conad'],
      Carrefour: ['carrefour', 'carrefour express', 'market carrefour'],
      Lidl: ['lidl', 'lidl italia'],
      Pam: ['pam', 'pam local'],
      Eurospin: ['eurospin'],
      MD: ['md', 'md discount']
    };
  },

  getNormalizedChainAliasMap() {
    const aliases = this.getChainAliases();
    const map = {};
    for (const [chain, values] of Object.entries(aliases)) {
      map[chain] = this.uniqueBy([chain, ...values].map((value) => this.normalizeSearchText(value)), (v) => v).filter(Boolean);
    }
    return map;
  },

  detectChain(name) {
    const normalizedName = this.normalizeSearchText(name);
    const aliases = this.getNormalizedChainAliasMap();
    for (const [chain, words] of Object.entries(aliases)) {
      if (words.some((word) => normalizedName.includes(word))) return chain;
    }
    return 'Supermercato';
  },

  getStoreSearchTokens(store) {
    const aliases = this.getNormalizedChainAliasMap();
    const chainTokens = aliases[store?.chain] || [];
    return this.uniqueBy([
      this.normalizeSearchText(store?.name),
      this.normalizeSearchText(store?.chain),
      ...chainTokens
    ].filter(Boolean), (value) => value);
  },

  matchesStoreQuery(store, query) {
    const needle = this.normalizeSearchText(query);
    if (!needle) return true;
    const tokens = this.getStoreSearchTokens(store);
    return tokens.some((token) => token === needle || token.startsWith(needle) || token.includes(needle) || needle.includes(token));
  },

  rankStoreResults(stores, query) {
    const needle = this.normalizeSearchText(query);
    return [...stores]
      .map((store, index) => {
        const tokens = this.getStoreSearchTokens(store);
        let score = 0;
        if (!needle) score += 1;
        if (tokens.some((token) => token === needle)) score += 160;
        if (tokens.some((token) => token.startsWith(needle))) score += 100;
        if (tokens.some((token) => token.includes(needle))) score += 70;
        if (tokens.some((token) => needle.includes(token))) score += 35;
        score += Math.max(0, 30 - (store.distanceKm || 0));
        return { store, score, index };
      })
      .sort((a, b) => (b.score - a.score) || (a.store.distanceKm - b.store.distanceKm) || (a.index - b.index))
      .map((entry) => entry.store);
  },

  ingredientAliases() {
    return {
      uovo: ['uova'],
      pomodoro: ['pomodori'],
      patata: ['patate'],
      cipolla: ['cipolle'],
      zucchina: ['zucchine'],
      melanzana: ['melanzane'],
      peperone: ['peperoni'],
      carota: ['carote'],
      pisello: ['piselli'],
      fagiolo: ['fagioli'],
      spaghetti: ['spaghetto'],
      pancetta: ['guanciale']
    };
  },

  normalizeIngredientName(value) {
    const normalized = this.normalizeSearchText(value).replace(/\b(di|da|con|al|alla|per|q\.b\.|qb)\b/g, ' ').replace(/\s+/g, ' ').trim();
    if (!normalized) return '';
    const aliases = this.ingredientAliases();
    for (const [base, synonyms] of Object.entries(aliases)) {
      const options = [base, ...synonyms].map((v) => this.normalizeSearchText(v));
      if (options.includes(normalized)) return this.normalizeSearchText(base);
    }
    if (normalized.endsWith('i') && normalized.length > 3) return normalized.slice(0, -1) + 'o';
    if (normalized.endsWith('e') && normalized.length > 3) return normalized.slice(0, -1) + 'a';
    return normalized;
  },

  comparePantryToRecipeIngredients(fridgeItems, recipeIngredients) {
    const normalizedFridge = this.uniqueBy((fridgeItems || []).map((item) => ({
      raw: item,
      normalized: this.normalizeIngredientName(item)
    })).filter((entry) => entry.normalized), (entry) => entry.normalized);

    const required = this.uniqueBy((recipeIngredients || []).map((item) => ({
      raw: item,
      normalized: this.normalizeIngredientName(item)
    })).filter((entry) => entry.normalized), (entry) => entry.normalized);

    const fridgeSet = new Set(normalizedFridge.map((entry) => entry.normalized));
    const present = [];
    const missing = [];

    for (const ingredient of required) {
      if (fridgeSet.has(ingredient.normalized)) present.push(ingredient.raw);
      else missing.push(ingredient.raw);
    }

    return {
      requiredIngredients: required.map((entry) => entry.raw),
      presentIngredients: present,
      missingIngredients: missing
    };
  },

  findMissingIngredients(fridgeItems, recipeIngredients) {
    return this.comparePantryToRecipeIngredients(fridgeItems, recipeIngredients).missingIngredients;
  },

  haversine(lat1, lon1, lat2, lon2) {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
};
