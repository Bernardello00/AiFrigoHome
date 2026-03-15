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
      .replace(/\s+/g, ' ');
  },

  getChainAliases() {
    return {
      Esselunga: ['esselunga', 'esse lunga', 'esselunga s p a'],
      Coop: ['coop', 'coop liguria', 'ipercoop'],
      Conad: ['conad', "conad city", 'margherita conad'],
      Carrefour: ['carrefour', 'carrefour express', 'market carrefour'],
      Lidl: ['lidl', 'lidl italia']
    };
  },

  detectChain(name) {
    const normalizedName = this.normalizeSearchText(name);
    const aliases = this.getChainAliases();
    for (const [chain, words] of Object.entries(aliases)) {
      if (words.some((word) => normalizedName.includes(this.normalizeSearchText(word)))) {
        return chain;
      }
    }
    return 'Supermercato';
  },

  matchesStoreQuery(store, query) {
    const needle = this.normalizeSearchText(query);
    if (!needle) return true;

    const name = this.normalizeSearchText(store?.name);
    const chain = this.normalizeSearchText(store?.chain);
    const aliases = this.getChainAliases()[store?.chain] || [];
    const aliasMatch = aliases.some((alias) => this.normalizeSearchText(alias).includes(needle) || needle.includes(this.normalizeSearchText(alias)));

    return name.includes(needle) || chain.includes(needle) || aliasMatch;
  },

  rankStoreResults(stores, query) {
    const needle = this.normalizeSearchText(query);
    if (!needle) return [...stores];

    return [...stores]
      .map((store, index) => {
        const name = this.normalizeSearchText(store.name);
        const chain = this.normalizeSearchText(store.chain);
        const aliases = this.getChainAliases()[store.chain] || [];

        let score = 0;
        if (chain === needle) score += 120;
        if (name === needle) score += 110;
        if (chain.startsWith(needle)) score += 90;
        if (name.startsWith(needle)) score += 80;
        if (chain.includes(needle)) score += 60;
        if (name.includes(needle)) score += 50;
        if (aliases.some((alias) => this.normalizeSearchText(alias).includes(needle))) score += 40;

        score += Math.max(0, 20 - (store.distanceKm || 0));

        return { store, score, index };
      })
      .sort((a, b) => (b.score - a.score) || (a.store.distanceKm - b.store.distanceKm) || (a.index - b.index))
      .map((entry) => entry.store);
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
