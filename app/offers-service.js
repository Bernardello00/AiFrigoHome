window.OffersService = {
  parseDate(value) {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    const raw = String(value).trim();
    if (!raw) return null;

    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const d = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00`);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    const itMatch = raw.match(/(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?/);
    if (itMatch) {
      const day = Number(itMatch[1]);
      const month = Number(itMatch[2]) - 1;
      const year = itMatch[3] ? Number(itMatch[3].length === 2 ? `20${itMatch[3]}` : itMatch[3]) : new Date().getFullYear();
      const d = new Date(year, month, day);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  },

  toStartOfDay(date) {
    const d = this.parseDate(date) || new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  },

  extractDateRangeFromText(text, fallbackDate = null) {
    const normalized = String(text || '');
    const matches = [...normalized.matchAll(/(\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?)/g)].map((entry) => entry[1]);
    if (matches.length >= 2) {
      return {
        validFrom: this.toStartOfDay(this.parseDate(matches[0])),
        validTo: this.toStartOfDay(this.parseDate(matches[1]))
      };
    }
    if (matches.length === 1) {
      const date = this.toStartOfDay(this.parseDate(matches[0]));
      return { validFrom: date, validTo: date };
    }
    const fallback = this.toStartOfDay(fallbackDate || new Date());
    return { validFrom: fallback, validTo: fallback };
  },

  parseRssItems(xml) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml))) {
      const block = match[1];
      const extract = (tag) => {
        const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
        return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
      };
      items.push({
        title: extract('title').replace(/<[^>]+>/g, '').trim(),
        pubDateRaw: extract('pubDate'),
        description: extract('description').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        link: extract('link')
      });
    }
    return items;
  },

  searchSupermarkets(query, stores) {
    const filtered = (stores || []).filter((store) => window.AppUtils.matchesStoreQuery(store, query));
    return window.AppUtils.rankStoreResults(filtered, query);
  },

  isOfferActiveOnDate(offer, date) {
    const target = this.toStartOfDay(date);
    const from = this.toStartOfDay(offer.validFrom);
    const to = this.toStartOfDay(offer.validTo);
    return from <= target && target <= to;
  },

  async fetchOffersByBrand(chain, address) {
    const query = encodeURIComponent(`${chain} volantino offerte ${address}`);
    const url = `https://r.jina.ai/http://news.google.com/rss/search?q=${query}&hl=it&gl=IT&ceid=IT:it`;
    const res = await fetch(url, { headers: { Accept: 'application/xml,text/plain' } });
    if (!res.ok) throw new Error('Feed offerte non disponibile');
    const xml = await res.text();
    const rawItems = this.parseRssItems(xml);

    return rawItems.map((item) => {
      const pubDate = this.parseDate(item.pubDateRaw) || new Date();
      const range = this.extractDateRangeFromText(`${item.title} ${item.description}`, pubDate);
      const validFrom = range.validFrom || this.toStartOfDay(pubDate);
      const validTo = range.validTo || this.toStartOfDay(pubDate);
      return {
        id: `${window.AppUtils.normalizeSearchText(item.title)}-${validFrom.toISOString()}`,
        title: item.title,
        link: item.link,
        sourceDate: pubDate,
        validFrom,
        validTo
      };
    });
  },

  async getOffersByStoreAndDate(store, today, address) {
    const offers = await this.fetchOffersByBrand(store.chain, address);
    return window.AppUtils.uniqueBy(
      offers.filter((offer) => this.isOfferActiveOnDate(offer, today)),
      (offer) => window.AppUtils.normalizeSearchText(offer.title)
    ).sort((a, b) => a.validTo - b.validTo || a.title.localeCompare(b.title));
  }
};
